import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle OAuth errors
    if (error) {
      console.error('Slack OAuth error:', error);
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
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${appUrl}/api/integrations/slack/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=not_configured`);
    }

    const tokenResponse = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Slack token exchange error:', errorData);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=token_exchange_failed`);
    }

    const data = await tokenResponse.json();

    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=${encodeURIComponent(data.error)}`);
    }

    // Extract relevant data from Slack response
    const accessToken = data.access_token;
    const teamId = data.team?.id;
    const teamName = data.team?.name;
    const botUserId = data.bot_user_id;

    // Store tokens in database
    if (!supabase) {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=db_not_configured`);
    }
    
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: stateData.userId,
        provider: 'slack',
        access_token: accessToken,
        refresh_token: null, // Slack doesn't use refresh tokens for bot tokens
        token_expires_at: null, // Slack tokens don't expire
        provider_user_id: botUserId,
        provider_email: null,
        provider_data: {
          team_id: teamId,
          team_name: teamName,
          scope: data.scope,
          token_type: data.token_type,
          authed_user: data.authed_user,
        },
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      console.error('Error storing Slack tokens:', upsertError);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=storage_failed`);
    }

    // Success - redirect back to workflow builder
    return NextResponse.redirect(`${appUrl}/workflows/new?integration_success=slack`);
  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=callback_failed`);
  }
}

