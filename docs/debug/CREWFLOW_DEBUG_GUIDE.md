# 🚢 CrewFlow Chat System Debug Guide

## 🔍 Issues Identified

### 1. **No Network Activity**
- Messages not triggering API calls
- No requests visible in browser Network tab
- Only fallback/template responses showing

### 2. **Chat History Not Persisting**
- Messages disappear after page refresh
- Database not storing conversation history
- No continuity between sessions

## 🛠️ Debugging Tools Added

### 1. **Enhanced Logging**
Added comprehensive console logging to:
- `src/components/agents/AgentInterface.tsx` - Message sending flow
- `src/components/agents/TabbedChatInterface.tsx` - History loading

### 2. **Debug Panel Component**
- **File**: `src/components/debug/CrewFlowDebugPanel.tsx`
- **Location**: Bottom-right corner of agent pages
- **Features**:
  - Full system diagnostics
  - Authentication status check
  - Database connectivity test
  - API endpoint testing
  - Individual component testing

### 3. **Environment Check Script**
- **File**: `debug-crewflow.js`
- **Usage**: `node debug-crewflow.js`
- **Checks**: Environment files, dependencies, critical files

## 🔧 Debugging Steps

### Step 1: Run Environment Check
```bash
node debug-crewflow.js
```

### Step 2: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Send a test message
4. Look for logs starting with "🚀 CREWFLOW DEBUG"

### Step 3: Use Debug Panel
1. Navigate to any agent page
2. Click the red "🐛 Debug" button (bottom-right)
3. Click "Run Full Diagnostics"
4. Review results for each system

### Step 4: Check Network Tab
1. Open DevTools Network tab
2. Send a message
3. Look for requests to `/api/agents/[agentId]/chat`
4. Check request/response details

## 🎯 Common Issues & Solutions

### Authentication Issues
**Symptoms**: 401 errors, "Authentication required"
**Solutions**:
- Verify user is signed in
- Check `.env.local` for Supabase credentials
- Clear browser cookies and re-login

### Database Connection Issues
**Symptoms**: Chat history not loading/saving
**Solutions**:
- Verify Supabase URL and keys in environment
- Check database schema exists
- Test database connection in debug panel

### API Endpoint Issues
**Symptoms**: No network requests, 404/500 errors
**Solutions**:
- Verify Next.js server is running
- Check API route files exist
- Test individual endpoints in debug panel

### Environment Configuration
**Symptoms**: Various connection failures
**Solutions**:
- Ensure `.env.local` exists with all required variables
- Restart development server after env changes
- Check for typos in environment variable names

## 📋 Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Other AI Services (if used)
PERPLEXITY_API_KEY=your_perplexity_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## 🔍 Debug Console Messages

Look for these specific log patterns:

### Message Sending
```
🚀 CREWFLOW DEBUG: handleSendMessage called
🌐 CREWFLOW DEBUG: Making API call
📡 CREWFLOW DEBUG: API response received
```

### History Loading
```
📚 CREWFLOW DEBUG: Loading thread messages
📚 CREWFLOW DEBUG: Messages response
📚 CREWFLOW DEBUG: Loaded messages
```

### Errors
```
❌ CREWFLOW DEBUG: Error sending message
❌ CREWFLOW DEBUG: Error details
```

## 🚨 Emergency Fixes

### If Nothing Works
1. **Clear Browser Data**: Clear cookies, localStorage, sessionStorage
2. **Restart Dev Server**: Stop and restart `npm run dev`
3. **Check Environment**: Ensure `.env.local` exists and is correct
4. **Database Reset**: Check if Supabase project is active

### Quick Test Commands
```bash
# Test environment
node debug-crewflow.js

# Check if server is running
curl http://localhost:3000/api/agents/anchor

# Test database connection (if you have Supabase CLI)
supabase status
```

## 📞 Next Steps

1. **Run the debug tools** and share the results
2. **Check browser console** for specific error messages
3. **Test individual components** using the debug panel
4. **Verify environment configuration** is complete

The debug panel will provide detailed information about what's working and what's not, making it much easier to identify the root cause of both issues.

## 🔄 Cleanup

After debugging, remove the debug panel:
1. Remove import from `src/app/dashboard/agents/[agentId]/page.tsx`
2. Remove `<CrewFlowDebugPanel>` component
3. Optionally remove console.log statements (or keep for future debugging)

---

**Remember**: The debug panel is now active on all agent pages. Use it to get real-time diagnostics of your CrewFlow chat system!
