import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const tier = searchParams.get('tier') || 'free';
    
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
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: data || [] });
  } catch (error) {
    console.error('Error in templates API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

