# ngrok Workflow Guide

## 🔄 **Yes, you need to start ngrok each time, BUT...**

### **The Reality:**
```bash
# Every time you restart development:
npm run dev          # Starts on localhost:3000
ngrok http 3000      # Gets NEW random URL like https://abc123.ngrok.io
```

### **The URL Changes:**
- First time: `https://abc123.ngrok.io`
- Second time: `https://def456.ngrok.io` 
- Third time: `https://ghi789.ngrok.io`

---

## 💡 **Solutions (Pick One):**

### **Option 1: Paid ngrok ($8/month) - BEST for frequent testing**
```bash
# Get a fixed subdomain
ngrok http 3000 --subdomain=crewflow-dev
# Always get: https://crewflow-dev.ngrok.io

# Set once in Shopify Partner Dashboard:
# App URL: https://crewflow-dev.ngrok.io
# Redirect: https://crewflow-dev.ngrok.io/api/auth/shopify/callback
# Never change again!
```

### **Option 2: Automated Script (FREE)**
```bash
# Use the script I created
npm run dev:shopify

# It will:
# 1. Start your app
# 2. Start ngrok
# 3. Show you the new URLs to copy/paste
```

### **Option 3: Manual but Organized (FREE)**
```bash
# 1. Start both services
npm run dev
ngrok http 3000

# 2. Copy the ngrok URL from terminal
# 3. Update Shopify Partner Dashboard (2 fields)
# 4. Test your changes
# 5. When done, update back to crewflow.ai
```

---

## 🎯 **Recommended Workflow for You:**

### **For Shopify Partner Testing:**

**Phase 1: Get it working (use ngrok)**
```bash
1. npm run dev:shopify
2. Copy URLs to Shopify Partner Dashboard
3. Test until OAuth works perfectly
4. Deploy to production once
```

**Phase 2: Final submission (use production)**
```bash
1. Update Partner Dashboard back to crewflow.ai
2. Run final automated checks
3. Submit for approval
```

### **For Regular Development:**
```bash
# Just use localhost - no ngrok needed
npm run dev
# Work on features, UI, etc.
```

---

## ⚡ **Quick Commands:**

### **Start Shopify Testing:**
```bash
npm run dev:shopify
# Follow the URLs it shows you
```

### **Stop Everything:**
```bash
Ctrl+C
# Updates Partner Dashboard back to crewflow.ai
```

### **Check Current URLs:**
```bash
# Visit this to see what environment is detected
http://localhost:3000/api/debug/environment
```

---

## 🤔 **When to Use Each:**

### **Use localhost (no ngrok):**
- Building UI components
- Working on internal logic
- General development
- Testing locally

### **Use ngrok:**
- Testing Shopify OAuth
- Testing webhooks
- Partner app submission
- Third-party integrations

### **Use crewflow.ai (production):**
- Final testing
- Partner submission
- Real users
- Production features

---

## 💰 **Cost Comparison:**

### **Free ngrok:**
- ✅ Works perfectly
- ❌ Random URLs each time
- ❌ Need to update Partner Dashboard each time

### **Paid ngrok ($8/month):**
- ✅ Fixed subdomain
- ✅ Set once, never change
- ✅ Worth it if testing frequently

### **My Recommendation:**
Start with free ngrok using the automated script. If you find yourself testing Shopify integration daily, upgrade to paid ngrok for the convenience.

The script I created makes the free version much easier to use! 🚀
