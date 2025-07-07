# CrewFlow Shopify Integration API Documentation

## Overview

The CrewFlow Shopify Integration provides a comprehensive API for managing e-commerce automation through AI agents. This documentation covers all endpoints, authentication, and integration patterns.

## Base URL

```
Production: https://crewflow.dev/api
Development: http://localhost:3000/api
```

## Authentication

All API requests require authentication using either:

1. **Session Token** (for web app)
2. **API Key** (for external integrations)

### Session Authentication
```http
Authorization: Bearer <session_token>
```

### API Key Authentication
```http
X-API-Key: <api_key>
```

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **Shopify Operations**: 40 requests per minute (Shopify limit)
- **Webhooks**: 50 requests per minute per IP
- **Authentication**: 5 attempts per 15 minutes per IP

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid shop domain format",
    "details": {
      "field": "shopDomain",
      "code": "INVALID_FORMAT"
    },
    "requestId": "req_123456789"
  }
}
```

### Error Types
- `AUTHENTICATION_ERROR` - Invalid credentials
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input data
- `RATE_LIMIT_ERROR` - Rate limit exceeded
- `API_ERROR` - External API error
- `NETWORK_ERROR` - Network connectivity issue
- `UNKNOWN_ERROR` - Unexpected error

## Endpoints

### Store Management

#### Connect Shopify Store
```http
POST /shopify/stores/connect
```

**Request Body:**
```json
{
  "shopDomain": "your-store.myshopify.com",
  "accessToken": "shpat_xxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "store": {
    "id": "store_123",
    "shopDomain": "your-store.myshopify.com",
    "storeName": "Your Maritime Store",
    "currency": "USD",
    "isPrimary": true,
    "connectedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### List User Stores
```http
GET /shopify/stores
```

**Response:**
```json
{
  "stores": [
    {
      "id": "store_123",
      "shopDomain": "store1.myshopify.com",
      "storeName": "Maritime Store 1",
      "currency": "USD",
      "isPrimary": true,
      "syncStatus": "synced",
      "lastSyncAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### Remove Store
```http
DELETE /shopify/stores/{storeId}
```

**Response:**
```json
{
  "success": true,
  "message": "Store removed successfully"
}
```

### Agent Operations

#### Execute Agent Capability
```http
POST /agents/{agentId}/capabilities/{capabilityId}
```

**Path Parameters:**
- `agentId`: Agent identifier (anchor, pearl, flint, beacon, splash, drake)
- `capabilityId`: Capability identifier

**Request Body:**
```json
{
  "storeId": "store_123",
  "action": "update_inventory",
  "parameters": {
    "productId": 123456789,
    "quantity": 50,
    "locationId": 456789
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "actionId": "action_789",
    "status": "completed",
    "result": {
      "inventoryItemId": 987654321,
      "newQuantity": 50,
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

#### Get Agent Status
```http
GET /agents/{agentId}/status
```

**Response:**
```json
{
  "agentId": "anchor",
  "status": "active",
  "lastActivity": "2024-01-01T11:55:00Z",
  "actionsToday": 23,
  "successRate": 95.7,
  "currentTask": "Monitoring inventory levels"
}
```

### Approval Workflow

#### Create Approval Request
```http
POST /approvals/requests
```

**Request Body:**
```json
{
  "agentId": "flint",
  "actionType": "price_update",
  "actionData": {
    "productId": 123456789,
    "oldPrice": 149.99,
    "newPrice": 129.99
  },
  "reason": "Competitive pricing adjustment"
}
```

**Response:**
```json
{
  "approvalRequest": {
    "id": "approval_456",
    "riskLevel": "critical",
    "expiresAt": "2024-01-01T13:00:00Z",
    "estimatedImpact": {
      "affectedItems": 1,
      "estimatedCost": 0,
      "reversible": true
    }
  }
}
```

#### Process Approval
```http
POST /approvals/requests/{requestId}/respond
```

**Request Body:**
```json
{
  "approved": true,
  "reason": "Approved for competitive advantage",
  "conditions": ["Monitor competitor pricing"],
  "modifiedParams": {
    "newPrice": 134.99
  }
}
```

#### Get Pending Approvals
```http
GET /approvals/pending
```

**Response:**
```json
{
  "approvals": [
    {
      "id": "approval_456",
      "agentName": "Flint (Marketing)",
      "actionType": "price_update",
      "description": "Update pricing for navigation compass",
      "riskLevel": "critical",
      "requestedAt": "2024-01-01T12:00:00Z",
      "expiresAt": "2024-01-01T13:00:00Z"
    }
  ]
}
```

### Analytics

#### Get Store Analytics
```http
GET /analytics/stores/{storeId}?timeframe=30d
```

**Query Parameters:**
- `timeframe`: 7d, 30d, 90d, 1y

**Response:**
```json
{
  "metrics": {
    "revenue": {
      "total": 125430,
      "growth": 12.5,
      "trend": "up",
      "forecast": [130000, 135000, 142000]
    },
    "orders": {
      "total": 342,
      "averageValue": 367,
      "conversionRate": 3.2
    },
    "products": {
      "total": 156,
      "topPerformers": [
        {
          "id": 123456789,
          "title": "Maritime Navigation Compass",
          "revenue": 15000,
          "units_sold": 100
        }
      ]
    }
  }
}
```

#### Get Predictive Insights
```http
GET /analytics/insights
```

**Response:**
```json
{
  "insights": [
    {
      "type": "revenue_forecast",
      "title": "Strong Revenue Growth Predicted",
      "confidence": 0.85,
      "impact": "high",
      "timeframe": "30 days",
      "recommendations": [
        "Increase inventory for top-performing products",
        "Scale successful marketing campaigns"
      ]
    }
  ]
}
```

### Webhooks

#### Webhook Endpoint
```http
POST /webhooks/shopify/{userId}/{storeId}
```

**Headers:**
- `X-Shopify-Topic`: Webhook topic
- `X-Shopify-Hmac-Sha256`: Webhook signature

**Supported Topics:**
- `orders/create`
- `orders/paid`
- `orders/fulfilled`
- `products/create`
- `products/update`
- `inventory_levels/update`
- `customers/create`

### Workflows

#### Create Workflow
```http
POST /workflows
```

**Request Body:**
```json
{
  "name": "Abandoned Cart Recovery",
  "description": "Automated email sequence for abandoned carts",
  "agentId": "flint",
  "nodes": [
    {
      "type": "trigger",
      "config": {
        "event": "cart_abandoned",
        "delay": 3600
      }
    },
    {
      "type": "action",
      "config": {
        "type": "send_email",
        "template": "cart_recovery_1",
        "discount": 10
      }
    }
  ]
}
```

#### Execute Workflow
```http
POST /workflows/{workflowId}/execute
```

**Request Body:**
```json
{
  "triggerData": {
    "cartId": "cart_123",
    "customerId": "customer_456",
    "items": [...]
  }
}
```

### Monitoring

#### System Health
```http
GET /health
```

**Response:**
```json
{
  "overall": "healthy",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "shopify": {
      "status": "healthy"
    },
    "cache": {
      "status": "healthy",
      "responseTime": 12
    }
  }
}
```

#### Performance Metrics
```http
GET /metrics/performance
```

**Response:**
```json
{
  "apiResponseTime": 250,
  "cacheHitRate": 85.5,
  "backgroundJobsQueued": 12,
  "errorRate": 0.5,
  "activeConnections": 45
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { CrewFlowAPI } from '@crewflow/sdk'

const crewflow = new CrewFlowAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://crewflow.dev/api'
})

// Connect store
const store = await crewflow.stores.connect({
  shopDomain: 'your-store.myshopify.com',
  accessToken: 'shpat_xxxxx'
})

// Execute agent capability
const result = await crewflow.agents.anchor.updateInventory({
  storeId: store.id,
  productId: 123456789,
  quantity: 50
})

// Get analytics
const analytics = await crewflow.analytics.getStoreMetrics(store.id, '30d')
```

### Python
```python
from crewflow import CrewFlowAPI

crewflow = CrewFlowAPI(
    api_key='your-api-key',
    base_url='https://crewflow.dev/api'
)

# Connect store
store = crewflow.stores.connect(
    shop_domain='your-store.myshopify.com',
    access_token='shpat_xxxxx'
)

# Execute agent capability
result = crewflow.agents.anchor.update_inventory(
    store_id=store['id'],
    product_id=123456789,
    quantity=50
)
```

## Webhook Integration

### Setting up Webhooks

1. **Automatic Setup** (Recommended)
   - Webhooks are automatically configured when connecting a store
   - CrewFlow manages webhook lifecycle

2. **Manual Setup**
   ```http
   POST https://your-store.myshopify.com/admin/api/2023-10/webhooks.json
   ```
   ```json
   {
     "webhook": {
       "topic": "orders/create",
       "address": "https://crewflow.dev/api/webhooks/shopify/{userId}/{storeId}",
       "format": "json"
     }
   }
   ```

### Webhook Security

All webhooks are verified using HMAC-SHA256:

```javascript
const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf8')
  const calculatedSignature = hmac.digest('base64')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(calculatedSignature, 'base64')
  )
}
```

## Best Practices

### Error Handling
- Always check response status codes
- Implement retry logic for transient errors
- Use exponential backoff for rate limits
- Log errors for debugging

### Performance
- Use caching for frequently accessed data
- Implement pagination for large datasets
- Monitor API usage and optimize calls
- Use webhooks instead of polling

### Security
- Store API keys securely
- Validate all webhook signatures
- Use HTTPS for all communications
- Implement proper access controls

## Support

- **Documentation**: https://docs.crewflow.dev
- **API Status**: https://status.crewflow.dev
- **Support Email**: support@crewflow.dev
- **GitHub Issues**: https://github.com/crewflow/issues
