# Shopify Partner Submission Fix

## 🚨 Issues Identified

1. **Environment Variable Problem**: `NEXT_PUBLIC_APP_URL` is set to `http://localhost:3000` but Shopify is testing at `https://crewflow.ai`
2. **Root Page Redirect**: The root page was redirecting all requests to `/dashboard`, interfering with Shopify OAuth
3. **Maintenance Mode Interference**: Maintenance mode might be blocking Shopify's access
4. **OAuth Flow Issues**: Environment-aware URL detection wasn't working properly

## ✅ Fixes Applied

### 1. Environment-Aware URL Detection
- Created `src/lib/utils/environment.ts` with smart environment detection
- Updated all Shopify OAuth routes to use environment-aware URLs
- Fixed production vs development URL handling

### 2. Root Page Shopify Detection
- Updated `src/app/page.tsx` to detect Shopify OAuth requests
- Automatically redirects Shopify requests to the correct install endpoint
- Preserves normal functionality for regular users

### 3. Maintenance Mode Bypass
- Updated `src/components/MaintenanceWrapper.tsx` to bypass Shopify routes
- Added comprehensive OAuth route bypassing in middleware
- Ensures Shopify can access OAuth endpoints even in maintenance mode

### 4. Multiple Install Endpoints
- Created alternative install endpoint at `/api/shopify/install`
- Added comprehensive debugging and logging
- Improved error handling and validation

## 🔧 Required Actions

### 1. Update Vercel Environment Variables

Set these environment variables in your Vercel dashboard:

```bash
# Critical for Shopify OAuth
NEXT_PUBLIC_APP_URL=https://crewflow.ai
NEXT_PUBLIC_PRODUCTION_URL=https://crewflow.ai

# Disable maintenance mode for testing
MAINTENANCE_MODE_OVERRIDE=false
MAINTENANCE_MODE=false
AUTO_MAINTENANCE_MODE=false

# Ensure production environment
NODE_ENV=production
```

### 2. Verify Shopify Partner Dashboard Settings

Ensure these settings in your Shopify Partner Dashboard:

**App URLs:**
- App URL: `https://crewflow.ai`
- Allowed redirection URLs: `https://crewflow.ai/api/auth/shopify/callback`

**App Type:**
- Should be set to "Embedded app" (this is correct for the expected grant URL)
- Distribution: Custom app or Private app

**Important:** The expected URL `https://admin.shopify.com/store/xbbf0y-vp/app/grant` indicates Shopify expects an embedded app flow.

### 3. Test the OAuth Flow

After deployment, test these URLs:
- `https://crewflow.ai/api/debug/environment` - Check environment detection
- `https://crewflow.ai/api/auth/shopify/install?shop=test-shop.myshopify.com` - Test install endpoint

## 🚀 Deployment Steps

1. **Commit and push changes:**
```bash
git add .
git commit -m "Fix Shopify Partner OAuth flow for production"
git push origin main
```

2. **Update Vercel environment variables:**
   - Go to Vercel dashboard → Settings → Environment Variables
   - Add/update the variables listed above
   - Make sure to set them for "Production" environment

3. **Redeploy:**
   - Trigger a new deployment in Vercel
   - Or push a new commit to trigger auto-deployment

4. **Test Shopify Partner submission:**
   - Go back to Shopify Partner Dashboard
   - Click "Run" on the automated checks
   - The OAuth flow should now work correctly

## 🔍 Debugging

If issues persist, check:

1. **Environment detection:** Visit `https://crewflow.ai/api/debug/environment`
2. **Console logs:** Check Vercel function logs for OAuth requests
3. **Shopify parameters:** Ensure Shopify is sending correct parameters
4. **Redirect URI:** Must match exactly in Partner Dashboard

## 📝 Expected Results

After these fixes:
- ✅ "Immediately authenticates after install" should pass
- ✅ "Immediately redirects to app UI after authentication" should pass
- ✅ OAuth flow should redirect to Shopify admin instead of homepage
- ✅ App should handle both embedded and non-embedded installation flows

## 🆘 If Still Failing

1. Check Vercel function logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure Shopify Partner Dashboard URLs match exactly
4. Test the debug endpoint to verify environment detection
5. Check that maintenance mode is fully disabled
