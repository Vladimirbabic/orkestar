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

export type AIModel = 'openai' | 'gemini' | 'stable-diffusion' | 'elevenlabs' | 'custom' | 'supadata' | 'autosend';
export type TriggerType = 'webhook';

// Sub-models for each provider
export type OpenAIModel = 'gpt-5.1';
export type GeminiModel = 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.5-flash-image' | 'gemini-2.0-flash-exp';
export type ElevenLabsModel = 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5' | 'eleven_v3';

export type SubModel = OpenAIModel | GeminiModel | ElevenLabsModel | string;

export interface NodeData {
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
  images?: string[]; // Array of base64 image data URLs
  [key: string]: unknown; // Index signature for compatibility
}

export interface ResultNodeData {
  label: string;
  result?: string;
  isLoading?: boolean;
  timestamp?: string;
  [key: string]: unknown; // Index signature for compatibility
}

export interface WebhookNodeData {
  label: string;
  webhookId?: string;
  webhookUrl?: string;
  description?: string;
  lastTriggered?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface ScheduleNodeData {
  label: string;
  scheduleType: 'interval' | 'cron';
  intervalMinutes?: number;
  cronExpression?: string;
  timezone?: string;
  isActive?: boolean;
  lastRun?: string;
  nextRun?: string;
  [key: string]: unknown;
}

export interface ConditionNodeData {
  label: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'is_empty' | 'is_not_empty';
  value: string;
  [key: string]: unknown;
}

export interface TransformNodeData {
  label: string;
  code: string;
  description?: string;
  [key: string]: unknown;
}

export type IntegrationType = 'email' | 'google-sheets' | 'slack' | 'notion' | 'discord' | 'airtable';

export interface IntegrationNodeData {
  label: string;
  integrationType: IntegrationType;
  action: string;
  config: Record<string, unknown>;
  isConnected?: boolean;
  accountName?: string;
  [key: string]: unknown;
}

export interface AgentStep {
  id: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  duration?: number;
}

export interface AgentNodeData {
  label: string;
  objective: string;
  model: 'openai' | 'gemini';
  maxSteps: number;
  temperature: number;
  steps: AgentStep[];
  isRunning?: boolean;
  finalResult?: string;
  tools: string[];
  [key: string]: unknown;
}

export type AnyNodeData = NodeData | ResultNodeData | WebhookNodeData | ScheduleNodeData | ConditionNodeData | TransformNodeData | IntegrationNodeData | AgentNodeData;

interface WorkflowState {
  nodes: Node<AnyNodeData>[];
  edges: Edge[];
  selectedNode: Node<AnyNodeData> | null;
  settingsNodeId: string | null; // ID of node whose settings panel is open
  currentWorkflowId: string | null;
  currentWorkflowName: string;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: AIModel, position: { x: number; y: number }) => void;
  addResultNode: (position: { x: number; y: number }) => void;
  addWebhookNode: (position: { x: number; y: number }) => void;
  addScheduleNode: (position: { x: number; y: number }) => void;
  addConditionNode: (position: { x: number; y: number }) => void;
  addTransformNode: (position: { x: number; y: number }) => void;
  addIntegrationNode: (integrationType: IntegrationType, position: { x: number; y: number }) => void;
  addAgentNode: (position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<AnyNodeData>) => void;
  setSelectedNode: (node: Node<AnyNodeData> | null) => void;
  setSettingsNodeId: (nodeId: string | null) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  setWorkflowName: (name: string) => void;
  loadWorkflow: (nodes: Node<AnyNodeData>[], edges: Edge[]) => void;
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
const resetNodeIdCounter = (nodes: Node<AnyNodeData>[]) => {
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
const ensureUniqueNodeIds = (nodes: Node<AnyNodeData>[]): Node<AnyNodeData>[] => {
  const seenIds = new Set<string>();
  const uniqueNodes: Node<AnyNodeData>[] = [];
  
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
  settingsNodeId: null,
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

  addWebhookNode: (position) => {
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNode: Node<WebhookNodeData> = {
      id: generateNodeId(),
      type: 'webhookNode',
      position,
      data: {
        label: 'Webhook Trigger',
        webhookId,
        webhookUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${webhookId}`,
        description: 'Trigger workflow via HTTP request',
        isActive: true,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addScheduleNode: (position) => {
    const newNode: Node<ScheduleNodeData> = {
      id: generateNodeId(),
      type: 'scheduleNode',
      position,
      data: {
        label: 'Schedule Trigger',
        scheduleType: 'interval',
        intervalMinutes: 1440, // Daily by default
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isActive: false,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addConditionNode: (position) => {
    const newNode: Node<ConditionNodeData> = {
      id: generateNodeId(),
      type: 'conditionNode',
      position,
      data: {
        label: 'Condition',
        field: '{{output}}',
        operator: 'contains',
        value: '',
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addTransformNode: (position) => {
    const newNode: Node<TransformNodeData> = {
      id: generateNodeId(),
      type: 'transformNode',
      position,
      data: {
        label: 'Transform',
        code: '// Transform the input data\nreturn input;',
        description: 'Custom JavaScript',
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addIntegrationNode: (integrationType, position) => {
    const integrationLabels: Record<IntegrationType, string> = {
      'email': 'Send Email',
      'google-sheets': 'Google Sheets',
      'slack': 'Slack',
      'notion': 'Notion',
      'discord': 'Discord',
      'airtable': 'Airtable',
    };
    const defaultActions: Record<IntegrationType, string> = {
      'email': 'send',
      'google-sheets': 'append',
      'slack': 'send_message',
      'notion': 'create_page',
      'discord': 'send_message',
      'airtable': 'create_record',
    };

    const newNode: Node<IntegrationNodeData> = {
      id: generateNodeId(),
      type: 'integrationNode',
      position,
      data: {
        label: integrationLabels[integrationType],
        integrationType,
        action: defaultActions[integrationType],
        config: {},
        isConnected: false,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addAgentNode: (position) => {
    const newNode: Node<AgentNodeData> = {
      id: generateNodeId(),
      type: 'agentNode',
      position,
      data: {
        label: 'AI Agent',
        objective: '',
        model: 'openai',
        maxSteps: 10,
        temperature: 0.7,
        steps: [],
        tools: ['web_search', 'summarize', 'analyze', 'generate'],
        isRunning: false,
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  updateNodeData: (nodeId, data) => {
    const nodes = get().nodes;
    const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) return;
    
    const node = nodes[nodeIndex];
    const newData = { ...node.data, ...data };
    
    // Only update if data actually changed
    const hasChanges = Object.keys(data).some(
      (key) => node.data[key as keyof typeof node.data] !== data[key as keyof typeof data]
    );
    
    if (!hasChanges) return;
    
    const newNodes = [...nodes];
    newNodes[nodeIndex] = { ...node, data: newData };
    set({ nodes: newNodes });
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  setSettingsNodeId: (nodeId) => {
    set({ settingsNodeId: nodeId });
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
      const newNode: Node<AnyNodeData> = {
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
