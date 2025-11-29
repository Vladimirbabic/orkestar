'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { X, Settings, Thermometer } from 'lucide-react';
import { NodeData, useWorkflowStore } from '@/store/workflowStore';
import { listContexts, type Context } from '@/lib/contextService';

interface NodeSettingsPanelProps {
  nodeId: string | null;
  nodeData: NodeData | null;
  onClose: () => void;
}

const NodeSettingsPanel = ({ nodeId, nodeData, onClose }: NodeSettingsPanelProps) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoadingContexts, setIsLoadingContexts] = useState(false);
  const [voices, setVoices] = useState<Array<{ voice_id: string; name: string }>>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [localSystemPrompt, setLocalSystemPrompt] = useState('');
  const [localTemperature, setLocalTemperature] = useState(0.7);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync local state with nodeData
  useEffect(() => {
    if (nodeData) {
      setLocalSystemPrompt(nodeData.systemPrompt || '');
      setLocalTemperature(nodeData.temperature || 0.7);
    }
  }, [nodeData]);

  // Load contexts when panel opens
  useEffect(() => {
    if (nodeId && contexts.length === 0) {
      setIsLoadingContexts(true);
      listContexts()
        .then(setContexts)
        .catch(console.error)
        .finally(() => setIsLoadingContexts(false));
    }
  }, [nodeId, contexts.length]);

  // Load voices for ElevenLabs
  const loadVoices = useCallback(async () => {
    if (isLoadingVoices || voices.length > 0) return;
    
    setIsLoadingVoices(true);
    try {
      const { useSettingsStore } = await import('@/store/settingsStore');
      const apiKey = useSettingsStore.getState().apiKeys.elevenlabs;
      
      if (apiKey) {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: { 'xi-api-key': apiKey },
        });
        
        if (response.ok) {
          const voicesData = await response.json();
          setVoices(voicesData.voices || []);
        }
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  }, [isLoadingVoices, voices.length]);

  useEffect(() => {
    if (nodeData?.model === 'elevenlabs' && voices.length === 0) {
      loadVoices();
    }
  }, [nodeData?.model, voices.length, loadVoices]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Delay adding listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!nodeId || !nodeData) return null;

  const handleContextSelect = (contextId: string | null) => {
    if (contextId) {
      const selectedContext = contexts.find((c) => c.id === contextId);
      if (selectedContext) {
        updateNodeData(nodeId, {
          contextId: contextId,
          systemPrompt: selectedContext.system_prompt || nodeData.systemPrompt || '',
          temperature: selectedContext.temperature ?? nodeData.temperature ?? 0.7,
        });
        setLocalSystemPrompt(selectedContext.system_prompt || '');
        setLocalTemperature(selectedContext.temperature ?? 0.7);
      }
    } else {
      updateNodeData(nodeId, { contextId: undefined });
    }
  };

  const handleSystemPromptChange = (value: string) => {
    setLocalSystemPrompt(value);
    if (nodeData.contextId) {
      updateNodeData(nodeId, { contextId: undefined });
    }
  };

  const handleSystemPromptBlur = () => {
    updateNodeData(nodeId, { systemPrompt: localSystemPrompt });
  };

  const handleTemperatureChange = (value: number) => {
    setLocalTemperature(value);
    updateNodeData(nodeId, { temperature: value });
    if (nodeData.contextId) {
      updateNodeData(nodeId, { contextId: undefined });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-[200]" />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-[201] flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-200">Node Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Voice Selector for ElevenLabs */}
          {nodeData.model === 'elevenlabs' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Voice
              </label>
              <select
                value={nodeData.voiceId || ''}
                onChange={(e) => {
                  updateNodeData(nodeId, { voiceId: e.target.value || undefined });
                }}
                onClick={loadVoices}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
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
                  </>
                )}
              </select>
            </div>
          )}

          {/* Context Selector */}
          {nodeData.model !== 'elevenlabs' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Context Template
              </label>
              <select
                value={nodeData.contextId || ''}
                onChange={(e) => handleContextSelect(e.target.value || null)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
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
              {nodeData.contextId && (
                <p className="text-[10px] text-emerald-400/70 mt-1">
                  ✓ Context applied - system prompt and temperature locked
                </p>
              )}
            </div>
          )}

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              System Prompt
            </label>
            <textarea
              value={localSystemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              onBlur={handleSystemPromptBlur}
              disabled={!!nodeData.contextId}
              placeholder={nodeData.contextId ? 'Using context template...' : 'Enter system prompt...'}
              className={`
                w-full min-h-[120px] px-3 py-2 
                bg-zinc-950 border rounded-lg
                text-sm text-zinc-200 placeholder-zinc-600
                resize-none
                focus:outline-none focus:ring-1 transition-all
                ${nodeData.contextId 
                  ? 'border-zinc-800/50 text-zinc-500 cursor-not-allowed' 
                  : 'border-zinc-800 focus:border-zinc-600 focus:ring-zinc-600'
                }
              `}
            />
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Thermometer className="w-3.5 h-3.5" />
                Temperature
              </label>
              <span className="text-xs text-zinc-300 font-mono">{localTemperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localTemperature}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
              disabled={!!nodeData.contextId}
              className={`
                w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-emerald-500
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110
                ${nodeData.contextId ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${(localTemperature / 2) * 100}%, #27272a ${(localTemperature / 2) * 100}%, #27272a 100%)`
              }}
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};

export default memo(NodeSettingsPanel);



