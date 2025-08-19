# 🛍️ Shopify AI Store Manager Debug Guide

## 🎯 Focus: AI Store Manager Chat System

This guide focuses specifically on debugging the **Shopify AI Store Manager** chat system, ignoring regular agent chats.

## 📍 Where to Find It

**URL**: `http://localhost:3000/dashboard/shopify`
**Interface**: Simplified single-page Store Manager dashboard
**Component**: `SimplifiedShopifyAIChat` in `src/components/shopify/SimplifiedShopifyAIChat.tsx`

## 🔧 Debug Tools Added

### 1. **Shopify AI Debug Panel**
- **Location**: Orange "🛍️ Shopify Debug" button (bottom-left corner)
- **Features**:
  - Authentication status check
  - Shopify store connection test
  - API endpoint testing (both `/shopify-management` and `/shopify-ai/chat`)
  - Chat history verification
  - Individual component testing

### 2. **Enhanced Console Logging**
Added detailed logging to `ShopifyAIChat.tsx`:
```
🛍️ SHOPIFY DEBUG: handleSendMessage called
🛍️ SHOPIFY DEBUG: Request type determined
🛍️ SHOPIFY DEBUG: Making API call
🛍️ SHOPIFY DEBUG: API response received
🛍️ SHOPIFY DEBUG: Response data
```

## 🚀 Quick Debug Steps

### Step 1: Access the Shopify Store Manager
1. Go to `http://localhost:3000/dashboard/shopify`
2. The AI chat interface is now the central component (no tabs needed)
3. Look for the orange "🛍️ Shopify Debug" button (if available)

### Step 2: Run Diagnostics
1. Click "🛍️ Shopify Debug" button
2. Click "Run Shopify Diagnostics"
3. Review the results for each system:
   - ✅ Authentication
   - ✅ Shopify Stores
   - ✅ Shopify AI API
   - ✅ Chat History

### Step 3: Test Individual Components
- **Test Stores**: Verify Shopify store connections
- **Test Message**: Send a test message to the AI

### Step 4: Check Browser Console
1. Open DevTools (F12) → Console tab
2. Send a message in the chat
3. Look for "🛍️ SHOPIFY DEBUG" logs

## 🎯 Shopify AI System Architecture

### **Two API Endpoints**:

1. **`/api/agents/shopify-management`** (Primary)
   - Used for most requests
   - No thread support
   - Simpler implementation
   - Better for general management

2. **`/api/agents/shopify-ai/chat`** (Thread-based)
   - Requires thread ID
   - Full conversation context
   - More complex but persistent

### **Message Flow**:
```
User Input → ShopifyAIChat → determineRequestType() → API Endpoint → AI Response
```

## 🔍 Common Issues & Solutions

### Issue 1: No Network Activity
**Symptoms**: No API calls in Network tab
**Debug Steps**:
1. Check console for "🛍️ SHOPIFY DEBUG" logs
2. Verify authentication in debug panel
3. Test with debug panel "Test Message" button

**Likely Causes**:
- User not authenticated
- JavaScript errors preventing fetch
- Store not selected

### Issue 2: Chat History Not Persisting
**Symptoms**: Messages disappear after refresh
**Debug Steps**:
1. Check "Chat History" section in debug panel
2. Look for database connection errors
3. Verify thread management is working

**Likely Causes**:
- Database connection issues
- Thread ID problems
- Authentication failures

### Issue 3: "Please select a store first"
**Symptoms**: Alert when trying to send messages
**Debug Steps**:
1. Check "Shopify Stores" section in debug panel
2. Verify store connection
3. Test store API with "Test Stores" button

**Likely Causes**:
- No Shopify stores connected
- Store connection failed
- Store selection not working

## 📋 Environment Requirements

### Required Environment Variables:
```env
# Supabase (for chat history)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (for AI responses)
OPENAI_API_KEY=your_openai_api_key

# Shopify (for store management)
SHOPIFY_CLIENT_ID=your_shopify_app_id
SHOPIFY_CLIENT_SECRET=your_shopify_app_secret
```

## 🛠️ API Endpoints to Test

### 1. Shopify Stores
```bash
GET /api/shopify/stores
```

### 2. Shopify Management (Primary)
```bash
POST /api/agents/shopify-management
{
  "message": "Help me create a product",
  "taskType": "shopify_management",
  "conversationHistory": []
}
```

### 3. Shopify AI Chat (Thread-based)
```bash
POST /api/agents/shopify-ai/chat
{
  "message": "Help me create a product",
  "taskType": "shopify_management",
  "threadId": "temp-debug-123",
  "attachments": []
}
```

### 4. Chat History
```bash
GET /api/chat/history?agent=shopify-ai&limit=5
```

## 🔄 Expected Debug Results

### ✅ **Working System**:
- Authentication: ✅ Authenticated
- Shopify Stores: ✅ 1+ stores connected
- Shopify AI API: ✅ API Working
- Chat History: ✅ Working

### ❌ **Broken System**:
- Authentication: ❌ Not Authenticated
- Shopify Stores: ❌ No stores or connection failed
- Shopify AI API: ❌ API Failed
- Chat History: ❌ Failed

## 🚨 Emergency Fixes

### If Authentication Fails:
1. Check if user is signed in
2. Verify `.env.local` has Supabase credentials
3. Clear browser cookies and re-login

### If No Stores Found:
1. Connect a Shopify store first
2. Check Shopify app credentials
3. Verify OAuth flow is working

### If API Fails:
1. Check OpenAI API key in environment
2. Verify Next.js server is running
3. Check for JavaScript errors in console

## 📞 Next Steps

1. **Run the Shopify debug panel** and share the results
2. **Check browser console** for "🛍️ SHOPIFY DEBUG" logs
3. **Test individual components** using the debug buttons
4. **Verify you have a Shopify store connected**

The debug panel will show exactly what's working and what's not in your Shopify AI Store Manager system!

---

**Remember**: The Shopify AI debug panel is now active at `/dashboard/shopify` - use it to get real-time diagnostics! 🛍️
