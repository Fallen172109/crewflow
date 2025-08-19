# 🚢 CrewFlow.ai Domain Setup Guide

## 🎯 Your Domain: `crewflow.ai`

Perfect choice! I can see you have `crewflow.ai` registered with Namecheap. Let's get it connected to your CrewFlow deployment.

## ✅ Configuration Already Updated

I've already updated your `next.config.ts` file with the `crewflow.ai` domain configuration.

## 🚀 Step-by-Step Setup

### Step 1: Add Domain in Vercel Dashboard

1. **Go to Vercel Dashboard**:
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your CrewFlow project

2. **Add the Domain**:
   - Go to Settings → Domains
   - Click "Add Domain"
   - Enter: `crewflow.ai`
   - Click "Add"

3. **Note the DNS Records**:
   Vercel will provide you with DNS records. They should be:

   **Root Domain (crewflow.ai)**:
   ```
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

   **WWW Subdomain (www.crewflow.ai)**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### Step 2: Configure DNS in Namecheap

1. **Log into Namecheap**:
   - Go to [namecheap.com](https://namecheap.com)
   - Sign in to your account

2. **Access Domain Management**:
   - Go to Domain List
   - Click "Manage" next to `crewflow.ai`

3. **Update DNS Records**:
   - Click on "Advanced DNS" tab
   - Delete any existing A records for `@` (root domain)
   - Add these records:

   **A Record for Root Domain**:
   ```
   Type: A Record
   Host: @
   Value: 76.76.19.61
   TTL: Automatic (or 300)
   ```

   **CNAME Record for WWW**:
   ```
   Type: CNAME Record
   Host: www
   Value: cname.vercel-dns.com
   TTL: Automatic (or 300)
   ```

4. **Save Changes** and wait for propagation (usually 5-30 minutes)

### Step 3: Update Vercel Environment Variables

1. **In Vercel Dashboard**:
   - Go to your CrewFlow project
   - Settings → Environment Variables

2. **Update/Add these variables**:
   ```bash
   NEXTAUTH_URL=https://crewflow.ai
   NEXT_PUBLIC_SITE_URL=https://crewflow.ai
   ```

3. **Redeploy** your application after updating environment variables

### Step 4: Update Supabase Configuration

1. **Go to Supabase Dashboard**:
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your CrewFlowNEW project

2. **Update Authentication Settings**:
   - Go to Authentication → Settings
   - Update "Site URL" to: `https://crewflow.ai`

3. **Add Redirect URLs**:
   - Add these URLs to the redirect URLs list:
     - `https://crewflow.ai/auth/callback`
     - `https://www.crewflow.ai/auth/callback`

### Step 5: Deploy Changes

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Configure crewflow.ai domain"
   git push origin main
   ```

2. **Vercel will automatically redeploy** with the new configuration

### Step 6: Test Your Domain

1. **Check DNS propagation**:
   - Visit [whatsmydns.net](https://whatsmydns.net)
   - Enter `crewflow.ai` and check if it resolves to Vercel's IP

2. **Test the site**:
   - Visit `https://crewflow.ai`
   - Test user registration/login
   - Verify dashboard access
   - Check all navigation works

## 🔧 Expected Timeline

- **DNS Changes**: 5-30 minutes (Namecheap is usually fast)
- **SSL Certificate**: Automatic (issued by Vercel within minutes)
- **Full Propagation**: Up to 24 hours globally

## ✅ Success Checklist

- [ ] Domain added in Vercel
- [ ] DNS records updated in Namecheap
- [ ] Environment variables updated in Vercel
- [ ] Supabase Site URL updated
- [ ] Supabase redirect URLs added
- [ ] Code changes committed and deployed
- [ ] Site accessible at `https://crewflow.ai`
- [ ] SSL certificate active (green lock icon)
- [ ] Authentication working
- [ ] All functionality tested

## 🚨 Troubleshooting

### Domain not loading?
1. Check DNS propagation: [whatsmydns.net](https://whatsmydns.net)
2. Verify DNS records in Namecheap match Vercel's requirements
3. Clear browser cache or try incognito mode

### Authentication issues?
1. Verify Supabase Site URL is `https://crewflow.ai`
2. Check redirect URLs are properly configured
3. Clear browser cookies and local storage

### SSL not working?
1. Wait a few more minutes (SSL is automatic)
2. Check domain verification in Vercel
3. Ensure DNS records are correct

## 🎉 After Setup

Once `crewflow.ai` is live:

1. **Update any external integrations** (Stripe webhooks, etc.)
2. **Test email confirmations** work with the new domain
3. **Update marketing materials** with the new URL
4. **Set up monitoring** to ensure uptime

---

**Your CrewFlow maritime AI platform will soon be live at `https://crewflow.ai`!** 🚢

The `.ai` domain is perfect for your AI-powered maritime automation platform - it's memorable, clearly indicates the AI nature of CrewFlow, and positions the platform as cutting-edge technology.
