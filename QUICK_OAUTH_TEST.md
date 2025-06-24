# Quick OAuth Integration Test

## Issues Fixed

✅ **API Error Handling**: Updated to show specific error messages
✅ **Button Styling**: Changed to orange (`bg-orange-600`) to match CrewFlow theme
✅ **Error Messages**: Now shows detailed OAuth configuration errors
✅ **Theme Consistency**: All buttons and UI elements now use orange theme

## Test the OAuth System

### Option 1: Test with Demo Credentials (Quick Test)

Add these test credentials to your `.env.local` file to test the UI flow:

```env
# Test credentials (won't work for real OAuth but will test the system)
FACEBOOK_BUSINESS_CLIENT_ID=test_client_id_123
FACEBOOK_BUSINESS_CLIENT_SECRET=test_client_secret_456
```

### Option 2: Set Up Real Salesforce OAuth (Quick Setup)

1. **Create Salesforce Connected App**:
   - Go to Salesforce Setup → App Manager
   - Click "New Connected App"
   - Fill in basic info (name, email, etc.)

2. **Configure OAuth**:
   - Enable OAuth Settings: ✅
   - Callback URL: `http://localhost:3000/api/integrations/oauth/callback`
   - Selected OAuth Scopes: "Access and manage your data (api)", "Perform requests on your behalf at any time (refresh_token, offline_access)"

3. **Get Credentials**:
   - Copy Consumer Key → `SALESFORCE_CLIENT_ID`
   - Copy Consumer Secret → `SALESFORCE_CLIENT_SECRET`

4. **Add to .env.local**:
   ```env
   SALESFORCE_CLIENT_ID=your_consumer_key
   SALESFORCE_CLIENT_SECRET=your_consumer_secret
   ```

### Option 3: Set Up Real Facebook OAuth (Full Test)

1. **Create Facebook App**:
   - Go to https://developers.facebook.com/
   - Create new app → Business type
   - Add "Facebook Login" product

2. **Configure OAuth**:
   - In Facebook Login settings, add redirect URI:
   - `http://localhost:3000/api/integrations/oauth/callback`

3. **Get Credentials**:
   - Copy App ID → `FACEBOOK_BUSINESS_CLIENT_ID`
   - Copy App Secret → `FACEBOOK_BUSINESS_CLIENT_SECRET`

4. **Add to .env.local**:
   ```env
   FACEBOOK_BUSINESS_CLIENT_ID=your_actual_app_id
   FACEBOOK_BUSINESS_CLIENT_SECRET=your_actual_app_secret
   ```

## Testing Steps

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Visit integrations page**:
   ```
   http://localhost:3000/dashboard/integrations
   ```

3. **Test the connection**:
   - Click the blue "Connect" button on Facebook Business
   - Check browser console for error messages
   - With test credentials: Should show OAuth configuration error
   - With real credentials: Should redirect to Facebook OAuth

## Expected Behavior

### With Test Credentials
- Button click works
- Shows error: "OAuth client not configured" with helpful message
- No browser console errors

### With Real Credentials
- Button click works
- Redirects to Facebook OAuth page
- After authorization, redirects back to integrations page

## Troubleshooting

### Button Not Visible
- ✅ Fixed: Changed to `bg-blue-600` for better contrast

### "Failed to initiate connection" Error
- ✅ Fixed: Added specific error handling
- Now shows: "OAuth client not configured for facebook-business. Please set FACEBOOK_BUSINESS_CLIENT_ID and FACEBOOK_BUSINESS_CLIENT_SECRET..."

### Console Errors
- Check browser developer tools (F12)
- Look for network errors in Network tab
- Check server logs in terminal

## Quick Test Commands

```bash
# Test integration configuration
node test-integrations.js

# Test OAuth endpoint (if server is running)
node test-oauth-connection.js
```

## Next Steps

1. Add OAuth credentials to `.env.local`
2. Restart development server
3. Test Facebook Business connection
4. Add more integrations as needed
5. Use connected integrations with AI agents
