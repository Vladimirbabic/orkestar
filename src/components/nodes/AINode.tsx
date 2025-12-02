'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react';
import { NodeData, AIModel, SubModel, useWorkflowStore } from '@/store/workflowStore';
import { useWorkflowRunnerContext } from '@/context/WorkflowRunnerContext';
import { modelVariants, getDefaultSubModel, getSubModelLabel } from '@/lib/modelConfig';
import {
  Image as ImageIcon,
  Settings,
  Play,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ArrowLeftCircle,
  X,
  Copy,
  Upload,
  Trash2,
} from 'lucide-react';
import { BorderBeam } from '@/components/ui/registry/magicui/border-beam';
import {
  OpenAILogo,
  GeminiLogo,
  ElevenLabsLogo,
  SupadataLogo,
} from '@/components/icons/BrandLogos';

const modelIcons: Record<AIModel, React.ReactNode> = {
  openai: <OpenAILogo className="w-3.5 h-3.5" />,
  gemini: <GeminiLogo className="w-3.5 h-3.5" />,
  'stable-diffusion': <ImageIcon className="w-3.5 h-3.5" />,
  elevenlabs: <ElevenLabsLogo className="w-3.5 h-3.5" />,
  custom: <Settings className="w-3.5 h-3.5" />,
  supadata: <SupadataLogo className="w-3.5 h-3.5" />,
};

const modelLabels: Record<AIModel, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  'stable-diffusion': 'Stable Diffusion',
  elevenlabs: 'ElevenLabs',
  custom: 'Custom',
  supadata: 'Supadata',
};

