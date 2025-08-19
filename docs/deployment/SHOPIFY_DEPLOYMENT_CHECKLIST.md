# Shopify OAuth Integration - Production Deployment Checklist

## 🎯 Pre-Deployment Requirements

### ✅ Database Setup
- [ ] **Execute SQL Migration**
  - Go to Supabase Dashboard: https://supabase.com/dashboard/project/bmlieuyijpgxdhvicpsf/editor
  - Copy contents of `scripts/simple-shopify-tables.sql`
  - Execute in SQL Editor
  - Verify all tables created successfully

- [ ] **Verify Table Structure**
  ```bash
  node scripts/test-shopify-oauth-fixes.js
  ```
  - All tables should show ✅ Accessible

### ✅ Environment Variables (Production)
- [x] `SHOPIFY_CLIENT_ID=1873049b3cc9829b691afd92310124cf`
- [x] `SHOPIFY_CLIENT_SECRET=328b2274325dd6cfe2965b343571110e`
- [x] `SHOPIFY_WEBHOOK_SECRET=CrewFlowShopifyWebhook2024!Maritime`
- [x] `NEXT_PUBLIC_APP_URL=https://crewflow.ai`

### ✅ Code Fixes Applied
- [x] API Client field mapping fixed (`shop_domain` vs `facebook_user_id`)
- [x] Embedded app installation flow with App Bridge
- [x] OAuth state management improvements
- [x] Dashboard integration with real API calls
- [x] HMAC validation security improvements

## 🚀 Deployment Steps

### 1. Final Code Review
- [ ] Review all modified files:
  - `src/lib/integrations/shopify-admin-api.ts`
  - `src/app/api/auth/shopify/install/route.ts`
  - `src/app/api/auth/shopify/callback/route.ts`
  - `src/app/dashboard/shopify/page.tsx`
  - `src/app/api/shopify/stores/route.ts`

### 2. Local Testing
- [ ] Start development server: `npm run dev`
- [ ] Navigate to `http://localhost:3000/dashboard/shopify`
- [ ] Test "Connect Store" button functionality
- [ ] Verify OAuth redirect works (even if it fails due to localhost)

### 3. Production Deployment
- [ ] Commit all changes to git
- [ ] Push to main branch
- [ ] Verify Vercel deployment completes successfully
- [ ] Check production site is accessible

### 4. Database Migration (Production)
- [ ] Execute SQL migration in production Supabase
- [ ] Verify tables created in production database
- [ ] Test database connectivity from production app

## 🧪 Production Testing Protocol

### Phase 1: Basic Connectivity
- [ ] Visit `https://crewflow.ai/dashboard/shopify`
- [ ] Verify page loads without errors
- [ ] Check browser console for JavaScript errors
- [ ] Verify "Connect Store" button is functional

### Phase 2: OAuth Flow Testing
- [ ] Click "Connect Store"
- [ ] Enter test Shopify store domain
- [ ] Verify redirect to Shopify OAuth
- [ ] Complete OAuth authorization
- [ ] Verify redirect back to CrewFlow
- [ ] Check if store appears in dashboard

### Phase 3: Embedded App Testing
- [ ] Install app from Shopify Partner Dashboard
- [ ] Verify embedded app loads correctly
- [ ] Test App Bridge integration
- [ ] Verify no "immediately authenticates" errors
- [ ] Check Shopify Partner Dashboard for validation status

## 🔍 Troubleshooting Guide

### Common Issues & Solutions

#### "Table does not exist" errors
**Solution**: Execute the database migration
```sql
-- Copy and paste scripts/simple-shopify-tables.sql into Supabase SQL Editor
```

#### "Invalid shop domain format" errors
**Solution**: Ensure shop domain includes `.myshopify.com`
```javascript
// Correct format: mystore.myshopify.com
// Incorrect: mystore or https://mystore.myshopify.com
```

#### "Invalid OAuth state" errors
**Solution**: Check state management in callback
- Verify `oauth_states` table exists
- Check state expiration (10 minutes)
- Ensure state is not already used

#### "Immediately authenticates after install" errors
**Solution**: Verify embedded app configuration
- Check App Bridge integration
- Verify HMAC validation
- Ensure proper OAuth flow for embedded apps

### Debug Commands
```bash
# Test database connectivity
node scripts/test-shopify-oauth-fixes.js

# Check environment variables
echo $SHOPIFY_CLIENT_ID
echo $NEXT_PUBLIC_APP_URL

# Verify API routes
curl https://crewflow.ai/api/shopify/stores
```

## 📊 Success Criteria

### ✅ Technical Requirements
- [ ] All database tables created and accessible
- [ ] OAuth flow completes without errors
- [ ] Stores appear in dashboard after connection
- [ ] Embedded app installs successfully
- [ ] No validation errors in Shopify Partner Dashboard

### ✅ User Experience
- [ ] Smooth OAuth connection process
- [ ] Clear error messages for failures
- [ ] Store information displays correctly
- [ ] Dashboard is responsive and functional

### ✅ Security & Compliance
- [ ] HMAC validation working properly
- [ ] OAuth state management secure
- [ ] RLS policies protecting user data
- [ ] No sensitive data exposed in logs

## 🎉 Post-Deployment Actions

### Immediate (Within 24 hours)
- [ ] Monitor error logs for OAuth issues
- [ ] Test with multiple Shopify stores
- [ ] Verify webhook endpoints (if applicable)
- [ ] Check performance metrics

### Short-term (Within 1 week)
- [ ] Submit app for Shopify review
- [ ] Gather user feedback on OAuth flow
- [ ] Monitor database performance
- [ ] Optimize any slow queries

### Long-term (Ongoing)
- [ ] Monitor OAuth success rates
- [ ] Track store connection metrics
- [ ] Plan additional Shopify features
- [ ] Maintain Shopify API compatibility

## 🆘 Emergency Contacts

### If Critical Issues Arise:
1. **Check Vercel Logs**: https://vercel.com/dashboard
2. **Check Supabase Logs**: https://supabase.com/dashboard/project/bmlieuyijpgxdhvicpsf/logs
3. **Rollback Option**: Revert to previous deployment if needed
4. **Database Backup**: Supabase automatic backups available

### Key Files for Quick Fixes:
- OAuth Routes: `src/app/api/auth/shopify/`
- Dashboard: `src/app/dashboard/shopify/page.tsx`
- API Client: `src/lib/integrations/shopify-admin-api.ts`
- Environment: `.env.local` (local) / Vercel Environment Variables (production)

---

**Ready for Production**: Once all checkboxes are completed, the Shopify OAuth integration should be ready for production use and Shopify app store submission.
