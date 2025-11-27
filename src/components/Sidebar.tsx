'use client';

import { useState, useEffect } from 'react';
import { AIModel, useWorkflowStore } from '@/store/workflowStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  Sparkles,
  Bot,
  Zap,
  Image as ImageIcon,
  Palette,
  Settings,
  Plus,
  Workflow,
  ChevronDown,
  Search,
  Layers,
  Key,
  FileOutput,
  Banana,
  Volume2,
  Database,
} from 'lucide-react';

interface ModelOption {
  id: AIModel;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  category: 'text' | 'image';
}

const allModelOptions: ModelOption[] = [
  {
    id: 'openai',
    label: 'GPT-5.1',
    description: 'OpenAI latest model',
    icon: <Sparkles className="w-4 h-4" />,
    iconColor: 'text-emerald-500',
    category: 'text',
  },
  {
    id: 'gemini',
    label: 'Gemini 2.0',
    description: 'Google DeepMind (Text & Image)',
    icon: <Zap className="w-4 h-4" />,
    iconColor: 'text-blue-500',
    category: 'text',
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    description: 'Voice synthesis',
    icon: <Volume2 className="w-4 h-4" />,
    iconColor: 'text-purple-500',
    category: 'text',
  },
  {
    id: 'stable-diffusion',
    label: 'Stable Diffusion',
    description: 'Image generation',
    icon: <ImageIcon className="w-4 h-4" />,
    iconColor: 'text-violet-500',
    category: 'image',
  },
  {
    id: 'custom',
    label: 'Custom API',
    description: 'Your own endpoint',
    icon: <Settings className="w-4 h-4" />,
    iconColor: 'text-zinc-400',
    category: 'text',
  },
  {
    id: 'supadata',
    label: 'Supadata',
    description: 'Web content extraction',
    icon: <Database className="w-4 h-4" />,
    iconColor: 'text-green-500',
    category: 'text',
  },
];

export default function Sidebar() {
  const { addNode, addResultNode } = useWorkflowStore();
  const { hasApiKey, openSettings } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    text: true,
    image: true,
    output: true,
  });

  // Only check API keys after component mounts to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter models to only show those with API keys (only after mount)
  const enabledModels = isMounted 
    ? allModelOptions.filter((model) => hasApiKey(model.id))
    : [];

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (model: AIModel) => {
    addNode(model, { x: 400, y: 300 });
  };

  const handleAddResultNode = () => {
    addResultNode({ x: 600, y: 300 });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const filteredModels = enabledModels.filter(
    (model) =>
      model.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const textModels = filteredModels.filter((m) => m.category === 'text');
  const imageModels = filteredModels.filter((m) => m.category === 'image');

  const hasAnyModels = enabledModels.length > 0;

  return (
    <div className="w-64 h-full bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
            <Workflow className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">Flow Builder</h1>
            <p className="text-xs text-zinc-500">Chain AI models</p>
          </div>
        </div>
      </div>

      {!isMounted ? (
        /* Show loading state during hydration to match server render */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Key className="w-5 h-5 text-zinc-500" />
          </div>
          <h3 className="text-sm font-medium text-zinc-200 mb-1">Loading...</h3>
        </div>
      ) : hasAnyModels ? (
        <>
          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Models List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
            {/* Text Models */}
            {textModels.length > 0 && (
              <div>
                <button
                  onClick={() => toggleCategory('text')}
                  className="flex items-center gap-2 w-full text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-400 transition-colors px-1"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      expandedCategories.text ? '' : '-rotate-90'
                    }`}
                  />
                  <Layers className="w-3 h-3" />
                  Text Models
                </button>
                {expandedCategories.text && (
                  <div className="space-y-1">
                    {textModels.map((model) => (
                      <div
                        key={model.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, model.id)}
                        onClick={() => handleAddNode(model.id)}
                        className="group flex items-center gap-3 p-2.5 rounded-md cursor-grab bg-zinc-900/50 border border-transparent hover:border-zinc-800 hover:bg-zinc-900 active:cursor-grabbing transition-all"
                      >
                        <div className={`${model.iconColor}`}>
                          {model.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-zinc-200">{model.label}</h3>
                          <p className="text-xs text-zinc-500">{model.description}</p>
                        </div>
                        <Plus className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Image Models */}
            {imageModels.length > 0 && (
              <div>
                <button
                  onClick={() => toggleCategory('image')}
                  className="flex items-center gap-2 w-full text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-400 transition-colors px-1"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      expandedCategories.image ? '' : '-rotate-90'
                    }`}
                  />
                  <ImageIcon className="w-3 h-3" />
                  Image Models
                </button>
                {expandedCategories.image && (
                  <div className="space-y-1">
                    {imageModels.map((model) => (
                      <div
                        key={model.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, model.id)}
                        onClick={() => handleAddNode(model.id)}
                        className="group flex items-center gap-3 p-2.5 rounded-md cursor-grab bg-zinc-900/50 border border-transparent hover:border-zinc-800 hover:bg-zinc-900 active:cursor-grabbing transition-all"
                      >
                        <div className={`${model.iconColor}`}>
                          {model.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-zinc-200">{model.label}</h3>
                          <p className="text-xs text-zinc-500">{model.description}</p>
                        </div>
                        <Plus className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Output Nodes */}
            <div>
              <button
                onClick={() => toggleCategory('output')}
                className="flex items-center gap-2 w-full text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-400 transition-colors px-1"
              >
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    expandedCategories.output ? '' : '-rotate-90'
                  }`}
                />
                <FileOutput className="w-3 h-3" />
                Output
              </button>
              {expandedCategories.output && (
                <div className="space-y-1">
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'result')}
                    onClick={handleAddResultNode}
                    className="group flex items-center gap-3 p-2.5 rounded-md cursor-grab bg-zinc-900/50 border border-transparent hover:border-emerald-800/50 hover:bg-emerald-950/20 active:cursor-grabbing transition-all"
                  >
                    <div className="text-emerald-500">
                      <FileOutput className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-zinc-200">Result</h3>
                      <p className="text-xs text-zinc-500">Display AI output</p>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Empty state when no API keys configured */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Key className="w-5 h-5 text-zinc-500" />
          </div>
          <h3 className="text-sm font-medium text-zinc-200 mb-1">No models configured</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Add your API keys to start building workflows
          </p>
          <button
            onClick={openSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            <Key className="w-4 h-4" />
            Add API Keys
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        <button 
          onClick={openSettings}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm hover:bg-zinc-800 hover:text-zinc-300 transition-all"
        >
          <Key className="w-4 h-4" />
          {isMounted && hasAnyModels ? 'Manage API Keys' : 'Configure Models'}
        </button>
      </div>
    </div>
  );
}
