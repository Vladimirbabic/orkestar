/**
 * AutoSend Email Integration Service
 * 
 * Provides email sending capabilities via the AutoSend API
 * Documentation: https://docs.autosend.com/
 */

const AUTOSEND_API_URL = 'https://api.autosend.com';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailSender {
  email: string;
  name?: string;
}

export interface SendEmailRequest {
  to: EmailRecipient | EmailRecipient[];
  from: EmailSender;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailRequest {
  emails: SendEmailRequest[];
}

/**
 * Send a single email via AutoSend API
 */
export async function sendEmail(
  apiKey: string,
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  if (!apiKey) {
    return { success: false, error: 'AutoSend API key not configured' };
  }

  try {
    const response = await fetch(`${AUTOSEND_API_URL}/v1/mails/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      messageId: data.id || data.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send bulk emails via AutoSend API
 */
export async function sendBulkEmail(
  apiKey: string,
  emails: SendEmailRequest[]
): Promise<{ success: boolean; results: SendEmailResponse[]; error?: string }> {
  if (!apiKey) {
    return { success: false, results: [], error: 'AutoSend API key not configured' };
  }

  try {
    const response = await fetch(`${AUTOSEND_API_URL}/v1/mails/send/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        results: [],
        error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      results: data.results || [],
    };
  } catch (error) {
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Failed to send bulk emails',
    };
  }
}

/**
 * Build email HTML from a template with variable substitution
 */
export function buildEmailHtml(
  template: string,
  variables: Record<string, string>
): string {
  let html = template;
  
  for (const [key, value] of Object.entries(variables)) {
    // Replace {{variable}} patterns
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(regex, value);
  }
  
  return html;
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse email string that may contain name
 * Accepts formats like: "John Doe <john@example.com>" or "john@example.com"
 */
export function parseEmailString(emailStr: string): EmailRecipient {
  const match = emailStr.match(/^(.+?)\s*<([^>]+)>$/);
  
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim(),
    };
  }
  
  return { email: emailStr.trim() };
}

/**
 * Create a simple HTML email template
 */
export function createSimpleEmailTemplate(
  content: string,
  options?: {
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  }
): string {
  const {
    backgroundColor = '#ffffff',
    textColor = '#333333',
    fontFamily = 'Arial, sans-serif',
  } = options || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: ${fontFamily};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 30px; color: ${textColor}; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}




