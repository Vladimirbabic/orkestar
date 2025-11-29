import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/integrationService';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const accessToken = await getAccessToken(userId, 'google');
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Google not connected' }, { status: 401 });
    }

    // Fetch spreadsheets from Google Drive
    const response = await fetch(
      `${DRIVE_API_URL}?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,webViewLink)&orderBy=modifiedTime desc&pageSize=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Drive API error:', error);
      return NextResponse.json({ error: 'Failed to fetch spreadsheets' }, { status: 500 });
    }

    const data = await response.json();
    
    const spreadsheets = data.files?.map((file: { id: string; name: string; webViewLink: string }) => ({
      id: file.id,
      name: file.name,
      url: file.webViewLink,
    })) || [];

    return NextResponse.json({ spreadsheets });
  } catch (error) {
    console.error('Error fetching spreadsheets:', error);
    return NextResponse.json({ error: 'Failed to fetch spreadsheets' }, { status: 500 });
  }
}

