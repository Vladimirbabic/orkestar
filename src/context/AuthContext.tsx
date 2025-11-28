'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut, getCurrentUser } from '@/lib/supabase';
import { useSettingsStore } from '@/store/settingsStore';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Cache user ID for sync operations
        if (currentUser?.id) {
          localStorage.setItem('supabase_user_id', currentUser.id);
          // Load API keys from Supabase for this user
          await useSettingsStore.getState().loadApiKeysFromSupabase();
        } else {
          localStorage.removeItem('supabase_user_id');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const newUser = session?.user || null;
        setUser(newUser);
        
        if (newUser?.id) {
          localStorage.setItem('supabase_user_id', newUser.id);
          // Load API keys when user signs in
          await useSettingsStore.getState().loadApiKeysFromSupabase();
        } else {
          localStorage.removeItem('supabase_user_id');
          // Clear API keys when user signs out
          useSettingsStore.setState({ apiKeys: {} });
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: newUser, error } = await supabaseSignIn(email, password);
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('supabase_user_id', newUser.id);
    }
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { user: newUser, error } = await supabaseSignUp(email, password);
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('supabase_user_id', newUser.id);
    }
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabaseSignOut();
    setUser(null);
    localStorage.removeItem('supabase_user_id');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

