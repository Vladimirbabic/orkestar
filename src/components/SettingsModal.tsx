'use client';

import { useState } from 'react';
import { useSettingsStore, APIKeys } from '@/store/settingsStore';
import { AIModel } from '@/store/workflowStore';
import {
  X,
  Key,
  Sparkles,
  Bot,
  Zap,
  Image as ImageIcon,
  Palette,
  Settings,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  AlertCircle,
  Banana,
  Volume2,
  Database,
} from 'lucide-react';

interface ModelConfig {
  id: AIModel;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  docsUrl: string;
  placeholder: string;
}

const modelConfigs: ModelConfig[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-5.1',
    icon: <Sparkles className="w-4 h-4" />,
    iconColor: 'text-emerald-500',
    docsUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
  },
  {
    id: 'gemini',
    label: 'Google AI',
    description: 'Gemini (Text & Nano Banana Image)',
    icon: <Zap className="w-4 h-4" />,
    iconColor: 'text-blue-500',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AI...',
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    description: 'Voice synthesis API',
    icon: <Volume2 className="w-4 h-4" />,
    iconColor: 'text-purple-500',
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
    placeholder: 'sk-...',
  },
  {
    id: 'stable-diffusion',
    label: 'Stability AI',
    description: 'Stable Diffusion XL',
    icon: <ImageIcon className="w-4 h-4" />,
    iconColor: 'text-violet-500',
    docsUrl: 'https://platform.stability.ai/account/keys',
    placeholder: 'sk-...',
  },
  {
    id: 'custom',
    label: 'Custom API',
    description: 'Your own endpoint',
    icon: <Settings className="w-4 h-4" />,
    iconColor: 'text-zinc-400',
    docsUrl: '',
    placeholder: 'Enter your API key...',
  },
  {
    id: 'supadata',
    label: 'Supadata',
    description: 'Web content extraction API',
    icon: <Database className="w-4 h-4" />,
    iconColor: 'text-green-500',
    docsUrl: 'https://dash.supadata.ai',
    placeholder: 'sd_...',
  },
];

export default function SettingsModal() {
  const { apiKeys, isSettingsOpen, closeSettings, setApiKey, removeApiKey } = useSettingsStore();
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [editingKeys, setEditingKeys] = useState<APIKeys>({});

  if (!isSettingsOpen) return null;

  const toggleKeyVisibility = (model: AIModel) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [model]: !prev[model],
    }));
  };

  const handleKeyChange = (model: AIModel, value: string) => {
    setEditingKeys((prev) => ({
      ...prev,
      [model]: value,
    }));
  };

  const handleSaveKey = (model: AIModel) => {
    const key = editingKeys[model];
    if (key !== undefined) {
      if (key.length > 0) {
        setApiKey(model, key);
      } else {
        removeApiKey(model);
      }
      setEditingKeys((prev) => {
        const newKeys = { ...prev };
        delete newKeys[model];
        return newKeys;
      });
    }
  };

  const getDisplayValue = (model: AIModel) => {
    if (editingKeys[model] !== undefined) {
      return editingKeys[model];
    }
    return apiKeys[model] || '';
  };

  const isEditing = (model: AIModel) => {
    return editingKeys[model] !== undefined;
  };

  const hasChanges = (model: AIModel) => {
    const editing = editingKeys[model];
    const current = apiKeys[model] || '';
    return editing !== undefined && editing !== current;
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };

  const enabledCount = Object.values(apiKeys).filter((k) => k && k.length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeSettings}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
              <Key className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">API Keys</h2>
              <p className="text-xs text-zinc-500">
                {enabledCount} of {modelConfigs.length} models configured
              </p>
            </div>
          </div>
          <button
            onClick={closeSettings}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-4 mt-4 p-3 rounded-md bg-zinc-900 border border-zinc-800 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-zinc-400">
            API keys are securely saved to your account and will be available when you sign in on any device.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {modelConfigs.map((model) => {
            const currentValue = getDisplayValue(model.id);
            const isVisible = visibleKeys[model.id];
            const editing = isEditing(model.id);
            const changed = hasChanges(model.id);
            const hasKey = apiKeys[model.id] && apiKeys[model.id]!.length > 0;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-lg border transition-colors ${
                  hasKey 
                    ? 'bg-zinc-900/50 border-zinc-800' 
                    : 'bg-zinc-950 border-zinc-800/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`${model.iconColor}`}>
                      {model.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-zinc-100">{model.label}</h3>
                        {hasKey && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{model.description}</p>
                    </div>
                  </div>
                  {model.docsUrl && (
                    <a
                      href={model.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Get key
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isVisible || editing ? 'text' : 'password'}
                      value={editing ? currentValue : (isVisible ? currentValue : (hasKey ? maskApiKey(currentValue) : ''))}
                      onChange={(e) => handleKeyChange(model.id, e.target.value)}
                      onFocus={() => {
                        if (!editing) {
                          handleKeyChange(model.id, currentValue);
                        }
                      }}
                      placeholder={model.placeholder}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-3 pr-10 py-2 text-sm text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => toggleKeyVisibility(model.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {isVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {changed && (
                    <button
                      onClick={() => handleSaveKey(model.id)}
                      className="px-3 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={closeSettings}
            className="px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

