# 🚨 Shopify OAuth Integration Fix - Domain Migration Issue

## 🔍 **Problem Identified**

The Shopify OAuth integration is failing because the redirect URI is pointing to the old domain (`crewflow.dev`) instead of the new domain (`crewflow.ai`).

**Current Behavior:**
1. User clicks "Connect Store"
2. System shows "redirected me to authorize" message
3. OAuth flow fails and redirects back to Shopify page
4. Store shows as "1 inactive store" instead of connecting

**Root Cause:**
- Environment variable `NEXT_PUBLIC_APP_URL` is set to old domain in production
- Shopify app configuration may still reference old domain
- OAuth redirect URI constructed as `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`

## 🛠️ **Complete Fix Solution**

### Step 1: Update Vercel Environment Variables

**CRITICAL:** Update these environment variables in your Vercel dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your CrewFlow project
3. Navigate to **Settings → Environment Variables**
4. Update/verify these variables:

```bash
NEXT_PUBLIC_APP_URL=https://crewflow.ai
NEXT_PUBLIC_SITE_URL=https://crewflow.ai
NEXTAUTH_URL=https://crewflow.ai
```

### Step 2: Update Shopify Partner Dashboard

1. **Login to Shopify Partner Dashboard**
2. **Navigate to your CrewFlow app**
3. **Go to App Setup → URLs**
4. **Update the following:**

   **App URL:**
   ```
   https://crewflow.ai
   ```

   **Allowed redirection URL(s):**
   ```
   https://crewflow.ai/api/auth/shopify/callback
   ```

5. **Save all changes**

### Step 3: Verify Shopify App Configuration

Ensure these settings are correct:

**App Type:** Public app (not embedded)
**Distribution:** Public
**Scopes:** Verify these are enabled:
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

### Step 4: Redeploy Application

After updating environment variables:

1. **Trigger a new deployment** in Vercel (environment changes require redeployment)
2. **Monitor deployment logs** for any errors
3. **Wait for deployment to complete**

### Step 5: Test the OAuth Flow

1. **Go to:** https://crewflow.ai/dashboard/shopify
2. **Click:** "Connect New Store" or "Connect Store"
3. **Enter:** A test Shopify store domain (e.g., `test-store.myshopify.com`)
4. **Verify:** You're redirected to Shopify's authorization page
5. **Complete:** The OAuth flow and verify the store shows as "active"

## 🔧 **Technical Details**

### OAuth Flow Sequence:
1. User initiates connection → `/api/auth/shopify?shop=store.myshopify.com`
2. System generates state and redirects to Shopify OAuth
3. Shopify redirects back to → `https://crewflow.ai/api/auth/shopify/callback`
4. Callback processes authorization and adds store to database

### Key Files Involved:
- `src/app/api/auth/shopify/route.ts` - OAuth initiation
- `src/app/api/auth/shopify/callback/route.ts` - OAuth callback handling
- `src/lib/shopify/multi-store-manager.ts` - Store management

## ✅ **Verification Checklist**

- [ ] Vercel environment variables updated to `crewflow.ai`
- [ ] Shopify Partner Dashboard URLs updated to `crewflow.ai`
- [ ] Application redeployed after environment changes
- [ ] OAuth flow tested successfully
- [ ] Store connection shows as "active" after OAuth completion
- [ ] No console errors during OAuth process

## 🚨 **If Issues Persist**

### Check Browser Console:
Look for errors related to:
- CORS issues
- Redirect URI mismatches
- Authentication failures

### Verify Network Requests:
1. Open browser DevTools → Network tab
2. Initiate Shopify connection
3. Check for failed requests or unexpected redirects

### Common Issues:
- **DNS propagation delays:** Wait 24 hours after domain changes
- **Browser cache:** Clear cookies and local storage
- **Shopify app review:** Ensure app is approved for production use

## 📞 **Support**

If the issue persists after following these steps:
1. Check Vercel deployment logs
2. Review Shopify Partner Dashboard for any warnings
3. Verify DNS resolution for `crewflow.ai`
4. Test with a different browser/incognito mode

---

**This fix addresses the domain migration issue and should restore full Shopify OAuth functionality.** 🚢
