import { APIKeys } from '@/store/settingsStore';
import { getCurrentUserIdSync } from './supabase';

// Get headers with user ID
function getHeaders(): HeadersInit {
  const userId = getCurrentUserIdSync();
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId || '',
  };
}

// Load API keys from Supabase
export async function loadApiKeys(): Promise<APIKeys> {
  const response = await fetch('/api/api-keys', {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    // If no keys found, return empty object
    if (response.status === 400 || response.status === 404) {
      return {};
    }
    throw new Error('Failed to load API keys');
  }

  const data = await response.json();
  return data.apiKeys || {};
}

// Save API keys to Supabase
export async function saveApiKeys(apiKeys: APIKeys): Promise<void> {
  const response = await fetch('/api/api-keys', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ apiKeys }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save API keys');
  }
}

// Delete an API key
export async function deleteApiKey(model: string): Promise<void> {
  const response = await fetch(`/api/api-keys?model=${model}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete API key');
  }
}





