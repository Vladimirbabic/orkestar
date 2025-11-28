'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Bot, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  Zap,
  Target,
  Brain,
  ListChecks,
  Play,
  Settings2
} from 'lucide-react';

export interface AgentStep {
  id: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  duration?: number;
}

export interface AgentNodeData {
  label: string;
  objective: string;
  model: 'openai' | 'gemini';
  maxSteps: number;
  temperature: number;
  steps: AgentStep[];
  isRunning?: boolean;
  finalResult?: string;
  tools: string[]; // Available tools the agent can use
  [key: string]: unknown;
}

const AVAILABLE_TOOLS = [
  { id: 'web_search', name: 'Web Search', icon: '🔍' },
  { id: 'web_scrape', name: 'Web Scrape', icon: '🌐' },
  { id: 'summarize', name: 'Summarize', icon: '📝' },
  { id: 'analyze', name: 'Analyze', icon: '🔬' },
  { id: 'generate', name: 'Generate', icon: '✨' },
  { id: 'translate', name: 'Translate', icon: '🌍' },
  { id: 'extract', name: 'Extract Data', icon: '📊' },
  { id: 'compare', name: 'Compare', icon: '⚖️' },
];

function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData;
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const completedSteps = nodeData.steps?.filter(s => s.status === 'completed').length || 0;
  const totalSteps = nodeData.steps?.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStepIcon = (status: AgentStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
      case 'failed':
        return <Circle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-zinc-600" />;
    }
  };

  return (
    <div
      className={`relative min-w-[320px] max-w-[380px] rounded-xl border-2 transition-all duration-200 ${
        selected
          ? 'border-violet-500/60 shadow-xl shadow-violet-500/20'
          : 'border-violet-500/30 hover:border-violet-500/40'
      } bg-gradient-to-b from-zinc-900 to-zinc-950 backdrop-blur-sm overflow-hidden`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-zinc-900"
      />

      {/* Animated gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/10 opacity-50" />

      {/* Header */}
      <div className="relative flex items-center gap-3 p-4 border-b border-zinc-800/50">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {nodeData.isRunning && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
              <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              {nodeData.label || 'AI Agent'}
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white uppercase tracking-wider">
              Agent
            </span>
          </div>
          <p className="text-xs text-zinc-500">Autonomous task execution</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfig(!showConfig);
          }}
          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Settings2 className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Objective */}
      <div className="relative p-4 border-b border-zinc-800/50">
        <div className="flex items-start gap-2 mb-2">
          <Target className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <label className="text-[10px] font-medium text-violet-400 uppercase tracking-wider">
            Objective
          </label>
        </div>
        <textarea
          value={nodeData.objective || ''}
          placeholder="Describe the goal for this agent..."
          className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none min-h-[60px]"
          onClick={(e) => e.stopPropagation()}
          readOnly
        />
      </div>

      {/* Tools */}
      {showConfig && (
        <div className="relative p-4 border-b border-zinc-800/50 bg-zinc-900/50">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
              Available Tools
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_TOOLS.map((tool) => {
              const isActive = nodeData.tools?.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={(e) => e.stopPropagation()}
                  className={`px-2 py-1 rounded-md text-xs transition-all ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  <span className="mr-1">{tool.icon}</span>
                  {tool.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Execution Steps */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center justify-between w-full p-3 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
            <Brain className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs font-medium text-zinc-300">
              Execution Plan
            </span>
          </div>
          {totalSteps > 0 && (
            <span className="text-[10px] text-zinc-500">
              {completedSteps}/{totalSteps} steps
            </span>
          )}
        </button>

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div className="h-0.5 bg-zinc-800">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {isExpanded && (
          <div className="p-3 pt-0 space-y-2 max-h-48 overflow-y-auto">
            {nodeData.steps?.length > 0 ? (
              nodeData.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                    step.status === 'running' ? 'bg-blue-500/10' : 'bg-zinc-800/30'
                  }`}
                >
                  <div className="mt-0.5">{getStepIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {step.action}
                    </p>
                    {step.result && step.status === 'completed' && (
                      <p className="text-[10px] text-zinc-500 mt-1 truncate">
                        ✓ {step.result}
                      </p>
                    )}
                  </div>
                  {step.duration && (
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {step.duration}ms
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <ListChecks className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  Steps will appear here when the agent runs
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Final Result Preview */}
      {nodeData.finalResult && (
        <div className="p-3 border-t border-zinc-800/50 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
              Result
            </span>
          </div>
          <p className="text-xs text-zinc-300 line-clamp-3">
            {nodeData.finalResult}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800/50 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span>Model: {nodeData.model || 'openai'}</span>
            <span>•</span>
            <span>Max: {nodeData.maxSteps || 10} steps</span>
          </div>
          {nodeData.isRunning ? (
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </div>
          ) : (
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/20 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-colors"
            >
              <Play className="w-3 h-3" />
              Run Agent
            </button>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-fuchsia-500 !border-2 !border-zinc-900"
      />

      {/* Pro badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        PRO
      </div>
    </div>
  );
}

export default memo(AgentNode);

