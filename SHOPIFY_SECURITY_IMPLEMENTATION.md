# Shopify Security Implementation - CrewFlow

## Overview
This document outlines the security improvements implemented for CrewFlow's Shopify integration, focusing on secure webhook validation and proper OAuth callback redirects for embedded apps.

## 1. Secure Webhook HMAC Validation

### Implementation Details
- **Location**: `src/lib/shopify/webhook-validator.ts`
- **Security Features**:
  - Timing-safe comparison using `crypto.timingSafeEqual()`
  - Proper error handling for missing secrets or signatures
  - Returns HTTP 401 on signature validation failure (as required by Shopify)
  - Returns HTTP 500 on configuration errors

### Key Functions
```typescript
export function validHmac(rawBody: string, signature: string | null, secret: string): boolean
export function validateShopifyWebhook(body: string, signature: string | null): ValidationResult
```

### Webhook Handler Pattern
All webhook handlers now follow this secure pattern:
1. Extract raw request body before parsing JSON
2. Validate HMAC signature using timing-safe comparison
3. Return 401 Unauthorized on signature failure
4. Return 500 Internal Server Error on configuration issues
5. Return 400 Bad Request on invalid JSON payload
6. Only process webhook after successful validation

### Updated Handlers
- `src/app/api/webhooks/shopify/general/route.ts` - Updated to use secure pattern
- `src/app/api/webhooks/shopify/example/route.ts` - Already following secure pattern
- Other webhook handlers use the centralized validation utilities

## 2. OAuth Callback Redirect for Embedded Apps

### Implementation Details
- **Location**: `src/app/api/auth/shopify/callback/route.ts`
- **Key Changes**:
  - Detects embedded app installation via `host` query parameter
  - Constructs proper Shopify admin interface URL
  - Redirects to `https://admin.shopify.com/store/{store-name}/apps/{app-handle}`
  - Falls back to internal dashboard for non-embedded apps

### Redirect Logic
```typescript
if (host) {
  // Embedded app - redirect to Shopify admin interface
  const storeName = shop.replace(/\.myshopify\.com$/, '');
  const appHandle = 'crewflow';
  const embeddedAppURL = `https://admin.shopify.com/store/${storeName}/apps/${appHandle}`;
  return NextResponse.redirect(embeddedAppURL);
} else {
  // Non-embedded app - redirect to internal dashboard
  return NextResponse.redirect(`${getBaseUrl()}/dashboard?shop=${shop}&installed=1`);
}
```

### Security Considerations
- Validates shop domain format to prevent open redirects
- Safely extracts store name from shop domain
- Uses configured app handle for consistent URL construction

## 3. Environment Variables

### Required Configuration
```bash
# Shopify OAuth
CREWFLOW_SHOPIFY_CLIENT_ID=your_shopify_client_id
CREWFLOW_SHOPIFY_CLIENT_SECRET=your_shopify_client_secret

# Webhook Security
CREWFLOW_SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret
# Alternative naming (for backward compatibility)
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret
```

### App Configuration
- **App Handle**: `crewflow` (configured in Shopify Partner Dashboard)
- **App Type**: Embedded (must be enabled in Partner Dashboard)
- **OAuth Redirect URI**: `https://your-domain.com/api/auth/shopify/callback`

## 4. Security Benefits

### Webhook Security
- **HMAC Validation**: Prevents unauthorized webhook requests
- **Timing-Safe Comparison**: Prevents timing attacks on signature validation
- **Proper Error Codes**: Returns expected HTTP status codes for different failure scenarios
- **Configuration Validation**: Ensures webhook secret is properly configured

### OAuth Security
- **Embedded App Support**: Proper redirect flow for Shopify admin integration
- **Domain Validation**: Prevents open redirect vulnerabilities
- **State Parameter Support**: Ready for CSRF protection (TODO: implement state validation)

## 5. Testing & Validation

### Webhook Testing
1. Configure webhook secret in environment variables
2. Set up webhook endpoints in Shopify Partner Dashboard
3. Test with invalid signatures (should return 401)
4. Test with missing secret configuration (should return 500)
5. Test with valid signatures (should return 200)

### OAuth Testing
1. Install app as embedded app in Shopify admin
2. Verify redirect to `admin.shopify.com/store/.../apps/crewflow`
3. Test non-embedded installation (should redirect to internal dashboard)

## 6. Compliance

### Shopify App Review Requirements
- ✅ Webhook HMAC validation with proper error handling
- ✅ OAuth callback redirects to Shopify admin interface for embedded apps
- ✅ Secure handling of access tokens and shop data
- ✅ Proper HTTP status codes for different scenarios

### Security Best Practices
- ✅ Timing-safe cryptographic comparisons
- ✅ Input validation and sanitization
- ✅ Proper error handling without information leakage
- ✅ Environment-based configuration management

## 7. Next Steps

### Recommended Improvements
1. **State Parameter Validation**: Implement CSRF protection in OAuth flow
2. **Database Integration**: Save shop data and access tokens securely
3. **Webhook Processing**: Implement business logic for different webhook topics
4. **Rate Limiting**: Add rate limiting to webhook endpoints
5. **Monitoring**: Add logging and monitoring for security events

### Maintenance
- Regularly rotate webhook secrets
- Monitor for failed webhook validations
- Keep Shopify API dependencies updated
- Review security logs for suspicious activity
