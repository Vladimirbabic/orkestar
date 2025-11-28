import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables must be set - no fallback credentials in code
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to get current user ID
// For now, using localStorage-based user ID (can be upgraded to proper auth later)
export async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === 'undefined') {
    // Server-side: try to get from request headers or use a default
    return null;
  }
  
  // Get or create a user ID from localStorage
  let userId = localStorage.getItem('workflow_user_id');
  if (!userId) {
    // Generate a new user ID
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('workflow_user_id', userId);
  }
  return userId;
}

// Client-side helper
export function getCurrentUserIdSync(): string | null {
  if (typeof window === 'undefined') return null;
  let userId = localStorage.getItem('workflow_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('workflow_user_id', userId);
  }
  return userId;
}

// Simple obfuscation helpers (for client-side storage)
// WARNING: This is NOT secure encryption - keys are stored locally only
// For production with sensitive data, implement server-side key management
export function obfuscateKey(key: string): string {
  // Reverse and base64 encode - just to prevent casual viewing
  const reversed = key.split('').reverse().join('');
  return btoa(reversed);
}

export function deobfuscateKey(obfuscated: string): string {
  try {
    const decoded = atob(obfuscated);
    return decoded.split('').reverse().join('');
  } catch {
    return '';
  }
}

