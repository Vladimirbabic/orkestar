'use client';

import { AIModel, useWorkflowStore } from '@/store/workflowStore';
import {
  X,
  Trash2,
  Copy,
  Play,
  Sparkles,
  Bot,
  Zap,
  Image as ImageIcon,
  Palette,
  Settings,
  Sliders,
  MessageSquare,
  FileText,
  Volume2,
  Database,
} from 'lucide-react';

const modelIcons: Record<AIModel, React.ReactNode> = {
  openai: <Sparkles className="w-4 h-4" />,
  gemini: <Zap className="w-4 h-4" />,
  'stable-diffusion': <ImageIcon className="w-4 h-4" />,
  elevenlabs: <Volume2 className="w-4 h-4" />,
  custom: <Settings className="w-4 h-4" />,
  supadata: <Database className="w-4 h-4" />,
};

const modelLabels: Record<AIModel, string> = {
  openai: 'OpenAI GPT-5.1',
  gemini: 'Google Gemini',
  'stable-diffusion': 'Stable Diffusion',
  elevenlabs: 'ElevenLabs',
  custom: 'Custom API',
  supadata: 'Supadata',
};

const modelIconColors: Record<AIModel, string> = {
  openai: 'text-emerald-500',
  gemini: 'text-blue-500',
  'stable-diffusion': 'text-violet-500',
  elevenlabs: 'text-purple-500',
  custom: 'text-zinc-400',
  supadata: 'text-green-500',
};

export default function NodeDetails() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);

  if (!selectedNode) return null;

  // Only show details for AI nodes, not result nodes
  if (selectedNode.type !== 'aiNode') return null;

  const { data } = selectedNode;
  
  // Type guard to ensure data.model is a valid AIModel
  if (!('model' in data) || typeof data.model !== 'string') {
    return null;
  }
  
  const model = data.model as AIModel;

  const handleUpdate = (field: string, value: string | number) => {
    updateNodeData(selectedNode.id, { [field]: value });
  };

  const handleDelete = () => {
    deleteNode(selectedNode.id);
  };

  const handleDuplicate = () => {
    duplicateNode(selectedNode.id);
  };

  return (
    <div className="w-80 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className={`${modelIconColors[model]}`}>
            {modelIcons[model]}
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">{data.label}</h2>
            <p className="text-xs text-zinc-500">{modelLabels[model]}</p>
          </div>
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <FileText className="w-3.5 h-3.5" />
            Node Name
          </label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => handleUpdate('label', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <MessageSquare className="w-3.5 h-3.5" />
            Description
          </label>
          <input
            type="text"
            value={data.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="Describe what this step does..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all"
          />
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Sparkles className="w-3.5 h-3.5" />
            Prompt Template
          </label>
          <textarea
            value={data.prompt || ''}
            onChange={(e) => handleUpdate('prompt', e.target.value)}
            placeholder="Use {{input}} to reference data from connected nodes..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all resize-none font-mono text-[13px]"
          />
          <p className="text-xs text-zinc-500">
            Use <code className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">{'{{input}}'}</code> to inject data from connected nodes
          </p>
        </div>

        {/* System Prompt */}
        {model !== 'stable-diffusion' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Settings className="w-3.5 h-3.5" />
              System Prompt
            </label>
            <textarea
              value={data.systemPrompt || ''}
              onChange={(e) => handleUpdate('systemPrompt', e.target.value)}
              placeholder="Set the AI's behavior and context..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all resize-none"
            />
          </div>
        )}

        {/* Temperature */}
        {model !== 'stable-diffusion' && (
          <div className="space-y-3">
            <label className="flex items-center justify-between text-xs font-medium text-zinc-400">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                Temperature
              </span>
              <span className="text-zinc-300 tabular-nums">{data.temperature ?? 0.7}</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={data.temperature ?? 0.7}
              onChange={(e) => handleUpdate('temperature', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-100 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
            />
            <div className="flex justify-between text-[11px] text-zinc-600">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        )}

        {/* Model Selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Bot className="w-3.5 h-3.5" />
            AI Model
          </label>
          <select
            value={model}
            onChange={(e) => handleUpdate('model', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all appearance-none cursor-pointer"
          >
            <option value="openai" className="bg-zinc-900">OpenAI GPT-5.1</option>
            <option value="gemini" className="bg-zinc-900">Google Gemini</option>
            <option value="stable-diffusion" className="bg-zinc-900">Stable Diffusion</option>
            <option value="elevenlabs" className="bg-zinc-900">ElevenLabs</option>
            <option value="custom" className="bg-zinc-900">Custom API</option>
            <option value="supadata" className="bg-zinc-900">Supadata</option>
          </select>
        </div>

        {/* Output Preview */}
        {data.output && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              Output Preview
            </label>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-md">
              <p className="text-xs text-zinc-400 font-mono line-clamp-4">{data.output}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-zinc-800 space-y-3">
        <button className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-md bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors">
          <Play className="w-4 h-4" />
          Run This Node
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-zinc-900 border border-red-900/50 text-red-400 text-sm hover:bg-red-950 hover:border-red-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
