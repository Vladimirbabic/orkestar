import { Node, Edge } from '@xyflow/react';
import { NodeData, ResultNodeData, AIModel } from '@/store/workflowStore';
import { runAIModel } from './aiService';
import { APIKeys } from '@/store/settingsStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExecutionContext {
  nodeOutputs: Map<string, string>;
  apiKeys: APIKeys;
  onNodeStart: (nodeId: string) => void;
  onNodeComplete: (nodeId: string, result: string) => void;
  onNodeError: (nodeId: string, error: string) => void;
}

type WorkflowNode = Node<NodeData | ResultNodeData>;

// ============================================================================
// Core Execution Logic
// ============================================================================

/**
 * Executes a single node (shared logic for both workflow and single node execution)
 */
async function executeNodeCore(
  node: WorkflowNode,
  getInputs: () => string[],
  context: ExecutionContext
): Promise<string | null> {
  const inputs = getInputs();
  const combinedInput = inputs.join('\n\n---\n\n');

  // Handle Result nodes - pass through the input
  if (node.type === 'resultNode') {
    context.onNodeStart(node.id);
    const result = combinedInput || '';
    context.nodeOutputs.set(node.id, result);
    context.onNodeComplete(node.id, result);
    return result;
  }
  
  // Handle AI nodes
  const data = node.data as NodeData;
  
  // Validate prompt requirements
  if (!data.prompt && data.model !== 'elevenlabs') {
    context.onNodeError(node.id, 'No prompt configured');
    return null;
  }
  
  // For ElevenLabs, if no prompt and no input, show error
  if (data.model === 'elevenlabs' && !data.prompt && !combinedInput) {
    context.onNodeError(node.id, 'No input available. Connect a node to provide text to convert to audio.');
    return null;
  }
  
  // Validate API key
  const apiKey = context.apiKeys[data.model];
  if (!apiKey) {
    context.onNodeError(node.id, `No API key configured for ${data.model}`);
    return null;
  }
  
  // Build the final prompt
  const prompt = buildPrompt(data, combinedInput);
  
  // Mark node as running
  context.onNodeStart(node.id);
  
  try {
    const response = await runAIModel(data.model, prompt, apiKey, {
      subModel: data.subModel,
      systemPrompt: data.systemPrompt,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      voiceId: data.voiceId,
      images: data.images,
    });
    
    if (response.success && response.result) {
      context.nodeOutputs.set(node.id, response.result);
      context.onNodeComplete(node.id, response.result);
      return response.result;
    } else {
      context.onNodeError(node.id, response.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    context.onNodeError(
      node.id,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}

/**
 * Builds the final prompt based on node data and combined input
 */
function buildPrompt(data: NodeData, combinedInput: string): string {
  let prompt = data.prompt || '';
  
  if (data.model === 'elevenlabs') {
    // ElevenLabs: use input from previous nodes directly as the text to convert
    return combinedInput || prompt;
  }
  
  if (combinedInput) {
    // Check if prompt contains {{input}} placeholder
    if (prompt.includes('{{input}}')) {
      return prompt.replace(/\{\{input\}\}/g, combinedInput);
    } else {
      // No placeholder - automatically prepend the input as context
      return `Here is the context/input from the previous step:\n\n${combinedInput}\n\n---\n\nNow, please do the following:\n\n${prompt}`;
    }
  }
  
  return prompt;
}

// ============================================================================
// Workflow Execution
// ============================================================================

/**
 * Executes an entire workflow using topological sorting
 */
export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: Edge[],
  context: ExecutionContext
): Promise<void> {
  // Build adjacency list and in-degree map for topological sort
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  // Initialize
  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  
  // Build graph
  for (const edge of edges) {
    const sources = adjacency.get(edge.source) || [];
    sources.push(edge.target);
    adjacency.set(edge.source, sources);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }
  
  // Find starting nodes (nodes with no incoming edges)
  const queue: string[] = [];
  for (const node of nodes) {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  }
  
  // Process nodes in topological order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentId);
    
    if (!currentNode) continue;
    
    // Get inputs from context (outputs from upstream nodes)
    const getInputs = () => {
      const inputEdges = edges.filter((e) => e.target === currentId);
      const inputs: string[] = [];
      for (const edge of inputEdges) {
        const output = context.nodeOutputs.get(edge.source);
        if (output) inputs.push(output);
      }
      return inputs;
    };
    
    // Execute the node
    await executeNodeCore(currentNode, getInputs, context);
    
    // Add downstream nodes to queue
    const downstream = adjacency.get(currentId) || [];
    for (const nextId of downstream) {
      const newInDegree = (inDegree.get(nextId) || 0) - 1;
      inDegree.set(nextId, newInDegree);
      if (newInDegree === 0) {
        queue.push(nextId);
      }
    }
  }
}

// ============================================================================
// Single Node Execution
// ============================================================================

/**
 * Executes a single node, using outputs from connected nodes
 */
export async function executeSingleNode(
  node: Node<NodeData>,
  edges: Edge[],
  allNodes: WorkflowNode[],
  context: ExecutionContext
): Promise<string | null> {
  // Get inputs from connected nodes (both AI nodes and Result nodes)
  const getInputs = () => {
    const inputEdges = edges.filter((e) => e.target === node.id);
    const inputs: string[] = [];
    
    for (const edge of inputEdges) {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        if (sourceNode.type === 'aiNode') {
          const sourceData = sourceNode.data as NodeData;
          if (sourceData.output) inputs.push(sourceData.output);
        } else if (sourceNode.type === 'resultNode') {
          const sourceData = sourceNode.data as ResultNodeData;
          if (sourceData.result) inputs.push(sourceData.result);
        }
      }
    }
    
    return inputs;
  };
  
  return executeNodeCore(node, getInputs, context);
}
