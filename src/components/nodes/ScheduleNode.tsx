'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, Calendar, Play, Settings2 } from 'lucide-react';

export interface ScheduleNodeData {
  label: string;
  scheduleType: 'interval' | 'cron';
  intervalMinutes?: number;
  cronExpression?: string;
  timezone?: string;
  isActive?: boolean;
  lastRun?: string;
  nextRun?: string;
  [key: string]: unknown;
}

const INTERVAL_OPTIONS = [
  { value: 60, label: 'Every hour' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Daily' },
  { value: 10080, label: 'Weekly' },
];

function ScheduleNode({ data, selected }: NodeProps) {
  const nodeData = data as ScheduleNodeData;
  const [showConfig, setShowConfig] = useState(false);

  const getScheduleLabel = () => {
    if (nodeData.scheduleType === 'cron' && nodeData.cronExpression) {
      return nodeData.cronExpression;
    }
    const option = INTERVAL_OPTIONS.find(o => o.value === nodeData.intervalMinutes);
    return option?.label || 'Not configured';
  };

  return (
    <div
      className={`relative min-w-[280px] rounded-xl border-2 overflow-visible transition-all duration-200 ${
        selected
          ? 'border-blue-500/70 shadow-xl shadow-blue-500/20 ring-2 ring-blue-500/30 ring-offset-2 ring-offset-zinc-950'
          : 'border-zinc-700/80 hover:border-zinc-500/80 hover:shadow-lg hover:shadow-zinc-800/30'
      } bg-zinc-900/95 backdrop-blur-sm`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {nodeData.label || 'Schedule Trigger'}
          </h3>
          <p className="text-xs text-zinc-500">Automated runs</p>
        </div>
        {nodeData.isActive && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-400">Active</span>
          </div>
        )}
      </div>

      {/* Schedule Config */}
      <div className="p-3 space-y-3">
        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Run Schedule
          </label>
          <div className="mt-1.5 flex items-center gap-2 px-2.5 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-200">{getScheduleLabel()}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfig(!showConfig);
              }}
              className="ml-auto p-1 rounded hover:bg-zinc-700 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="p-2 bg-zinc-800/30 rounded-lg space-y-2">
            <label className="text-[10px] font-medium text-zinc-500">Frequency</label>
            <div className="grid grid-cols-2 gap-1">
              {INTERVAL_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={(e) => e.stopPropagation()}
                  className={`px-2 py-1.5 text-xs rounded-md transition-colors ${
                    nodeData.intervalMinutes === option.value
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next/Last Run */}
        <div className="flex items-center gap-2 px-2.5 py-2 bg-zinc-800/30 rounded-lg">
          <Play className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-zinc-400">
            {nodeData.nextRun 
              ? `Next: ${new Date(nodeData.nextRun).toLocaleString()}`
              : 'Configure schedule to enable'
            }
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-blue-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
      />

      {/* Pro badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg">
        PRO
      </div>
    </div>
  );
}

export default memo(ScheduleNode);

