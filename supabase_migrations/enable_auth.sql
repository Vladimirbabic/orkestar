-- Enable Row Level Security on all tables
-- This ensures users can only access their own data

-- Workflows table
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflows" ON workflows
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own workflows" ON workflows
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own workflows" ON workflows
  FOR DELETE USING (auth.uid()::text = user_id);

-- Sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid()::text = user_id);

-- Contexts table
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contexts" ON contexts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own contexts" ON contexts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own contexts" ON contexts
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own contexts" ON contexts
  FOR DELETE USING (auth.uid()::text = user_id);

-- API Keys table
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api_keys" ON api_keys
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own api_keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own api_keys" ON api_keys
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own api_keys" ON api_keys
  FOR DELETE USING (auth.uid()::text = user_id);







