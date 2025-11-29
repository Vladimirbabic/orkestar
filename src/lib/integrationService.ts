import { supabase } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export type IntegrationProvider = 'google' | 'slack' | 'notion';

export interface IntegrationStatus {
  connected: boolean;
  provider: IntegrationProvider;
  providerEmail?: string | null;
  providerData?: Record<string, unknown> | null;
  connectedAt?: string;
}

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  provider_user_id?: string | null;
  provider_email?: string | null;
  provider_data?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Get the status of a user's integration with a provider
 */
export async function getIntegrationStatus(
  userId: string,
  provider: IntegrationProvider,
  client?: SupabaseClient
): Promise<IntegrationStatus> {
  const db = client || supabase;
  if (!db) {
    return { connected: false, provider };
  }
  
  const { data, error } = await db
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) {
    return {
      connected: false,
      provider,
    };
  }

  return {
    connected: true,
    provider,
    providerEmail: data.provider_email,
    providerData: data.provider_data,
    connectedAt: data.created_at,
  };
}

/**
 * Get all integration statuses for a user
 */
export async function getAllIntegrationStatuses(
  userId: string,
  client?: SupabaseClient
): Promise<Record<IntegrationProvider, IntegrationStatus>> {
  const statuses: Record<IntegrationProvider, IntegrationStatus> = {
    google: { connected: false, provider: 'google' },
    slack: { connected: false, provider: 'slack' },
    notion: { connected: false, provider: 'notion' },
  };

  const db = client || supabase;
  if (!db) {
    return statuses;
  }
  
  const { data, error } = await db
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) {
    return statuses;
  }

  for (const integration of data) {
    const provider = integration.provider as IntegrationProvider;
    if (provider in statuses) {
      statuses[provider] = {
        connected: true,
        provider,
        providerEmail: integration.provider_email,
        providerData: integration.provider_data,
        connectedAt: integration.created_at,
      };
    }
  }

  return statuses;
}

/**
 * Get a valid access token for a provider, refreshing if needed (for Google)
 */
export async function getAccessToken(
  userId: string,
  provider: IntegrationProvider,
  client?: SupabaseClient
): Promise<string | null> {
  const db = client || supabase;
  if (!db) {
    return null;
  }
  
  const { data, error } = await db
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if token needs refresh (for Google only)
  if (provider === 'google' && data.token_expires_at && data.refresh_token) {
    const expiresAt = new Date(data.token_expires_at);
    const now = new Date();
    
    // Refresh if token expires in less than 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      const newToken = await refreshGoogleToken(userId, data.refresh_token, db);
      if (newToken) {
        return newToken;
      }
    }
  }

  return data.access_token;
}

/**
 * Refresh a Google access token
 */
async function refreshGoogleToken(
  userId: string,
  refreshToken: string,
  client?: SupabaseClient
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Google OAuth credentials not configured');
    return null;
  }

  const db = client || supabase;
  if (!db) {
    return null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token');
      return null;
    }

    const data = await response.json();
    
    // Update the stored token
    await db
      .from('user_integrations')
      .update({
        access_token: data.access_token,
        token_expires_at: data.expires_in 
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      })
      .eq('user_id', userId)
      .eq('provider', 'google');

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

/**
 * Disconnect a user's integration with a provider
 */
export async function disconnectIntegration(
  userId: string,
  provider: IntegrationProvider,
  client?: SupabaseClient
): Promise<boolean> {
  const db = client || supabase;
  if (!db) {
    return false;
  }
  
  const { error } = await db
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    console.error(`Error disconnecting ${provider}:`, error);
    return false;
  }

  return true;
}

/**
 * Get full integration record (for internal use)
 */
export async function getIntegration(
  userId: string,
  provider: IntegrationProvider,
  client?: SupabaseClient
): Promise<Integration | null> {
  const db = client || supabase;
  if (!db) {
    return null;
  }
  
  const { data, error } = await db
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Integration;
}
