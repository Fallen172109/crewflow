# 🌐 CrewFlow Custom Domain Setup Guide

## 📋 Overview

This guide will walk you through adding a custom domain to your CrewFlow deployment on Vercel. Your project is already configured and ready for custom domain integration.

## 🚀 Step-by-Step Setup

### Step 1: Purchase and Configure Your Domain

1. **Purchase a domain** from a registrar like:
   - Namecheap
   - GoDaddy
   - Cloudflare
   - Google Domains
   - Porkbun

2. **Recommended domain ideas for CrewFlow**:
   - `crewflow.ai`
   - `crewflow.io`
   - `getcrewflow.com`
   - `crewflow.app`
   - `mycrewflow.com`

### Step 2: Add Domain in Vercel Dashboard

1. **Go to Vercel Dashboard**:
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your CrewFlow project

2. **Navigate to Domains**:
   - Click on "Settings" tab
   - Click on "Domains" in the sidebar

3. **Add Your Domain**:
   - Click "Add Domain"
   - Enter your domain (e.g., `yourdomain.com`)
   - Click "Add"

4. **Configure DNS Records**:
   Vercel will show you DNS records to add. You'll need to add these to your domain registrar:

   **For Root Domain (yourdomain.com)**:
   ```
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

   **For WWW Subdomain (www.yourdomain.com)**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### Step 3: Update DNS at Your Registrar

1. **Log into your domain registrar**
2. **Find DNS Management** (usually called "DNS", "Name Servers", or "DNS Records")
3. **Add the records** provided by Vercel
4. **Wait for propagation** (can take 24-48 hours, usually much faster)

### Step 4: Update CrewFlow Configuration

#### 4.1 Update Next.js Config

Edit `next.config.ts` and uncomment/update the domain sections:

```typescript
experimental: {
  serverActions: {
    allowedOrigins: [
      'localhost:3000',
      'yourdomain.com',        // Replace with your domain
      'www.yourdomain.com'     // Replace with your domain
    ]
  }
},
images: {
  domains: [
    'localhost',
    'yourdomain.com'           // Replace with your domain
  ],
  // ... rest of config
}
```

#### 4.2 Update Environment Variables in Vercel

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Update these variables**:

```bash
# Update the site URL for your custom domain
NEXTAUTH_URL=https://yourdomain.com

# If you have any other URLs in environment variables, update them too
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Step 5: Update Supabase Configuration

1. **Go to Supabase Dashboard**:
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your CrewFlowNEW project

2. **Update Authentication Settings**:
   - Go to Authentication → Settings
   - Update "Site URL" to: `https://yourdomain.com`
   - Add redirect URLs:
     - `https://yourdomain.com/auth/callback`
     - `https://www.yourdomain.com/auth/callback`

3. **Update Allowed Origins** (if needed):
   - Add your domain to allowed origins in Supabase

### Step 6: SSL Certificate (Automatic)

Vercel automatically provides SSL certificates for custom domains. Once DNS propagates:
- ✅ Your site will be available at `https://yourdomain.com`
- ✅ SSL certificate will be automatically issued and renewed
- ✅ HTTP traffic will redirect to HTTPS

### Step 7: Test Your Domain

1. **Wait for DNS propagation** (check with [whatsmydns.net](https://whatsmydns.net))
2. **Visit your domain** in a browser
3. **Test key functionality**:
   - Landing page loads
   - Authentication works
   - Dashboard access
   - All links work correctly

## 🔧 Troubleshooting

### Domain Not Working?

1. **Check DNS propagation**: Use [whatsmydns.net](https://whatsmydns.net)
2. **Verify DNS records**: Make sure they match exactly what Vercel provided
3. **Clear browser cache**: Try incognito/private browsing
4. **Check Vercel status**: Visit the Domains section in Vercel dashboard

### Authentication Issues?

1. **Update Supabase Site URL**: Make sure it matches your domain
2. **Check redirect URLs**: Ensure they're properly configured
3. **Clear browser storage**: Clear cookies and local storage
4. **Test in incognito mode**: Rule out cached authentication

### SSL Certificate Issues?

1. **Wait 24-48 hours**: SSL certificates can take time to issue
2. **Check domain verification**: Ensure DNS records are correct
3. **Contact Vercel support**: If SSL doesn't work after 48 hours

## 📝 Post-Setup Checklist

After your domain is working:

- [ ] Update any hardcoded URLs in your code
- [ ] Update social media links
- [ ] Update documentation with new domain
- [ ] Set up domain redirects if needed (www → non-www or vice versa)
- [ ] Update any external integrations (Stripe webhooks, etc.)
- [ ] Test email confirmations work with new domain
- [ ] Update any marketing materials

## 🎯 Next Steps

Once your custom domain is live:

1. **Update Stripe webhooks** (if using Stripe) to use new domain
2. **Configure email provider** to use custom domain for better deliverability
3. **Set up monitoring** to ensure domain stays healthy
4. **Consider CDN optimization** for better global performance

## 🆘 Need Help?

If you encounter issues:
1. Check Vercel's domain documentation
2. Contact your domain registrar's support
3. Use Vercel's support chat
4. Check DNS propagation tools

---

**Your CrewFlow project is ready for a custom domain! Just follow these steps and you'll have your maritime AI platform running on your own domain.** 🚢
