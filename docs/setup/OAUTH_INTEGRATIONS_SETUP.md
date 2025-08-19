# OAuth Integrations Setup Guide

This guide will help you set up OAuth integrations for CrewFlow so all third-party services work with one-click authentication.

## Quick Start

1. **Copy environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in required values** (see sections below for each service)

3. **Test integrations** at `/dashboard/integrations`

## Required for Core Functionality

### Supabase (Database & Auth)
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Create/select your project
- Go to Settings → API
- Copy:
  - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/public key)
  - `SUPABASE_SERVICE_ROLE_KEY` (service_role key)

### AI Services (Required for Agents)

#### OpenAI
- Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
- Create new secret key
- Copy to `OPENAI_API_KEY`

#### Perplexity AI
- Go to [Perplexity API](https://www.perplexity.ai/settings/api)
- Generate API key
- Copy to `PERPLEXITY_API_KEY`

## OAuth Integration Setup

### Facebook Business (Recommended)

1. **Create Facebook App**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create new app → Business type
   - Add Facebook Login product

2. **Configure OAuth**:
   - In Facebook Login settings:
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/integrations/oauth/callback`
   - For production: `https://yourdomain.com/api/integrations/oauth/callback`

3. **Get credentials**:
   - App ID → `FACEBOOK_BUSINESS_CLIENT_ID`
   - App Secret → `FACEBOOK_BUSINESS_CLIENT_SECRET`

4. **Request permissions**:
   - Submit for review: `pages_manage_posts`, `pages_read_engagement`, `business_management`

### Google Ads

1. **Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project or select existing
   - Enable Google Ads API

2. **OAuth Setup**:
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/integrations/oauth/callback`

3. **Copy credentials**:
   - Client ID → `GOOGLE_ADS_CLIENT_ID`
   - Client Secret → `GOOGLE_ADS_CLIENT_SECRET`

### Salesforce

1. **Salesforce Setup**:
   - Go to Setup → App Manager
   - New Connected App
   - Enable OAuth Settings
   - Callback URL: `http://localhost:3000/api/integrations/oauth/callback`
   - Scopes: `Access and manage your data (api)`, `Perform requests on your behalf at any time (refresh_token, offline_access)`

2. **Copy credentials**:
   - Consumer Key → `SALESFORCE_CLIENT_ID`
   - Consumer Secret → `SALESFORCE_CLIENT_SECRET`

### HubSpot

1. **HubSpot App**:
   - Go to [HubSpot Developer](https://developers.hubspot.com/)
   - Create app
   - Auth tab → Add redirect URL: `http://localhost:3000/api/integrations/oauth/callback`

2. **Copy credentials**:
   - Client ID → `HUBSPOT_CLIENT_ID`
   - Client Secret → `HUBSPOT_CLIENT_SECRET`

### Slack

1. **Slack App**:
   - Go to [Slack API](https://api.slack.com/apps)
   - Create New App → From scratch
   - OAuth & Permissions → Redirect URLs: `http://localhost:3000/api/integrations/oauth/callback`

2. **Copy credentials**:
   - Client ID → `SLACK_CLIENT_ID`
   - Client Secret → `SLACK_CLIENT_SECRET`

## Testing Integrations

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Visit integrations page**:
   ```
   http://localhost:3000/dashboard/integrations
   ```

3. **Test OAuth flow**:
   - Click "Connect" on any integration
   - Should redirect to service's OAuth page
   - After authorization, should redirect back with success message

## Troubleshooting

### Common Issues

1. **"OAuth client not configured"**:
   - Check environment variables are set correctly
   - Restart development server after adding new variables

2. **"Invalid redirect URI"**:
   - Ensure redirect URI in service matches exactly: `http://localhost:3000/api/integrations/oauth/callback`
   - For production, use your domain: `https://yourdomain.com/api/integrations/oauth/callback`

3. **"Insufficient permissions"**:
   - Check if app needs approval for requested scopes
   - Some services require business verification

### Debug Mode

Enable debug logging:
```bash
DEBUG=crewflow:* npm run dev
```

Check browser console and server logs for detailed error messages.

## Production Deployment

1. **Update redirect URIs** in all OAuth apps to use production domain
2. **Set production environment variables** in your hosting platform
3. **Test each integration** in production environment

## Security Notes

- Never commit `.env.local` to version control
- Use different OAuth apps for development and production
- Regularly rotate API keys and secrets
- Monitor OAuth app usage and permissions
