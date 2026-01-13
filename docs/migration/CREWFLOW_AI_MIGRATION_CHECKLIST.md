# 🚢 CrewFlow Domain Migration Checklist: crewflow.dev → crewflow.ai

## ✅ Code Changes (COMPLETED)

The following code changes have been automatically applied:

- [x] **next.config.ts**: Updated allowedOrigins and domains
- [x] **production-config.ts**: Updated staging and production baseUrl and CORS origins
- [x] **middleware.ts**: Updated allowedOrigins for production
- [x] **Documentation files**: Updated all references from crewflow.dev to crewflow.ai
- [x] **API documentation**: Updated base URLs and examples
- [x] **Deployment guides**: Updated domain references

## 📋 Manual Configuration Required

### 1. Vercel Configuration

#### 1.1 Add New Domain
1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your CrewFlow project**
3. **Navigate to**: Settings → Domains
4. **Add Domain**: Click "Add Domain" and enter `crewflow.ai`
5. **Add WWW Subdomain**: Also add `www.crewflow.ai` (optional but recommended)
6. **Note DNS Records**: Vercel will provide DNS records (should be the same as before)

#### 1.2 Update Environment Variables
**In Vercel Dashboard → Settings → Environment Variables**, update:

```bash
# Update these existing variables:
NEXTAUTH_URL=https://crewflow.ai
NEXT_PUBLIC_SITE_URL=https://crewflow.ai
NEXT_PUBLIC_APP_URL=https://crewflow.ai

# Keep all other variables unchanged
```

#### 1.3 Remove Old Domain (After Migration)
- **After confirming new domain works**, remove `crewflow.dev` from Vercel domains
- **Keep both domains active during transition period** for testing

### 2. DNS Configuration (Namecheap)

#### 2.1 Configure crewflow.ai DNS
1. **Login to Namecheap**: https://namecheap.com
2. **Go to Domain List** → Click "Manage" next to `crewflow.ai`
3. **Navigate to**: Advanced DNS tab
4. **Add DNS Records**:

   **A Record (Root Domain)**:
   ```
   Type: A Record
   Host: @
   Value: 76.76.19.61
   TTL: Automatic (or 300)
   ```

   **CNAME Record (WWW Subdomain)**:
   ```
   Type: CNAME Record
   Host: www
   Value: cname.vercel-dns.com
   TTL: Automatic (or 300)
   ```

#### 2.2 Maintain crewflow.dev (Temporary)
- **Keep crewflow.dev DNS active** during migration
- **Set up redirect** from crewflow.dev to crewflow.ai (optional)
- **Remove crewflow.dev DNS** only after confirming migration success

### 3. Supabase Configuration

#### 3.1 Update Authentication Settings
1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select**: CrewFlowNEW project (bmlieuyijpgxdhvicpsf)
3. **Navigate to**: Authentication → Settings
4. **Update Site URL**: Change from `https://crewflow.dev` to `https://crewflow.ai`

#### 3.2 Update Redirect URLs
**In Authentication → Settings → Redirect URLs**, add:
- `https://crewflow.ai/auth/callback`
- `https://www.crewflow.ai/auth/callback`

**Keep existing crewflow.dev URLs temporarily** for smooth transition:
- `https://crewflow.dev/auth/callback`
- `https://www.crewflow.dev/auth/callback`

#### 3.3 Update CORS Settings (if applicable)
**In API Settings**, ensure CORS origins include:
- `https://crewflow.ai`
- `https://www.crewflow.ai`

### 4. OAuth Provider Configurations

#### 4.1 Facebook OAuth (App ID: YOUR_FACEBOOK_APP_ID)
1. **Go to Facebook Developers**: https://developers.facebook.com
2. **Select your app** (App ID: YOUR_FACEBOOK_APP_ID)
3. **Navigate to**: Facebook Login → Settings
4. **Update Valid OAuth Redirect URIs**:
   - Add: `https://crewflow.ai/auth/callback`
   - Add: `https://www.crewflow.ai/auth/callback`
   - Keep existing crewflow.dev URLs during transition

