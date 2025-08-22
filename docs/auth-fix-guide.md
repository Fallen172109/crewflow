# CrewFlow Authentication Fix Guide

## Issue Summary
Users experience "Auth session missing!" errors on crewflow.ai because of a mismatch between client and server cookie configurations, combined with domain redirection conflicts.

## Root Cause
1. **Cookie Name Mismatch**: Client uses custom `sb-crewflow-auth-token`, server expects standard `sb-access-token`/`sb-refresh-token`
2. **Domain Conflict**: External redirect (crewflow.ai → www.crewflow.ai) conflicts with middleware redirect (www → apex)
3. **Multiple Cookie Sources**: Creates confusion between different cookie naming schemes

## Applied Fixes

### 1. Standardized Client Configuration
**File**: `src/lib/auth-context.tsx`
- ✅ Removed custom `storageKey: 'sb-crewflow-auth-token'`
- ✅ Added `flowType: 'pkce'` for standard SSR cookie handling
- ✅ Now uses standard Supabase cookie names that match server expectations

### 2. Enhanced Environment Detection
**File**: `src/lib/utils/environment.ts`
- ✅ Updated `isProduction()` to recognize both `crewflow.ai` and `www.crewflow.ai`
- ✅ Prevents environment detection issues during domain transition

### 3. Improved Middleware Logging
**File**: `middleware.ts`
- ✅ Added logging for domain redirects
- ✅ Enhanced auth token checking with legacy cookie support
- ✅ Better debugging information for troubleshooting

### 4. Cookie Cleanup Utility
**File**: `src/app/api/auth/cleanup-cookies/route.ts`
- ✅ New endpoint to clear conflicting cookies
- ✅ Handles both current and legacy cookie names
- ✅ Clears cookies for both apex and www domains

### 5. Enhanced Debug Endpoint
**File**: `src/app/api/debug/session-cookies/route.ts`
- ✅ Better domain detection and redirect indicators
- ✅ Improved diagnostics for troubleshooting

## Deployment Steps

### Step 1: Deploy Code Changes
```bash
# The code changes are already applied
git add .
git commit -m "fix: resolve authentication session mismatch between client and server"
git push origin main
```

### Step 2: Fix Domain Configuration
**In Vercel Dashboard:**
1. Go to Project Settings → Domains
2. Ensure `crewflow.ai` is set as the primary domain
3. Remove or disable any redirect from apex to www
4. The middleware will handle www → apex redirects

### Step 3: Clear User Cookies
**For affected users:**
1. Visit: `https://crewflow.ai/api/auth/cleanup-cookies` (POST request)
2. Or manually clear browser cookies for `*.crewflow.ai`
3. Log in again to establish fresh session

### Step 4: Verify Fix
1. Test login flow on `https://crewflow.ai`
2. Check debug endpoint: `https://crewflow.ai/api/debug/session-cookies`
3. Verify dashboard access works without redirects

## Expected Results

### Before Fix
```json
{
  "domain": { "host": "www.crewflow.ai", "isProduction": false },
  "session": { "exists": false, "hasUser": false },
  "cookies": {
    "supabaseCookies": [
      { "name": "sb-bmlieuyijpgxdhvicpsf-auth-token" },
      { "name": "sb-crewflow-auth-token" }
    ]
  }
}
```

### After Fix
```json
{
  "domain": { "host": "crewflow.ai", "isProduction": true },
  "session": { "exists": true, "hasUser": true },
  "cookies": {
    "supabaseCookies": [
      { "name": "sb-access-token" },
      { "name": "sb-refresh-token" }
    ]
  }
}
```

## Troubleshooting

### If Users Still Experience Issues
1. **Clear all cookies**: Use the cleanup endpoint
2. **Check domain**: Ensure accessing `crewflow.ai` (not www)
3. **Fresh login**: Complete new authentication flow
4. **Check debug**: Use session-cookies endpoint for diagnostics

### If Domain Still Redirects to WWW
1. Check Vercel domain settings
2. Verify DNS configuration at registrar
3. Ensure no external redirects are configured
4. The middleware should handle www → apex redirects

## Technical Notes

- **Cookie Scope**: Standard Supabase cookies work across subdomains
- **SSR Compatibility**: New configuration is fully compatible with Next.js SSR
- **Security**: Maintains all security features (httpOnly, secure, sameSite)
- **Backward Compatibility**: Middleware temporarily supports legacy cookies during transition

## Monitoring

After deployment, monitor:
- Authentication success rates
- Session persistence across page loads
- Server-side session detection
- Domain redirect behavior

The fix addresses the core client/server cookie mismatch while maintaining security and compatibility.
