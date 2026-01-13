# 🚢 CrewFlow Domain Migration Deployment Strategy

## 🎯 Migration Overview

**Objective**: Migrate CrewFlow from `crewflow.dev` to `crewflow.ai` with zero downtime and minimal user disruption.

**Timeline**: 2-3 days for complete migration
**Risk Level**: Low (with proper testing)
**Rollback Plan**: Keep crewflow.dev active as fallback

## 📋 Pre-Migration Checklist

### Prerequisites Verification
- [ ] **Domain Ownership**: Confirm crewflow.ai is purchased and accessible in Namecheap
- [ ] **Code Changes**: All code updates completed and tested locally
- [ ] **Backup Access**: Ensure access to all service dashboards (Vercel, Supabase, OAuth providers)
- [ ] **Team Notification**: Inform team members about migration timeline
- [ ] **User Communication**: Prepare user notification if needed

### Environment Preparation
- [ ] **Local Testing**: Test all changes on localhost:3000
- [ ] **Staging Environment**: If available, test on staging first
- [ ] **Database Backup**: Create Supabase backup before changes
- [ ] **Environment Variables**: Document current production environment variables

## 🚀 Deployment Sequence

### Phase 1: Infrastructure Setup (30-60 minutes)

#### Step 1.1: DNS Configuration
```bash
# Priority: HIGH | Risk: LOW
# Time: 15 minutes | Rollback: Easy
```

1. **Configure crewflow.ai DNS in Namecheap**:
   - Add A record: `@` → `76.76.19.61`
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - **Keep crewflow.dev DNS active** (important for rollback)

2. **Verify DNS propagation**:
   ```bash
   # Check DNS resolution
   nslookup crewflow.ai
   # Should resolve to 76.76.19.61
   ```

#### Step 1.2: Vercel Domain Setup
```bash
# Priority: HIGH | Risk: LOW
# Time: 10 minutes | Rollback: Easy
```

1. **Add domain in Vercel Dashboard**:
   - Go to Settings → Domains
   - Add `crewflow.ai`
   - Add `www.crewflow.ai`
   - **Do NOT remove crewflow.dev yet**

2. **Wait for SSL certificate**:
   - Vercel automatically provisions SSL
   - Usually takes 5-10 minutes after DNS propagation

#### Step 1.3: Initial Testing
```bash
# Priority: HIGH | Risk: LOW
# Time: 15 minutes
```

1. **Test basic connectivity**:
   - Visit `https://crewflow.ai` (should show current site)
   - Verify SSL certificate (green lock icon)
   - Test both `crewflow.ai` and `www.crewflow.ai`

2. **Verify functionality**:
   - Test homepage loading
   - Check static assets loading
   - Verify no console errors

### Phase 2: Application Configuration (45-90 minutes)

#### Step 2.1: Supabase Configuration
```bash
# Priority: HIGH | Risk: MEDIUM
# Time: 15 minutes | Rollback: Easy
```

1. **Update Supabase Authentication**:
   - Site URL: `https://crewflow.ai`
   - Add redirect URLs:
     - `https://crewflow.ai/auth/callback`
     - `https://www.crewflow.ai/auth/callback`
   - **Keep existing crewflow.dev URLs active**

2. **Test authentication**:
   - Try login/logout on crewflow.ai
   - Verify redirect URLs work correctly
   - Test social login if configured

#### Step 2.2: Environment Variables Update
```bash
# Priority: HIGH | Risk: MEDIUM
# Time: 10 minutes | Rollback: Medium
```

1. **Update Vercel environment variables**:
   ```bash
   NEXTAUTH_URL=https://crewflow.ai
   NEXT_PUBLIC_SITE_URL=https://crewflow.ai
   NEXT_PUBLIC_APP_URL=https://crewflow.ai
   ```

2. **Trigger redeployment**:
   - Environment variable changes require redeployment
   - Monitor deployment logs for errors

#### Step 2.3: OAuth Provider Updates
```bash
# Priority: HIGH | Risk: MEDIUM
# Time: 20-30 minutes | Rollback: Medium
```

1. **Facebook OAuth (App ID: YOUR_FACEBOOK_APP_ID)**:
   - Add `https://crewflow.ai/auth/callback` to Valid OAuth Redirect URIs
   - **Keep crewflow.dev URLs active during transition**

2. **Other OAuth providers** (if configured):
   - Update redirect URLs for each provider
   - Test each OAuth flow individually

#### Step 2.4: Comprehensive Testing
```bash
# Priority: HIGH | Risk: LOW
# Time: 30-45 minutes
```

1. **Authentication Testing**:
   - Test email/password login
   - Test social login (Facebook, Google, etc.)
   - Test user registration
   - Test password reset flow

2. **Core Functionality Testing**:
   - Test dashboard access
   - Test AI agent interactions
   - Test file uploads/downloads
   - Test payment flows (if applicable)

3. **API Testing**:
   - Test API endpoints
   - Verify webhook functionality
   - Test third-party integrations

