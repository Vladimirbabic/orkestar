import { getAccessToken } from '@/lib/integrationService';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

export interface SheetInfo {
  sheetId: number;
  title: string;
  index: number;
}

export interface CellRange {
  values: string[][];
}

/**
 * List all Google Sheets accessible by the user
 */
export async function listSpreadsheets(userId: string): Promise<SpreadsheetInfo[]> {
  const accessToken = await getAccessToken(userId, 'google');
  if (!accessToken) {
    throw new Error('Google not connected');
  }

  const response = await fetch(
    `${DRIVE_API_URL}?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,webViewLink)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list spreadsheets');
  }

  const data = await response.json();
  return data.files.map((file: { id: string; name: string; webViewLink: string }) => ({
    id: file.id,
    name: file.name,
    url: file.webViewLink,
  }));
}

/**
 * Get sheets within a spreadsheet
 */
export async function getSheets(userId: string, spreadsheetId: string): Promise<SheetInfo[]> {
  const accessToken = await getAccessToken(userId, 'google');
  if (!accessToken) {
    throw new Error('Google not connected');
  }

  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get sheets');
  }

  const data = await response.json();
  return data.sheets.map((sheet: { properties: { sheetId: number; title: string; index: number } }) => ({
    sheetId: sheet.properties.sheetId,
    title: sheet.properties.title,
    index: sheet.properties.index,
  }));
}

/**
 * Read data from a range in a spreadsheet
 */
export async function readRange(
  userId: string,
  spreadsheetId: string,
  range: string
): Promise<CellRange> {
  const accessToken = await getAccessToken(userId, 'google');
  if (!accessToken) {
    throw new Error('Google not connected');
  }

  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to read range');
  }

  const data = await response.json();
  return {
    values: data.values || [],
  };
}

/**
 * Write data to a range in a spreadsheet
 */
export async function writeRange(
  userId: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const accessToken = await getAccessToken(userId, 'google');
  if (!accessToken) {
    throw new Error('Google not connected');
  }

  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to write range');
  }
}

/**
 * Append data to a spreadsheet
 */
export async function appendRows(
  userId: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const accessToken = await getAccessToken(userId, 'google');
  if (!accessToken) {
    throw new Error('Google not connected');
  }

  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to append rows');
  }
}

