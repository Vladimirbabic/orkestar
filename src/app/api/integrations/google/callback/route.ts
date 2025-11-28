import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
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
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${appUrl}/api/integrations/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=not_configured`);
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Google token exchange error:', errorData);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    let providerEmail = null;
    let providerUserId = null;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      providerEmail = userInfo.email;
      providerUserId = userInfo.id;
    }

    // Store tokens in database
    if (!supabase) {
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=db_not_configured`);
    }
    
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: stateData.userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        provider_user_id: providerUserId,
        provider_email: providerEmail,
        provider_data: {
          scope: tokens.scope,
          token_type: tokens.token_type,
        },
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      console.error('Error storing Google tokens:', upsertError);
      return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=storage_failed`);
    }

    // Success - redirect back to workflow builder
    return NextResponse.redirect(`${appUrl}/workflows/new?integration_success=google`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/workflows/new?integration_error=callback_failed`);
  }
}

