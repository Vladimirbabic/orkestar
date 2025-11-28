'use client';

import { useState, useCallback, useRef } from 'react';
import { useWorkflowStore, NodeData, ResultNodeData } from '@/store/workflowStore';
import { useSettingsStore } from '@/store/settingsStore';
import { executeWorkflow, executeSingleNode } from '@/lib/workflowExecutor';
import { Node } from '@xyflow/react';

export function useWorkflowRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false); // Prevent race conditions
  
  // Use refs to get latest values without causing re-renders
  const nodesRef = useRef(useWorkflowStore.getState().nodes);
  const edgesRef = useRef(useWorkflowStore.getState().edges);
  const apiKeysRef = useRef(useSettingsStore.getState().apiKeys);
  
  // Subscribe to store changes
  useWorkflowStore.subscribe((state) => {
    nodesRef.current = state.nodes;
    edgesRef.current = state.edges;
  });
  
  useSettingsStore.subscribe((state) => {
    apiKeysRef.current = state.apiKeys;
  });

  const runWorkflow = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const apiKeys = apiKeysRef.current;
    const updateNodeData = useWorkflowStore.getState().updateNodeData;

    // Batch reset all nodes
    nodes.forEach((node) => {
      if (node.type === 'aiNode') {
        updateNodeData(node.id, { isRunning: false, hasOutput: false, output: undefined });
      } else if (node.type === 'resultNode') {
        updateNodeData(node.id, { isLoading: false, result: undefined });
      }
    });

    const nodeOutputs = new Map<string, string>();

    try {
      await executeWorkflow(nodes, edges, {
        nodeOutputs,
        apiKeys,
        onNodeStart: (nodeId) => {
          const node = nodesRef.current.find((n) => n.id === nodeId);
          if (node?.type === 'aiNode') {
            updateNodeData(nodeId, { isRunning: true });
          } else if (node?.type === 'resultNode') {
            updateNodeData(nodeId, { isLoading: true });
          }
        },
        onNodeComplete: (nodeId, result) => {
          const node = nodesRef.current.find((n) => n.id === nodeId);
          if (node?.type === 'aiNode') {
            updateNodeData(nodeId, { 
              isRunning: false, 
              hasOutput: true, 
              output: result 
            });
          } else if (node?.type === 'resultNode') {
            updateNodeData(nodeId, { 
              isLoading: false, 
              result,
              timestamp: new Date().toLocaleTimeString()
            });
          }
        },
        onNodeError: (nodeId, error) => {
          const node = nodesRef.current.find((n) => n.id === nodeId);
          if (node?.type === 'aiNode') {
            updateNodeData(nodeId, { 
              isRunning: false, 
              hasOutput: false,
              output: `Error: ${error}`
            });
          } else if (node?.type === 'resultNode') {
            updateNodeData(nodeId, { 
              isLoading: false, 
              result: `Error: ${error}`
            });
          }
        },
      });
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, []);

  const runSingleNode = useCallback(async (nodeId: string) => {
    const nodes = nodesRef.current;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== 'aiNode' || isRunningRef.current) return;

    isRunningRef.current = true;
    setIsRunning(true);
    
    const edges = edgesRef.current;
    const apiKeys = apiKeysRef.current;
    const updateNodeData = useWorkflowStore.getState().updateNodeData;
    
    updateNodeData(nodeId, { isRunning: true, hasOutput: false });

    const nodeOutputs = new Map<string, string>();
    
    // Pre-populate outputs from nodes that already have results
    nodes.forEach((n) => {
      if (n.type === 'aiNode') {
        const data = n.data as NodeData;
        if (data.output) {
          nodeOutputs.set(n.id, data.output);
        }
      }
    });

    try {
      const result = await executeSingleNode(
        node as Node<NodeData>,
        edges,
        nodes,
        {
          nodeOutputs,
          apiKeys,
          onNodeStart: () => {
            updateNodeData(nodeId, { isRunning: true });
          },
          onNodeComplete: (_, result) => {
            updateNodeData(nodeId, { 
              isRunning: false, 
              hasOutput: true, 
              output: result 
            });
            
            // Also update connected Result nodes
            const connectedResults = edgesRef.current
              .filter((e) => e.source === nodeId)
              .map((e) => nodesRef.current.find((n) => n.id === e.target))
              .filter((n) => n?.type === 'resultNode');
            
            connectedResults.forEach((resultNode) => {
              if (resultNode) {
                updateNodeData(resultNode.id, {
                  result,
                  timestamp: new Date().toLocaleTimeString()
                });
              }
            });
          },
          onNodeError: (_, error) => {
            updateNodeData(nodeId, { 
              isRunning: false, 
              hasOutput: false,
              output: `Error: ${error}`
            });
          },
        }
      );

      return result;
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, []);

  return { runWorkflow, runSingleNode, isRunning };
}
