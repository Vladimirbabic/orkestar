-- Create contexts table for storing context templates
CREATE TABLE IF NOT EXISTS contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  system_prompt TEXT,
  temperature NUMERIC(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_contexts_user_id ON contexts(user_id);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_contexts_updated_at ON contexts(updated_at DESC);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own contexts
-- CREATE POLICY "Users can view their own contexts" ON contexts
--   FOR SELECT USING (user_id = current_setting('app.user_id', true));

-- Policy to allow users to insert their own contexts
-- CREATE POLICY "Users can insert their own contexts" ON contexts
--   FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

-- Policy to allow users to update their own contexts
-- CREATE POLICY "Users can update their own contexts" ON contexts
--   FOR UPDATE USING (user_id = current_setting('app.user_id', true));

-- Policy to allow users to delete their own contexts
-- CREATE POLICY "Users can delete their own contexts" ON contexts
--   FOR DELETE USING (user_id = current_setting('app.user_id', true));





