import { supabase } from './supabase';
import { PricingTier, PRICING_TIERS, TierLimits } from './stripe';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  feature: string;
  count: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface UserSubscriptionStatus {
  tier: PricingTier;
  isActive: boolean;
  subscription: Subscription | null;
  limits: TierLimits;
  usage: {
    workflows: number;
    aiExecutions: number;
    contexts: number;
  };
}

// Check Stripe directly for user's subscription (server-side only)
async function checkStripeSubscription(email: string): Promise<{ tier: PricingTier; isActive: boolean } | null> {
  // This is called from API routes, so we can use server-side imports
  try {
    const { getStripeServer } = await import('./stripe');
    const stripe = getStripeServer();
    
    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return null;
    }
    
    const customerId = customers.data[0].id;
    
    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) {
      // Check for trialing
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 1,
      });
      
      if (trialingSubs.data.length === 0) {
        return null;
      }
      
      return { tier: 'pro', isActive: true };
    }
    
    // Has active subscription
    return { tier: 'pro', isActive: true };
  } catch (error) {
    console.error('Error checking Stripe subscription:', error);
    return null;
  }
}

// Get user's subscription status with usage
export async function getUserSubscriptionStatus(userId: string, email?: string): Promise<UserSubscriptionStatus> {
  let tier: PricingTier = 'free';
  let isActive = true;
  
  // If email is provided, check Stripe directly
  if (email) {
    const stripeStatus = await checkStripeSubscription(email);
    if (stripeStatus) {
      tier = stripeStatus.tier;
      isActive = stripeStatus.isActive;
    }
  }
  
  const limits = PRICING_TIERS[tier].limits;

  // Get current usage
  const usage = await getCurrentUsage(userId);

  return {
    tier,
    isActive,
    subscription: null, // We're checking Stripe directly now
    limits,
    usage,
  };
}

// Get current period usage
export async function getCurrentUsage(userId: string): Promise<{ workflows: number; aiExecutions: number; contexts: number }> {
  if (!supabase) {
    return { workflows: 0, aiExecutions: 0, contexts: 0 };
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get workflow count
  const { count: workflowCount } = await supabase
    .from('workflows')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get context count
  const { count: contextCount } = await supabase
    .from('contexts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get AI executions this period
  const { data: usageData } = await supabase
    .from('usage_records')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', 'ai_calls')
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString());

  const aiExecutions = usageData?.reduce((sum, record) => sum + record.count, 0) || 0;

  return {
    workflows: workflowCount || 0,
    aiExecutions,
    contexts: contextCount || 0,
  };
}

// Record usage
export async function recordUsage(userId: string, feature: string, count: number = 1): Promise<void> {
  if (!supabase) return;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Check for existing record this period
  const { data: existing } = await supabase
    .from('usage_records')
    .select('id, count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString())
    .limit(1)
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from('usage_records')
      .update({ count: existing.count + count })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase.from('usage_records').insert({
      user_id: userId,
      feature,
      count,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    });
  }
}

// Check if user can perform action
export async function canPerformAction(
  userId: string,
  action: 'create_workflow' | 'run_ai' | 'create_context' | 'add_step' | 'use_schedule' | 'use_integration',
  context?: { currentSteps?: number; integrationId?: string }
): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  const status = await getUserSubscriptionStatus(userId);

  switch (action) {
    case 'create_workflow': {
      if (status.limits.workflows === -1) return { allowed: true };
      if (status.usage.workflows >= status.limits.workflows) {
        return {
          allowed: false,
          reason: `You've reached the maximum of ${status.limits.workflows} workflows on the ${PRICING_TIERS[status.tier].name} plan`,
          limit: status.limits.workflows,
          current: status.usage.workflows,
        };
      }
      return { allowed: true };
    }
    case 'run_ai': {
      if (status.limits.aiExecutions === -1) return { allowed: true };
      if (status.usage.aiExecutions >= status.limits.aiExecutions) {
        return {
          allowed: false,
          reason: `You've used all ${status.limits.aiExecutions} AI executions for this month on the ${PRICING_TIERS[status.tier].name} plan`,
          limit: status.limits.aiExecutions,
          current: status.usage.aiExecutions,
        };
      }
      return { allowed: true };
    }
    case 'create_context': {
      if (status.limits.contexts === -1) return { allowed: true };
      if (status.usage.contexts >= status.limits.contexts) {
        return {
          allowed: false,
          reason: `You've reached the maximum of ${status.limits.contexts} context documents on the ${PRICING_TIERS[status.tier].name} plan`,
          limit: status.limits.contexts,
          current: status.usage.contexts,
        };
      }
      return { allowed: true };
    }
    case 'add_step': {
      if (status.limits.maxSteps === -1) return { allowed: true };
      const currentSteps = context?.currentSteps || 0;
      if (currentSteps >= status.limits.maxSteps) {
        return {
          allowed: false,
          reason: `Free plan is limited to ${status.limits.maxSteps} step per workflow. Upgrade to Pro for unlimited steps and branching.`,
          limit: status.limits.maxSteps,
          current: currentSteps,
        };
      }
      return { allowed: true };
    }
    case 'use_schedule': {
      // Schedules are Pro only
      if (status.tier !== 'pro') {
        return {
          allowed: false,
          reason: 'Scheduled runs are a Pro feature. Upgrade to automate your workflows.',
        };
      }
      return { allowed: true };
    }
    case 'use_integration': {
      if (status.limits.integrations === -1) return { allowed: true };
      // For now, allow all - we'll track integration usage later
      return { allowed: true };
    }
    default:
      return { allowed: true };
  }
}

// Get or create Stripe customer ID
export async function getOrCreateStripeCustomerId(userId: string, email: string): Promise<string | null> {
  if (!supabase) return null;

  // Check if customer exists
  const { data: customer } = await supabase
    .from('customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (customer?.stripe_customer_id) {
    return customer.stripe_customer_id;
  }

  return null; // Will be created by the API route
}

