import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import { getDefaultSubModel, getSubModelLabel } from '@/lib/modelConfig';

export type AIModel = 'openai' | 'gemini' | 'stable-diffusion' | 'elevenlabs' | 'custom' | 'supadata';

// Sub-models for each provider
export type OpenAIModel = 'gpt-5.1';
export type GeminiModel = 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.5-flash-image' | 'gemini-2.0-flash-exp';
export type ElevenLabsModel = 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5' | 'eleven_v3';

export type SubModel = OpenAIModel | GeminiModel | ElevenLabsModel | string;

export interface NodeData extends Record<string, unknown> {
  label: string;
  model: AIModel;
  subModel?: SubModel; // Specific model variant
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  description?: string;
  isRunning?: boolean;
  hasOutput?: boolean;
  output?: string;
  contextId?: string; // Selected context template ID
  voiceId?: string; // ElevenLabs voice ID
}

export interface ResultNodeData extends Record<string, unknown> {
  label: string;
  result?: string;
  isLoading?: boolean;
  timestamp?: string;
}

interface WorkflowState {
  nodes: Node<NodeData | ResultNodeData>[];
  edges: Edge[];
  selectedNode: Node<NodeData | ResultNodeData> | null;
  currentWorkflowId: string | null;
  currentWorkflowName: string;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: AIModel, position: { x: number; y: number }) => void;
  addResultNode: (position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData | ResultNodeData>) => void;
  setSelectedNode: (node: Node<NodeData | ResultNodeData> | null) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  setWorkflowName: (name: string) => void;
  loadWorkflow: (nodes: Node<NodeData | ResultNodeData>[], edges: Edge[]) => void;
  clearWorkflow: () => void;
}

const modelDefaults: Record<AIModel, { label: string; description: string }> = {
  openai: { label: 'GPT-5.1', description: 'OpenAI latest flagship model' },
  gemini: { label: 'Gemini 2.0', description: 'Google Gemini Flash' },
  'stable-diffusion': { label: 'Stable Diffusion', description: 'Image generation' },
  elevenlabs: { label: 'ElevenLabs', description: 'AI voice synthesis' },
  custom: { label: 'Custom Model', description: 'Custom API endpoint' },
  supadata: { label: 'Supadata', description: 'Web content extraction' },
};

let nodeIdCounter = 0;

const generateNodeId = () => {
  nodeIdCounter += 1;
  return `node-${nodeIdCounter}`;
};

// Reset counter based on existing node IDs to avoid duplicates
const resetNodeIdCounter = (nodes: Node<NodeData | ResultNodeData>[]) => {
  if (nodes.length === 0) {
    nodeIdCounter = 0;
    return;
  }
  
  // Extract numeric IDs from existing nodes
  const existingIds = nodes
    .map((node) => {
      const match = node.id.match(/^node-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((id) => id > 0);
  
  // Set counter to highest ID (generateNodeId increments first, so next ID will be max+1)
  nodeIdCounter = existingIds.length > 0 ? Math.max(...existingIds) : 0;
};

// Ensure all node IDs are unique
const ensureUniqueNodeIds = (nodes: Node<NodeData | ResultNodeData>[]): Node<NodeData | ResultNodeData>[] => {
  const seenIds = new Set<string>();
  const uniqueNodes: Node<NodeData | ResultNodeData>[] = [];
  
  // First, find the maximum ID to start generating new IDs from
  const existingIds = nodes
    .map((node) => {
      const match = node.id.match(/^node-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((id) => id > 0);
  let maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  
  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      // Generate a new unique ID for duplicate
      maxId += 1;
      const newId = `node-${maxId}`;
      uniqueNodes.push({ ...node, id: newId });
      seenIds.add(newId);
    } else {
      seenIds.add(node.id);
      uniqueNodes.push(node);
    }
  }
  
  return uniqueNodes;
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  currentWorkflowId: null,
  currentWorkflowName: 'My Workflow',

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<NodeData | ResultNodeData>[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge({ ...connection, animated: true }, get().edges),
    });
  },

  addNode: (type, position) => {
    const defaults = modelDefaults[type];
    const subModel = getDefaultSubModel(type);
    const newNode: Node<NodeData> = {
      id: generateNodeId(),
      type: 'aiNode',
      position,
      data: {
        label: getSubModelLabel(type, subModel),
        model: type,
        subModel: subModel,
        description: defaults.description,
        prompt: '',
        temperature: 0.7,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addResultNode: (position) => {
    const newNode: Node<ResultNodeData> = {
      id: generateNodeId(),
      type: 'resultNode',
      position,
      data: {
        label: 'Result',
        result: '',
        isLoading: false,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNode: get().selectedNode?.id === nodeId ? null : get().selectedNode,
    });
  },

  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node) {
      const newNode: Node<NodeData | ResultNodeData> = {
        ...node,
        id: generateNodeId(),
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: { ...node.data },
      };
      set({ nodes: [...get().nodes, newNode] });
    }
  },

  setWorkflowName: (name) => {
    set({ currentWorkflowName: name });
  },

  loadWorkflow: (nodes, edges) => {
    // Ensure all node IDs are unique before loading
    const uniqueNodes = ensureUniqueNodeIds(nodes);
    // Reset node ID counter to avoid duplicates when loading existing workflows
    resetNodeIdCounter(uniqueNodes);
    set({ nodes: uniqueNodes, edges, selectedNode: null });
  },

  clearWorkflow: () => {
    // Reset the node ID counter when clearing
    nodeIdCounter = 0;
    set({ 
      nodes: [], 
      edges: [], 
      selectedNode: null,
      currentWorkflowId: null,
      currentWorkflowName: 'My Workflow',
    });
  },
}));
