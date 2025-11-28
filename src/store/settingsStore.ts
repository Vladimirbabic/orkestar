import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModel } from './workflowStore';
import { saveApiKeys, loadApiKeys as loadApiKeysFromDB } from '@/lib/apiKeyService';

export interface APIKeys {
  openai?: string;
  gemini?: string;
  'stable-diffusion'?: string;
  elevenlabs?: string;
  custom?: string;
  supadata?: string;
}

interface SettingsState {
  apiKeys: APIKeys;
  isSettingsOpen: boolean;
  setApiKey: (model: AIModel, key: string) => void;
  removeApiKey: (model: AIModel) => void;
  hasApiKey: (model: AIModel) => boolean;
  getEnabledModels: () => AIModel[];
  openSettings: () => void;
  closeSettings: () => void;
  syncApiKeysToSupabase: () => Promise<void>;
  loadApiKeysFromSupabase: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiKeys: {},
      isSettingsOpen: false,

      setApiKey: async (model, key) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [model]: key,
          },
        }));
        // Auto-sync to Supabase
        try {
          await saveApiKeys(get().apiKeys);
        } catch (error) {
          console.error('Failed to sync API key to Supabase:', error);
        }
      },

      removeApiKey: async (model) => {
        set((state) => {
          const newKeys = { ...state.apiKeys };
          delete newKeys[model];
          return { apiKeys: newKeys };
        });
        // Auto-sync to Supabase
        try {
          await saveApiKeys(get().apiKeys);
        } catch (error) {
          console.error('Failed to sync API key removal to Supabase:', error);
        }
      },

      hasApiKey: (model) => {
        const keys = get().apiKeys;
        return !!keys[model] && keys[model]!.length > 0;
      },

      getEnabledModels: () => {
        const keys = get().apiKeys;
        return (Object.keys(keys) as AIModel[]).filter(
          (model) => keys[model] && keys[model]!.length > 0
        );
      },

      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),

      syncApiKeysToSupabase: async () => {
        try {
          await saveApiKeys(get().apiKeys);
        } catch (error) {
          console.error('Failed to sync API keys to Supabase:', error);
          throw error;
        }
      },

      loadApiKeysFromSupabase: async () => {
        try {
          const keys = await loadApiKeysFromDB();
          set({ apiKeys: keys });
        } catch (error) {
          console.error('Failed to load API keys from Supabase:', error);
          // Don't throw - just log, keep local keys
        }
      },
    }),
    {
      name: 'workflow-settings',
    }
  )
);

