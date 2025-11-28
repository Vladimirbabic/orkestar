'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { PRICING_TIERS, PricingTier, TierLimits } from '@/lib/stripe';
import { getCurrentUserIdSync } from '@/lib/supabase';

interface SubscriptionStatus {
  tier: PricingTier;
  isActive: boolean;
  limits: TierLimits;
  usage: {
    workflows: number;
    aiExecutions: number;
    contexts: number;
  };
  subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
}

interface SubscriptionContextType {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  canCreateWorkflow: () => boolean;
  canRunAI: () => boolean;
  canCreateContext: () => boolean;
  canAddStep: (currentSteps: number) => boolean;
  canUseSchedule: () => boolean;
  canUseWebhook: () => boolean;
  canUseLogicBlocks: () => boolean;
  isPro: () => boolean;
  getUsagePercentage: (feature: 'workflows' | 'aiExecutions' | 'contexts') => number;
  openCheckout: (tier: PricingTier) => Promise<void>;
  openPortal: () => Promise<void>;
}

const defaultStatus: SubscriptionStatus = {
  tier: 'free',
  isActive: true,
  limits: PRICING_TIERS.free.limits,
  usage: { workflows: 0, aiExecutions: 0, contexts: 0 },
  subscription: null,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setStatus(defaultStatus);
      setIsLoading(false);
      return;
    }

    try {
      const userId = getCurrentUserIdSync();
      const response = await fetch('/api/subscription', {
        headers: { 
          'x-user-id': userId || '',
          'x-user-email': user.email || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setStatus(defaultStatus);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setStatus(defaultStatus);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const canCreateWorkflow = useCallback(() => {
    if (!status) return false;
    if (status.limits.workflows === -1) return true;
    return status.usage.workflows < status.limits.workflows;
  }, [status]);

  const canRunAI = useCallback(() => {
    if (!status) return false;
    if (status.limits.aiExecutions === -1) return true;
    return status.usage.aiExecutions < status.limits.aiExecutions;
  }, [status]);

  const canCreateContext = useCallback(() => {
    if (!status) return false;
    if (status.limits.contexts === -1) return true;
    return status.usage.contexts < status.limits.contexts;
  }, [status]);

  const canAddStep = useCallback((currentSteps: number) => {
    if (!status) return false;
    if (status.limits.maxSteps === -1) return true;
    return currentSteps < status.limits.maxSteps;
  }, [status]);

  const canUseSchedule = useCallback(() => {
    return status?.tier === 'pro';
  }, [status]);

  const canUseWebhook = useCallback(() => {
    return status?.tier === 'pro';
  }, [status]);

  const canUseLogicBlocks = useCallback(() => {
    return status?.tier === 'pro';
  }, [status]);

  const isPro = useCallback(() => {
    return status?.tier === 'pro';
  }, [status]);

  const getUsagePercentage = useCallback((feature: 'workflows' | 'aiExecutions' | 'contexts') => {
    if (!status) return 0;
    const limit = status.limits[feature];
    if (limit === -1) return 0; // unlimited
    const usage = status.usage[feature];
    return Math.min((usage / limit) * 100, 100);
  }, [status]);

  const openCheckout = useCallback(async (tier: PricingTier) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }

    const priceId = PRICING_TIERS[tier].priceId;
    if (!priceId) {
      console.error('No price ID configured for tier:', tier);
      console.error('STRIPE_PRO_PRICE_ID should be set in .env.local');
      console.error('Make sure it starts with "price_" not "prod_"');
      alert('Stripe is not configured correctly. Check console for details.');
      return;
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
          tier,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Checkout error:', data.error);
        alert('Failed to create checkout session: ' + data.error);
        return;
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
        alert('Failed to get checkout URL');
      }
    } catch (error) {
      console.error('Error opening checkout:', error);
      alert('Failed to open checkout. Check console for details.');
    }
  }, [user]);

  const openPortal = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
    }
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        isLoading,
        refresh: fetchStatus,
        canCreateWorkflow,
        canRunAI,
        canCreateContext,
        canAddStep,
        canUseSchedule,
        canUseWebhook,
        canUseLogicBlocks,
        isPro,
        getUsagePercentage,
        openCheckout,
        openPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

