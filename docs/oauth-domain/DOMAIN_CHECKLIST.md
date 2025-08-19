# 🚢 CrewFlow Custom Domain Checklist

## ✅ Quick Setup Checklist

### Before You Start
- [ ] Have a domain purchased and ready
- [ ] Access to domain registrar's DNS settings
- [ ] Access to Vercel dashboard
- [ ] Access to Supabase dashboard

### 1. Vercel Configuration
- [ ] Add domain in Vercel dashboard (Settings → Domains)
- [ ] Note down the DNS records provided by Vercel
- [ ] Update environment variables in Vercel:
  - [ ] `NEXTAUTH_URL=https://yourdomain.com`
  - [ ] `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`

### 2. DNS Configuration
- [ ] Add A record: `@` → `76.76.19.61`
- [ ] Add CNAME record: `www` → `cname.vercel-dns.com`
- [ ] Wait for DNS propagation (check with whatsmydns.net)

### 3. Code Updates
- [ ] Update `next.config.ts` with your domain
- [ ] Run: `node scripts/update-domain.js yourdomain.com`
- [ ] Commit and push changes
- [ ] Redeploy on Vercel

### 4. Supabase Configuration
- [ ] Update Site URL: `https://yourdomain.com`
- [ ] Add redirect URLs:
  - [ ] `https://yourdomain.com/auth/callback`
  - [ ] `https://www.yourdomain.com/auth/callback`

### 5. Testing
- [ ] Visit `https://yourdomain.com`
- [ ] Test landing page loads
- [ ] Test user registration
- [ ] Test user login
- [ ] Test dashboard access
- [ ] Test all navigation links
- [ ] Verify SSL certificate is active

### 6. Post-Setup (Optional)
- [ ] Update any external webhooks (Stripe, etc.)
- [ ] Update marketing materials
- [ ] Set up domain monitoring
- [ ] Configure email provider with custom domain

## 🆘 Common Issues

### Domain not loading?
- Check DNS propagation: [whatsmydns.net](https://whatsmydns.net)
- Verify DNS records match Vercel's requirements
- Clear browser cache / try incognito mode

### Authentication not working?
- Verify Supabase Site URL is correct
- Check redirect URLs are properly configured
- Clear browser cookies and local storage

### SSL certificate issues?
- Wait 24-48 hours for automatic SSL provisioning
- Ensure DNS records are correct
- Contact Vercel support if issues persist

## 📞 Support Resources

- **Vercel Docs**: [vercel.com/docs/concepts/projects/domains](https://vercel.com/docs/concepts/projects/domains)
- **Supabase Auth Docs**: [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
- **DNS Checker**: [whatsmydns.net](https://whatsmydns.net)
- **SSL Checker**: [ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/)

---

**Need help?** Refer to the detailed `CUSTOM_DOMAIN_SETUP.md` guide for step-by-step instructions.
