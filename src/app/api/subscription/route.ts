import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscriptionStatus, canPerformAction } from '@/lib/subscriptionService';
import { createClient } from '@supabase/supabase-js';

// GET - Get user's subscription status
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    // Get user's email from Supabase to check Stripe
    let email: string | undefined;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: user } = await supabase.auth.admin.getUserById(userId);
        email = user?.user?.email;
      }
    } catch (e) {
      // If we can't get email, we'll fall back to free tier
      console.log('Could not get user email:', e);
    }

    // Also try getting email from header (set by client)
    const headerEmail = request.headers.get('x-user-email');
    if (headerEmail && !email) {
      email = headerEmail;
    }

    const status = await getUserSubscriptionStatus(userId, email);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

// POST - Check if user can perform action
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body as { action: 'create_workflow' | 'run_ai' | 'create_context' };

    if (!action) {
      return NextResponse.json(
        { error: 'Action required' },
        { status: 400 }
      );
    }

    const result = await canPerformAction(userId, action);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking action permission:', error);
    return NextResponse.json(
      { error: 'Failed to check permission' },
      { status: 500 }
    );
  }
}

