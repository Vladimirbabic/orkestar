import { getCurrentUserIdSync } from './supabase';

export interface Context {
  id: string;
  name: string;
  content: string; // The context text/content
  system_prompt?: string;
  temperature?: number;
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

// List all contexts
export async function listContexts(): Promise<Context[]> {
  const response = await fetch('/api/contexts', {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch contexts');
  }

  const data = await response.json();
  return data.contexts || [];
}

// Save a context
export async function saveContext(
  name: string,
  content: string,
  systemPrompt?: string,
  temperature?: number,
  id?: string
): Promise<Context> {
  const url = '/api/contexts';
  const method = id ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify({
      id,
      name,
      content,
      system_prompt: systemPrompt,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `HTTP ${response.status}: Failed to save context`;
    console.error('Context save error:', errorData);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.context;
}

// Load a context
export async function loadContext(id: string): Promise<Context | null> {
  const contexts = await listContexts();
  return contexts.find((c) => c.id === id) || null;
}

// Delete a context
export async function deleteContext(id: string): Promise<void> {
  const response = await fetch(`/api/contexts?id=${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete context');
  }
}

