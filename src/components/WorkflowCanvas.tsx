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
import { useWorkflowStore, AIModel } from '@/store/workflowStore';
import { useSettingsStore } from '@/store/settingsStore';
import AINode from '@/components/nodes/AINode';
import ResultNode from '@/components/nodes/ResultNode';
import { Key, MousePointer } from 'lucide-react';

// Memoize node types to prevent recreation
const nodeTypes = {
  aiNode: AINode,
  resultNode: ResultNode,
};

// Memoized MiniMap to prevent re-renders
const MemoizedMiniMap = memo(function MemoizedMiniMap() {
  const nodeColor = useCallback((node: { type?: string; data?: { model?: string } }) => {
    if (node.type === 'resultNode') return '#10b981';
    const colors: Record<string, string> = {
      openai: '#10b981',
      gemini: '#3b82f6',
      'stable-diffusion': '#8b5cf6',
      elevenlabs: '#a855f7',
      custom: '#71717a',
      supadata: '#10b981',
    };
    return colors[node.data?.model as string] || '#71717a';
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
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  
  const apiKeys = useSettingsStore((state) => state.apiKeys);
  const getEnabledModels = useSettingsStore((state) => state.getEnabledModels);
  const openSettings = useSettingsStore((state) => state.openSettings);

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

      if (type === 'result') {
        addResultNode(position);
      } else {
        addNode(type as AIModel, position);
      }
    },
    [screenToFlowPosition, addNode, addResultNode]
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
