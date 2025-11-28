'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code2, Braces } from 'lucide-react';

export interface TransformNodeData {
  label: string;
  code: string;
  description?: string;
  [key: string]: unknown;
}

function TransformNode({ data, selected }: NodeProps) {
  const nodeData = data as TransformNodeData;

  const codePreview = nodeData.code 
    ? nodeData.code.split('\n').slice(0, 3).join('\n')
    : '// Transform data here\nreturn input;';

  return (
    <div
      className={`relative min-w-[280px] rounded-xl border-2 overflow-visible transition-all duration-200 ${
        selected
          ? 'border-cyan-500/70 shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-500/30 ring-offset-2 ring-offset-zinc-950'
          : 'border-zinc-700/80 hover:border-zinc-500/80 hover:shadow-lg hover:shadow-zinc-800/30'
      } bg-zinc-900/95 backdrop-blur-sm`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-cyan-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Code2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {nodeData.label || 'Transform'}
          </h3>
          <p className="text-xs text-zinc-500">{nodeData.description || 'Custom JavaScript'}</p>
        </div>
      </div>

      {/* Code Preview */}
      <div className="p-3">
        <div className="relative">
          <div className="absolute top-2 left-2">
            <Braces className="w-3 h-3 text-zinc-600" />
          </div>
          <pre className="pl-6 pr-2 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg overflow-hidden">
            <code className="text-[11px] text-cyan-400 font-mono leading-relaxed block max-h-16 overflow-hidden">
              {codePreview}
            </code>
          </pre>
          {nodeData.code && nodeData.code.split('\n').length > 3 && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-800/50 to-transparent rounded-b-lg" />
          )}
        </div>

        {/* Available functions hint */}
        <div className="mt-2 flex flex-wrap gap-1">
          {['input', 'JSON', 'Math', 'String'].map(fn => (
            <span
              key={fn}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-500 rounded"
            >
              {fn}
            </span>
          ))}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-cyan-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
      />

      {/* Pro badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg">
        PRO
      </div>
    </div>
  );
}

export default memo(TransformNode);