### Phase 3: Third-Party Integrations (30-60 minutes)

#### Step 3.1: Shopify Integration
```bash
# Priority: MEDIUM | Risk: MEDIUM
# Time: 15 minutes | Rollback: Easy
```

1. **Update Shopify App URLs**:
   - App URL: `https://crewflow.ai`
   - Redirect URL: `https://crewflow.ai/api/auth/shopify/callback`

2. **Test Shopify OAuth flow**:
   - Test store connection
   - Verify webhook delivery

#### Step 3.2: Stripe Webhooks
```bash
# Priority: MEDIUM | Risk: MEDIUM
# Time: 10 minutes | Rollback: Easy
```

1. **Update webhook endpoints**:
   - Change from crewflow.dev to crewflow.ai
   - Test webhook delivery

#### Step 3.3: Email Service Configuration
```bash
# Priority: LOW | Risk: LOW
# Time: 5 minutes | Rollback: Easy
```

1. **Test email delivery**:
   - Send test emails from new domain
   - Verify email templates render correctly

### Phase 4: Go-Live & Monitoring (Ongoing)

#### Step 4.1: Traffic Monitoring
```bash
# Priority: HIGH | Risk: LOW
# Time: Ongoing
```

1. **Monitor application logs**:
   - Watch Vercel deployment logs
   - Monitor Supabase logs
   - Check for authentication errors

2. **Performance monitoring**:
   - Monitor response times
   - Check for increased error rates
   - Verify all features working

#### Step 4.2: User Communication
```bash
# Priority: MEDIUM | Risk: LOW
# Time: 15 minutes
```

1. **Update user-facing materials**:
   - Update any hardcoded URLs in app
   - Update support documentation
   - Notify users if necessary

## 🔄 Rollback Strategy

### Immediate Rollback (if issues detected within 24 hours)

#### Quick Rollback Steps:
1. **Revert environment variables** in Vercel:
   ```bash
   NEXTAUTH_URL=https://crewflow.dev
   NEXT_PUBLIC_SITE_URL=https://crewflow.dev
   NEXT_PUBLIC_APP_URL=https://crewflow.dev
   ```

2. **Revert Supabase Site URL** to `https://crewflow.dev`

3. **Remove crewflow.ai redirect URLs** from OAuth providers

4. **Redeploy application** with reverted settings

#### Full Rollback (if major issues persist):
1. **Remove crewflow.ai domain** from Vercel
2. **Revert all code changes** to previous commit
3. **Restore database backup** if needed
4. **Communicate rollback** to users

### Rollback Testing:
- Test rollback procedure on staging environment first
- Document rollback steps for quick execution
- Ensure team knows rollback procedure

## ⚠️ Risk Mitigation

### High-Risk Areas:
1. **Authentication flows** - Test thoroughly before go-live
2. **OAuth integrations** - Keep old URLs active during transition
3. **Payment processing** - Test Stripe webhooks carefully
4. **API integrations** - Verify all third-party services updated

### Monitoring Points:
- **Error rates** - Watch for spikes in application errors
- **Authentication failures** - Monitor login success rates
- **API response times** - Ensure performance not degraded
- **User complaints** - Monitor support channels

### Contingency Plans:
- **Partial rollback** - Revert specific components if needed
- **Gradual migration** - Use DNS to gradually shift traffic
- **Maintenance mode** - Enable if major issues detected

## 📊 Success Metrics

### Technical Metrics:
- [ ] **DNS resolution**: crewflow.ai resolves correctly globally
- [ ] **SSL certificate**: Valid and trusted certificate active
- [ ] **Application uptime**: 99.9%+ uptime maintained
- [ ] **Response times**: No significant performance degradation
- [ ] **Error rates**: Error rates remain within normal ranges

### Functional Metrics:
- [ ] **Authentication**: All login methods working correctly
- [ ] **Core features**: All major features functional
- [ ] **Integrations**: All third-party integrations working
- [ ] **User experience**: No user-reported issues

### Business Metrics:
- [ ] **User retention**: No significant user drop-off
- [ ] **Conversion rates**: Payment/signup rates maintained
- [ ] **Support tickets**: No increase in support requests

## 📞 Emergency Contacts

- **Technical Lead**: [Your contact]
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Domain Registrar**: Namecheap support

## 📝 Post-Migration Tasks (Week 1)

### Immediate (Day 1-2):
- [ ] Monitor application stability
- [ ] Address any user-reported issues
- [ ] Verify all integrations working

### Short-term (Day 3-7):
- [ ] Remove old redirect URLs from OAuth providers
- [ ] Update marketing materials and documentation
- [ ] Set up 301 redirects from crewflow.dev (optional)

### Long-term (Week 2+):
- [ ] Remove crewflow.dev domain from Vercel (optional)
- [ ] Update SEO and search engine listings
- [ ] Archive old domain documentation

---

**🎯 Success Definition**: CrewFlow platform fully operational at https://crewflow.ai with all features working, zero downtime, and no user disruption.
