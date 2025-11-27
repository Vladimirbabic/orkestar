import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ivhrdgvmkxwmmsoerlci.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aHJkZ3Zta3h3bW1zb2VybGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTcyODgsImV4cCI6MjA3ODUzMzI4OH0.UTV2q5S-OmUA9lrmvKKYdU1lZJB8j6aGQ3kNAJtlZJE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Simple encryption/decryption helpers (for client-side)
// Note: In production, you might want to use server-side encryption
export function encryptKey(key: string): string {
  // Simple base64 encoding for now - in production, use proper encryption
  return btoa(key);
}

export function decryptKey(encrypted: string): string {
  // Simple base64 decoding for now - in production, use proper decryption
  try {
    return atob(encrypted);
  } catch {
    return '';
  }
}

