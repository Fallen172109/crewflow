# 🚢 CrewFlow.dev Domain Setup Guide

## 🎯 Your Domain: `crewflow.dev`

Perfect choice! I can see you have `crewflow.dev` registered with Namecheap. Let's get it connected to your CrewFlow deployment.

## ✅ Configuration Already Updated

I've already updated your `next.config.ts` file with the `crewflow.dev` domain configuration.

## 🚀 Step-by-Step Setup

### Step 1: Add Domain in Vercel Dashboard

1. **Go to Vercel Dashboard**:
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your CrewFlow project

2. **Add the Domain**:
   - Go to Settings → Domains
   - Click "Add Domain"
   - Enter: `crewflow.dev`
   - Click "Add"

3. **Note the DNS Records**:
   Vercel will provide you with DNS records. They should be:
   
   **Root Domain (crewflow.dev)**:
   ```
   Type: A
   Name: @
   Value: 76.76.19.61
   ```
   
   **WWW Subdomain (www.crewflow.dev)**:
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
   - Click "Manage" next to `crewflow.dev`

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
   NEXTAUTH_URL=https://crewflow.dev
   NEXT_PUBLIC_SITE_URL=https://crewflow.dev
   ```

3. **Redeploy** your application after updating environment variables

### Step 4: Update Supabase Configuration

1. **Go to Supabase Dashboard**:
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your CrewFlowNEW project

2. **Update Authentication Settings**:
   - Go to Authentication → Settings
   - Update "Site URL" to: `https://crewflow.dev`

3. **Add Redirect URLs**:
   - Add these URLs to the redirect URLs list:
     - `https://crewflow.dev/auth/callback`
     - `https://www.crewflow.dev/auth/callback`

### Step 5: Deploy Changes

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Configure crewflow.dev domain"
   git push origin main
   ```

2. **Vercel will automatically redeploy** with the new configuration

### Step 6: Test Your Domain

1. **Check DNS propagation**:
   - Visit [whatsmydns.net](https://whatsmydns.net)
   - Enter `crewflow.dev` and check if it resolves to Vercel's IP

2. **Test the site**:
   - Visit `https://crewflow.dev`
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
- [ ] Site accessible at `https://crewflow.dev`
- [ ] SSL certificate active (green lock icon)
- [ ] Authentication working
- [ ] All functionality tested

## 🚨 Troubleshooting

### Domain not loading?
1. Check DNS propagation: [whatsmydns.net](https://whatsmydns.net)
2. Verify DNS records in Namecheap match Vercel's requirements
3. Clear browser cache or try incognito mode

### Authentication issues?
1. Verify Supabase Site URL is `https://crewflow.dev`
2. Check redirect URLs are properly configured
3. Clear browser cookies and local storage

### SSL not working?
1. Wait a few more minutes (SSL is automatic)
2. Check domain verification in Vercel
3. Ensure DNS records are correct

## 🎉 After Setup

Once `crewflow.dev` is live:

1. **Update any external integrations** (Stripe webhooks, etc.)
2. **Test email confirmations** work with the new domain
3. **Update marketing materials** with the new URL
4. **Set up monitoring** to ensure uptime

---

**Your CrewFlow maritime AI platform will soon be live at `https://crewflow.dev`!** 🚢

The `.dev` domain is perfect for your tech-forward maritime automation platform - it's secure (requires HTTPS), memorable, and clearly indicates the innovative nature of CrewFlow.
