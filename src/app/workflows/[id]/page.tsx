'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';
import NodeDetails from '@/components/NodeDetails';
import SettingsModal from '@/components/SettingsModal';
import AIWorkflowBuilder from '@/components/AIWorkflowBuilder';
import { useWorkflowStore } from '@/store/workflowStore';
import { WorkflowRunnerProvider } from '@/context/WorkflowRunnerContext';
import { loadWorkflow } from '@/lib/workflowService';

// Dynamic import to avoid SSR issues with React Flow
const WorkflowCanvas = dynamic(() => import('@/components/WorkflowCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-zinc-800 animate-pulse" />
        <p className="text-zinc-500 text-sm">Loading canvas...</p>
      </div>
    </div>
  ),
});

export default function WorkflowEditor() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { loadWorkflow: loadWorkflowToStore, setWorkflowName, clearWorkflow, currentWorkflowId } = useWorkflowStore();
  const selectedNode = useWorkflowStore((state) => state.selectedNode);

  useEffect(() => {
    let isCancelled = false;
    
    if (workflowId === 'new') {
      // New workflow - clear the store
      clearWorkflow();
      useWorkflowStore.setState({ currentWorkflowId: null });
    } else {
      // Load existing workflow
      loadWorkflow(workflowId)
        .then((workflow) => {
          if (!isCancelled) {
            if (workflow) {
              loadWorkflowToStore(workflow.nodes, workflow.edges);
              setWorkflowName(workflow.name);
              useWorkflowStore.setState({ currentWorkflowId: workflow.id });
            } else {
              // Workflow not found, redirect to workflows page
              router.push('/');
            }
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            console.error('Failed to load workflow:', error);
            router.push('/');
          }
        });
    }
    
    return () => {
      isCancelled = true;
    };
  }, [workflowId, loadWorkflowToStore, setWorkflowName, clearWorkflow, router]);

  return (
    <WorkflowRunnerProvider>
      <main className="h-screen w-screen overflow-hidden bg-zinc-950 flex flex-col">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <WorkflowCanvas />
          {selectedNode && <NodeDetails />}
        </div>
        <SettingsModal />
        <AIWorkflowBuilder />
      </main>
    </WorkflowRunnerProvider>
  );
}

