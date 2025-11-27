'use client';

import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react';
import { NodeData, AIModel, SubModel, useWorkflowStore } from '@/store/workflowStore';
import { useWorkflowRunnerContext } from '@/context/WorkflowRunnerContext';
import { modelVariants, getDefaultSubModel, getSubModelLabel } from '@/lib/modelConfig';
import { listContexts, type Context } from '@/lib/contextService';
import {
  Sparkles,
  Bot,
  Zap,
  Image as ImageIcon,
  Palette,
  Settings,
  Play,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ArrowLeftCircle,
  X,
  Banana,
  Volume2,
  Copy,
  Database,
} from 'lucide-react';
import { BorderBeam } from '@/components/ui/registry/magicui/border-beam';

const modelIcons: Record<AIModel, React.ReactNode> = {
  openai: <Sparkles className="w-3.5 h-3.5" />,
  gemini: <Zap className="w-3.5 h-3.5" />,
  'stable-diffusion': <ImageIcon className="w-3.5 h-3.5" />,
  elevenlabs: <Volume2 className="w-3.5 h-3.5" />,
  custom: <Settings className="w-3.5 h-3.5" />,
  supadata: <Database className="w-3.5 h-3.5" />,
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

interface AINodeProps {
  id: string;
  data: NodeData;
  selected?: boolean;
}

const AINode = ({ data, selected, id }: AINodeProps) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);
  const { runSingleNode, isRunning: isWorkflowRunning } = useWorkflowRunnerContext();
  const edges = useEdges();
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isSubModelDropdownOpen, setIsSubModelDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(data.prompt || '');
  const [localSystemPrompt, setLocalSystemPrompt] = useState(data.systemPrompt || '');
  const [localTemperature, setLocalTemperature] = useState(data.temperature || 0.7);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoadingContexts, setIsLoadingContexts] = useState(false);
  const [voices, setVoices] = useState<Array<{ voice_id: string; name: string }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const subModelDropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const styles = modelStyles[data.model];
  const currentSubModel = data.subModel || getDefaultSubModel(data.model);
  const variants = modelVariants[data.model] || [];
  
  // Check if this node has incoming connections
  const hasIncomingConnection = edges.some((edge) => edge.target === id);

  // Sync local state with data
  useEffect(() => {
    setLocalPrompt(data.prompt || '');
  }, [data.prompt]);

  useEffect(() => {
    setLocalSystemPrompt(data.systemPrompt || '');
  }, [data.systemPrompt]);

  useEffect(() => {
    setLocalTemperature(data.temperature || 0.7);
  }, [data.temperature]);

  // Load contexts when component mounts if contextId is set
  useEffect(() => {
    if (data.contextId && contexts.length === 0) {
      const abortController = new AbortController();
      let isCancelled = false;
      
      listContexts()
        .then((loadedContexts) => {
          if (!isCancelled && !abortController.signal.aborted) {
            setContexts(loadedContexts);
          }
        })
        .catch((error) => {
          if (!isCancelled && !abortController.signal.aborted) {
            console.error('Failed to load contexts:', error);
          }
        });
      
      return () => {
        isCancelled = true;
        abortController.abort();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.contextId]);

  // Load voices for ElevenLabs with cleanup
  const loadVoices = useCallback(async (abortSignal: AbortSignal) => {
    if (data.model === 'elevenlabs' && voices.length === 0 && !isLoadingVoices) {
      setIsLoadingVoices(true);
      try {
        // Get API key from settings store
        const { useSettingsStore } = await import('@/store/settingsStore');
        const apiKey = useSettingsStore.getState().apiKeys.elevenlabs;
        
        if (apiKey && !abortSignal.aborted) {
          const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
              'xi-api-key': apiKey,
            },
            signal: abortSignal,
          });
          
          if (response.ok && !abortSignal.aborted) {
            const voicesData = await response.json();
            setVoices(voicesData.voices || []);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to load voices:', error);
        }
      } finally {
        if (!abortSignal.aborted) {
          setIsLoadingVoices(false);
        }
      }
    }
  }, [data.model, voices.length, isLoadingVoices]);
  
  // Load voices when component mounts for ElevenLabs
  useEffect(() => {
    if (data.model === 'elevenlabs' && voices.length === 0 && !isLoadingVoices) {
      const abortController = new AbortController();
      loadVoices(abortController.signal);
      return () => abortController.abort();
    }
  }, [data.model, loadVoices, voices.length, isLoadingVoices]);

  // Initialize subModel if not set
  useEffect(() => {
    if (!data.subModel) {
      const defaultSub = getDefaultSubModel(data.model);
      updateNodeData(id, { subModel: defaultSub });
    }
  }, [data.model, data.subModel, id, updateNodeData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false);
      }
      if (subModelDropdownRef.current && !subModelDropdownRef.current.contains(event.target as Node)) {
        setIsSubModelDropdownOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
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
      label: getSubModelLabel(data.model, subModel)
    });
    setIsSubModelDropdownOpen(false);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalPrompt(e.target.value);
  };

  const handlePromptBlur = () => {
    updateNodeData(id, { prompt: localPrompt });
  };

  const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalSystemPrompt(e.target.value);
    // If context is applied, clear it when user manually edits
    if (data.contextId) {
      updateNodeData(id, { contextId: undefined });
    }
  };

  const handleSystemPromptBlur = () => {
    updateNodeData(id, { systemPrompt: localSystemPrompt });
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalTemperature(value);
    updateNodeData(id, { temperature: value });
    // If context is applied, clear it when user manually edits
    if (data.contextId) {
      updateNodeData(id, { contextId: undefined });
    }
  };

  const handleRunNode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.isRunning || isWorkflowRunning) return;
    await runSingleNode(id);
  };

  const toggleSettings = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const willOpen = !isSettingsOpen;
    setIsSettingsOpen(willOpen);
    
    // Load contexts when opening settings
    if (willOpen && contexts.length === 0) {
      setIsLoadingContexts(true);
      try {
        const loadedContexts = await listContexts();
        setContexts(loadedContexts);
      } catch (error) {
        console.error('Failed to load contexts:', error);
      } finally {
        setIsLoadingContexts(false);
      }
    }
  };

  const handleContextSelect = (contextId: string | null) => {
    if (contextId) {
      const selectedContext = contexts.find((c) => c.id === contextId);
      if (selectedContext) {
        // Apply context's system prompt and temperature
        updateNodeData(id, {
          contextId: contextId,
          systemPrompt: selectedContext.system_prompt || data.systemPrompt || '',
          temperature: selectedContext.temperature ?? data.temperature ?? 0.7,
        });
        setLocalSystemPrompt(selectedContext.system_prompt || '');
        setLocalTemperature(selectedContext.temperature ?? 0.7);
      }
    } else {
      // Clear context
      updateNodeData(id, { contextId: undefined });
    }
  };

  return (
    <div className="relative">
      <div
        className={`
          group relative w-[320px] rounded-xl
          overflow-visible
          transition-all duration-300
          ${data.isRunning 
            ? 'border-0 bg-zinc-900' 
            : 'border-2 border-zinc-700 hover:border-zinc-600 bg-zinc-900'
          }
        `}
      >
      {/* BorderBeam for running state */}
      {data.isRunning && (
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
            <span className={styles.icon}>{modelIcons[data.model]}</span>
            <span className="text-xs font-medium text-zinc-200 flex-1">
              {modelLabels[data.model]}
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
                    ${data.model === model ? 'bg-zinc-700/30' : ''}
                  `}
                >
                  <span className={modelStyles[model].icon}>{modelIcons[model]}</span>
                  <span className="text-sm text-zinc-200">{modelLabels[model]}</span>
                  {data.model === model && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Textarea - Hidden for ElevenLabs */}
      {data.model !== 'elevenlabs' && (
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

      {/* Voice Selector for ElevenLabs */}
      {data.model === 'elevenlabs' && (
        <div className="px-3 pb-2">
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Select Voice
          </label>
          <select
            value={data.voiceId || ''}
            onChange={(e) => {
              updateNodeData(id, { voiceId: e.target.value || undefined });
            }}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600"
            onClick={(e) => {
              e.stopPropagation();
              loadVoices();
            }}
          >
            <option value="">Select a voice...</option>
            {isLoadingVoices ? (
              <option disabled>Loading voices...</option>
            ) : voices.length > 0 ? (
              voices.map((voice) => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name}
                </option>
              ))
            ) : (
              <>
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Default)</option>
                <option value="pNInz6obpgDQGcFmaJgB">Adam</option>
                <option value="EXAVITQu4vr4xnSDxMaL">Bella</option>
                <option value="ErXwobaYiN019PkySvjV">Antoni</option>
                <option value="MF3mGyEYCl7XYWbV9V6O">Elli</option>
                <option value="TxGEqnHWrfWFTfGW9XjX">Josh</option>
                <option value="VR6AewLTigWG4xSOukaG">Arnold</option>
                <option value="yoZ06aMxZJJ28mfd3POQ">Sam</option>
              </>
            )}
          </select>
          {hasIncomingConnection ? (
            <p className="text-[10px] text-blue-400/70 mt-1 px-1">
              ℹ️ Will convert text from previous step to audio
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500 mt-1 px-1">
              Connect a node to convert its output to audio
            </p>
          )}
        </div>
      )}

      {/* Output Preview (if available) */}
      {data.output && (
        <div className="px-3 pb-3">
          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg max-h-[60px] overflow-y-auto">
            <p className="text-xs text-zinc-400 line-clamp-3">{data.output}</p>
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
                  {getSubModelLabel(data.model, currentSubModel)}
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
          <div ref={settingsRef} className="relative">
            <button 
              onClick={toggleSettings}
              className={`
                p-1.5 rounded-lg transition-colors
                ${isSettingsOpen 
                  ? 'bg-zinc-700 text-zinc-200' 
                  : 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300'
                }
              `}
              title="Node settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Settings Panel */}
            {isSettingsOpen && (
              <div 
                className="absolute top-full right-0 mt-1 w-80 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 p-4"
                onWheel={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-zinc-200">Node Settings</span>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Voice Selector for ElevenLabs */}
                {data.model === 'elevenlabs' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      Voice
                    </label>
                    <select
                      value={data.voiceId || ''}
                      onChange={(e) => {
                        updateNodeData(id, { voiceId: e.target.value || undefined });
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadVoices();
                      }}
                    >
                      <option value="">Select a voice...</option>
                      {isLoadingVoices ? (
                        <option disabled>Loading voices...</option>
                      ) : voices.length > 0 ? (
                        voices.map((voice) => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Default)</option>
                          <option value="pNInz6obpgDQGcFmaJgB">Adam</option>
                          <option value="EXAVITQu4vr4xnSDxMaL">Bella</option>
                          <option value="ErXwobaYiN019PkySvjV">Antoni</option>
                          <option value="MF3mGyEYCl7XYWbV9V6O">Elli</option>
                          <option value="TxGEqnHWrfWFTfGW9XjX">Josh</option>
                          <option value="VR6AewLTigWG4xSOukaG">Arnold</option>
                          <option value="yoZ06aMxZJJ28mfd3POQ">Sam</option>
                        </>
                      )}
                    </select>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {hasIncomingConnection 
                        ? 'Will convert text from previous step to audio'
                        : 'Connect a node to provide text to convert'}
                    </p>
                  </div>
                )}

                {/* Context Selector */}
                {data.model !== 'elevenlabs' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                      Context Template
                    </label>
                    <select
                      value={data.contextId || ''}
                      onChange={(e) => handleContextSelect(e.target.value || null)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">None</option>
                      {isLoadingContexts ? (
                        <option disabled>Loading...</option>
                      ) : (
                        contexts.map((context) => (
                          <option key={context.id} value={context.id}>
                            {context.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {/* System Prompt */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={localSystemPrompt}
                    onChange={handleSystemPromptChange}
                    onBlur={handleSystemPromptBlur}
                    disabled={!!data.contextId}
                    placeholder={data.contextId ? 'Using context template...' : 'Enter system prompt...'}
                    className={`
                      w-full min-h-[80px] px-3 py-2 
                      bg-zinc-950 border rounded-lg
                      text-sm text-zinc-200 placeholder-zinc-600
                      resize-none
                      focus:outline-none focus:ring-1 transition-all
                      ${data.contextId 
                        ? 'border-zinc-800/50 text-zinc-500 cursor-not-allowed' 
                        : 'border-zinc-700 focus:border-zinc-600 focus:ring-zinc-600'
                      }
                    `}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Temperature */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-zinc-400">
                      Temperature
                    </label>
                    <span className="text-xs text-zinc-500">{localTemperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={localTemperature}
                    onChange={handleTemperatureChange}
                    disabled={!!data.contextId}
                    className={`
                      w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer
                      ${data.contextId ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(localTemperature / 2) * 100}%, #27272a ${(localTemperature / 2) * 100}%, #27272a 100%)`
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Play button */}
          <button
            onClick={handleRunNode}
            disabled={data.isRunning || isWorkflowRunning}
            className={`
              p-1.5 rounded-lg transition-colors
              ${data.isRunning || isWorkflowRunning
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'hover:bg-zinc-700 text-zinc-500 hover:text-emerald-400'
              }
            `}
            title="Run node"
          >
            {data.isRunning ? (
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            ) : data.hasOutput ? (
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
        className={`!w-3 !h-3 !border-2 !transition-colors !z-50 ${
          hasIncomingConnection 
            ? '!bg-blue-500 !border-blue-400' 
            : '!bg-zinc-700 !border-zinc-500 hover:!bg-emerald-500 hover:!border-emerald-400'
        }`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-500 hover:!bg-emerald-500 hover:!border-emerald-400 !transition-colors !z-50"
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
        {data.contextId && (
          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px]">
            Context
          </span>
        )}
        {data.systemPrompt && !data.contextId && (
          <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">
            System
          </span>
        )}
        <span>Temp: {data.temperature?.toFixed(1) || '0.7'}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${data.isRunning ? 'bg-yellow-500 animate-pulse' : data.hasOutput ? 'bg-emerald-500' : styles.indicator}`} />
        <span>{data.isRunning ? 'Running...' : data.hasOutput ? 'Complete' : 'Ready'}</span>
      </span>
    </div>
    </div>
  );
};

export default memo(AINode);