#### 4.2 Other OAuth Providers
**For each configured OAuth provider**, update redirect URLs:
- **Google OAuth**: Update authorized redirect URIs
- **GitHub OAuth**: Update authorization callback URL
- **Any other providers**: Update callback/redirect URLs

### 5. Third-Party Service Integrations

#### 5.1 Shopify App Configuration
1. **Shopify Partner Dashboard**: Update app URLs
2. **App URL**: Change to `https://crewflow.ai`
3. **Allowed redirection URLs**: Add `https://crewflow.ai/api/auth/shopify/callback`

#### 5.2 Stripe Webhooks
1. **Stripe Dashboard**: https://dashboard.stripe.com
2. **Navigate to**: Developers → Webhooks
3. **Update webhook endpoints** from crewflow.dev to crewflow.ai
4. **Test webhook delivery** after migration

#### 5.3 Email Service (Resend)
1. **Check domain verification** if using custom email domain
2. **Update any hardcoded URLs** in email templates
3. **Test email delivery** with new domain

### 6. SSL Certificate Considerations

#### 6.1 Automatic SSL (Vercel)
- **Vercel automatically provisions SSL** for new domains
- **Wait 5-10 minutes** after DNS propagation for SSL activation
- **Verify SSL certificate** shows green lock icon

#### 6.2 SSL Verification
- **Test HTTPS**: Visit `https://crewflow.ai`
- **Check certificate**: Should show valid SSL certificate
- **Test redirects**: HTTP should redirect to HTTPS

### 7. Monitoring and Analytics

#### 7.1 Update Monitoring Services
- **Update any uptime monitoring** services with new domain
- **Update analytics tracking** if using custom domain tracking
- **Update error monitoring** services (Sentry, etc.)

#### 7.2 Search Engine Considerations
- **Set up 301 redirects** from crewflow.dev to crewflow.ai (if keeping old domain)
- **Update sitemap** with new domain
- **Submit new domain** to Google Search Console

## 🚀 Migration Timeline & Testing

### Phase 1: Preparation (Day 1)
- [ ] Complete all code changes (✅ DONE)
- [ ] Configure Vercel with new domain
- [ ] Set up DNS records for crewflow.ai
- [ ] Update Supabase configuration

### Phase 2: Testing (Day 1-2)
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Test basic site functionality at crewflow.ai
- [ ] Test authentication flow
- [ ] Test all major features
- [ ] Verify SSL certificate

### Phase 3: OAuth & Integrations (Day 2)
- [ ] Update OAuth provider configurations
- [ ] Test social login functionality
- [ ] Update third-party service webhooks
- [ ] Test API integrations

### Phase 4: Go Live (Day 2-3)
- [ ] Update environment variables to use crewflow.ai
- [ ] Deploy changes to production
- [ ] Monitor for any issues
- [ ] Update marketing materials

### Phase 5: Cleanup (Day 7+)
- [ ] Remove crewflow.dev redirect URLs from services
- [ ] Remove old domain from Vercel (optional)
- [ ] Update documentation and support materials

## ⚠️ Potential Issues & Solutions

### DNS Propagation Delays
- **Issue**: New domain not resolving immediately
- **Solution**: Wait up to 24 hours for global propagation
- **Check**: Use https://whatsmydns.net to verify propagation

### Authentication Failures
- **Issue**: Users can't log in after migration
- **Solution**: Clear browser cookies and local storage
- **Prevention**: Keep old redirect URLs active during transition

### API Integration Failures
- **Issue**: Third-party webhooks failing
- **Solution**: Update webhook URLs in all external services
- **Testing**: Test each integration individually

### SSL Certificate Issues
- **Issue**: SSL not working on new domain
- **Solution**: Wait for automatic provisioning or contact Vercel support
- **Verification**: Check certificate validity in browser

## 📞 Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Namecheap Support**: https://www.namecheap.com/support/

---

**🎯 Success Criteria**: CrewFlow platform fully operational at https://crewflow.ai with all features working correctly and no user disruption.
