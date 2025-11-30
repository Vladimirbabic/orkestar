-- Execution logging tables
-- Run this migration to enable execution history, scheduling, and templates

-- =====================================================
-- WORKFLOW EXECUTIONS (Logging & History)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'webhook', 'schedule')),
  trigger_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  total_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_label TEXT,
  input JSONB,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for execution queries
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_steps_execution_id ON execution_steps(execution_id);

-- RLS Policies for executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions" ON workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" ON workflow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions" ON workflow_executions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view steps of own executions" ON execution_steps
  FOR SELECT USING (
    execution_id IN (SELECT id FROM workflow_executions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert steps for own executions" ON execution_steps
  FOR INSERT WITH CHECK (
    execution_id IN (SELECT id FROM workflow_executions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update steps for own executions" ON execution_steps
  FOR UPDATE USING (
    execution_id IN (SELECT id FROM workflow_executions WHERE user_id = auth.uid())
  );

-- =====================================================
-- SCHEDULES (Trigger automation)
-- =====================================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('interval', 'cron')),
  interval_minutes INTEGER, -- For interval type: 60 = hourly, 1440 = daily, 10080 = weekly
  cron_expression TEXT, -- For cron type
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for schedule queries
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_workflow_id ON schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run_at) WHERE is_active = true;

-- RLS for schedules
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules" ON schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" ON schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" ON schedules
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TEMPLATES LIBRARY
-- =====================================================

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('starter', 'marketing', 'sales', 'support', 'productivity', 'developer', 'premium')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL DEFAULT '[]',
  thumbnail_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  is_community BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for template queries
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tier ON templates(tier);
CREATE INDEX IF NOT EXISTS idx_templates_featured ON templates(is_featured) WHERE is_featured = true;

-- RLS for templates (public read, admin write)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Authors can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = author_id);

-- =====================================================
-- INTEGRATIONS & CREDENTIALS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'slack', 'notion', 'discord', 'airtable', 'email')),
  account_name TEXT,
  credentials JSONB NOT NULL DEFAULT '{}', -- Encrypted OAuth tokens or API keys
  is_active BOOLEAN DEFAULT true,
  scopes TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider, account_name)
);

-- Index for integration queries
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON user_integrations(provider);

-- RLS for integrations
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations" ON user_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own integrations" ON user_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON user_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON user_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- WEBHOOKS
-- =====================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_id TEXT NOT NULL UNIQUE, -- Public webhook identifier
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_webhook_id ON webhooks(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_workflow_id ON webhooks(workflow_id);

-- RLS for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks" ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks" ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks" ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks" ON webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SEED STARTER TEMPLATES
-- =====================================================

INSERT INTO templates (name, description, category, tier, nodes, edges, is_featured) VALUES
(
  'Simple Text Summarizer',
  'Summarize any text into key points using AI',
  'starter',
  'free',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Summarizer","model":"openai","prompt":"Summarize the following text into 3-5 bullet points:\n\n{{input}}","temperature":0.5}}]',
  '[]',
  true
),
(
  'Q&A Bot',
  'Answer questions based on provided context',
  'starter',
  'free',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Q&A","model":"openai","prompt":"Based on this context:\n{{context}}\n\nAnswer this question:\n{{question}}","temperature":0.3}}]',
  '[]',
  true
),
(
  'Content Rewriter',
  'Rewrite content in a different tone or style',
  'starter',
  'free',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Rewriter","model":"openai","prompt":"Rewrite the following text in a {{tone}} tone:\n\n{{input}}","temperature":0.7}}]',
  '[]',
  true
),
(
  'Image Describer',
  'Generate descriptions for images using AI vision',
  'starter',
  'free',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Describe Image","model":"gemini","prompt":"Describe this image in detail, including objects, colors, and mood.","temperature":0.5}}]',
  '[]',
  false
),
(
  'Meeting Notes to Actions',
  'Extract action items from meeting notes',
  'starter',
  'free',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Extract Actions","model":"openai","prompt":"Extract all action items from these meeting notes. Format as a checklist with owner and deadline if mentioned:\n\n{{notes}}","temperature":0.3}}]',
  '[]',
  false
),
(
  'Multi-Step Content Pipeline',
  'Research → Write → Edit workflow for content creation',
  'marketing',
  'pro',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Research","model":"openai","prompt":"Research the topic: {{topic}}. Provide 5 key facts and statistics.","temperature":0.5}},{"id":"2","type":"aiNode","position":{"x":400,"y":200},"data":{"label":"Write Draft","model":"openai","prompt":"Write a blog post based on this research:\n{{research}}\n\nTone: {{tone}}","temperature":0.7}},{"id":"3","type":"aiNode","position":{"x":700,"y":200},"data":{"label":"Edit & Polish","model":"openai","prompt":"Edit and polish this draft for clarity, grammar, and engagement:\n\n{{draft}}","temperature":0.4}}]',
  '[{"id":"e1","source":"1","target":"2"},{"id":"e2","source":"2","target":"3"}]',
  true
),
(
  'Lead Qualification',
  'Analyze and score leads automatically',
  'sales',
  'pro',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Analyze Lead","model":"openai","prompt":"Analyze this lead information and provide:\n1. Lead score (1-100)\n2. Key buying signals\n3. Recommended next action\n\nLead data:\n{{lead_data}}","temperature":0.3}}]',
  '[]',
  true
),
(
  'Customer Support Triage',
  'Categorize and route support tickets',
  'support',
  'pro',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Triage","model":"openai","prompt":"Analyze this support ticket and provide:\n1. Category (billing, technical, feature request, bug)\n2. Priority (low, medium, high, urgent)\n3. Suggested response template\n4. Escalation needed (yes/no)\n\nTicket:\n{{ticket}}","temperature":0.2}}]',
  '[]',
  true
),
(
  'Research Assistant',
  'Deep research with multiple AI models',
  'premium',
  'pro',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":100},"data":{"label":"Initial Research","model":"openai","prompt":"Research: {{topic}}\n\nProvide comprehensive overview with sources.","temperature":0.5}},{"id":"2","type":"aiNode","position":{"x":100,"y":300},"data":{"label":"Alternative View","model":"gemini","prompt":"Provide alternative perspectives on:\n{{topic}}\n\nConsider contrarian viewpoints.","temperature":0.6}},{"id":"3","type":"aiNode","position":{"x":400,"y":200},"data":{"label":"Synthesize","model":"openai","prompt":"Synthesize these research findings into a balanced report:\n\nMain research:\n{{main}}\n\nAlternative views:\n{{alt}}","temperature":0.4}}]',
  '[{"id":"e1","source":"1","target":"3"},{"id":"e2","source":"2","target":"3"}]',
  true
),
(
  'Code Review Assistant',
  'Automated code review and suggestions',
  'developer',
  'pro',
  '[{"id":"1","type":"aiNode","position":{"x":100,"y":200},"data":{"label":"Review Code","model":"openai","prompt":"Review this code for:\n1. Bugs and potential issues\n2. Performance improvements\n3. Best practices violations\n4. Security concerns\n\nCode:\n```{{language}}\n{{code}}\n```","temperature":0.2}}]',
  '[]',
  true
)
ON CONFLICT DO NOTHING;




