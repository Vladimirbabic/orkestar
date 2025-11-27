'use client';

import { useState, useCallback } from 'react';
import { useWorkflowStore, NodeData, ResultNodeData } from '@/store/workflowStore';
import { useSettingsStore } from '@/store/settingsStore';
import { executeWorkflow, executeSingleNode } from '@/lib/workflowExecutor';
import { Node } from '@xyflow/react';

export function useWorkflowRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const { nodes, edges, updateNodeData } = useWorkflowStore();
  const { apiKeys } = useSettingsStore();

  const runWorkflow = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);

    // Reset all nodes - use batch update to prevent multiple re-renders
    const updates: Array<{ id: string; data: Partial<NodeData | ResultNodeData> }> = [];
    nodes.forEach((node) => {
      if (node.type === 'aiNode') {
        updates.push({ id: node.id, data: { isRunning: false, hasOutput: false, output: undefined } });
      } else if (node.type === 'resultNode') {
        updates.push({ id: node.id, data: { isLoading: false, result: undefined } });
      }
    });
    // Apply all updates at once
    updates.forEach(({ id, data }) => updateNodeData(id, data));

    const nodeOutputs = new Map<string, string>();

    await executeWorkflow(nodes, edges, {
      nodeOutputs,
      apiKeys,
      onNodeStart: (nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node?.type === 'aiNode') {
          updateNodeData(nodeId, { isRunning: true });
        } else if (node?.type === 'resultNode') {
          updateNodeData(nodeId, { isLoading: true });
        }
      },
      onNodeComplete: (nodeId, result) => {
        const node = nodes.find((n) => n.id === nodeId);
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
        const node = nodes.find((n) => n.id === nodeId);
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

    setIsRunning(false);
  }, [nodes, edges, apiKeys, updateNodeData, isRunning]);

  const runSingleNode = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== 'aiNode' || isRunning) return;

    setIsRunning(true);
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
          const connectedResults = edges
            .filter((e) => e.source === nodeId)
            .map((e) => nodes.find((n) => n.id === e.target))
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

    setIsRunning(false);
    return result;
  }, [nodes, edges, apiKeys, updateNodeData, isRunning]);

  return { runWorkflow, runSingleNode, isRunning };
}





