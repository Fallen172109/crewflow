# Production Shopify OAuth Fix Guide

## Current Issues Summary
1. **500 Error from Shopify**: App configured as embedded but needs to be public
2. **Connect Store Button**: "Failed to initiate OAuth flow" error
3. **Integrations Button**: Not properly routing to Shopify OAuth
4. **App Review Blocker**: OAuth flow must work for Shopify app submission

## Immediate Action Plan

### Step 1: Fix Shopify Partner Dashboard (CRITICAL)
**This is the root cause of the 500 error**

1. **Login to Shopify Partner Dashboard**
   - Go to https://partners.shopify.com
   - Navigate to your CrewFlow app

2. **Change App Type**
   - Go to "App setup" → "App details"
   - **Change from "Embedded app" to "Public app"**
   - This fixes the 500 error from the embedded redirect URL

3. **Update Redirect URIs**
   - Go to "App setup" → "URLs"
   - Set **Allowed redirection URL(s)** to:
     ```
     https://crewflow.dev/api/auth/shopify/callback
     ```
   - Remove any other URLs
   - Ensure no trailing slashes

4. **Verify Scopes**
   - Go to "App setup" → "Protected customer data access"
   - Enable these scopes:
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

5. **Save Changes**
   - Save all changes
   - Wait 5-10 minutes for propagation

### Step 2: Verify Vercel Environment Variables
Check these are set in Vercel production:

```bash
SHOPIFY_CLIENT_ID=1873049b3cc9829b691afd92310124cf
SHOPIFY_CLIENT_SECRET=328b2274325dd6cfe2965b343571110e
SHOPIFY_WEBHOOK_SECRET=CrewFlowShopifyWebhook2024!Maritime
NEXT_PUBLIC_APP_URL=https://crewflow.dev
```

### Step 3: Deploy Updated Code
The IntegrationHub has been updated to properly handle Shopify connections.

**Deploy to production:**
```bash
git add .
git commit -m "Fix Shopify OAuth integration for production"
git push origin main
```

### Step 4: Test the OAuth Flow

1. **Test from Shopify Page**
   - Go to https://crewflow.dev/dashboard/shopify
   - Click "Connect Store"
   - Enter test store domain
   - Should redirect to Shopify authorization

2. **Test from Integrations Page**
   - Go to https://crewflow.dev/dashboard/integrations
   - Find Shopify integration
   - Click "Connect"
   - Enter test store domain
   - Should redirect to Shopify authorization

### Step 5: Verify Complete Flow
1. User clicks Connect → Shopify authorization page
2. User logs into Shopify account
3. Shopify shows permission consent screen
4. User clicks "Install app" or "Connect"
5. Redirects back to CrewFlow with success message

## Expected OAuth Flow URLs

**Initiation**:
```
https://crewflow.ai/api/auth/shopify?shop=your-store.myshopify.com
```

**Shopify Authorization**:
```
https://your-store.myshopify.com/admin/oauth/authorize?client_id=1873049b3cc9829b691afd92310124cf&scope=read_products,write_products...&redirect_uri=https://crewflow.ai/api/auth/shopify/callback&state=...
```

**Callback**:
```
https://crewflow.ai/api/auth/shopify/callback?code=...&state=...&shop=your-store.myshopify.com
```

## Troubleshooting

### Still Getting 500 Error?
- Double-check app type is "Public" not "Embedded"
- Verify redirect URI exactly matches (case-sensitive)
- Ensure no trailing slashes in URLs

### "Failed to initiate OAuth flow"?
- Check user is logged into CrewFlow
- Verify environment variables in Vercel
- Check Supabase connection

### Authorization Denied?
- Verify all required scopes are enabled
- Check app permissions in Partner Dashboard

### App Review Issues?
- Ensure OAuth flow works end-to-end
- Test with multiple test stores
- Verify all features work after connection

## Testing Script

Run the production test script:
```bash
node scripts/test-shopify-production.js
```

This will verify:
- Environment variables
- OAuth URL generation
- Production endpoint accessibility
- Configuration recommendations

## Success Criteria

✅ Connect Store button works without errors
✅ Integrations page Shopify connection works
✅ Complete OAuth flow: Connect → Authorize → Callback → Success
✅ Store appears in CrewFlow dashboard after connection
✅ No 500 errors from Shopify
✅ Ready for Shopify app review submission

## Post-Fix Actions

1. **Test thoroughly** with multiple stores
2. **Document the working flow** for future reference
3. **Submit app for Shopify review**
4. **Create separate development app** for future testing
5. **Monitor production OAuth success rates**
