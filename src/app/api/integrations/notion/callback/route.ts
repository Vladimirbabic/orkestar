import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle OAuth errors
    if (error) {
      console.error('Notion OAuth error:', error);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=missing_code`);
    }

    // Decode and validate state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=invalid_state`);
    }

    // Check state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=state_expired`);
    }

    // Exchange code for tokens
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = `${appUrl}/api/integrations/notion/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=not_configured`);
    }

    // Notion requires Basic auth for token exchange
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Notion token exchange error:', errorData);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=token_exchange_failed`);
    }

    const data = await tokenResponse.json();

    if (data.error) {
      console.error('Notion API error:', data.error);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=${encodeURIComponent(data.error)}`);
    }

    // Extract relevant data from Notion response
    const accessToken = data.access_token;
    const workspaceId = data.workspace_id;
    const workspaceName = data.workspace_name;
    const workspaceIcon = data.workspace_icon;
    const botId = data.bot_id;
    const ownerUser = data.owner?.user;

    // Store tokens in database
    const supabase = await createSupabaseServerClient();
    
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: stateData.userId,
        provider: 'notion',
        access_token: accessToken,
        refresh_token: null, // Notion doesn't use refresh tokens
        token_expires_at: null, // Notion tokens don't expire
        provider_user_id: botId,
        provider_email: ownerUser?.person?.email || null,
        provider_data: {
          workspace_id: workspaceId,
          workspace_name: workspaceName,
          workspace_icon: workspaceIcon,
          owner: data.owner,
          duplicated_template_id: data.duplicated_template_id,
        },
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      console.error('Error storing Notion tokens:', upsertError);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=storage_failed`);
    }

    // Success - redirect back to workflow builder
    return NextResponse.redirect(`${appUrl}/workflows/new?integration_success=notion`);
  } catch (error) {
    console.error('Notion OAuth callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=callback_failed`);
  }
}
