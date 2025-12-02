'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useWorkflowRunner } from '@/hooks/useWorkflowRunner';

interface WorkflowRunnerContextType {
  runWorkflow: () => Promise<void>;
  runSingleNode: (nodeId: string) => Promise<string | null | undefined>;
  isRunning: boolean;
}

const WorkflowRunnerContext = createContext<WorkflowRunnerContextType | null>(null);

export function WorkflowRunnerProvider({ children }: { children: ReactNode }) {
  const workflowRunner = useWorkflowRunner();

  return (
    <WorkflowRunnerContext.Provider value={workflowRunner}>
      {children}
    </WorkflowRunnerContext.Provider>
  );
}

export function useWorkflowRunnerContext() {
  const context = useContext(WorkflowRunnerContext);
  if (!context) {
    throw new Error('useWorkflowRunnerContext must be used within a WorkflowRunnerProvider');
  }
  return context;
}














