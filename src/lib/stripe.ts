import Stripe from 'stripe';

// Server-side Stripe instance (lazy initialization to handle build time)
let _stripe: Stripe | null = null;

export const getStripeServer = (): Stripe => {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }
  return _stripe;
};

// For backward compatibility, but will throw if not configured
export const stripe = (() => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // Return a proxy that throws on access - allows module to load during build
    return new Proxy({} as Stripe, {
      get: () => {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      },
    });
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
    typescript: true,
  });
})();

// Tier limits type
export interface TierLimits {
  workflows: number;
  aiExecutions: number;
  contexts: number;
  maxSteps: number;
  integrations: number;
  templates: number;
}

// Pricing tier type
export interface PricingTierInfo {
  name: string;
  description: string;
  price: number;
  priceId: string | null | undefined;
  features: string[];
  limits: TierLimits;
}

// Pricing tiers configuration
export const PRICING_TIERS: Record<'free' | 'pro', PricingTierInfo> = {
  free: {
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    priceId: null,
    features: [
      '1 workflow (single step)',
      '50 AI executions/month',
      'Manual runs only',
      '2 integrations',
      '5 starter templates',
      '24hr execution history',
    ],
    limits: {
      workflows: 1,
      aiExecutions: 50,
      contexts: 1,
      maxSteps: 1,
      integrations: 2,
      templates: 5,
    },
  },
  pro: {
    name: 'Pro',
    description: 'Unlimited automation power',
    price: 9.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    features: [
      'Unlimited workflows & steps',
      'Unlimited AI executions',
      'Scheduled runs',
      'All integrations',
      'All templates',
      'Variables & logic blocks',
      '30-day execution history',
      'Priority support',
    ],
    limits: {
      workflows: -1,
      aiExecutions: -1,
      contexts: -1,
      maxSteps: -1,
      integrations: -1,
      templates: -1,
    },
  },
};

export type PricingTier = keyof typeof PRICING_TIERS;

// Get tier from price ID
export function getTierFromPriceId(priceId: string | null): PricingTier {
  if (!priceId) return 'free';
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) return 'pro';
  return 'free';
}

// Get limits for a tier
export function getTierLimits(tier: PricingTier) {
  return PRICING_TIERS[tier].limits;
}

// Check if user has access to a feature
export function hasFeatureAccess(tier: PricingTier, feature: keyof TierLimits, currentUsage: number): boolean {
  const limit = PRICING_TIERS[tier].limits[feature];
  if (limit === -1) return true; // unlimited
  return currentUsage < limit;
}

