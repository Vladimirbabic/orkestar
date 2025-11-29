import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import {
  getAllIntegrationStatuses,
  disconnectIntegration,
  IntegrationProvider,
} from '@/lib/integrationService';

// GET - Get all integration statuses for the current user
export async function GET(request: NextRequest) {
  try {
    // Try to get userId from query params first (for client-side calls)
    const userIdParam = request.nextUrl.searchParams.get('userId');
    
    let userId: string | null = userIdParam;
    
    // If no userId in params, try to get from session
    if (!userId) {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && user) {
        userId = user.id;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statuses = await getAllIntegrationStatuses(userId);
    
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
    const { provider, userId: userIdBody } = await request.json();
    
    // Try to get userId from body first, then from session
    let userId: string | null = userIdBody;
    
    if (!userId) {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!authError && user) {
        userId = user.id;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!provider || !['google', 'slack', 'notion'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    const success = await disconnectIntegration(userId, provider as IntegrationProvider);
    
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
