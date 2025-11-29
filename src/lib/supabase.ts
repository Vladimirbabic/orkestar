import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient, User } from '@supabase/supabase-js';

// Environment variables must be set - no fallback credentials in code
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

// Use browser client from @supabase/ssr for proper cookie handling
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================================================
// Authentication Functions
// ============================================================================

export async function signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Database not configured' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Database not configured' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signOut(): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Database not configured' };
  }

  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================================================
// User ID Helpers (now using Supabase Auth)
// ============================================================================

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

export function getCurrentUserIdSync(): string | null {
  // For sync operations, we need to rely on cached user data
  // This is used for API headers - the actual auth check happens server-side
  if (typeof window === 'undefined') return null;
  
  // Try to get from localStorage cache (set by AuthContext)
  const cachedUserId = localStorage.getItem('supabase_user_id');
  return cachedUserId;
}

// ============================================================================
// Key Obfuscation (for client-side storage)
// ============================================================================

export function obfuscateKey(key: string): string {
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
