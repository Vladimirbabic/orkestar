'use client';

import React, { useCallback, useRef, useMemo, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { useWorkflowStore, AIModel, NodeData, IntegrationType } from '@/store/workflowStore';
import { useSettingsStore } from '@/store/settingsStore';
import AINode from '@/components/nodes/AINode';
import ResultNode from '@/components/nodes/ResultNode';
import WebhookNode from '@/components/nodes/WebhookNode';
import ScheduleNode from '@/components/nodes/ScheduleNode';
import ConditionNode from '@/components/nodes/ConditionNode';
import TransformNode from '@/components/nodes/TransformNode';
import IntegrationNode from '@/components/nodes/IntegrationNode';
import NodeSettingsPanel from '@/components/NodeSettingsPanel';
import { Key, MousePointer } from 'lucide-react';

// Memoize node types to prevent recreation
const nodeTypes = {
  aiNode: AINode,
  resultNode: ResultNode,
  webhookNode: WebhookNode,
  scheduleNode: ScheduleNode,
  conditionNode: ConditionNode,
  transformNode: TransformNode,
  integrationNode: IntegrationNode,
};

// Memoized MiniMap to prevent re-renders
const MemoizedMiniMap = memo(function MemoizedMiniMap() {
  const nodeColor = useCallback((node: { type?: string; data?: { model?: string } }) => {
    // Node type colors
    const typeColors: Record<string, string> = {
      resultNode: '#10b981',
      webhookNode: '#f59e0b',
      scheduleNode: '#3b82f6',
      conditionNode: '#a855f7',
      transformNode: '#06b6d4',
      integrationNode: '#ec4899',
    };
    if (node.type && typeColors[node.type]) return typeColors[node.type];
    
    // AI model colors
    const modelColors: Record<string, string> = {
      openai: '#10b981',
      gemini: '#3b82f6',
      'stable-diffusion': '#8b5cf6',
      elevenlabs: '#a855f7',
      custom: '#71717a',
      supadata: '#10b981',
    };
    return modelColors[node.data?.model as string] || '#71717a';
  }, []);

  return (
    <MiniMap
      nodeColor={nodeColor}
      maskColor="rgba(0, 0, 0, 0.85)"
      style={{
        backgroundColor: '#09090b',
      }}
    />
  );
});

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  // Use selectors to minimize re-renders
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const addResultNode = useWorkflowStore((state) => state.addResultNode);
  const addWebhookNode = useWorkflowStore((state) => state.addWebhookNode);
  const addScheduleNode = useWorkflowStore((state) => state.addScheduleNode);
  const addConditionNode = useWorkflowStore((state) => state.addConditionNode);
  const addTransformNode = useWorkflowStore((state) => state.addTransformNode);
  const addIntegrationNode = useWorkflowStore((state) => state.addIntegrationNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const settingsNodeId = useWorkflowStore((state) => state.settingsNodeId);
  const setSettingsNodeId = useWorkflowStore((state) => state.setSettingsNodeId);
  
  const apiKeys = useSettingsStore((state) => state.apiKeys);
  const getEnabledModels = useSettingsStore((state) => state.getEnabledModels);
  const openSettings = useSettingsStore((state) => state.openSettings);

  // Get the node data for the settings panel
  const settingsNode = useMemo(() => {
    if (!settingsNodeId) return null;
    const node = nodes.find((n) => n.id === settingsNodeId);
    if (!node || node.type !== 'aiNode') return null;
    return node.data as NodeData;
  }, [settingsNodeId, nodes]);

  const enabledModels = useMemo(() => getEnabledModels(), [getEnabledModels, apiKeys]);
  const hasModels = enabledModels.length > 0;
  const hasNodes = nodes.length > 0;

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Handle different node types
      switch (type) {
        case 'result':
          addResultNode(position);
          break;
        case 'webhook':
          addWebhookNode(position);
          break;
        case 'schedule':
          addScheduleNode(position);
          break;
        case 'condition':
          addConditionNode(position);
          break;
        case 'transform':
          addTransformNode(position);
          break;
        case 'email':
        case 'google-sheets':
        case 'slack':
        case 'notion':
        case 'discord':
        case 'airtable':
          addIntegrationNode(type as IntegrationType, position);
          break;
        default:
          addNode(type as AIModel, position);
      }
    },
    [screenToFlowPosition, addNode, addResultNode, addWebhookNode, addScheduleNode, addConditionNode, addTransformNode, addIntegrationNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'rgba(113, 113, 122, 0.4)', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.5}
          color="rgba(161, 161, 170, 0.25)"
        />
        {hasNodes && (
          <>
            <Controls />
            <MemoizedMiniMap />
          </>
        )}
      </ReactFlow>

      {/* Empty state */}
      {!hasNodes && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center text-center max-w-sm">
            {hasModels ? (
              <>
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <MousePointer className="w-6 h-6 text-zinc-500" />
                </div>
                <h3 className="text-base font-medium text-zinc-200 mb-2">
                  Start building your workflow
                </h3>
                <p className="text-sm text-zinc-500">
                  Click on a model from the sidebar or drag it onto the canvas to add your first step
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <Key className="w-6 h-6 text-zinc-500" />
                </div>
                <h3 className="text-base font-medium text-zinc-200 mb-2">
                  Configure your API keys
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Add API keys for the AI models you want to use in your workflows
                </p>
                <button
                  onClick={openSettings}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors"
                >
                  <Key className="w-4 h-4" />
                  Add API Keys
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Node Settings Panel */}
      {settingsNodeId && settingsNode && (
        <NodeSettingsPanel
          nodeId={settingsNodeId}
          nodeData={settingsNode}
          onClose={() => setSettingsNodeId(null)}
        />
      )}
    </div>
  );
}

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
