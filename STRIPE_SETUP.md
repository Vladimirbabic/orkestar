# Stripe Integration Setup Guide

This guide will help you set up Stripe for subscription billing in Orkestar.

## Overview

The integration includes:
- **Three pricing tiers**: Free, Pro ($29/mo), and Enterprise ($99/mo)
- **Usage-based gating**: Workflows, AI executions, and context limits
- **Customer portal**: Users can manage their subscriptions
- **Webhook handling**: Automatic subscription sync

## Setup Steps

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### 2. Create Products and Prices

In your Stripe Dashboard:

1. Go to **Products** → **Add Product**
2. Create **Pro Plan**:
   - Name: `Pro`
   - Description: `For power users and small teams`
   - Price: $29/month (recurring)
   - Copy the Price ID (starts with `price_`)

3. Create **Enterprise Plan**:
   - Name: `Enterprise`
   - Description: `For organizations at scale`
   - Price: $99/month (recurring)
   - Copy the Price ID

### 3. Set Up Webhook

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`)

### 4. Configure Customer Portal

1. Go to **Settings** → **Billing** → **Customer portal**
2. Enable the portal and configure:
   - Allow customers to update payment methods
   - Allow subscription cancellation
   - Show invoices

### 5. Set Environment Variables

Add these to your `.env.local`:

```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (from step 2)
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx

# App URL (for redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run Database Migration

Apply the subscription tables to your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or run the migration manually in the Supabase SQL editor
# (see supabase_migrations/create_subscriptions_table.sql)
```

The migration creates these tables:
- `customers` - Links Supabase users to Stripe customers
- `subscriptions` - Stores subscription data
- `products` - Caches Stripe products
- `prices` - Caches Stripe prices
- `usage_records` - Tracks feature usage per period

### 7. Test the Integration

1. Start the dev server: `npm run dev`
2. Navigate to `/pricing`
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

## Pricing Tiers

| Feature | Free | Pro ($29/mo) | Enterprise ($99/mo) |
|---------|------|--------------|---------------------|
| Workflows | 3 | Unlimited | Unlimited |
| AI Executions/mo | 100 | 2,000 | Unlimited |
| Context Documents | 1 | 20 | Unlimited |
| Support | Community | Priority | 24/7 Dedicated |

## How It Works

### Checkout Flow
1. User clicks "Upgrade" on pricing page
2. App creates Stripe Checkout session
3. User enters payment info on Stripe
4. Webhook receives `checkout.session.completed`
5. Subscription is saved to database

### Usage Tracking
- Workflow count is tracked when creating workflows
- AI executions are tracked per API call
- Context count is tracked when creating contexts
- Usage resets monthly

### Gating Logic
- Before creating a workflow → check workflow limit
- Before running AI → check AI execution limit
- Before creating context → check context limit
- If limit reached → show upgrade prompt

## Local Development

For testing webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This will give you a webhook signing secret for local testing
```

## Production Deployment

1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook endpoint URL
4. Create live products/prices (or copy from test mode)

## Troubleshooting

### Webhook signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Check that you're using the signing secret from the correct webhook endpoint

### Subscription not syncing
- Check webhook logs in Stripe Dashboard
- Verify the events are being sent and received

### Customer not created
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Check Supabase admin permissions







