import { createClient } from '@supabase/supabase-js';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: 'starter' | 'marketing' | 'sales' | 'support' | 'productivity' | 'developer' | 'premium';
  tier: 'free' | 'pro' | 'premium';
  nodes: unknown[];
  edges: unknown[];
  thumbnail_url: string | null;
  author_id: string | null;
  author_name: string | null;
  is_community: boolean;
  is_featured: boolean;
  usage_count: number;
  created_at: string;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get all templates
export async function getTemplates(
  tier: 'free' | 'pro' = 'free',
  category?: string
): Promise<Template[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('templates')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('usage_count', { ascending: false });

  // Free users only see free templates
  if (tier === 'free') {
    query = query.eq('tier', 'free');
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }

  return data || [];
}

// Get template by ID
export async function getTemplateById(id: string): Promise<Template | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  return data;
}

// Increment template usage count
export async function incrementTemplateUsage(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.rpc('increment_template_usage', { template_id: id });
  
  if (error) {
    // Fallback: direct update
    await supabase
      .from('templates')
      .update({ usage_count: supabase.rpc('increment', { row_id: id }) })
      .eq('id', id);
  }
}

// Get featured templates
export async function getFeaturedTemplates(limit: number = 5): Promise<Template[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('is_featured', true)
    .limit(limit);

  if (error) {
    console.error('Error fetching featured templates:', error);
    throw error;
  }

  return data || [];
}

// Template categories
export const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: 'Grid' },
  { id: 'starter', name: 'Starter', icon: 'Zap' },
  { id: 'marketing', name: 'Marketing', icon: 'Megaphone' },
  { id: 'sales', name: 'Sales', icon: 'TrendingUp' },
  { id: 'support', name: 'Support', icon: 'HeadphonesIcon' },
  { id: 'productivity', name: 'Productivity', icon: 'CheckSquare' },
  { id: 'developer', name: 'Developer', icon: 'Code' },
  { id: 'premium', name: 'Premium', icon: 'Crown' },
];


