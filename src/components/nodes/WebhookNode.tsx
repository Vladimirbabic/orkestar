'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Webhook, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import { WebhookNodeData } from '@/store/workflowStore';

function WebhookNode({ data, selected }: NodeProps) {
  const nodeData = data as WebhookNodeData;
  const [copied, setCopied] = useState(false);

  const copyWebhookUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.webhookUrl) {
      await navigator.clipboard.writeText(nodeData.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`relative min-w-[280px] rounded-xl border-2 overflow-visible transition-all duration-200 ${
        selected
          ? 'border-amber-500/70 shadow-xl shadow-amber-500/20 ring-2 ring-amber-500/30 ring-offset-2 ring-offset-zinc-950'
          : 'border-zinc-700/80 hover:border-zinc-500/80 hover:shadow-lg hover:shadow-zinc-800/30'
      } bg-zinc-900/95 backdrop-blur-sm`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Webhook className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {nodeData.label}
          </h3>
          <p className="text-xs text-zinc-500 truncate">{nodeData.description}</p>
        </div>
        {nodeData.isActive && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-400">Active</span>
          </div>
        )}
      </div>

      {/* Webhook URL */}
      <div className="p-3 space-y-3">
        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Webhook URL
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 px-2.5 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              <code className="text-xs text-amber-400 font-mono truncate block">
                {nodeData.webhookUrl || 'Generating...'}
              </code>
            </div>
            <button
              onClick={copyWebhookUrl}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
              title="Copy webhook URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {/* Method hint */}
        <div className="flex items-center gap-2 px-2.5 py-2 bg-zinc-800/30 rounded-lg">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-zinc-400">
            Send a <code className="text-amber-400 font-mono">POST</code> request to trigger this workflow
          </span>
        </div>

        {/* Last triggered */}
        {nodeData.lastTriggered && (
          <div className="text-xs text-zinc-500">
            Last triggered: {new Date(nodeData.lastTriggered).toLocaleString()}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-amber-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
      />

      {/* Pro badge */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg">
        PRO
      </div>
    </div>
  );
}

export default memo(WebhookNode);

