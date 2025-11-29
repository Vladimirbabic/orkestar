# Setting Up OAuth Integrations

This guide walks you through setting up OAuth credentials for Google Sheets, Slack, and Notion integrations.

## Google Sheets

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name it (e.g., "Orkestar Workflows")
4. Click "Create"

### 2. Enable APIs

1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google Sheets API**
   - **Google Drive API**

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace org)
3. Fill in required fields:
   - App name: "Orkestar"
   - User support email: your email
   - Developer contact email: your email
4. Click "Save and Continue"
5. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.readonly`
6. Add test users (your Google email) while in testing mode
7. Complete the setup

### 4. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Orkestar Web Client"
5. Add Authorized redirect URIs:
   - `http://localhost:3000/api/integrations/google/callback` (development)
   - `https://your-domain.com/api/integrations/google/callback` (production)
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

### 5. Add to Environment Variables

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

---

## Slack

### 1. Create a Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it "Orkestar" and select your workspace
4. Click "Create App"

### 2. Configure OAuth & Permissions

1. In the left sidebar, click "OAuth & Permissions"
2. Under "Redirect URLs", add:
   - `http://localhost:3000/api/integrations/slack/callback` (development)
   - `https://your-domain.com/api/integrations/slack/callback` (production)
3. Under "Scopes" → "Bot Token Scopes", add:
   - `chat:write` - Send messages
   - `channels:read` - View channel list
   - `users:read` - View user info
4. Under "User Token Scopes", add:
   - `channels:read`

### 3. Get Credentials

1. Go to "Basic Information" in the sidebar
2. Under "App Credentials", copy:
   - **Client ID**
   - **Client Secret**

### 4. Add to Environment Variables

```env
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
```

---

## Notion

### 1. Create a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "Orkestar"
4. Select the workspace to associate with
5. Click "Submit"

### 2. Configure OAuth

1. In your integration settings, go to "Distribution"
2. Toggle on "Public integration"
3. Add redirect URI:
   - `http://localhost:3000/api/integrations/notion/callback` (development)
   - `https://your-domain.com/api/integrations/notion/callback` (production)
4. Under "Capabilities", ensure these are enabled:
   - Read content
   - Update content
   - Insert content

### 3. Get Credentials

1. Go to "Secrets" tab
2. Copy:
   - **OAuth client ID**
   - **OAuth client secret**

### 4. Add to Environment Variables

```env
NOTION_CLIENT_ID=your_client_id_here
NOTION_CLIENT_SECRET=your_client_secret_here
```

---

## Testing the Integrations

1. Start the development server: `npm run dev`
2. Open a workflow in the builder
3. Drag an integration node (Google Sheets, Slack, or Notion) to the canvas
4. Click the "Connect" button on the node
5. Complete the OAuth flow in the popup
6. You should see a "Connected" status on the node

## Troubleshooting

### "redirect_uri_mismatch" error
- Ensure your redirect URI in the OAuth provider matches exactly what's in your code
- Check for trailing slashes
- Verify you're using the correct environment (localhost vs production)

### "invalid_client" error
- Double-check your Client ID and Secret
- Ensure there are no extra spaces in your environment variables

### Integration not showing as connected
- Check browser console for errors
- Verify the database migration has been run
- Check that your Supabase RLS policies allow the insert

## Production Deployment

When deploying to production:

1. Update all redirect URIs in each OAuth provider to use your production domain
2. Set the production environment variables in your hosting platform
3. Update `NEXT_PUBLIC_APP_URL` to your production URL


