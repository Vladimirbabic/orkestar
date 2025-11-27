import { Node, Edge } from '@xyflow/react';
import { getCurrentUserIdSync } from './supabase';

export interface Session {
  id: string;
  workflow_id: string;
  name: string;
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

// List sessions for a workflow
export async function listSessions(workflowId?: string): Promise<Session[]> {
  const url = workflowId 
    ? `/api/sessions?workflow_id=${workflowId}`
    : '/api/sessions';

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }

  const data = await response.json();
  return data.sessions || [];
}

// Save a session
export async function saveSession(
  workflowId: string,
  name: string,
  nodes: Node[],
  edges: Edge[],
  id?: string
): Promise<Session> {
  const url = id ? '/api/sessions' : '/api/sessions';
  const method = id ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify({
      id,
      workflow_id: workflowId,
      name,
      nodes,
      edges,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save session');
  }

  const data = await response.json();
  return data.session;
}

// Load a session
export async function loadSession(id: string): Promise<Session | null> {
  const sessions = await listSessions();
  return sessions.find((s) => s.id === id) || null;
}

// Delete a session
export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`/api/sessions?id=${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
}





