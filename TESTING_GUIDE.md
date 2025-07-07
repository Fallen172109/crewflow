# 🧪 CrewFlow Shopify Integration Testing Guide

## 🚀 Quick Start Testing (5 minutes)

### 1. **Environment Setup**
```bash
# Install dependencies
npm install

# Set up environment variables (already configured in .env.local)
# You'll need to add your actual Shopify credentials

# Start development server
npm run dev
```

### 2. **Basic Functionality Test**
```bash
# Open browser to http://localhost:3000
# Navigate to /dashboard/shopify
# Check if the Shopify integration page loads
```

## 🔧 **Testing Approaches**

### **Option A: Mock Testing (Recommended for Development)**
Test with simulated data - no real Shopify store needed.

### **Option B: Shopify Development Store**
Test with a free Shopify development store.

### **Option C: Production Store**
Test with your actual Shopify store (use caution).

---

## 🎭 **Option A: Mock Testing (Start Here)**

### 1. **Run Unit Tests**
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=shopify
npm test -- --testPathPattern=agents
npm test -- --testPathPattern=webhooks

# Run tests in watch mode
npm test -- --watch
```

### 2. **Test Individual Components**

#### Test Shopify API Client
```bash
# Create a test file
touch src/__tests__/manual-shopify-test.js
```

```javascript
// src/__tests__/manual-shopify-test.js
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

async function testShopifyAPI() {
  console.log('Testing Shopify API with mock data...')
  
  // This will use mock data since no real credentials
  const api = await createShopifyAPI('test-user-123')
  
  if (api) {
    console.log('✅ Shopify API client created successfully')
    
    // Test mock methods
    try {
      const products = await api.getProducts(10)
      console.log('✅ Products fetched:', products.length)
      
      const orders = await api.getOrders(10)
      console.log('✅ Orders fetched:', orders.length)
      
    } catch (error) {
      console.log('❌ API test failed:', error.message)
    }
  } else {
    console.log('❌ Failed to create Shopify API client')
  }
}

testShopifyAPI()
```

#### Test AI Agents
```bash
# Test agent capabilities
node -e "
const { executeShopifyCapability } = require('./src/lib/agents/shopify-capabilities');

async function testAgent() {
  const result = await executeShopifyCapability(
    'anchor',
    'inventory_management', 
    'test-user-123',
    { action: 'check_stock', productId: 123 }
  );
  console.log('Agent test result:', result);
}

testAgent().catch(console.error);
"
```

### 3. **Test UI Components**

#### Navigate to Shopify Dashboard
1. Go to `http://localhost:3000/dashboard/shopify`
2. Check if all components load:
   - Store connection interface
   - Agent activity dashboard
   - Analytics widgets
   - Permission controls

#### Test Mock Data Display
The interface should show placeholder/mock data for:
- Store metrics
- Agent activities
- Recent actions
- Performance charts

---

## 🏪 **Option B: Shopify Development Store (Recommended)**

### 1. **Create Shopify Development Store**
```bash
# Go to https://partners.shopify.com
# Sign up for Shopify Partner account (free)
# Create a development store
# Note: Development stores are free and perfect for testing
```

### 2. **Create Shopify App**
```bash
# In Shopify Partners dashboard:
# 1. Go to "Apps" section
# 2. Click "Create app"
# 3. Choose "Custom app"
# 4. Fill in app details:
#    - App name: "CrewFlow Test"
#    - App URL: http://localhost:3000
#    - Allowed redirection URLs: http://localhost:3000/api/auth/shopify/callback
```

### 3. **Get API Credentials**
```bash
# In your Shopify app settings:
# 1. Copy "Client ID" 
# 2. Copy "Client secret"
# 3. Generate webhook secret
```

### 4. **Update Environment Variables**
```bash
# Update .env.local with your actual credentials:
SHOPIFY_CLIENT_ID=your_actual_client_id
SHOPIFY_CLIENT_SECRET=your_actual_client_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

### 5. **Test Real Integration**
```bash
# Restart development server
npm run dev

# Navigate to http://localhost:3000/dashboard/shopify
# Click "Connect Store"
# Enter your development store domain: your-dev-store.myshopify.com
# Complete OAuth flow
```

### 6. **Add Test Data to Development Store**
```bash
# In Shopify admin:
# 1. Add some test products
# 2. Create test customers
# 3. Place test orders
# 4. Set up inventory
```

### 7. **Test Agent Actions**
```bash
# In CrewFlow dashboard:
# 1. Try inventory management with Anchor
# 2. Test product optimization with Flint
# 3. Check analytics with Pearl
# 4. Test customer service with Beacon
```

---

## 🔍 **Detailed Testing Scenarios**

### **Scenario 1: Store Connection**
```bash
# Test Steps:
1. Navigate to /dashboard/shopify
2. Click "Connect Store"
3. Enter store domain
4. Complete OAuth authorization
5. Verify store appears in dashboard
6. Check sync status

