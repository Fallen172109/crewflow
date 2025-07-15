# CrewFlow Vercel Deployment Guide

This guide will help you deploy CrewFlow to Vercel with automatic GitHub integration.

## Prerequisites

- GitHub repository: `https://github.com/Fallen172109/crewflow.git`
- Domain: `crewflow.dev`
- Supabase project: CrewFlowNEW (bmlieuyijpgxdhvicpsf)

## Step 1: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/signup
2. **Sign up with GitHub** using your Fallen172109 account
3. **Import Project**:
   - Click "Add New Project"
   - Select "Import Git Repository"
   - Choose your `crewflow` repository
   - Click "Import"

## Step 2: Configure Environment Variables

In Vercel dashboard, go to Project Settings → Environment Variables and add:

### Required Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
OPENAI_API_KEY=your-openai-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key

# Email Service
RESEND_API_KEY=your-resend-api-key

# Payment Processing
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Application Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://crewflow.dev
```

### Optional OAuth Variables (add as needed)
```bash
# Facebook Business
FACEBOOK_BUSINESS_CLIENT_ID=your-facebook-client-id
FACEBOOK_BUSINESS_CLIENT_SECRET=your-facebook-client-secret

# Google Services
GOOGLE_ADS_CLIENT_ID=your-google-client-id
GOOGLE_ADS_CLIENT_SECRET=your-google-client-secret

# Salesforce
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret

# Add other OAuth providers as needed...
```

## Step 3: Configure Custom Domain

1. **In Vercel Dashboard**:
   - Go to Project Settings → Domains
   - Add `crewflow.dev` as a custom domain
   - Add `www.crewflow.dev` (optional)

2. **Update DNS Records**:
   - Go to your domain registrar (where you bought crewflow.dev)
   - Update DNS records to point to Vercel:
     - Type: `A`, Name: `@`, Value: `76.76.19.61`
     - Type: `CNAME`, Name: `www`, Value: `cname.vercel-dns.com`

## Step 4: Configure Build Settings

Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm ci`
- **Development Command**: `npm run dev`

## Step 5: Deploy

1. **Trigger Deployment**:
   - Push any change to your `main` branch
   - Or click "Deploy" in Vercel dashboard

2. **Monitor Build**:
   - Watch the build logs in Vercel dashboard
   - Ensure all environment variables are loaded
   - Check for any build errors

## Step 6: Verify Deployment

Once deployed, test these endpoints:

1. **Homepage**: https://crewflow.dev
2. **Health Check**: https://crewflow.dev/api/health
3. **Authentication**: https://crewflow.dev/auth/login
4. **Dashboard**: https://crewflow.dev/dashboard (after login)

## Step 7: Set Up Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Production**: Pushes to `main` branch → https://crewflow.dev
- **Preview**: Pushes to other branches → temporary preview URLs

## Troubleshooting

### Build Failures
- Check environment variables are set correctly
- Review build logs in Vercel dashboard
- Ensure all dependencies are in package.json

### Domain Issues
- Verify DNS propagation (can take up to 48 hours)
- Check domain configuration in Vercel
- Ensure SSL certificate is generated

### API Issues
- Verify Supabase URLs and keys
- Check CORS settings in Supabase
- Ensure API routes are working

### Environment Variables
- Double-check all required variables are set
- Ensure no typos in variable names
- Verify sensitive keys are correct

## Security Checklist

- [ ] All environment variables are set in Vercel (not in code)
- [ ] Supabase RLS policies are enabled
- [ ] API keys are production-ready
- [ ] HTTPS is enforced
- [ ] CORS is properly configured

## Post-Deployment

1. **Test all features**:
   - User registration/login
   - AI agents functionality
   - Admin system
   - OAuth integrations
   - Payment processing

2. **Monitor performance**:
   - Use Vercel Analytics
   - Check Supabase metrics
   - Monitor error rates

3. **Set up monitoring**:
   - Configure alerts for downtime
   - Set up error tracking
   - Monitor API usage

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase Integration**: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

---

After deployment, your CrewFlow application will be live at https://crewflow.dev with automatic updates from GitHub!
