import { getAccessToken } from '@/lib/integrationService';

const SLACK_API_URL = 'https://slack.com/api';

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  display_name: string;
}

export interface SlackMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    text: string;
    user: string;
    ts: string;
  };
}

/**
 * List channels the bot has access to
 */
export async function listChannels(userId: string): Promise<SlackChannel[]> {
  const accessToken = await getAccessToken(userId, 'slack');
  if (!accessToken) {
    throw new Error('Slack not connected');
  }

  const response = await fetch(
    `${SLACK_API_URL}/conversations.list?types=public_channel,private_channel&exclude_archived=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list channels');
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(data.error || 'Failed to list channels');
  }

  return data.channels.map((channel: { id: string; name: string; is_private: boolean; is_member: boolean }) => ({
    id: channel.id,
    name: channel.name,
    is_private: channel.is_private,
    is_member: channel.is_member,
  }));
}

/**
 * Send a message to a channel
 */
export async function sendMessage(
  userId: string,
  channelId: string,
  text: string,
  options?: {
    thread_ts?: string;
    blocks?: object[];
  }
): Promise<SlackMessageResponse> {
  const accessToken = await getAccessToken(userId, 'slack');
  if (!accessToken) {
    throw new Error('Slack not connected');
  }

  const body: Record<string, unknown> = {
    channel: channelId,
    text,
  };

  if (options?.thread_ts) {
    body.thread_ts = options.thread_ts;
  }

  if (options?.blocks) {
    body.blocks = options.blocks;
  }

  const response = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(data.error || 'Failed to send message');
  }

  return data;
}

/**
 * Get user info
 */
export async function getUserInfo(userId: string, slackUserId: string): Promise<SlackUser> {
  const accessToken = await getAccessToken(userId, 'slack');
  if (!accessToken) {
    throw new Error('Slack not connected');
  }

  const response = await fetch(
    `${SLACK_API_URL}/users.info?user=${slackUserId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(data.error || 'Failed to get user info');
  }

  return {
    id: data.user.id,
    name: data.user.name,
    real_name: data.user.real_name || data.user.name,
    display_name: data.user.profile?.display_name || data.user.name,
  };
}

/**
 * Join a channel (required before sending messages to public channels)
 */
export async function joinChannel(userId: string, channelId: string): Promise<void> {
  const accessToken = await getAccessToken(userId, 'slack');
  if (!accessToken) {
    throw new Error('Slack not connected');
  }

  const response = await fetch(`${SLACK_API_URL}/conversations.join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to join channel');
  }

  const data = await response.json();
  
  if (!data.ok && data.error !== 'already_in_channel') {
    throw new Error(data.error || 'Failed to join channel');
  }
}




