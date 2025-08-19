# CrewFlow OAuth Integration API Reference

Complete API reference for the CrewFlow OAuth integration system.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://crewflow.com`

## Authentication

All API endpoints require authentication via Bearer token:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

## Rate Limiting

- **Development**: No limits
- **Production**: 100 requests per minute per user

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Endpoints

### OAuth Connection Management

#### POST /api/integrations/connect

Initiate OAuth connection for an integration.

**Request Body:**
```json
{
  "integrationId": "salesforce",
  "returnUrl": "/dashboard/integrations",
  "additionalParams": {}
}
```

**Response:**
```json
{
  "authUrl": "https://login.salesforce.com/services/oauth2/authorize?...",
  "integration": {
    "id": "salesforce",
    "name": "Salesforce",
    "authType": "oauth2",
    "scopes": ["api", "refresh_token"],
    "features": {
      "webhooks": true,
      "realTimeSync": true
    }
  },
  "security": {
    "pkceEnabled": true,
    "refreshTokenSupported": true
  }
}
```

**Error Codes:**
- `MISSING_INTEGRATION_ID`: Integration ID is required
- `INTEGRATION_NOT_FOUND`: Integration not found
- `OAUTH_NOT_CONFIGURED`: OAuth credentials not configured
- `NOT_PRODUCTION_READY`: Integration not available in production

---

#### GET /api/integrations/oauth/callback

Handle OAuth provider callback (automatic redirect).

**Query Parameters:**
- `code`: Authorization code from provider
- `state`: OAuth state parameter
- `error`: Error code (if authorization failed)

**Redirects to:**
- Success: `/dashboard/integrations?success=Integration connected successfully`
- Error: `/dashboard/integrations?error=Error message`

---

### Connection Status

#### GET /api/integrations/status

Get integration connection status.

**Query Parameters:**
- `integration`: Specific integration ID (optional)
- `include_all`: Include beta integrations (optional)

**Response (All Connections):**
```json
{
  "connections": [
    {
      "connected": true,
      "integration": {
        "id": "salesforce",
        "name": "Salesforce",
        "category": "crm",
        "features": {
          "webhooks": true,
          "realTimeSync": true
        }
      },
      "status": "connected",
      "connectionHealth": "healthy",
      "connectedAt": "2024-01-01T00:00:00Z",
      "lastUsed": "2024-01-01T12:00:00Z",
      "expiresAt": "2024-01-02T00:00:00Z",
      "scope": "api refresh_token",
      "providerInfo": {
        "userId": "provider-user-id",
        "username": "user@example.com",
        "email": "user@example.com"
      }
    }
  ],
  "summary": {
    "total": 5,
    "connected": 3,
    "disconnected": 1,
    "errors": 1,
    "expired": 0
  }
}
```

**Response (Single Integration):**
```json
{
  "integration": "salesforce",
  "status": {
    "connected": true,
    "status": "connected",
    "connectionHealth": "healthy",
    "connectedAt": "2024-01-01T00:00:00Z",
    "lastUsed": "2024-01-01T12:00:00Z",
    "expiresAt": "2024-01-02T00:00:00Z",
    "scope": "api refresh_token"
  },
  "integration_info": {
    "name": "Salesforce",
    "category": "crm",
    "features": {
      "webhooks": true
    }
  }
}
```

---

#### DELETE /api/integrations/status

Disconnect an integration.

**Request Body:**
```json
{
  "integrationId": "salesforce"
}
```

**Response:**
```json
{
  "success": true,
  "integration": "salesforce",
  "disconnectedAt": "2024-01-01T12:00:00Z"
}
```

---

#### POST /api/integrations/status

Test integration connection health.

**Request Body:**
```json
{
  "integrationId": "salesforce"
}
```

