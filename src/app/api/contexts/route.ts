import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id');
  return userId || null;
}

// GET - List all contexts for the current user
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contexts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching contexts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contexts: data || [] });
  } catch (error) {
    console.error('Contexts API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create a new context
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, content, system_prompt, temperature } = body;

    if (!name) {
      return NextResponse.json({ error: 'Context name is required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Context content is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contexts')
      .insert({
        user_id: userId,
        name,
        content: content || '',
        system_prompt: system_prompt || null,
        temperature: temperature !== undefined ? temperature : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating context:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ context: data });
  } catch (error) {
    console.error('Contexts API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing context
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, content, system_prompt, temperature } = body;

    if (!id) {
      return NextResponse.json({ error: 'Context ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt;
    if (temperature !== undefined) updateData.temperature = temperature;

    const { data, error } = await supabase
      .from('contexts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating context:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 });
    }

    return NextResponse.json({ context: data });
  } catch (error) {
    console.error('Contexts API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a context
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Context ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('contexts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting context:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contexts API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

