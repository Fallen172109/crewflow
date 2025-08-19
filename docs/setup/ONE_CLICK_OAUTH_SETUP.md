# One-Click OAuth Setup Guide for CrewFlow

## 🎯 Goal: True One-Click Connections

Users should only need to:
1. Click "Connect" button
2. Authorize permissions on the provider's site
3. Get redirected back to CrewFlow with full AI agent access

**No API keys, no developer accounts, no technical setup required from users!**

## 🏗️ Architecture Overview

```
User clicks "Connect" 
    ↓
CrewFlow Master OAuth App (your credentials)
    ↓
Provider OAuth (Facebook, Google, etc.)
    ↓
User authorizes permissions
    ↓
Tokens stored securely in CrewFlow
    ↓
AI agents can work autonomously in background
```

## 📋 Implementation Checklist

### ✅ Phase 1: Master OAuth Applications (CRITICAL)

**You need to create ONE OAuth app per provider that ALL users will connect through:**

#### Facebook Business App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app → **Business** type
3. Add products:
   - **Facebook Login** (for authentication)
   - **Marketing API** (for ads management)
   - **Pages API** (for page management)
4. Configure OAuth redirect:
   - Development: `http://localhost:3000/api/integrations/oauth/callback`
   - Production: `https://yourdomain.com/api/integrations/oauth/callback`
5. Request these scopes in App Review:
   ```
   public_profile, email, pages_show_list, pages_read_engagement,
   pages_manage_posts, pages_manage_metadata, pages_messaging,
   business_management, ads_management, read_insights
   ```
6. Copy App ID and App Secret to `.env.local`:
   ```
   CREWFLOW_FACEBOOK_CLIENT_ID=your_app_id
   CREWFLOW_FACEBOOK_CLIENT_SECRET=your_app_secret
   ```

#### Google Workspace/Ads App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "CrewFlow AI Manager"
3. Enable APIs:
   - Google Ads API
   - Gmail API
   - Google Drive API
   - Google Calendar API
4. Create OAuth 2.0 credentials
5. Configure authorized redirect URIs
6. Copy credentials to `.env.local`

#### Repeat for LinkedIn, Twitter, Shopify, etc.

### ✅ Phase 2: Database Setup

Run the migration to add autonomous action tables:

```bash
# Apply the migration
psql -d your_database -f database/migrations/002_autonomous_actions.sql
```

This creates:
- `agent_actions` - Tracks all AI agent actions
- `action_permissions` - User permissions for autonomous actions
- `autonomous_actions` - Scheduled background tasks
- `oauth_audit_log` - Security audit trail

### ✅ Phase 3: Environment Configuration

Copy the master OAuth template:

```bash
cp .env.master-oauth.example .env.local
```

Fill in your master OAuth credentials:

```env
# Facebook (REQUIRED for social media agents)
CREWFLOW_FACEBOOK_CLIENT_ID=123456789
CREWFLOW_FACEBOOK_CLIENT_SECRET=abc123def456

# Google (REQUIRED for marketing agents)
CREWFLOW_GOOGLE_CLIENT_ID=your-google-client-id
CREWFLOW_GOOGLE_CLIENT_SECRET=your-google-secret

# Add others as needed...
```

### ✅ Phase 4: Test the Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `/dashboard/integrations`

3. Click "Connect" on Facebook Business

4. You should be redirected to Facebook OAuth

5. After authorization, you're redirected back with tokens stored

6. AI agents can now work autonomously!

## 🤖 How AI Agents Use OAuth Tokens

### Example: Splash Agent (Social Media)

```typescript
// AI agent can now post autonomously
const actionManager = createAutonomousActionManager(userId)

const result = await actionManager.executeFacebookPost(
  pageId,
  {
    message: "AI-generated content based on trending topics",
    scheduled_publish_time: Date.now() + 3600000 // 1 hour from now
  },
  'splash' // agent ID
)

if (result.success) {
  console.log('Post created autonomously:', result.postId)
}
```

### Example: Coral Agent (Customer Support)

```typescript
// AI agent can reply to comments autonomously
const result = await actionManager.executeFacebookReply(
  commentId,
  "Thank you for your feedback! Our team will look into this.",
  'coral'
)
```

## 🔒 Security & Permissions

### Default Permissions (Auto-granted)

When users connect Facebook Business, they automatically get:

- **Post Creation**: 5 posts per day max
- **Comment Replies**: 20 replies per hour max
- **Analytics Access**: Unlimited (read-only)

### User Control

Users can:
- View all autonomous actions in their dashboard
- Adjust rate limits and permissions
- Disable autonomous actions anytime
- Revoke OAuth access completely

### Audit Trail

Every autonomous action is logged with:
- Timestamp and agent ID
- Action type and parameters
- Success/failure status
- User who authorized it

## 🚀 Production Deployment

### 1. Domain Verification

Update OAuth redirect URLs in all provider apps:
```
https://yourdomain.com/api/integrations/oauth/callback
```

### 2. Environment Variables

Set production environment variables:
```bash
# In your hosting platform (Vercel, Railway, etc.)
CREWFLOW_FACEBOOK_CLIENT_ID=prod_app_id
CREWFLOW_FACEBOOK_CLIENT_SECRET=prod_app_secret
# ... other credentials
```

### 3. App Reviews & Compliance

Submit apps for review with each provider:

- **Facebook**: Business verification + app review for advanced permissions
- **Google**: Security assessment for sensitive scopes
- **LinkedIn**: Company verification for marketing permissions

See `OAUTH_COMPLIANCE_GUIDE.md` for detailed requirements.

## 🎉 User Experience

### Before (Complex)
1. User creates Facebook Developer account
2. User creates Facebook app
3. User configures OAuth settings
4. User copies API keys to CrewFlow
5. User tests connection
6. User grants permissions manually for each action

### After (One-Click)
1. User clicks "Connect" ✨
2. User authorizes on Facebook
3. Done! AI agents work autonomously 🤖

## 🔧 Troubleshooting

### "OAuth not configured" error
- Check that `CREWFLOW_FACEBOOK_CLIENT_ID` is set
- Verify the client secret is correct
- Ensure the integration is listed in `master-oauth.ts`

### "Invalid redirect URI" error
- Update redirect URI in Facebook app settings
- Ensure it matches exactly: `https://yourdomain.com/api/integrations/oauth/callback`

### "Insufficient permissions" error
- Check that your Facebook app has requested the required scopes
- Submit app for review if using advanced permissions
- Verify business verification is complete

### Tokens expire
- The system automatically refreshes tokens
- Check `oauth_audit_log` table for refresh attempts
- Re-authorize if refresh tokens are invalid

## 📊 Monitoring

Track OAuth health in your dashboard:

```sql
-- Check recent connections
SELECT integration_id, COUNT(*) as connections
FROM api_connections 
WHERE status = 'connected' 
  AND connected_at > NOW() - INTERVAL '7 days'
GROUP BY integration_id;

-- Check autonomous action success rate
SELECT action_type, 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'completed') as successful
FROM agent_actions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action_type;
```

## 🎯 Next Steps

1. **Set up Facebook Business app** (highest priority)
2. **Configure Google Workspace app** (for marketing agents)
3. **Test one-click flow** with real users
4. **Submit apps for review** (can take 2-4 weeks)
5. **Add more integrations** (LinkedIn, Twitter, Shopify)
6. **Monitor usage and optimize** rate limits

With this setup, your users get the seamless experience they expect - just click "Connect" and let the AI agents handle everything else! 🚀
