import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SCOPES = [
  'chat:write',
  'channels:read',
  'users:read',
].join(',');

export async function GET() {
  try {
    // Check if user is authenticated
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for required environment variables
    const clientId = process.env.SLACK_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Slack OAuth not configured. Please set SLACK_CLIENT_ID in environment variables.' },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl}/api/integrations/slack/callback`;
    
    // Create state parameter with user ID for security
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64');

    // Build authorization URL
    const authUrl = new URL(SLACK_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Slack OAuth authorize error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Slack OAuth' },
      { status: 500 }
    );
  }
}

