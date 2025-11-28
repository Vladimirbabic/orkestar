import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Lazy initialization for Supabase admin client
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase admin credentials not configured');
    }
    _supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  }
  return _supabaseAdmin;
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

// Relevant events to handle
const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  const stripe = getStripeServer();

  try {
    event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          await handleCheckoutCompleted(session);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Get user ID from session metadata
  let userId = session.metadata?.supabase_user_id;
  
  // If not in session metadata, try to get it from subscription metadata
  if (!userId && session.subscription) {
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;
    
    const stripe = getStripeServer();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    userId = subscription.metadata?.supabase_user_id;
  }
  
  if (!userId) {
    console.error('No user ID in checkout session');
    return;
  }

  // Ensure customer is linked
  if (session.customer) {
    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer.id;

    await getSupabaseAdmin()
      .from('customers')
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
      }, {
        onConflict: 'user_id',
      });
  }
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  // Get user ID from customer
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const { data: customer } = await getSupabaseAdmin()
    .from('customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!customer) {
    console.error('Customer not found for subscription:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  
  // Type assertion for subscription properties that exist at runtime but may not be in types
  const sub = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    canceled_at?: number | null;
    trial_start?: number | null;
    trial_end?: number | null;
  };

  await getSupabaseAdmin()
    .from('subscriptions')
    .upsert({
      user_id: customer.user_id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: sub.current_period_start 
        ? new Date(sub.current_period_start * 1000).toISOString() 
        : null,
      current_period_end: sub.current_period_end 
        ? new Date(sub.current_period_end * 1000).toISOString() 
        : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      canceled_at: sub.canceled_at 
        ? new Date(sub.canceled_at * 1000).toISOString() 
        : null,
      trial_start: sub.trial_start 
        ? new Date(sub.trial_start * 1000).toISOString() 
        : null,
      trial_end: sub.trial_end 
        ? new Date(sub.trial_end * 1000).toISOString() 
        : null,
    }, {
      onConflict: 'stripe_subscription_id',
    });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await getSupabaseAdmin()
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Update subscription status to active if it was past_due
  // Type assertion for invoice properties
  const inv = invoice as unknown as { subscription?: string | { id: string } };
  
  if (inv.subscription) {
    const subscriptionId = typeof inv.subscription === 'string'
      ? inv.subscription
      : inv.subscription.id;

    await getSupabaseAdmin()
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('stripe_subscription_id', subscriptionId)
      .eq('status', 'past_due');
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Mark subscription as past_due
  // Type assertion for invoice properties
  const inv = invoice as unknown as { subscription?: string | { id: string } };
  
  if (inv.subscription) {
    const subscriptionId = typeof inv.subscription === 'string'
      ? inv.subscription
      : inv.subscription.id;

    await getSupabaseAdmin()
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subscriptionId);
  }
}

