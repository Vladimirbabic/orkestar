'use client';

import { useSubscription } from '@/context/SubscriptionContext';
import { PRICING_TIERS } from '@/lib/stripe';
import { Zap, Crown, Building2 } from 'lucide-react';

const tierIcons = {
  free: Zap,
  pro: Crown,
  enterprise: Building2,
};

const tierColors = {
  free: 'text-zinc-400',
  pro: 'text-violet-400',
  enterprise: 'text-amber-400',
};

interface UsageIndicatorProps {
  compact?: boolean;
}

export function UsageIndicator({ compact = false }: UsageIndicatorProps) {
  const { status, isLoading } = useSubscription();

  if (isLoading || !status) return null;

  const Icon = tierIcons[status.tier];
  const plan = PRICING_TIERS[status.tier];

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Icon className={`w-3.5 h-3.5 ${tierColors[status.tier]}`} />
        <span className="text-zinc-400">{plan.name}</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${tierColors[status.tier]}`} />
        <span className="font-medium text-sm text-zinc-200">{plan.name} Plan</span>
      </div>

      <div className="space-y-3">
        {/* Workflows */}
        <UsageBar
          label="Workflows"
          current={status.usage.workflows}
          limit={status.limits.workflows}
        />

        {/* AI Executions */}
        <UsageBar
          label="AI Executions"
          current={status.usage.aiExecutions}
          limit={status.limits.aiExecutions}
          suffix="/mo"
        />

        {/* Contexts */}
        <UsageBar
          label="Contexts"
          current={status.usage.contexts}
          limit={status.limits.contexts}
        />
      </div>
    </div>
  );
}

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  suffix?: string;
}

function UsageBar({ label, current, limit, suffix = '' }: UsageBarProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-zinc-400">{label}</span>
        <span className={`${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-zinc-300'}`}>
          {current.toLocaleString()}
          {isUnlimited ? '' : ` / ${limit.toLocaleString()}`}
          {isUnlimited ? ' (unlimited)' : suffix}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}







