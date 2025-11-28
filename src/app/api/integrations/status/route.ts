import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllIntegrationStatuses, disconnectIntegration, IntegrationProvider } from '@/lib/integrationService';

// GET - Get all integration statuses for the current user
export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statuses = await getAllIntegrationStatuses(user.id);
    
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Error fetching integration statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration statuses' },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect a specific integration
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider } = await request.json();
    
    if (!provider || !['google', 'slack', 'notion'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    const success = await disconnectIntegration(user.id, provider as IntegrationProvider);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}

