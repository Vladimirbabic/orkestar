import { getAccessToken } from '@/lib/integrationService';

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon?: string;
  parent_type: 'database' | 'page' | 'workspace';
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export interface NotionSearchResult {
  pages: NotionPage[];
  databases: NotionDatabase[];
}

/**
 * Search for pages and databases
 */
export async function search(
  userId: string,
  query?: string,
  filter?: 'page' | 'database'
): Promise<NotionSearchResult> {
  const accessToken = await getAccessToken(userId, 'notion');
  if (!accessToken) {
    throw new Error('Notion not connected');
  }

  const body: Record<string, unknown> = {};
  if (query) {
    body.query = query;
  }
  if (filter) {
    body.filter = { property: 'object', value: filter };
  }

  const response = await fetch(`${NOTION_API_URL}/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to search Notion');
  }

  const data = await response.json();

  const pages: NotionPage[] = [];
  const databases: NotionDatabase[] = [];

  for (const result of data.results) {
    if (result.object === 'page') {
      const title = extractPageTitle(result);
      pages.push({
        id: result.id,
        title,
        url: result.url,
        icon: result.icon?.emoji || result.icon?.external?.url,
        parent_type: result.parent?.type || 'workspace',
      });
    } else if (result.object === 'database') {
      const title = result.title?.[0]?.plain_text || 'Untitled';
      databases.push({
        id: result.id,
        title,
        url: result.url,
        icon: result.icon?.emoji || result.icon?.external?.url,
      });
    }
  }

  return { pages, databases };
}

/**
 * Get a page's content
 */
export async function getPage(userId: string, pageId: string): Promise<NotionPage> {
  const accessToken = await getAccessToken(userId, 'notion');
  if (!accessToken) {
    throw new Error('Notion not connected');
  }

  const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get page');
  }

  const data = await response.json();
  const title = extractPageTitle(data);

  return {
    id: data.id,
    title,
    url: data.url,
    icon: data.icon?.emoji || data.icon?.external?.url,
    parent_type: data.parent?.type || 'workspace',
  };
}

/**
 * Create a new page
 */
export async function createPage(
  userId: string,
  parentId: string,
  parentType: 'page' | 'database',
  title: string,
  content?: string
): Promise<NotionPage> {
  const accessToken = await getAccessToken(userId, 'notion');
  if (!accessToken) {
    throw new Error('Notion not connected');
  }

  const body: Record<string, unknown> = {
    parent: parentType === 'database' 
      ? { database_id: parentId }
      : { page_id: parentId },
    properties: parentType === 'database'
      ? { title: { title: [{ text: { content: title } }] } }
      : { title: { title: [{ text: { content: title } }] } },
  };

  // Add content as a paragraph block if provided
  if (content) {
    body.children = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content } }],
        },
      },
    ];
  }

  const response = await fetch(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Notion create page error:', error);
    throw new Error('Failed to create page');
  }

  const data = await response.json();

  return {
    id: data.id,
    title,
    url: data.url,
    icon: data.icon?.emoji || data.icon?.external?.url,
    parent_type: parentType,
  };
}

/**
 * Append content to a page
 */
export async function appendToPage(
  userId: string,
  pageId: string,
  content: string
): Promise<void> {
  const accessToken = await getAccessToken(userId, 'notion');
  if (!accessToken) {
    throw new Error('Notion not connected');
  }

  const response = await fetch(`${NOTION_API_URL}/blocks/${pageId}/children`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content } }],
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to append to page');
  }
}

/**
 * Add a row to a database
 */
export async function addDatabaseRow(
  userId: string,
  databaseId: string,
  properties: Record<string, unknown>
): Promise<NotionPage> {
  const accessToken = await getAccessToken(userId, 'notion');
  if (!accessToken) {
    throw new Error('Notion not connected');
  }

  const response = await fetch(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Notion add row error:', error);
    throw new Error('Failed to add database row');
  }

  const data = await response.json();
  const title = extractPageTitle(data);

  return {
    id: data.id,
    title,
    url: data.url,
    icon: data.icon?.emoji || data.icon?.external?.url,
    parent_type: 'database',
  };
}

/**
 * Helper to extract page title from various property formats
 */
function extractPageTitle(page: Record<string, unknown>): string {
  const properties = page.properties as Record<string, { title?: Array<{ plain_text: string }>; type?: string }> | undefined;
  if (!properties) return 'Untitled';

  // Look for title property
  for (const [, prop] of Object.entries(properties)) {
    if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
      return prop.title[0].plain_text;
    }
  }

  // Check for Name property (common in databases)
  if (properties.Name?.title?.[0]?.plain_text) {
    return properties.Name.title[0].plain_text;
  }

  // Check for title property directly
  if (properties.title?.title?.[0]?.plain_text) {
    return properties.title.title[0].plain_text;
  }

  return 'Untitled';
}

