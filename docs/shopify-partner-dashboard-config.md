# Shopify Partner Dashboard Configuration for CrewFlow

This document outlines the exact configuration needed in the Shopify Partner Dashboard for CrewFlow to pass app review.

## 🎯 Critical Settings for App Review

### 1. App Information
- **App Name**: CrewFlow
- **App Type**: Public app
- **Category**: Store management
- **Description**: Maritime-themed AI automation platform for Shopify stores

### 2. App Setup
```
✅ Embedded app: ON (Critical for review)
✅ App URL: https://crewflow.ai
✅ Allowed redirection URLs:
   - https://crewflow.ai/api/auth/shopify/callback
   - https://crewflow.ai/embedded
   - https://crewflow.ai/shopify/setup
```

### 3. App Permissions (Scopes)
```
✅ Required Scopes:
   - read_products
   - write_products
   - read_orders
   - write_orders
   - read_customers
   - write_customers
   - read_inventory
   - write_inventory
   - read_analytics
```

### 4. Webhooks Configuration
```
✅ Webhook Endpoints:
   - https://crewflow.ai/api/shopify/webhook
   - https://crewflow.ai/api/webhooks/shopify/customer-redact
   - https://crewflow.ai/api/webhooks/shopify/customer-data-request
   - https://crewflow.ai/api/webhooks/shopify/shop-data-erasure

✅ Webhook Events:
   - orders/create
   - orders/updated
   - orders/paid
   - products/create
   - products/update
   - customers/create
   - inventory_levels/update

✅ GDPR Webhooks (Required):
   - customers/redact
   - customers/data_request
   - shop/redact
```

## 🔧 Environment Variables Required

### Production (.env.production)
```bash
# Shopify App Configuration
SHOPIFY_CLIENT_ID=your_api_key_here
SHOPIFY_CLIENT_SECRET=your_api_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# App URLs
NEXT_PUBLIC_APP_URL=https://crewflow.ai
VERCEL_ENV=production

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Development (.env.local)
```bash
# Shopify App Configuration (same as production)
SHOPIFY_CLIENT_ID=your_api_key_here
SHOPIFY_CLIENT_SECRET=your_api_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Development URLs
NGROK_URL=https://your-ngrok-url.ngrok.io
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io

# Supabase Configuration (same as production)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 Testing Checklist

### Before Submission
- [ ] Run test suite: `node scripts/test-shopify-app-review-fixes.js`
- [ ] Test OAuth flow with ngrok
- [ ] Verify webhook HMAC validation
- [ ] Test embedded app functionality
- [ ] Confirm GDPR webhook endpoints respond correctly

### OAuth Flow Testing
1. **Install Flow**:
   ```
   https://your-ngrok-url.ngrok.io/api/auth/shopify/install?shop=test-store.myshopify.com
   ```
   - Should redirect to Shopify OAuth
   - Should include all required parameters
   - Should redirect back to callback after authorization

2. **Callback Flow**:
   - Should handle app installation without forcing login
   - Should redirect to setup page for new installations
   - Should redirect to embedded admin for existing apps

3. **Embedded App Access**:
   ```
   https://your-ngrok-url.ngrok.io/?shop=test-store.myshopify.com&host=test&embedded=1
   ```
   - Should redirect to `/embedded` page
   - Should initialize App Bridge
   - Should load store information

### Webhook Testing
1. **Valid Signature**:
   ```bash
   curl -X POST https://your-ngrok-url.ngrok.io/api/shopify/webhook \
     -H "Content-Type: application/json" \
     -H "x-shopify-topic: orders/create" \
     -H "x-shopify-shop-domain: test-store.myshopify.com" \
     -H "x-shopify-hmac-sha256: valid_signature_here" \
     -d '{"test": "data"}'
   ```
   - Should return 200 OK

2. **Invalid Signature**:
   ```bash
   curl -X POST https://your-ngrok-url.ngrok.io/api/shopify/webhook \
     -H "Content-Type: application/json" \
     -H "x-shopify-topic: orders/create" \
     -H "x-shopify-shop-domain: test-store.myshopify.com" \
     -H "x-shopify-hmac-sha256: invalid_signature" \
     -d '{"test": "data"}'
   ```
   - Should return 401 Unauthorized

## 🚀 Deployment Steps

### 1. Update Partner Dashboard
1. Log into Shopify Partner Dashboard
2. Navigate to your CrewFlow app
3. Update all settings according to this guide
4. Save changes

### 2. Deploy to Production
```bash
# Ensure all environment variables are set in Vercel
vercel env add SHOPIFY_CLIENT_ID
vercel env add SHOPIFY_CLIENT_SECRET
vercel env add SHOPIFY_WEBHOOK_SECRET

# Deploy
git push origin main
```

### 3. Verify Production Deployment
1. Test OAuth flow: `https://crewflow.ai/api/auth/shopify/install?shop=test-store.myshopify.com`
2. Test webhook endpoint: `https://crewflow.ai/api/shopify/webhook`
3. Test embedded app: `https://crewflow.ai/?shop=test-store.myshopify.com&embedded=1`

### 4. Submit for Review
1. Complete app listing information
2. Add screenshots and descriptions
3. Submit for review
4. Monitor review status

## 🔍 Common Review Issues & Solutions

### Issue: "App immediately authenticates after install"
**Solution**: ✅ Fixed - App installation redirects to setup page, not login

### Issue: "Wrong redirect URL"
**Solution**: ✅ Fixed - Embedded apps redirect to admin.shopify.com format

### Issue: "Webhook validation fails"
**Solution**: ✅ Fixed - Using timing-safe HMAC comparison, returns 401 for invalid signatures

### Issue: "App Bridge not detected"
**Solution**: ✅ Fixed - Scripts loaded from Shopify CDN, proper initialization

### Issue: "Session tokens not supported"
**Solution**: ✅ Fixed - Session token validation implemented for embedded apps

## 📞 Support

If you encounter issues during review:
1. Check the test suite results
2. Verify all environment variables are set
3. Test with ngrok locally first
4. Contact Shopify Partner Support if needed

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Ready for Review
