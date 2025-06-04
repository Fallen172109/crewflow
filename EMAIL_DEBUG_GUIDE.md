# 🔍 CrewFlow Email Debugging Guide

## 🚨 Current Issue
Emails are not being sent despite SMTP configuration. Resend dashboard shows 0 emails sent, indicating Supabase is not connecting to Resend.

## 🔧 Root Cause Analysis

Based on research, the most likely issues are:

### 1. **Domain Verification Required** ⚠️
**CRITICAL**: Resend requires domain verification to send emails via SMTP. The current configuration uses `onboarding@resend.dev` which may not be properly set up.

### 2. **Rate Limiting** ✅ FIXED
- Was: 2 emails per hour
- Now: 30 emails per hour

### 3. **SMTP Configuration Issues**
Current settings need verification:
- Host: `smtp.resend.com` ✅
- Port: `587` ✅  
- Username: `resend` ✅
- Password: API key ✅
- From Email: `onboarding@resend.dev` ⚠️

## 🛠️ Debugging Steps

### Step 1: Check Resend Dashboard
1. Go to your Resend dashboard
2. Check "Domains" section
3. Verify if any domains are set up
4. Look for any error messages or warnings

### Step 2: Test with Verified Domain
If you have a domain in Resend:
1. Use an email from that domain (e.g., `noreply@yourdomain.com`)
2. Update Supabase SMTP settings with the verified domain email

### Step 3: Use Resend's Test Domain
For immediate testing, try using Resend's built-in test domain:
- From Email: `onboarding@resend.dev`
- This should work without domain verification

### Step 4: Check Supabase Auth Logs
1. Go to Supabase Dashboard
2. Navigate to Authentication > Logs
3. Look for email-related errors
4. Check for SMTP connection failures

### Step 5: Test SMTP Connection
Use the enhanced test page at `/test-email` to:
1. See detailed debug information
2. Check if user creation is successful
3. Verify if email sending is triggered
4. Monitor browser console for errors

## 🔧 Immediate Fixes to Try

### Fix 1: Reset SMTP Configuration
```bash
# Complete SMTP reconfiguration with proper settings
```

### Fix 2: Use Resend Integration (Recommended)
Instead of manual SMTP, use Resend's Supabase integration:
1. Go to Resend Dashboard > Integrations
2. Find Supabase integration
3. Connect your Supabase project
4. This handles domain verification automatically

### Fix 3: Verify API Key Permissions
1. Check if your Resend API key has sending permissions
2. Regenerate API key if needed
3. Ensure key is not restricted to specific domains

## 🧪 Testing Protocol

### Test 1: Basic Signup
1. Go to `/test-email`
2. Use a unique email address
3. Check debug information
4. Monitor Resend dashboard for activity

### Test 2: Console Monitoring
1. Open browser developer tools
2. Watch console during signup
3. Look for network errors or auth failures

### Test 3: Supabase Logs
1. Check Supabase Auth logs immediately after test
2. Look for SMTP-related errors
3. Check for rate limiting messages

## 📋 Checklist for Resolution

- [ ] Verify domain is set up in Resend
- [ ] Confirm API key has proper permissions
- [ ] Test with `onboarding@resend.dev` first
- [ ] Check Supabase Auth logs for errors
- [ ] Monitor Resend dashboard during tests
- [ ] Verify rate limits are not being hit
- [ ] Test with different email addresses
- [ ] Check browser console for client-side errors

## 🚀 Next Steps

1. **Immediate**: Test with current configuration using debug page
2. **If fails**: Set up domain verification in Resend
3. **Alternative**: Use Resend's Supabase integration
4. **Fallback**: Switch to Gmail SMTP temporarily

## 📞 Common Error Messages

### "SMTP Authentication Failed"
- API key is incorrect or expired
- API key doesn't have sending permissions

### "Domain not verified"
- Need to verify domain in Resend dashboard
- Use `onboarding@resend.dev` for testing

### "Rate limit exceeded"
- Too many emails sent in short time
- Wait or increase rate limits

### "Connection timeout"
- Network issues between Supabase and Resend
- Check Supabase status page

## 🔍 Debug Information to Collect

When testing, collect:
1. Exact error messages from Supabase
2. Resend dashboard activity (or lack thereof)
3. Browser console logs
4. Network tab in developer tools
5. Supabase Auth logs timestamp
6. User creation success/failure
7. Email confirmation status

---

**Status**: 🔍 Investigating - Need to verify domain setup in Resend
**Priority**: High - Email confirmation is critical for user onboarding
