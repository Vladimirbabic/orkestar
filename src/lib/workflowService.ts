import { Node, Edge } from '@xyflow/react';
import { getCurrentUserIdSync } from './supabase';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

// Get headers with user ID
function getHeaders(): HeadersInit {
  const userId = getCurrentUserIdSync();
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId || '',
  };
}

// List all workflows
export async function listWorkflows(): Promise<Workflow[]> {
  const response = await fetch('/api/workflows', {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch workflows');
  }

  const data = await response.json();
  return data.workflows || [];
}

// Save a workflow
export async function saveWorkflow(
  name: string,
  nodes: Node[],
  edges: Edge[],
  description?: string,
  id?: string
): Promise<Workflow> {
  const url = id ? '/api/workflows' : '/api/workflows';
  const method = id ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify({
      id,
      name,
      description,
      nodes,
      edges,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save workflow');
  }

  const data = await response.json();
  return data.workflow;
}

// Load a workflow
export async function loadWorkflow(id: string): Promise<Workflow | null> {
  const workflows = await listWorkflows();
  return workflows.find((w) => w.id === id) || null;
}

// Delete a workflow
export async function deleteWorkflow(id: string): Promise<void> {
  const response = await fetch(`/api/workflows?id=${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete workflow');
  }
}





