# CrewFlow OAuth Integration System - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Quick Start](#quick-start)
5. [API Reference](#api-reference)
6. [Components](#components)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)
9. [Contributing](#contributing)

## Overview

CrewFlow's OAuth Integration System is a production-ready, secure, and scalable solution for managing OAuth 2.0 connections with third-party services. It provides one-click authentication, automatic token management, error recovery, and comprehensive monitoring.

### Key Benefits

- **One-Click Integration**: Seamless OAuth flows for non-technical users
- **Production Ready**: Enterprise-grade security and scalability
- **Automatic Recovery**: Self-healing token refresh and error recovery
- **Comprehensive Monitoring**: Real-time health checks and analytics
- **Developer Friendly**: Well-documented APIs and React components

### Supported Providers

- **CRM**: Salesforce, HubSpot
- **E-commerce**: Shopify, Stripe
- **Marketing**: Facebook Business, Google Ads, Mailchimp
- **Productivity**: Google Workspace, Slack, Asana, Monday.com
- **Social**: LinkedIn, Twitter, Discord
- **Development**: Jira

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   API Routes    │    │   OAuth Manager │
│                 │    │                 │    │                 │
│ - IntegrationHub│◄──►│ - /connect      │◄──►│ - Token Mgmt    │
│ - ErrorRecovery │    │ - /callback     │    │ - Security      │
│ - TokenManager  │    │ - /status       │    │ - Recovery      │
│ - TestDashboard │    │ - /test         │    │ - Validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Supabase DB   │
                       │                 │
                       │ - oauth_integrations
                       │ - oauth_audit_log
                       │ - encrypted tokens
                       └─────────────────┘
```

### Data Flow

1. **User Initiates Connection**: Click "Connect" in Integration Hub
2. **OAuth URL Generation**: System generates secure authorization URL
3. **Provider Authorization**: User authorizes on provider's site
4. **Callback Processing**: System receives and validates callback
5. **Token Exchange**: Authorization code exchanged for access tokens
6. **Secure Storage**: Tokens encrypted and stored in database
7. **Automatic Refresh**: Background service maintains token validity

## Features

### Core Features

#### 1. OAuth 2.0 Flow Management
- PKCE support for enhanced security
- State parameter validation
- Automatic token refresh
- Error handling and recovery

#### 2. Security
- Token encryption at rest
- Rate limiting and CSRF protection
- Audit logging for compliance
- Secure state management

#### 3. Error Recovery
- Automatic retry with exponential backoff
- Token refresh failure recovery
- Connection health monitoring
- User-friendly error messages

#### 4. Token Management
- Background refresh service
- Expiration monitoring
- Bulk operations
- Health status tracking

#### 5. Testing & Validation
- Comprehensive test suites
- Configuration validation
- Health checks
- Performance monitoring

### Advanced Features

#### 1. Production Configuration
- Environment-specific settings
- Scalability optimizations
- Monitoring integration
- Deployment automation

#### 2. Integration Hub UI
- Real-time status updates
- Search and filtering
- Bulk operations
- Error recovery interface

#### 3. Developer Tools
- API testing endpoints
- Configuration validation
- Debug logging
- Performance metrics

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/crewflow.git
cd crewflow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### 2. Environment Configuration

```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth encryption key (generate with: openssl rand -hex 32)
OAUTH_ENCRYPTION_KEY=your-256-bit-encryption-key

# OAuth provider credentials (example)
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret
```

### 3. Database Setup

```sql
-- Run the OAuth schema migration
\i database/migrations/001_oauth_schema_migration.sql
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Configure OAuth Providers

1. Visit each provider's developer console
2. Create OAuth applications
3. Set redirect URI: `http://localhost:3000/api/integrations/oauth/callback`
4. Add client credentials to environment variables

## API Reference

### Authentication Endpoints

#### POST /api/integrations/connect
Initiate OAuth connection for an integration.

```typescript
// Request
{
  "integrationId": "salesforce",
  "returnUrl": "/dashboard/integrations"
}

// Response
{
  "authUrl": "https://login.salesforce.com/services/oauth2/authorize?...",
  "integration": {
    "id": "salesforce",
    "name": "Salesforce",
    "authType": "oauth2"
  }
}
```

#### GET /api/integrations/oauth/callback
Handle OAuth provider callback (automatic).

### Status Endpoints

#### GET /api/integrations/status
Get integration connection status.

```typescript
// Response
{
  "connections": [
    {
      "connected": true,
      "integration": {
        "id": "salesforce",
        "name": "Salesforce"
      },
      "status": "connected",
      "connectedAt": "2024-01-01T00:00:00Z",
      "lastUsed": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### DELETE /api/integrations/status
Disconnect an integration.

```typescript
// Request
{
  "integrationId": "salesforce"
}

// Response
{
  "success": true,
  "disconnectedAt": "2024-01-01T12:00:00Z"
}
```

### Management Endpoints

#### GET /api/integrations/tokens
Get token management status.

#### POST /api/integrations/tokens
Perform token operations.

#### GET /api/integrations/recover
Get recovery status and health check.

#### POST /api/integrations/recover
Attempt error recovery.

#### POST /api/integrations/test
Run integration tests.

#### GET /api/integrations/config
Get production configuration status.

## Components

### IntegrationHub

Main interface for managing OAuth integrations.

```tsx
import IntegrationHub from '@/components/integrations/IntegrationHub'

<IntegrationHub className="w-full" />
```

**Features:**
- Real-time connection status
- One-click connect/disconnect
- Search and filtering
- Error recovery interface

### ErrorRecovery

Automatic error recovery and troubleshooting.

```tsx
import ErrorRecovery from '@/components/integrations/ErrorRecovery'

<ErrorRecovery 
  integrationId="salesforce"
  errorCode="TOKEN_EXPIRED"
  onRecoveryComplete={(success) => console.log(success)}
/>
```

### TokenManager

Token lifecycle management dashboard.

```tsx
import TokenManager from '@/components/integrations/TokenManager'

<TokenManager className="w-full" />
```

### TestingDashboard

Integration testing and validation interface.

```tsx
import TestingDashboard from '@/components/integrations/TestingDashboard'

<TestingDashboard integrationId="salesforce" />
```

### ProductionConfig

Production configuration monitoring.

```tsx
import ProductionConfig from '@/components/integrations/ProductionConfig'

<ProductionConfig className="w-full" />
```

## Security

### Token Security
- AES-256-GCM encryption for stored tokens
- Secure key derivation with scrypt
- Encrypted refresh tokens
- Token rotation on refresh

### Request Security
- CSRF protection with secure tokens
- Rate limiting per user and IP
- Origin validation in production
- Request signing for webhooks

### Audit & Compliance
- Comprehensive audit logging
- Security violation tracking
- Access pattern monitoring
- Compliance reporting

### Best Practices
- Regular key rotation
- Principle of least privilege
- Secure defaults
- Input validation

## Troubleshooting

### Common Issues

#### OAuth Callback Errors
```
Error: Invalid state parameter
```
**Solution**: Check redirect URI configuration and ensure HTTPS in production.

#### Token Refresh Failures
```
Error: Refresh token expired
```
**Solution**: User needs to reconnect the integration.

#### Rate Limiting
```
Error: Too many requests
```
**Solution**: Implement exponential backoff or contact provider for rate limit increase.

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Health Checks

Monitor system health:
```bash
curl -X GET "http://localhost:3000/api/integrations/recover"
```

### Configuration Validation

Validate setup:
```bash
curl -X GET "http://localhost:3000/api/integrations/config?action=validate"
```

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Jest for testing

### Testing

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run OAuth flow tests
npm run test:oauth
```

### Documentation

- Update API documentation for new endpoints
- Add JSDoc comments for new functions
- Update README for new features
- Include examples in documentation

---

For additional support, please refer to the specific setup guides or contact the development team.
