# 🔒 CrewFlow Security Setup Guide

## 🚨 Important Security Notice

This repository has been cleaned of all sensitive credentials and is safe for public use. However, you'll need to configure your own credentials for development.

## 📋 Quick Setup for Development

### 1. Environment Variables Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials in `.env.local`:**

#### Required for Basic Functionality:
```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI API Keys (Required)
OPENAI_API_KEY=sk-your_openai_api_key
PERPLEXITY_API_KEY=pplx-your_perplexity_api_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key

# Admin System
ADMIN_PROMOTION_KEY=your-secure-admin-key-here
```

#### Optional for Full Features:
```bash
# Email Service
RESEND_API_KEY=re_your_resend_api_key

# Payment Processing
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# OAuth Integrations (as needed)
CREWFLOW_FACEBOOK_CLIENT_ID=your_facebook_client_id
CREWFLOW_FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
CREWFLOW_SHOPIFY_CLIENT_ID=your_shopify_client_id
CREWFLOW_SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
```

### 2. Security Best Practices

#### ✅ DO:
- Keep `.env.local` in your local development only
- Use different credentials for development/staging/production
- Rotate API keys regularly
- Use environment-specific Supabase projects
- Generate strong admin keys

#### ❌ DON'T:
- Commit `.env.local` to version control
- Share credentials in chat/email
- Use production credentials in development
- Hardcode secrets in source code
- Use weak admin passwords

### 3. Getting API Keys

#### Supabase:
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy URL and anon key
5. Copy service role key (keep secret!)

#### OpenAI:
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Go to API Keys section
3. Create new secret key
4. Copy key (starts with `sk-`)

#### Perplexity AI:
1. Create account at [perplexity.ai](https://perplexity.ai)
2. Go to API section
3. Generate API key
4. Copy key (starts with `pplx-`)

#### Anthropic (Optional):
1. Create account at [console.anthropic.com](https://console.anthropic.com)
2. Go to API Keys
3. Create new key
4. Copy key (starts with `sk-ant-`)

### 4. Verification

Run the setup verification:
```bash
npm run dev
```

If you see errors about missing environment variables, check your `.env.local` file.

## 🛡️ Production Security

For production deployment:

1. **Use secure environment variable management**
   - Vercel: Project Settings → Environment Variables
   - Never expose service role keys in client-side code

2. **Rotate credentials regularly**
   - Set up calendar reminders
   - Use different keys for each environment

3. **Monitor usage**
   - Check API usage dashboards
   - Set up billing alerts
   - Monitor for unusual activity

## 🆘 Security Issues

If you discover any security vulnerabilities:

1. **DO NOT** create a public issue
2. Contact the maintainers privately
3. Allow time for fixes before disclosure

## 📚 Additional Resources

- [Supabase Security Guide](https://supabase.com/docs/guides/auth/security)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [Environment Variable Security](https://12factor.net/config)

---

**Remember**: Security is everyone's responsibility. When in doubt, ask for help!