**Response:**
```json
{
  "integration": "salesforce",
  "test": {
    "healthy": true,
    "error": null,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

### Token Management

#### GET /api/integrations/tokens

Get token management status and statistics.

**Query Parameters:**
- `action`: `health` | `stats` (optional)

**Response:**
```json
{
  "stats": {
    "total": 10,
    "active": 8,
    "expired": 1,
    "expiringSoon": 1,
    "refreshed": 5,
    "failed": 0
  },
  "serviceRunning": true,
  "nextMaintenance": "2024-01-01T12:15:00Z"
}
```

---

#### POST /api/integrations/tokens

Perform token operations.

**Request Body (Refresh Token):**
```json
{
  "action": "refresh",
  "integrationId": "salesforce"
}
```

**Request Body (Force Maintenance):**
```json
{
  "action": "force_maintenance"
}
```

**Response:**
```json
{
  "refresh": {
    "success": true,
    "integrationId": "salesforce",
    "userId": "user-id",
    "nextRefreshAt": "2024-01-01T13:00:00Z"
  }
}
```

---

#### PUT /api/integrations/tokens

Control token management service.

**Request Body:**
```json
{
  "action": "start" | "stop" | "restart",
  "intervalMinutes": 15
}
```

**Response:**
```json
{
  "service": {
    "action": "started",
    "intervalMinutes": 15,
    "running": true
  }
}
```

---

### Error Recovery

#### GET /api/integrations/recover

Get recovery status and health check.

**Response:**
```json
{
  "health": {
    "healthy": 3,
    "unhealthy": 1,
    "total": 4,
    "issues": [
      {
        "integrationId": "facebook-business",
        "issue": "Access token expired",
        "severity": "low"
      }
    ]
  },
  "recoveryStats": {
    "totalAttempts": 10,
    "successfulRecoveries": 8,
    "failedRecoveries": 2
  }
}
```

---

#### POST /api/integrations/recover

Attempt error recovery for specific integration.

**Request Body:**
```json
{
  "integrationId": "salesforce",
  "errorCode": "TOKEN_EXPIRED",
  "errorMessage": "Access token has expired"
}
```

**Response:**
```json
{
  "integration": "salesforce",
  "recovery": {
    "success": true,
    "action": "refresh_token",
    "message": "Access token refreshed successfully"
  }
}
```

---

#### PUT /api/integrations/recover

Perform bulk recovery for all failed integrations.

**Response:**
```json
{
  "bulkRecovery": {
    "processed": 3,
    "recovered": 2,
    "failed": 1,
    "results": [
      {
        "integrationId": "salesforce",
        "result": {
          "success": true,
          "action": "refresh_token",
          "message": "Token refreshed successfully"
        }
      }
    ]
  }
}
```

---

### Testing & Validation

#### POST /api/integrations/test

Run integration tests.

**Request Body (Test Integration):**
```json
{
  "action": "test_integration",
  "integrationId": "salesforce"
}
```

**Request Body (Test All):**
```json
{
  "action": "test_all"
}
```

**Request Body (Specific Test):**
```json
{
  "action": "test_specific",
  "integrationId": "salesforce",
  "testType": "oauth_config"
}
```

**Response:**
```json
{
  "testSuite": {
    "integrationId": "salesforce",
    "integrationName": "Salesforce",
    "tests": [
      {
        "success": true,
        "testName": "OAuth Configuration Test",
        "duration": 150,
        "timestamp": "2024-01-01T12:00:00Z"
      }
    ],
    "overallSuccess": true,
    "totalDuration": 500,
    "passedTests": 3,
    "failedTests": 0
  }
}
```

---

#### GET /api/integrations/test

Get test information and available actions.

**Query Parameters:**
- `action`: `validation_report` | `health_status`
- `integration`: Integration ID (required for specific actions)

**Response:**
```json
{
  "availableActions": [
    "test_integration",
    "test_all",
    "validate_health",
    "validate_config"
  ],
  "availableTestTypes": [
    "oauth_config",
    "auth_url",
    "api_connectivity",
    "database_schema"
  ]
}
```

---

### Configuration Management

#### GET /api/integrations/config

Get production configuration status.

**Query Parameters:**
- `action`: `validate` | `environment` | `oauth_uris` | `security` | `providers`

**Response (Validation):**
```json
{
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": ["No monitoring webhook configured"]
  },
  "oauthProviders": {
    "configured": ["salesforce", "facebook-business"],
    "missing": ["google-ads", "hubspot"]
  },
  "environment": {
    "environment": "development",
    "baseUrl": "http://localhost:3000",
    "securityEnabled": false,
    "monitoringEnabled": true
  }
}
```

**Response (OAuth URIs):**
```json
{
  "redirectUris": {
    "salesforce": "http://localhost:3000/api/integrations/oauth/callback",
    "facebook-business": "http://localhost:3000/api/integrations/oauth/callback"
  },
  "webhookUrls": {
    "salesforce": "http://localhost:3000/api/integrations/webhook/salesforce",
    "facebook-business": "http://localhost:3000/api/integrations/webhook/facebook-business"
  },
  "baseUrl": "http://localhost:3000"
}
```

---

#### PUT /api/integrations/config

Update configuration settings.

**Request Body:**
```json
{
  "action": "update_features",
  "settings": {
    "autoTokenRefresh": true,
    "healthChecks": true
  }
}
```

**Response:**
```json
{
  "message": "Configuration updated successfully",
  "features": {
    "autoTokenRefresh": true,
    "healthChecks": true,
    "auditLogging": true
  }
}
```

---

#### HEAD /api/integrations/config

Health check endpoint (returns HTTP status only).

**Response:**
- `200`: Configuration is valid
- `503`: Configuration has errors

---

## Webhook Endpoints

### POST /api/integrations/webhook/{provider}

Receive webhooks from OAuth providers.

**Headers:**
- `X-Hub-Signature`: Webhook signature (provider-specific)
- `Content-Type`: `application/json`

**Response:**
```json
{
  "received": true,
  "processed": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## SDK Usage Examples

### JavaScript/TypeScript

```typescript
// Initialize OAuth connection
const response = await fetch('/api/integrations/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    integrationId: 'salesforce'
  })
})

const { authUrl } = await response.json()
window.location.href = authUrl
```

### React Hook

```typescript
import { useState, useEffect } from 'react'

function useIntegrationStatus(integrationId: string) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/integrations/status?integration=${integrationId}`)
      .then(res => res.json())
      .then(data => {
        setStatus(data.status)
        setLoading(false)
      })
  }, [integrationId])

  return { status, loading }
}
```

---

For more examples and detailed implementation guides, see the main documentation.
