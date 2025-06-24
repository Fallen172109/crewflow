# CrewFlow OAuth Integration - Developer Setup Guide

This guide will help you set up the CrewFlow OAuth integration system for development and testing.

## Prerequisites

### Required Software
- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)
- PostgreSQL client (optional, for local DB)

### Required Accounts
- Supabase account (free tier is sufficient for development)
- OAuth provider developer accounts (see [Provider Setup](#oauth-provider-setup))

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/crewflow.git
cd crewflow

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 2. Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Configure Environment Variables**
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Run Database Migrations**
   ```sql
   -- In Supabase SQL Editor, run:
   \i database/migrations/001_oauth_schema_migration.sql
   ```

### 3. Security Configuration

```bash
# Generate encryption keys
OAUTH_ENCRYPTION_KEY=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

# Add to .env.local
echo "OAUTH_ENCRYPTION_KEY=$OAUTH_ENCRYPTION_KEY" >> .env.local
echo "CSRF_SECRET=$CSRF_SECRET" >> .env.local
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.local
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## OAuth Provider Setup

### Facebook Business

1. **Create Facebook App**
   - Go to [developers.facebook.com](https://developers.facebook.com)
   - Create new app → Business type
   - Add "Facebook Login" product

2. **Configure OAuth Settings**
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/integrations/oauth/callback`
   - App Domains: `localhost`

3. **Add Credentials**
   ```bash
   # Add to .env.local
   FACEBOOK_BUSINESS_CLIENT_ID=your-app-id
   FACEBOOK_BUSINESS_CLIENT_SECRET=your-app-secret
   ```

### Google Workspace/Ads

1. **Create Google Cloud Project**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project
   - Enable required APIs (Gmail, Drive, Ads, etc.)

2. **Create OAuth Credentials**
   - Go to Credentials → Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/integrations/oauth/callback`

3. **Add Credentials**
   ```bash
   # Add to .env.local
   GOOGLE_WORKSPACE_CLIENT_ID=your-client-id
   GOOGLE_WORKSPACE_CLIENT_SECRET=your-client-secret
   ```

### Salesforce

1. **Create Connected App**
   - Go to Salesforce Setup → App Manager
   - New Connected App
   - Enable OAuth Settings
   - Callback URL: `http://localhost:3000/api/integrations/oauth/callback`
   - Selected OAuth Scopes: `api`, `refresh_token`, `offline_access`

2. **Add Credentials**
   ```bash
   # Add to .env.local
   SALESFORCE_CLIENT_ID=your-consumer-key
   SALESFORCE_CLIENT_SECRET=your-consumer-secret
   ```

### Additional Providers

Follow similar patterns for other providers. See `OAUTH_INTEGRATIONS_SETUP.md` for detailed instructions.

## Development Workflow

### 1. Testing OAuth Flows

```bash
# Start the development server
npm run dev

# Navigate to Integration Hub
open http://localhost:3000/dashboard/integrations

# Test connection flow:
# 1. Click "Connect" on any configured integration
# 2. Complete OAuth flow on provider site
# 3. Verify successful connection in dashboard
```

### 2. Running Tests

```bash
# Run all tests
npm test

# Run OAuth-specific tests
npm run test:oauth

# Run integration tests (requires configured providers)
npm run test:integration

# Run with coverage
npm run test:coverage
```

### 3. API Testing

```bash
# Test OAuth configuration
curl -X GET "http://localhost:3000/api/integrations/config?action=validate" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test integration status
curl -X GET "http://localhost:3000/api/integrations/status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Run integration tests
curl -X POST "http://localhost:3000/api/integrations/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "test_all"}'
```

### 4. Database Management

```bash
# View OAuth integrations
npx supabase db inspect

# Reset OAuth data (development only)
npx supabase db reset

# Backup development data
npx supabase db dump > backup.sql
```

## Development Tools

### VS Code Extensions

Recommended extensions for development:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode"
  ]
}
```

### Environment Validation

```bash
# Validate your setup
npm run validate:env

# Check OAuth configuration
npm run check:oauth

# Test database connection
npm run test:db
```

### Debug Mode

Enable detailed logging:

```bash
# Add to .env.local
LOG_LEVEL=debug
DEBUG_OAUTH=true

# Restart development server
npm run dev
```

## Common Development Tasks

### Adding a New OAuth Provider

1. **Update Configuration**
   ```typescript
   // src/lib/integrations/config.ts
   export const INTEGRATIONS = {
     // ... existing integrations
     'new-provider': {
       id: 'new-provider',
       name: 'New Provider',
       description: 'Description of the provider',
       logo: '/integrations/new-provider.png',
       category: 'category',
       authType: 'oauth2',
       productionReady: false, // Set to true when ready
       // ... OAuth configuration
     }
   }
   ```

2. **Add Environment Variables**
   ```bash
   NEW_PROVIDER_CLIENT_ID=your-client-id
   NEW_PROVIDER_CLIENT_SECRET=your-client-secret
   ```

3. **Test Integration**
   ```bash
   npm run test:integration -- --provider=new-provider
   ```

### Debugging OAuth Issues

1. **Enable Debug Logging**
   ```bash
   DEBUG_OAUTH=true npm run dev
   ```

2. **Check Network Requests**
   - Open browser dev tools
   - Monitor Network tab during OAuth flow
   - Check for failed requests or CORS issues

3. **Validate State Parameters**
   ```bash
   # Decode OAuth state parameter
   echo "base64-state-string" | base64 -d | jq
   ```

### Testing Error Recovery

```bash
# Simulate token expiration
curl -X POST "http://localhost:3000/api/integrations/recover" \
  -H "Content-Type: application/json" \
  -d '{"integrationId": "salesforce", "errorCode": "TOKEN_EXPIRED"}'

# Test bulk recovery
curl -X PUT "http://localhost:3000/api/integrations/recover"
```

## Troubleshooting

### Common Issues

#### "OAuth client not configured" Error
- Check environment variables are set correctly
- Restart development server after adding new variables
- Verify provider credentials are valid

#### CORS Errors
- Ensure redirect URI matches exactly in provider settings
- Check for trailing slashes in URLs
- Verify localhost is allowed in development

#### Database Connection Issues
- Check Supabase project status
- Verify connection string format
- Ensure database migrations are applied

#### Token Refresh Failures
- Check provider refresh token settings
- Verify token expiration handling
- Test with fresh OAuth connection

### Getting Help

1. **Check Documentation**
   - `OAUTH_INTEGRATION_DOCUMENTATION.md`
   - `PRODUCTION_DEPLOYMENT_GUIDE.md`
   - Provider-specific setup guides

2. **Debug Tools**
   - Browser developer tools
   - Supabase dashboard logs
   - Application debug logs

3. **Community Support**
   - GitHub issues
   - Development team Slack
   - Stack Overflow (tag: crewflow-oauth)

## Next Steps

After completing the setup:

1. **Explore the Integration Hub** at `/dashboard/integrations`
2. **Test OAuth flows** with configured providers
3. **Review the API documentation** for integration details
4. **Set up monitoring** for production deployment
5. **Configure additional providers** as needed

For production deployment, see `PRODUCTION_DEPLOYMENT_GUIDE.md`.

---

Happy coding! 🚀