const modelStyles: Record<AIModel, { icon: string; indicator: string; glow: string }> = {
  openai: { icon: 'text-emerald-500', indicator: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
  gemini: { icon: 'text-blue-500', indicator: 'bg-blue-500', glow: 'shadow-blue-500/50' },
  'stable-diffusion': { icon: 'text-violet-500', indicator: 'bg-violet-500', glow: 'shadow-violet-500/50' },
  elevenlabs: { icon: 'text-purple-500', indicator: 'bg-purple-500', glow: 'shadow-purple-500/50' },
  custom: { icon: 'text-zinc-400', indicator: 'bg-zinc-400', glow: 'shadow-zinc-400/50' },
  supadata: { icon: 'text-green-500', indicator: 'bg-green-500', glow: 'shadow-green-500/50' },
};

const allModels: AIModel[] = ['openai', 'gemini', 'stable-diffusion', 'elevenlabs', 'custom', 'supadata'];

const AINode = ({ data, selected, id, ...props }: NodeProps) => {
  const nodeData = data as unknown as NodeData;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const setSettingsNodeId = useWorkflowStore((state) => state.setSettingsNodeId);
  const { runSingleNode, isRunning: isWorkflowRunning } = useWorkflowRunnerContext();
  const edges = useEdges();
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isSubModelDropdownOpen, setIsSubModelDropdownOpen] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(nodeData.prompt || '');
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const subModelDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles = modelStyles[nodeData.model];
  const currentSubModel = nodeData.subModel || getDefaultSubModel(nodeData.model);
  const variants = modelVariants[nodeData.model] || [];
  
  // Check if this node has incoming connections
  const hasIncomingConnection = edges.some((edge) => edge.target === id);

  // Sync local state with data
  useEffect(() => {
    setLocalPrompt(nodeData.prompt || '');
  }, [nodeData.prompt]);

  // Initialize subModel if not set
  useEffect(() => {
    if (!nodeData.subModel) {
      const defaultSub = getDefaultSubModel(nodeData.model);
      updateNodeData(id, { subModel: defaultSub });
    }
  }, [nodeData.model, nodeData.subModel, id, updateNodeData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false);
      }
      if (subModelDropdownRef.current && !subModelDropdownRef.current.contains(event.target as Node)) {
        setIsSubModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea with cleanup
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [localPrompt]);

  const handleProviderChange = (model: AIModel) => {
    const defaultSub = getDefaultSubModel(model);
    updateNodeData(id, { 
      model, 
      subModel: defaultSub,
      label: getSubModelLabel(model, defaultSub)
    });
    setIsProviderDropdownOpen(false);
  };

  const handleSubModelChange = (subModel: SubModel) => {
    updateNodeData(id, { 
      subModel,
      label: getSubModelLabel(nodeData.model, subModel)
    });
    setIsSubModelDropdownOpen(false);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalPrompt(e.target.value);
  };

  const handlePromptBlur = () => {
    updateNodeData(id, { prompt: localPrompt });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imagePromises = Array.from(files).map((file) => {
      return new Promise<string>((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          reject(new Error('File must be an image'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Failed to read image'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises)
      .then((newImages) => {
        const currentImages = nodeData.images || [];
        updateNodeData(id, { images: [...currentImages, ...newImages] });
      })
      .catch((error) => {
        console.error('Error uploading images:', error);
      });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = nodeData.images || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    updateNodeData(id, { images: newImages.length > 0 ? newImages : undefined });
  };

  const handleRunNode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.isRunning || isWorkflowRunning) return;
    await runSingleNode(id);
  };

  const openSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsNodeId(id);
  };

  return (
    <div className="relative overflow-visible">
      <div
        className={`
          group relative w-[320px] rounded-xl
          overflow-visible
          transition-all duration-200
          ${nodeData.isRunning 
            ? 'border-0 bg-zinc-900' 
            : selected
              ? 'border-2 border-emerald-500/70 bg-zinc-900 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-zinc-950'
              : 'border-2 border-zinc-700/80 hover:border-zinc-500/80 bg-zinc-900 hover:shadow-lg hover:shadow-zinc-800/30'
          }
        `}
      >
      {/* BorderBeam for running state */}
      {nodeData.isRunning && (
        <BorderBeam 
          duration={8} 
          borderWidth={2}
          className="z-[1]"
        />
      )}
      
      {/* Content wrapper with overflow */}
      <div className="relative z-[2] overflow-visible rounded-xl">

      {/* Header with Provider Selector */}
      <div className="px-3 pt-3 pb-2">
        {/* Provider Dropdown */}
        <div ref={providerDropdownRef} className="relative z-[60]">
          <button
            onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
            className={`
              flex items-center gap-2 px-2.5 py-1.5 rounded-lg w-full
              bg-zinc-800/50 border border-zinc-700/50
              hover:bg-zinc-800 hover:border-zinc-600
              transition-all text-left
            `}
          >
            <span className={styles.icon}>{modelIcons[nodeData.model]}</span>
            <span className="text-xs font-medium text-zinc-200 flex-1">
              {modelLabels[nodeData.model]}
            </span>
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Provider Dropdown Menu */}
          {isProviderDropdownOpen && (
            <div 
              className="absolute top-full left-0 right-0 mt-1 py-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-[60] overflow-hidden max-h-64 overflow-y-auto" 
              style={{ position: 'absolute' }}
              onWheel={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {allModels.map((model) => (
                <button
                  key={model}
                  onClick={() => handleProviderChange(model)}
                  className={`
                    flex items-center gap-2 w-full px-3 py-2 text-left
                    hover:bg-zinc-700/50 transition-colors
                    ${nodeData.model === model ? 'bg-zinc-700/30' : ''}
                  `}
                >
                  <span className={modelStyles[model].icon}>{modelIcons[model]}</span>
                  <span className="text-sm text-zinc-200">{modelLabels[model]}</span>
                  {nodeData.model === model && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Textarea - Hidden for ElevenLabs */}
      {nodeData.model !== 'elevenlabs' && (
        <div className="px-3 pb-2">
          <textarea
            ref={textareaRef}
            value={localPrompt}
            onChange={handlePromptChange}
            onBlur={handlePromptBlur}
            placeholder={hasIncomingConnection 
              ? "What should I do with the input? (e.g., 'Summarize this', 'Translate to Spanish')"
              : "Write your prompt here..."
            }
            className={`
              w-full min-h-[70px] max-h-[120px] px-3 py-2.5 
              bg-zinc-950 border rounded-lg
              text-sm text-zinc-200 placeholder-zinc-600
              resize-none
              focus:outline-none focus:ring-1 transition-all
              ${hasIncomingConnection 
                ? 'border-blue-500/30 focus:border-blue-500/50 focus:ring-blue-500/30' 
                : 'border-zinc-800 focus:border-zinc-600 focus:ring-zinc-600'
              }
            `}
            onClick={(e) => e.stopPropagation()}
          />
          {hasIncomingConnection && (
            <p className="text-[10px] text-blue-400/70 mt-1 px-1">
              ℹ️ Input from connected node will be automatically included
            </p>
          )}
        </div>
      )}

      {/* Image Upload Section - Hidden for ElevenLabs, Stable Diffusion, and Supadata */}
      {nodeData.model !== 'elevenlabs' && nodeData.model !== 'stable-diffusion' && nodeData.model !== 'supadata' && (
        <div className="px-3 pb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Upload Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className={`
              w-full flex items-center justify-center gap-2 px-3 py-2
              bg-zinc-950 border rounded-lg
              text-xs text-zinc-400 hover:text-zinc-200
              transition-all
              border-zinc-800 hover:border-zinc-700
              hover:bg-zinc-900
            `}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Images</span>
            {(nodeData.images && nodeData.images.length > 0) && (
              <span className="ml-auto text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">
                {nodeData.images.length}
              </span>
            )}
          </button>

          {/* Image Previews */}
          {nodeData.images && nodeData.images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2" style={{ contain: 'content' }}>
              {nodeData.images.map((image, index) => (
                <div
                  key={index}
                  className="relative group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 object-cover rounded-lg border border-zinc-800"
                    style={{ contentVisibility: 'auto' }}
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ElevenLabs info */}
      {nodeData.model === 'elevenlabs' && (
        <div className="px-3 pb-2">
          <p className="text-xs text-zinc-400">
            {nodeData.voiceId ? '🎤 Voice selected' : '⚙️ Configure voice in settings'}
          </p>
          {hasIncomingConnection ? (
            <p className="text-[10px] text-blue-400/70 mt-1">
              ℹ️ Will convert text from previous step to audio
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500 mt-1">
              Connect a node to convert its output to audio
            </p>
          )}
        </div>
      )}

      {/* Output Preview (if available) */}
      {nodeData.output && (
        <div className="px-3 pb-3">
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg max-h-[60px] overflow-y-auto">
            <p className="text-xs text-zinc-400 line-clamp-3">{nodeData.output}</p>
          </div>
        </div>
      )}

      {/* Footer with Model and Actions */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-zinc-800/50">
        {/* Sub-Model Dropdown */}
        {variants.length > 1 ? (
          <div ref={subModelDropdownRef} className="relative flex-1 z-[60]">
            <button
              onClick={() => setIsSubModelDropdownOpen(!isSubModelDropdownOpen)}
              className={`
                flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg
                bg-zinc-800/30 border border-zinc-700/30
                hover:bg-zinc-800/50 hover:border-zinc-600/50
                transition-all text-left
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Model:</span>
                <span className="text-xs font-medium text-zinc-200">
                  {getSubModelLabel(nodeData.model, currentSubModel)}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isSubModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Sub-Model Dropdown Menu */}
            {isSubModelDropdownOpen && (
              <div 
                className="absolute top-full left-0 right-0 mt-1 py-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-[60] overflow-hidden max-h-48 overflow-y-auto" 
                style={{ position: 'absolute' }}
                onWheel={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => handleSubModelChange(variant.id)}
                    className={`
                      flex flex-col w-full px-3 py-2 text-left
                      hover:bg-zinc-700/50 transition-colors
                      ${currentSubModel === variant.id ? 'bg-zinc-700/30' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-200">{variant.label}</span>
                      {currentSubModel === variant.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                    {variant.description && (
                      <span className="text-xs text-zinc-500 mt-0.5">{variant.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Duplicate button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
            title="Duplicate node"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Settings button */}
          <button 
            onClick={openSettings}
            className="p-1.5 rounded-lg transition-colors hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
            title="Node settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Play button */}
          <button
            onClick={handleRunNode}
            disabled={nodeData.isRunning || isWorkflowRunning}
            className={`
              p-1.5 rounded-lg transition-colors
              ${nodeData.isRunning || isWorkflowRunning
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'hover:bg-zinc-700 text-zinc-500 hover:text-emerald-400'
              }
            `}
            title="Run node"
          >
            {nodeData.isRunning ? (
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            ) : nodeData.hasOutput ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-4 !h-4 !border-2 !transition-all !z-50 hover:!scale-125 ${
          hasIncomingConnection 
            ? '!bg-blue-500 !border-blue-400' 
            : '!bg-zinc-700 !border-zinc-500 hover:!bg-emerald-500 hover:!border-emerald-400'
        }`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-zinc-700 !border-2 !border-zinc-500 hover:!bg-emerald-500 hover:!border-emerald-400 !transition-all !z-50 hover:!scale-125"
      />
    </div>

    {/* Status below card */}
    <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-zinc-500 mt-1 w-[320px]">
      <span className="flex items-center gap-1.5">
        {hasIncomingConnection && (
          <span className="px-1.5 py-0.5 bg-blue-500 border border-blue-400 rounded-full flex items-center gap-1 text-[10px] text-blue-100">
            <ArrowLeftCircle className="w-3 h-3" />
            Has input
          </span>
        )}
        {nodeData.contextId && (
          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px]">
            Context
          </span>
        )}
        {nodeData.systemPrompt && !nodeData.contextId && (
          <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">
            System
          </span>
        )}
        <span>Temp: {nodeData.temperature?.toFixed(1) || '0.7'}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${nodeData.isRunning ? 'bg-yellow-500 animate-pulse' : nodeData.hasOutput ? 'bg-emerald-500' : styles.indicator}`} />
        <span>{nodeData.isRunning ? 'Running...' : nodeData.hasOutput ? 'Complete' : 'Ready'}</span>
      </span>
    </div>
    </div>
  );
};

export default memo(AINode);
