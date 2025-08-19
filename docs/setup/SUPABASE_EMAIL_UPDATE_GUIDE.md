# 📧 Supabase Email Configuration Update Guide

## 🎯 Objective
Update Supabase SMTP settings to use the verified crewflow.ai domain with Resend.

## 🔧 Configuration Steps

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **CrewFlowNEW** project (ID: bmlieuyijpgxdhvicpsf)
3. Navigate to **Authentication** → **Settings**
4. Scroll down to **SMTP Settings** section

### Step 2: Update SMTP Configuration

Replace the current SMTP settings with these **exact values**:

```yaml
SMTP Settings:
  Enable SMTP: ✅ Enabled
  Host: smtp.resend.com
  Port: 587
  Username: resend
  Password: re_dhigHo3e_4tSn2D2YnKjvAcMijj9CMzzH
  From Name: CrewFlow
  From Email: noreply@crewflow.ai
```

### Step 3: Update Email Templates

#### Confirmation Email Template
**Subject**: `🚢 Welcome to CrewFlow - Confirm Your Account`

**Body** (HTML):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CrewFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Source Sans Pro', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #FF6A3D, #e55a2b); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600;">⚓ CrewFlow</h1>
      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Maritime AI Automation Platform</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 20px;">
      <h2 style="color: #000000; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Welcome Aboard! 🚢</h2>
      
      <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for joining CrewFlow, your maritime AI automation platform. We're excited to have you as part of our crew!
      </p>
      
      <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        To get started, please confirm your email address by clicking the button below:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" 
           style="display: inline-block; background-color: #FF6A3D; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Confirm Your Account
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
        If the button doesn't work, you can also copy and paste this link into your browser:<br>
        <a href="{{ .ConfirmationURL }}" style="color: #FF6A3D; word-break: break-all;">{{ .ConfirmationURL }}</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        This email was sent from <strong>CrewFlow</strong><br>
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
```

#### Password Recovery Email Template
**Subject**: `🔐 CrewFlow Password Reset Request`

**Body** (HTML):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - CrewFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Source Sans Pro', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #FF6A3D, #e55a2b); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600;">⚓ CrewFlow</h1>
      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Password Reset Request</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 20px;">
      <h2 style="color: #000000; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Reset Your Password</h2>
      
      <p style="color: #000000; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We received a request to reset your CrewFlow account password. Click the button below to create a new password:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" 
           style="display: inline-block; background-color: #FF6A3D; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
        This link will expire in 24 hours for security reasons.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        This email was sent from <strong>CrewFlow</strong><br>
        For support, contact us at support@crewflow.ai
      </p>
    </div>
  </div>
</body>
</html>
```

### Step 4: Save and Test Configuration

1. **Save** all SMTP settings in Supabase
2. **Test** the configuration using the signup flow
3. **Monitor** the Resend dashboard for email activity

## ✅ Verification Checklist

- [ ] SMTP Host set to `smtp.resend.com`
- [ ] SMTP Port set to `587`
- [ ] Username set to `resend`
- [ ] Password set to your Resend API key
- [ ] From Email set to `noreply@crewflow.ai`
- [ ] From Name set to `CrewFlow`
- [ ] Email templates updated with CrewFlow branding
- [ ] Templates use `{{ .ConfirmationURL }}` variable correctly

## 🧪 Testing Instructions

### Test 1: User Registration
1. Go to your CrewFlow signup page
2. Register with a real email address
3. Check your inbox for the confirmation email
4. Verify the email has CrewFlow branding and @crewflow.ai sender

### Test 2: Password Reset
1. Go to the password reset page
2. Enter your email address
3. Check your inbox for the reset email
4. Verify the email has proper branding and functionality

### Test 3: Resend Dashboard Monitoring
1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Check the "Emails" section for sent emails
3. Verify emails are being sent successfully
4. Check for any error messages or delivery issues

## 🚨 Troubleshooting

### Common Issues

1. **"Domain not verified" error**:
   - Ensure crewflow.ai domain is verified in Resend
   - Check DNS records are properly configured
   - Wait for DNS propagation (up to 24 hours)

2. **"Authentication failed" error**:
   - Verify the Resend API key is correct
   - Check the API key has sending permissions
   - Regenerate API key if needed

3. **Emails not being sent**:
   - Check Supabase Auth logs for errors
   - Verify SMTP settings are saved correctly
   - Test with a different email address

4. **Template rendering issues**:
   - Ensure `{{ .ConfirmationURL }}` variable is used correctly
   - Check HTML syntax is valid
   - Test template rendering in Supabase

## 📊 Expected Results

After successful configuration:
- ✅ Emails sent from `noreply@crewflow.ai`
- ✅ Professional CrewFlow branding in all emails
- ✅ Resend dashboard shows successful email delivery
- ✅ Users receive confirmation emails promptly
- ✅ Password reset emails work correctly

## 🔄 Next Steps

Once SMTP is configured and tested:
1. Update production environment variables in Vercel
2. Test email functionality on the live site
3. Monitor email delivery rates and user feedback
4. Consider setting up additional email addresses for different purposes

---

**Status**: Ready for implementation
**Priority**: High - Required for user authentication
**Estimated Time**: 15-20 minutes
