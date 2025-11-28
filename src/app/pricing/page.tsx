'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { PRICING_TIERS, PricingTier } from '@/lib/stripe';
import { 
  Check, 
  Zap, 
  Crown, 
  ArrowLeft, 
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

const tierIcons: Record<string, typeof Zap> = {
  free: Zap,
  pro: Crown,
};

const tierGradients: Record<string, string> = {
  free: 'from-zinc-600 to-zinc-700',
  pro: 'from-violet-500 to-fuchsia-500',
};

const tierBorders: Record<string, string> = {
  free: 'border-zinc-700',
  pro: 'border-violet-500/50',
};

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { status, isLoading, openCheckout, openPortal, refresh } = useSubscription();
  const [loadingTier, setLoadingTier] = useState<PricingTier | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      refresh();
      // Clear the URL params
      window.history.replaceState({}, '', '/pricing');
    }
  }, [searchParams, refresh]);

  const handleSelectPlan = async (tier: PricingTier) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/pricing');
      return;
    }

    if (tier === 'free') return;
    if (tier === status?.tier) return;

    setLoadingTier(tier);
    try {
      await openCheckout(tier);
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingTier('pro');
    try {
      await openPortal();
    } finally {
      setLoadingTier(null);
    }
  };

  const getButtonText = (tier: PricingTier) => {
    if (!isAuthenticated) return 'Sign in to continue';
    if (tier === status?.tier) return 'Current Plan';
    
    // Determine upgrade/downgrade based on tier order
    const tierOrder: Record<string, number> = { free: 0, pro: 1 };
    const currentTierOrder = tierOrder[status?.tier || 'free'];
    const targetTierOrder = tierOrder[tier];
    
    if (targetTierOrder < currentTierOrder) return 'Downgrade';
    return 'Upgrade';
  };

  const isCurrentTier = (tier: PricingTier) => tier === status?.tier;

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] bg-amber-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 flex items-center gap-3 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-300">Subscription activated!</p>
              <p className="text-xs text-emerald-400/70">Your plan has been upgraded successfully.</p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="ml-4 text-emerald-400/50 hover:text-emerald-400"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-300 font-medium">Choose your plan</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Scale your automation
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include access to our 
            powerful workflow builder and AI integrations.
          </p>
        </div>

        {/* Current plan indicator */}
        {isAuthenticated && status && status.tier !== 'free' && (
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tierGradients[status.tier]}`} />
              <span className="text-sm text-zinc-300">
                You&apos;re on the <span className="font-semibold text-white">{PRICING_TIERS[status.tier].name}</span> plan
              </span>
              <button
                onClick={handleManageSubscription}
                className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                Manage <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {(Object.entries(PRICING_TIERS) as [PricingTier, typeof PRICING_TIERS.free][]).map(([tier, plan]) => {
            const Icon = tierIcons[tier];
            const isPopular = tier === 'pro';
            const isCurrent = isCurrentTier(tier);

            return (
              <div
                key={tier}
                className={`relative group rounded-3xl bg-zinc-900/50 backdrop-blur-sm border transition-all duration-300 ${
                  isCurrent 
                    ? `${tierBorders[tier]} ring-2 ring-offset-2 ring-offset-zinc-950 ${tier === 'pro' ? 'ring-violet-500/30' : 'ring-zinc-700/30'}`
                    : 'border-zinc-800/50 hover:border-zinc-700/50'
                } ${isPopular ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${tierGradients[tier]} text-xs font-semibold text-white shadow-lg shadow-violet-500/25`}>
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tierGradients[tier]} flex items-center justify-center shadow-lg ${tier === 'pro' ? 'shadow-violet-500/25' : ''}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-sm text-zinc-500">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">
                        ${plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-zinc-500">/month</span>
                      )}
                    </div>
                    {tier === 'free' && (
                      <p className="text-sm text-zinc-500 mt-1">No credit card required</p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => isCurrent && tier !== 'free' ? handleManageSubscription() : handleSelectPlan(tier)}
                    disabled={isLoading || loadingTier === tier || (tier === 'free' && isCurrent)}
                    className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? tier === 'free'
                          ? 'bg-zinc-800 text-zinc-400 cursor-default'
                          : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                        : tier === 'pro'
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02]'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loadingTier === tier ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      tier === 'free' ? 'Current Plan' : (
                        <>Manage Plan <ExternalLink className="w-3.5 h-3.5" /></>
                      )
                    ) : (
                      <>
                        {getButtonText(tier)}
                        {tier !== 'free' && <ChevronRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>

                  {/* Features */}
                  <div className="mt-8 pt-8 border-t border-zinc-800/50">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                      What&apos;s included
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${tierGradients[tier]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-zinc-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Glow effect on hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${tierGradients[tier]} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`} />
              </div>
            );
          })}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-20 text-center">
          <p className="text-zinc-500 text-sm">
            Questions? Reach out to{' '}
            <a href="mailto:support@orkestar.app" className="text-violet-400 hover:text-violet-300">
              support@orkestar.app
            </a>
          </p>
          <p className="text-zinc-600 text-xs mt-2">
            All prices in USD. Subscriptions can be canceled anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

