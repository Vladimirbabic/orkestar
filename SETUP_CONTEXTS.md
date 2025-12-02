# Setting Up Contexts Table

If you're getting errors when trying to save contexts, you need to create the `contexts` table in your Supabase database.

## Steps:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
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
```

6. Click **Run** to execute the query
7. You should see a success message
8. Try saving a context again - it should work now!

## Alternative: Use the migration file

You can also run the SQL from the file:
`supabase_migrations/create_contexts_table.sql`










