# Shopify App Testing Guide

## 🧪 **Testing Without Constant Deployments**

### **Method 1: ngrok (Recommended for development)**

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start local development:**
   ```bash
   # Terminal 1: Start your app
   npm run dev
   
   # Terminal 2: Create tunnel
   ngrok http 3000
   ```

3. **Update Shopify Partner Dashboard temporarily:**
   - App URL: `https://abc123.ngrok.io` (your ngrok URL)
   - Redirect URL: `https://abc123.ngrok.io/api/auth/shopify/callback`

4. **Test your changes instantly** without deploying!

### **Method 2: Vercel Preview Deployments**

1. **Create feature branch:**
   ```bash
   git checkout -b test-shopify-changes
   git add .
   git commit -m "Test Shopify OAuth"
   git push origin test-shopify-changes
   ```

2. **Get preview URL from Vercel** (automatic)

3. **Update Partner Dashboard** with preview URL

4. **Test, then merge to main** when ready

---

## 🔄 **Development Workflow**

### **Daily Development:**
```bash
# 1. Start local testing
npm run dev
ngrok http 3000

# 2. Update Partner Dashboard with ngrok URL
# 3. Make changes and test instantly
# 4. No deployment needed!
```

### **When Ready for Production:**
```bash
# 1. Deploy to production
git add .
git commit -m "Final Shopify OAuth fixes"
git push origin main

# 2. Update Partner Dashboard back to crewflow.ai
# 3. Run final Partner submission tests
```

---

## 🎯 **For Your Current Issue:**

**Right now, to test the fixes I made:**

1. **Quick test with ngrok:**
   ```bash
   npm run dev
   ngrok http 3000
   ```

2. **Update Partner Dashboard:**
   - Remove localhost URL
   - Add your ngrok URL temporarily
   - Test the automated checks

3. **If working, deploy to production:**
   ```bash
   git add .
   git commit -m "Fix Shopify Partner OAuth flow"
   git push origin main
   ```

4. **Update Partner Dashboard back to crewflow.ai**

---

## 🛠️ **Testing Checklist:**

- [ ] Remove localhost URL from Partner Dashboard
- [ ] Test with ngrok URL first
- [ ] Verify OAuth flow works
- [ ] Check maintenance mode bypass
- [ ] Test embedded app installation
- [ ] Deploy to production
- [ ] Final Partner Dashboard update
- [ ] Run automated checks

This way you can iterate quickly without constant deployments! 🚀
