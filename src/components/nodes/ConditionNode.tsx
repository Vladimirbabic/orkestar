'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, ArrowRight, Settings2, ChevronDown } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';

export interface ConditionNodeData {
  label: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'is_empty' | 'is_not_empty';
  value: string;
  [key: string]: unknown;
}

const OPERATORS = [
  { value: 'equals', label: '=', description: 'equals' },
  { value: 'not_equals', label: '≠', description: 'not equals' },
  { value: 'contains', label: '∋', description: 'contains' },
  { value: 'not_contains', label: '∌', description: 'not contains' },
  { value: 'greater', label: '>', description: 'greater than' },
  { value: 'less', label: '<', description: 'less than' },
  { value: 'is_empty', label: '∅', description: 'is empty' },
  { value: 'is_not_empty', label: '≠∅', description: 'is not empty' },
];

function ConditionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ConditionNodeData;
  const [showSettings, setShowSettings] = useState(false);
  const [showOperatorDropdown, setShowOperatorDropdown] = useState(false);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const getOperatorLabel = () => {
    return OPERATORS.find(o => o.value === nodeData.operator)?.label || '=';
  };

  const handleFieldChange = (value: string) => {
    updateNodeData(id, { field: value });
  };

  const handleOperatorChange = (value: string) => {
    updateNodeData(id, { operator: value });
    setShowOperatorDropdown(false);
  };

  const handleValueChange = (value: string) => {
    updateNodeData(id, { value });
  };

  const needsValue = !['is_empty', 'is_not_empty'].includes(nodeData.operator);

  return (
    <div
      className={`relative min-w-[280px] rounded-xl border-2 overflow-visible transition-all duration-200 ${
        selected
          ? 'border-purple-500/70 shadow-xl shadow-purple-500/20 ring-2 ring-purple-500/30 ring-offset-2 ring-offset-zinc-950'
          : 'border-zinc-700/80 hover:border-zinc-500/80 hover:shadow-lg hover:shadow-zinc-800/30'
      } bg-zinc-900/95 backdrop-blur-sm`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-purple-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {nodeData.label || 'Condition'}
          </h3>
          <p className="text-xs text-zinc-500">If/else branch</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            showSettings ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-zinc-800 text-zinc-500'
          }`}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 space-y-3 border-b border-zinc-800/50 bg-zinc-950/50">
          {/* Field Input */}
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
              Check Field
            </label>
            <input
              type="text"
              value={nodeData.field || ''}
              onChange={(e) => handleFieldChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="e.g., input, result.status"
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Operator Dropdown */}
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
              Condition
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOperatorDropdown(!showOperatorDropdown);
                }}
                className="w-full flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600 transition-colors"
              >
                <span>{OPERATORS.find(o => o.value === nodeData.operator)?.description || 'equals'}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showOperatorDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showOperatorDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  {OPERATORS.map((op) => (
                    <button
                      key={op.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOperatorChange(op.value);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700 transition-colors ${
                        nodeData.operator === op.value ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-300'
                      }`}
                    >
                      <span className="w-6 text-center font-mono">{op.label}</span>
                      <span>{op.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Value Input */}
          {needsValue && (
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
                Compare Value
              </label>
              <input
                type="text"
                value={nodeData.value || ''}
                onChange={(e) => handleValueChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="e.g., success, true, 100"
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          )}
        </div>
      )}

      {/* Condition Display (Preview) */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 px-2.5 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
          <code className="text-xs text-purple-400 font-mono truncate flex-1">
            {nodeData.field || '{{field}}'}
          </code>
          <span className="text-xs text-zinc-400 font-medium shrink-0">
            {getOperatorLabel()}
          </span>
          {needsValue && (
            <code className="text-xs text-emerald-400 font-mono truncate flex-1 text-right">
              {nodeData.value || '"value"'}
            </code>
          )}
        </div>

        {/* Branch indicators */}
        <div className="flex justify-between text-[10px] text-zinc-500 px-1">
          <span className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-emerald-500" />
            True
          </span>
          <span className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-red-500" />
            False
          </span>
        </div>
      </div>

      {/* Output Handles - True (top) and False (bottom) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
        style={{ top: '35%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!w-4 !h-4 !bg-red-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
        style={{ top: '65%' }}
      />

      {/* Pro badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg">
        PRO
      </div>
    </div>
  );
}

export default memo(ConditionNode);

