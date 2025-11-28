import { NextRequest, NextResponse } from 'next/server';

const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params (passed from client)
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - please log in first' }, { status: 401 });
    }

    // Check for required environment variables
    const clientId = process.env.NOTION_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Notion OAuth not configured. Please set NOTION_CLIENT_ID in environment variables.' },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl}/api/integrations/notion/callback`;
    
    // Create state parameter with user ID for security
    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now(),
    })).toString('base64');

    // Build authorization URL
    const authUrl = new URL(NOTION_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('owner', 'user');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Notion OAuth authorize error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Notion OAuth' },
      { status: 500 }
    );
  }
}
