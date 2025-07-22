# CrewFlow OAuth Integration - Production Deployment Guide

This guide covers the complete setup and deployment of CrewFlow's production-ready OAuth 2.0 integration system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [OAuth Provider Configuration](#oauth-provider-configuration)
5. [Security Configuration](#security-configuration)
6. [Deployment Steps](#deployment-steps)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 18+ 
- PostgreSQL 14+
- Redis (optional, for rate limiting)
- SSL certificate for HTTPS
- Domain with DNS access

### Required Accounts
- Supabase project (production tier)
- OAuth provider developer accounts
- Monitoring service (optional)

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://crewflow.ai

# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Security
OAUTH_ENCRYPTION_KEY=your-256-bit-encryption-key-here
CSRF_SECRET=your-csrf-secret-here
NEXTAUTH_SECRET=your-nextauth-secret-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Monitoring (Optional)
METRICS_ENDPOINT=https://your-metrics-endpoint
ALERT_WEBHOOK_URL=https://your-alert-webhook

# OAuth Providers (Add as needed)
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret

FACEBOOK_BUSINESS_CLIENT_ID=your-facebook-client-id
FACEBOOK_BUSINESS_CLIENT_SECRET=your-facebook-client-secret

GOOGLE_ADS_CLIENT_ID=your-google-client-id
GOOGLE_ADS_CLIENT_SECRET=your-google-client-secret

# Add more providers as needed...
```

### Security Key Generation

Generate secure keys for production:

```bash
# OAuth encryption key (256-bit)
openssl rand -hex 32

# CSRF secret
openssl rand -hex 32

# NextAuth secret
openssl rand -hex 32
```

## Database Setup

### 1. Supabase Configuration

1. Create a new Supabase project for production
2. Enable Row Level Security (RLS)
3. Run the database migration scripts:

```sql
-- Run the OAuth schema migration
\i database/migrations/001_oauth_schema_migration.sql
```

### 2. Database Optimization

Configure production database settings:

```sql
-- Optimize for production
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

## OAuth Provider Configuration

### Redirect URIs

Configure these redirect URIs in each OAuth provider:

- **OAuth Callback**: `https://crewflow.com/api/integrations/oauth/callback`
- **Webhook URL**: `https://crewflow.com/api/integrations/webhook/{provider-id}`

### Provider-Specific Setup

#### Facebook Business
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing
3. Add "Facebook Login" product
4. Configure redirect URI: `https://crewflow.com/api/integrations/oauth/callback`
5. Request required permissions in App Review

#### Google Workspace/Ads
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI
4. Configure OAuth consent screen
5. Request scope verification if needed

#### Salesforce
1. Go to Salesforce Setup → App Manager
2. Create new Connected App
3. Enable OAuth settings
4. Set callback URL and scopes
5. Configure IP restrictions if needed

#### Other Providers
Follow similar patterns for each provider. See `OAUTH_INTEGRATIONS_SETUP.md` for detailed instructions.

## Security Configuration

### 1. HTTPS/SSL Setup

Ensure HTTPS is properly configured:

```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    server_name crewflow.com www.crewflow.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Rate Limiting

Configure rate limiting at multiple levels:

- Application level (built-in)
- Reverse proxy level (Nginx/Cloudflare)
- Database level (connection pooling)

### 3. CORS Configuration

Ensure CORS is properly configured for production domains only.

## Deployment Steps

### 1. Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] OAuth providers configured
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Monitoring setup complete

### 2. Build and Deploy

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start ecosystem.config.js --env production
```

### 3. Post-deployment Verification

```bash
# Test OAuth configuration
curl -X GET "https://crewflow.com/api/integrations/test" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify database connectivity
curl -X GET "https://crewflow.com/api/health"

# Test OAuth flow
# Visit: https://crewflow.com/dashboard/integrations
```

## Monitoring & Maintenance

### 1. Health Checks

Set up automated health checks:

```bash
# Application health
GET /api/health

# OAuth system health
GET /api/integrations/recover

# Token management status
GET /api/integrations/tokens?action=health
```

### 2. Monitoring Metrics

Key metrics to monitor:

- OAuth success/failure rates
- Token refresh success rates
- API response times
- Database connection pool usage
- Error rates by integration

### 3. Automated Maintenance

Configure automated tasks:

```bash
# Token refresh service (runs automatically)
# Database cleanup (weekly)
# Log rotation (daily)
# Health check alerts (real-time)
```

### 4. Backup Strategy

- Database: Daily automated backups
- Configuration: Version controlled
- Logs: Retained for 30 days
- Metrics: Retained for 90 days

## Troubleshooting

### Common Issues

#### OAuth Callback Errors
```bash
# Check redirect URI configuration
# Verify SSL certificate
# Check CORS settings
```

#### Token Refresh Failures
```bash
# Check provider rate limits
# Verify refresh token validity
# Review error logs
```

#### Database Connection Issues
```bash
# Check connection string
# Verify SSL configuration
# Monitor connection pool
```

### Debug Mode

Enable debug logging temporarily:

```bash
# Set environment variable
LOG_LEVEL=debug

# Or use API endpoint
POST /api/integrations/tokens
{
  "action": "force_maintenance"
}
```

### Support Contacts

- Technical Issues: Check GitHub issues
- OAuth Provider Issues: Contact provider support
- Database Issues: Check Supabase status
- SSL/DNS Issues: Contact hosting provider

## Security Considerations

### Regular Security Tasks

1. **Monthly**: Review OAuth provider permissions
2. **Quarterly**: Rotate encryption keys
3. **Annually**: Security audit and penetration testing

### Incident Response

1. Disable affected integrations
2. Rotate compromised credentials
3. Review audit logs
4. Notify affected users
5. Document and improve

### Compliance

Ensure compliance with:
- GDPR (data protection)
- SOC 2 (security controls)
- Provider-specific requirements
- Industry regulations

## Performance Optimization

### Database Optimization
- Connection pooling
- Query optimization
- Index maintenance
- Regular VACUUM

### Application Optimization
- Caching strategies
- Rate limiting
- Connection reuse
- Error handling

### Infrastructure Optimization
- CDN configuration
- Load balancing
- Auto-scaling
- Geographic distribution

---

For additional support, refer to the technical documentation or contact the development team.
