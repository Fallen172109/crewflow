# Shopify Partner Dashboard Configuration Fix

## Current Issues
- 500 error from Shopify OAuth redirect
- App configured as "embedded" but CrewFlow needs "public" app
- Redirect URI mismatch causing authorization failures

## Required Shopify Partner Dashboard Settings

### 1. App Setup & Distribution
- **App Type**: Public app (NOT embedded)
- **Distribution**: Custom app or Private app (NOT App Store)
- **App URL**: `https://crewflow.dev` (if required)

### 2. OAuth Configuration
**Redirect URIs** (CRITICAL - must match exactly):
```
https://crewflow.dev/api/auth/shopify/callback
```

**Scopes** (must match the scopes in your code):
- `read_products`
- `write_products` 
- `read_orders`
- `write_orders`
- `read_customers`
- `read_analytics`
- `read_inventory`
- `write_inventory`
- `read_fulfillments`
- `write_fulfillments`

### 3. App Settings
- **Client ID**: `<your_shopify_client_id>` (must match Shopify dashboard)
- **Client Secret**: `<your_shopify_client_secret>` (must match Shopify dashboard)
- **Webhook Secret**: `<your_shopify_webhook_secret>` (must match Shopify dashboard)

### 4. Webhooks (Optional but recommended)
**Webhook URL**: `https://crewflow.dev/api/webhooks/shopify`

**Webhook Topics**:
- `orders/create`
- `orders/updated`
- `orders/paid`
- `products/create`
- `products/update`
- `inventory_levels/update`

## Steps to Fix in Shopify Partner Dashboard

### Step 1: Access Your App
1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Navigate to "Apps" section
3. Find your CrewFlow app

### Step 2: Update App Configuration
1. Go to "App setup" section
2. **Change app type from "Embedded" to "Public"**
3. Set distribution to "Custom" or "Private" (not App Store)

### Step 3: Fix OAuth Settings
1. Go to "App setup" → "URLs" section
2. **Set Allowed redirection URL(s)**: `https://crewflow.dev/api/auth/shopify/callback`
3. Remove any other redirect URLs
4. Ensure no trailing slashes

### Step 4: Verify Scopes
1. Go to "App setup" → "Protected customer data access"
2. Ensure all required scopes are enabled (see list above)

### Step 5: Save and Test
1. Save all changes
2. Wait 5-10 minutes for changes to propagate
3. Test the OAuth flow from CrewFlow

## Testing the Fix

After making these changes, test the OAuth flow:

1. Go to `https://crewflow.dev/dashboard/shopify`
2. Click "Connect Store" 
3. Enter a test store domain (e.g., `your-test-store.myshopify.com`)
4. Should redirect to Shopify authorization page
5. After authorization, should redirect back to CrewFlow successfully

## Common Issues & Solutions

### Issue: Still getting 500 error
**Solution**: Double-check redirect URI exactly matches (no trailing slash, correct protocol)

### Issue: "App not found" error
**Solution**: Verify Client ID matches in both Partner Dashboard and environment variables

### Issue: Scope permission errors
**Solution**: Ensure all required scopes are enabled in Partner Dashboard

### Issue: Embedded app warnings
**Solution**: Confirm app type is set to "Public" not "Embedded"

## Environment Variables Verification

Ensure these are set correctly in Vercel production:
```
SHOPIFY_CLIENT_ID=<your_shopify_client_id>
SHOPIFY_CLIENT_SECRET=<your_shopify_client_secret>
SHOPIFY_WEBHOOK_SECRET=<your_shopify_webhook_secret>
NEXT_PUBLIC_APP_URL=https://crewflow.ai
```

## Next Steps After Fix

1. Test OAuth flow thoroughly
2. Verify store connection works
3. Test webhook delivery (if configured)
4. Submit app for Shopify review
5. Create development/test app for future testing
