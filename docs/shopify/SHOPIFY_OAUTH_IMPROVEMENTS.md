# Shopify OAuth Integration Improvements

## Overview
This document outlines the improvements made to CrewFlow's Shopify OAuth integration to ensure better reliability, security, and maintainability.

## Changes Made

### 1. Normalized Base URL Function (`src/lib/env.ts`)
- **New File**: Created a clean, simplified `getBaseUrl()` function
- **Key Features**:
  - Automatically strips trailing slashes from all URLs
  - Prioritizes environment variables in logical order
  - Fallback to localhost for development
  - Consistent URL formatting across the application

```typescript
export function getBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const url = fromEnv || 'http://localhost:3000';
  return url.replace(/\/$/, '');
}
```

### 2. Improved Webhook HMAC Validation (`src/lib/shopify/webhook-validator.ts`)
- **New File**: Centralized webhook validation logic
- **Key Features**:
  - Timing-safe HMAC comparison using `crypto.timingSafeEqual()`
  - Proper error handling for different validation scenarios
  - Clean API with detailed error messages
  - Returns 401 status on invalid signatures

```typescript
export function validHmac(raw: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const digest = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(digest));
  } catch (error) {
    return false;
  }
}
```

### 3. Updated OAuth Routes
- **Modified Files**:
  - `src/app/api/auth/shopify/route.ts`
  - `src/app/api/auth/shopify/callback/route.ts`
  - `src/app/api/shopify/install/route.ts`
  - `src/app/api/auth/shopify/install/route.ts`
  - `src/app/admin/oauth/redirect_to_install/embedded/route.ts`

- **Improvements**:
  - All routes now use the new `getBaseUrl()` function
  - Consistent redirect URI construction: `${getBaseUrl()}/api/auth/shopify/callback`
  - Added logging for OAuth redirect URIs and authorization URLs
  - Maintained existing functionality while improving reliability

### 4. Enhanced Webhook Routes
- **Modified Files**:
  - `src/app/api/webhooks/shopify/[userId]/[storeId]/route.ts`
  - `src/app/api/shopify/webhook/route.ts`

- **Improvements**:
  - All webhook routes now use centralized HMAC validation
  - Consistent 401 responses for invalid signatures
  - Proper raw body handling for signature verification
  - Better error messages and logging

### 5. Example Implementation
- **New File**: `src/app/api/webhooks/shopify/example/route.ts`
- **Purpose**: Clean reference implementation following the suggested pattern
- **Features**:
  - Minimal, focused webhook handler
  - Proper HMAC validation with 401 response
  - Clear error handling for different scenarios

## Benefits

### Security
- **Timing-Safe Comparison**: All HMAC validations use `crypto.timingSafeEqual()` to prevent timing attacks
- **Consistent Validation**: Centralized validation logic reduces security vulnerabilities
- **Proper Error Responses**: Invalid signatures return 401 status as expected by Shopify

### Reliability
- **URL Normalization**: Consistent URL formatting prevents OAuth redirect mismatches
- **Environment Detection**: Robust environment variable handling for different deployment scenarios
- **Error Handling**: Comprehensive error handling with detailed logging

### Maintainability
- **Centralized Logic**: Base URL and webhook validation logic in dedicated modules
- **Consistent Patterns**: All OAuth and webhook routes follow the same patterns
- **Clean Code**: Simplified implementations that are easier to understand and maintain

## Configuration Requirements

### Environment Variables
Ensure these environment variables are properly configured:

```bash
# Shopify OAuth
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Alternative naming (for backward compatibility)
CREWFLOW_SHOPIFY_CLIENT_ID=your_client_id
CREWFLOW_SHOPIFY_CLIENT_SECRET=your_client_secret
CREWFLOW_SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Base URL (one of these)
NEXT_PUBLIC_APP_URL=https://crewflow.ai
NEXT_PUBLIC_SITE_URL=https://crewflow.ai
NEXTAUTH_URL=https://crewflow.ai
```

### Shopify Partner Dashboard
Ensure your Shopify app configuration matches:
- **Redirect URI**: `https://crewflow.ai/api/auth/shopify/callback`
- **Webhook URL**: `https://crewflow.ai/api/webhooks/shopify/[topic]`

## Testing
The improvements maintain backward compatibility while enhancing security and reliability. All existing OAuth flows should continue to work without changes.

## Next Steps
1. Deploy the changes to production
2. Monitor OAuth success rates and webhook processing
3. Update any custom webhook handlers to use the new validation pattern
4. Consider migrating other OAuth integrations to use the same patterns
