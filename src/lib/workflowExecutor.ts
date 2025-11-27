import { Node, Edge } from '@xyflow/react';
import { NodeData, ResultNodeData, AIModel } from '@/store/workflowStore';
import { runAIModel } from './aiService';
import { APIKeys } from '@/store/settingsStore';

interface ExecutionContext {
  nodeOutputs: Map<string, string>;
  apiKeys: APIKeys;
  onNodeStart: (nodeId: string) => void;
  onNodeComplete: (nodeId: string, result: string) => void;
  onNodeError: (nodeId: string, error: string) => void;
}

export async function executeWorkflow(
  nodes: Node<NodeData | ResultNodeData>[],
  edges: Edge[],
  context: ExecutionContext
): Promise<void> {
  // Build adjacency list for the graph
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  // Initialize
  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });
  
  // Build graph
  edges.forEach((edge) => {
    const sources = adjacency.get(edge.source) || [];
    sources.push(edge.target);
    adjacency.set(edge.source, sources);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });
  
  // Find starting nodes (nodes with no incoming edges)
  const queue: string[] = [];
  nodes.forEach((node) => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });
  
  // Process nodes in topological order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentId);
    
    if (!currentNode) continue;
    
    // Execute the node
    await executeNode(currentNode, nodes, edges, context);
    
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

async function executeNode(
  node: Node<NodeData | ResultNodeData>,
  allNodes: Node<NodeData | ResultNodeData>[],
  edges: Edge[],
  context: ExecutionContext
): Promise<void> {
  // Get inputs from connected nodes (works for both AI and Result nodes)
  const inputEdges = edges.filter((e) => e.target === node.id);
  const inputs: string[] = [];
  
  for (const edge of inputEdges) {
    const output = context.nodeOutputs.get(edge.source);
    if (output) {
      inputs.push(output);
    }
  }
  
  const combinedInput = inputs.join('\n\n---\n\n');

  // Handle Result nodes - pass through the input
  if (node.type === 'resultNode') {
    context.onNodeStart(node.id);
    
    // Result node just passes through the combined input
    const result = combinedInput || '';
    context.nodeOutputs.set(node.id, result);
    context.onNodeComplete(node.id, result);
    return;
  }
  
  // Handle AI nodes
  const data = node.data as NodeData;
  
  // For ElevenLabs, prompt is optional - it will use input from previous nodes
  if (!data.prompt && data.model !== 'elevenlabs') {
    context.onNodeError(node.id, 'No prompt configured');
    return;
  }
  
  // For ElevenLabs, if no prompt and no input, show error
  if (data.model === 'elevenlabs' && !data.prompt && !combinedInput) {
    context.onNodeError(node.id, 'No input available. Connect a node to provide text to convert to audio.');
    return;
  }
  
  const apiKey = context.apiKeys[data.model];
  if (!apiKey) {
    context.onNodeError(node.id, `No API key configured for ${data.model}`);
    return;
  }
  
  // Build the final prompt
  // For ElevenLabs, use input directly if no prompt is provided
  let prompt = data.prompt || '';
  
  if (data.model === 'elevenlabs') {
    // ElevenLabs: use input from previous nodes directly as the text to convert
    prompt = combinedInput || prompt;
  } else if (combinedInput) {
    // For other models, handle input as before
    // Check if prompt contains {{input}} placeholder
    if (prompt.includes('{{input}}')) {
      // Replace placeholder with actual input
      prompt = prompt.replace(/\{\{input\}\}/g, combinedInput);
    } else {
      // No placeholder - automatically prepend the input as context
      prompt = `Here is the context/input from the previous step:\n\n${combinedInput}\n\n---\n\nNow, please do the following:\n\n${prompt}`;
    }
  }
  
  // Mark node as running
  context.onNodeStart(node.id);
  
  try {
    // Call the AI API
    const response = await runAIModel(data.model, prompt, apiKey, {
      subModel: data.subModel,
      systemPrompt: data.systemPrompt,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      voiceId: data.voiceId,
    });
    
    if (response.success && response.result) {
      context.nodeOutputs.set(node.id, response.result);
      context.onNodeComplete(node.id, response.result);
    } else {
      context.onNodeError(node.id, response.error || 'Unknown error');
    }
  } catch (error) {
    context.onNodeError(
      node.id,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function executeSingleNode(
  node: Node<NodeData>,
  edges: Edge[],
  allNodes: Node<NodeData | ResultNodeData>[],
  context: ExecutionContext
): Promise<string | null> {
  const data = node.data as NodeData;
  
  // For ElevenLabs, prompt is optional - it will use input from previous nodes
  if (!data.prompt && data.model !== 'elevenlabs') {
    context.onNodeError(node.id, 'No prompt configured');
    return null;
  }
  
  const apiKey = context.apiKeys[data.model];
  if (!apiKey) {
    context.onNodeError(node.id, `No API key configured for ${data.model}`);
    return null;
  }
  
  // Get inputs from connected nodes (both AI nodes and Result nodes)
  const inputEdges = edges.filter((e) => e.target === node.id);
  const inputs: string[] = [];
  
  for (const edge of inputEdges) {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    if (sourceNode) {
      if (sourceNode.type === 'aiNode') {
        const sourceData = sourceNode.data as NodeData;
        if (sourceData.output) {
          inputs.push(sourceData.output);
        }
      } else if (sourceNode.type === 'resultNode') {
        const sourceData = sourceNode.data as ResultNodeData;
        if (sourceData.result) {
          inputs.push(sourceData.result);
        }
      }
    }
  }
  
  // Build the final prompt
  const combinedInput = inputs.join('\n\n---\n\n');
  
  // For ElevenLabs, use input directly if no prompt is provided
  let prompt = data.prompt || '';
  
  if (data.model === 'elevenlabs') {
    // ElevenLabs: use input from previous nodes directly as the text to convert
    prompt = combinedInput || prompt;
    if (!prompt) {
      context.onNodeError(node.id, 'No input available. Connect a node to provide text to convert to audio.');
      return null;
    }
  } else if (combinedInput) {
    // For other models, handle input as before
    // Check if prompt contains {{input}} placeholder
    if (prompt.includes('{{input}}')) {
      // Replace placeholder with actual input
      prompt = prompt.replace(/\{\{input\}\}/g, combinedInput);
    } else {
      // No placeholder - automatically prepend the input as context
      prompt = `Here is the context/input from the previous step:\n\n${combinedInput}\n\n---\n\nNow, please do the following:\n\n${prompt}`;
    }
  }
  
  context.onNodeStart(node.id);
  
  try {
    const response = await runAIModel(data.model, prompt, apiKey, {
      subModel: data.subModel,
      systemPrompt: data.systemPrompt,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      voiceId: data.voiceId,
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
