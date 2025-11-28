'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/context/SubscriptionContext';
import { PRICING_TIERS, PricingTier } from '@/lib/stripe';
import { Crown, X, Sparkles, Zap, ArrowRight } from 'lucide-react';

interface UpgradePromptProps {
  feature: 'workflows' | 'aiExecutions' | 'contexts';
  onClose: () => void;
}

const featureLabels = {
  workflows: 'workflows',
  aiExecutions: 'AI executions',
  contexts: 'context documents',
};

export function UpgradePrompt({ feature, onClose }: UpgradePromptProps) {
  const router = useRouter();
  const { status, openCheckout } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  if (!status) return null;

  // Only show upgrade prompt for free tier (Pro has unlimited everything)
  if (status.tier !== 'free') return null;

  const currentLimit = status.limits[feature];
  const nextTier: PricingTier = 'pro';
  const nextPlan = PRICING_TIERS[nextTier];
  const nextLimit = nextPlan.limits[feature];

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await openCheckout(nextTier);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-700/50 shadow-2xl overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-white mb-2">
              Upgrade to unlock more
            </h3>
            <p className="text-zinc-400">
              You&apos;ve reached the limit of {currentLimit} {featureLabels[feature]} on the{' '}
              <span className="text-zinc-200">{PRICING_TIERS[status.tier].name}</span> plan.
            </p>
          </div>

          {/* Comparison */}
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">{PRICING_TIERS[status.tier].name}</p>
                  <p className="text-xs text-zinc-500">{currentLimit} {featureLabels[feature]}</p>
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-zinc-500" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{nextPlan.name}</p>
                  <p className="text-xs text-violet-400">
                    {nextLimit === -1 ? 'Unlimited' : nextLimit} {featureLabels[feature]}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2 mb-8">
            {nextPlan.features.slice(0, 4).map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors font-medium text-sm"
            >
              Maybe later
            </button>
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Upgrade to {nextPlan.name}
                  <span className="text-white/70">${nextPlan.price}/mo</span>
                </>
              )}
            </button>
          </div>

          {/* Link to pricing */}
          <button
            onClick={() => router.push('/pricing')}
            className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Compare all plans →
          </button>
        </div>
      </div>
    </div>
  );
}

