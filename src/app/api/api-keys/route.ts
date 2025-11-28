import { NextRequest, NextResponse } from 'next/server';
import { supabase, obfuscateKey, deobfuscateKey } from '@/lib/supabase';

function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId || null;
}

function checkSupabase() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  return null;
}

// GET - Get all API keys for the current user
export async function GET(request: NextRequest) {
  const dbError = checkSupabase();
  if (dbError) return dbError;
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data, error } = await supabase!
      .from('api_keys')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deobfuscate keys before returning
    const deobfuscatedKeys = (data || []).map((key: { model: string; encrypted_key: string }) => ({
      model: key.model,
      key: deobfuscateKey(key.encrypted_key),
    }));

    // Convert to object format
    const keysObject: Record<string, string> = {};
    deobfuscatedKeys.forEach(({ model, key }) => {
      keysObject[model] = key;
    });

    return NextResponse.json({ apiKeys: keysObject });
  } catch (error) {
    console.error('API Keys API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// POST - Save API keys
export async function POST(request: NextRequest) {
  const dbError = checkSupabase();
  if (dbError) return dbError;
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { apiKeys } = body;

    if (!apiKeys || typeof apiKeys !== 'object') {
      return NextResponse.json({ error: 'API keys object is required' }, { status: 400 });
    }

    // Upsert each key
    const promises = Object.entries(apiKeys).map(async ([model, key]) => {
      if (!key || typeof key !== 'string' || key.length === 0) {
        // Skip empty keys
        return;
      }

      const obfuscated = obfuscateKey(key);

      const { error } = await supabase!
        .from('api_keys')
        .upsert({
          user_id: userId,
          model,
          encrypted_key: obfuscated,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,model',
        });

      if (error) {
        console.error(`Error saving API key for ${model}:`, error);
        throw error;
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Keys API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an API key
export async function DELETE(request: NextRequest) {
  const dbError = checkSupabase();
  if (dbError) return dbError;
  
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');

    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    const { error } = await supabase!
      .from('api_keys')
      .delete()
      .eq('user_id', userId)
      .eq('model', model);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Keys API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

