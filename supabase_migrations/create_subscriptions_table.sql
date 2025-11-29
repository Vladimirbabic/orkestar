-- Create customers table to link Supabase users with Stripe customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create subscriptions table to store user subscription data
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'incomplete',
  -- Status can be: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, paused
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prices table to cache Stripe prices locally
CREATE TABLE IF NOT EXISTS prices (
  id TEXT PRIMARY KEY, -- Stripe price ID
  product_id TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  unit_amount INTEGER, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  interval TEXT, -- 'month' or 'year'
  interval_count INTEGER DEFAULT 1,
  trial_period_days INTEGER,
  type TEXT DEFAULT 'recurring', -- 'recurring' or 'one_time'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table to cache Stripe products locally
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- Stripe product ID
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage tracking table for metered features
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'workflow_runs', 'ai_calls', etc.
  count INTEGER DEFAULT 1,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(period_start, period_end);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view own customer record" ON customers
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Prices and products are public (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view prices" ON prices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for usage records
CREATE POLICY "Users can view own usage records" ON usage_records
  FOR SELECT USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at
  BEFORE UPDATE ON prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