# Expected Results:
✅ OAuth flow completes successfully
✅ Store data syncs within 2 minutes
✅ Dashboard shows store metrics
✅ Agents show as active
```

### **Scenario 2: Agent Automation**
```bash
# Test Steps:
1. Go to agent dashboard
2. Enable Anchor for inventory management
3. Set low stock threshold to 5 units
4. Reduce a product's inventory to 3 units in Shopify
5. Wait for webhook processing

# Expected Results:
✅ Webhook received and processed
✅ Low stock alert triggered
✅ Anchor agent creates reorder suggestion
✅ Notification sent to user
```

### **Scenario 3: Approval Workflow**
```bash
# Test Steps:
1. Enable Flint for marketing
2. Set price change approval requirement
3. Try to change product price by >20%
4. Check approval request
5. Approve/reject the request

# Expected Results:
✅ Approval request created
✅ User receives notification
✅ Action executes after approval
✅ Audit log records all steps
```

### **Scenario 4: Analytics & Insights**
```bash
# Test Steps:
1. Navigate to analytics dashboard
2. Check revenue metrics
3. View predictive insights
4. Test different timeframes
5. Export analytics data

# Expected Results:
✅ Metrics display correctly
✅ Charts render properly
✅ Insights are relevant
✅ Export functions work
```

---

## 🧪 **Advanced Testing**

### **Load Testing**
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Dashboard Load"
    requests:
      - get:
          url: "/dashboard/shopify"
EOF

# Run load test
artillery run load-test.yml
```

### **Security Testing**
```bash
# Test input validation
curl -X POST http://localhost:3000/api/shopify/stores/connect \
  -H "Content-Type: application/json" \
  -d '{"shopDomain": "<script>alert(\"xss\")</script>"}'

# Test authentication
curl -X GET http://localhost:3000/api/shopify/stores \
  -H "Authorization: Bearer invalid_token"

# Test rate limiting
for i in {1..50}; do
  curl http://localhost:3000/api/health &
done
```

### **Webhook Testing**
```bash
# Install ngrok for webhook testing
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use ngrok URL for webhook endpoints in Shopify
# Test webhook delivery with real events
```

---

## 🐛 **Troubleshooting Common Issues**

### **Issue: "Store connection failed"**
```bash
# Check:
1. Shopify credentials in .env.local
2. App permissions in Shopify Partners
3. Redirect URLs match exactly
4. Development server is running

# Debug:
- Check browser console for errors
- Check server logs: npm run dev
- Verify Shopify app status
```

### **Issue: "Agents not responding"**
```bash
# Check:
1. AI API keys are valid
2. Supabase connection working
3. Database tables exist
4. Permissions are set correctly

# Debug:
- Check API key limits
- Test Supabase connection
- Review agent logs
```

### **Issue: "Webhooks not working"**
```bash
# Check:
1. Webhook URLs are accessible
2. HMAC signatures are valid
3. Webhook secret matches
4. Firewall allows incoming requests

# Debug:
- Use ngrok for local testing
- Check webhook delivery logs in Shopify
- Verify signature validation
```

---

## 📊 **Testing Checklist**

### **Basic Functionality** ✅
- [ ] Environment setup complete
- [ ] Development server starts
- [ ] Shopify integration page loads
- [ ] Mock data displays correctly

### **Store Integration** ✅
- [ ] OAuth flow works
- [ ] Store connects successfully
- [ ] Data syncs properly
- [ ] Webhooks process events

### **Agent Operations** ✅
- [ ] Agents respond to commands
- [ ] Permissions work correctly
- [ ] Approval workflow functions
- [ ] Actions execute properly

### **Analytics & Reporting** ✅
- [ ] Metrics display accurately
- [ ] Charts render correctly
- [ ] Insights are relevant
- [ ] Export functions work

### **Security & Performance** ✅
- [ ] Input validation works
- [ ] Authentication required
- [ ] Rate limiting active
- [ ] Error handling graceful

---

## 🚀 **Next Steps After Testing**

1. **Fix any issues found during testing**
2. **Add more test data for comprehensive testing**
3. **Set up production environment**
4. **Configure monitoring and alerting**
5. **Deploy to staging environment**
6. **Conduct user acceptance testing**
7. **Deploy to production**

---

## 📞 **Need Help?**

If you encounter issues during testing:

1. **Check the logs**: `npm run dev` shows detailed error messages
2. **Review the documentation**: Each component has inline documentation
3. **Test with mock data first**: Eliminates external dependencies
4. **Use browser dev tools**: Check network requests and console errors
5. **Start simple**: Test one component at a time

**Remember**: Start with mock testing, then move to development store, and finally test with production data. This approach minimizes risk and helps identify issues early! 🧪⚓
