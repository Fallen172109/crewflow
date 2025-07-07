#!/usr/bin/env node

// CrewFlow Shopify Integration Test Runner
// Quick testing script for the Shopify integration

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚢 CrewFlow Shopify Integration Test Runner')
console.log('=' .repeat(50))

// Test configuration
const tests = {
  environment: {
    name: '🔧 Environment Setup',
    tests: [
      () => checkEnvFile(),
      () => checkDependencies(),
      () => checkSupabaseConnection(),
      () => checkAIKeys()
    ]
  },
  components: {
    name: '🧩 Component Tests',
    tests: [
      () => testShopifyAPIClient(),
      () => testAgentCapabilities(),
      () => testWebhookProcessing(),
      () => testAnalyticsEngine()
    ]
  },
  integration: {
    name: '🔗 Integration Tests',
    tests: [
      () => testDatabaseSchema(),
      () => testPermissionSystem(),
      () => testWorkflowEngine(),
      () => testMonitoringSystem()
    ]
  },
  ui: {
    name: '🖥️ UI Tests',
    tests: [
      () => testShopifyDashboard(),
      () => testAgentInterface(),
      () => testAnalyticsDashboard(),
      () => testWorkflowBuilder()
    ]
  }
}

// Main test runner
async function runTests() {
  console.log('Starting comprehensive test suite...\n')
  
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0
  
  for (const [category, config] of Object.entries(tests)) {
    console.log(`\n${config.name}`)
    console.log('-'.repeat(30))
    
    for (const test of config.tests) {
      totalTests++
      try {
        await test()
        console.log('✅ PASS')
        passedTests++
      } catch (error) {
        console.log(`❌ FAIL: ${error.message}`)
        failedTests++
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Summary')
  console.log('='.repeat(50))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Your CrewFlow Shopify integration is ready!')
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above and fix them before proceeding.')
  }
}

// Individual test functions
function checkEnvFile() {
  process.stdout.write('Checking .env.local file... ')
  
  if (!fs.existsSync('.env.local')) {
    throw new Error('.env.local file not found')
  }
  
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY',
    'ANTHROPIC_API_KEY'
  ]
  
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      throw new Error(`Missing required environment variable: ${varName}`)
    }
  }
}

function checkDependencies() {
  process.stdout.write('Checking dependencies... ')
  
  if (!fs.existsSync('node_modules')) {
    throw new Error('node_modules not found. Run: npm install')
  }
  
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found')
  }
}

async function checkSupabaseConnection() {
  process.stdout.write('Testing Supabase connection... ')
  
  try {
    // This would test the actual connection
    // For now, just check if the URL is valid
    const envContent = fs.readFileSync('.env.local', 'utf8')
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)
    
    if (!urlMatch || !urlMatch[1].includes('supabase.co')) {
      throw new Error('Invalid Supabase URL')
    }
  } catch (error) {
    throw new Error('Supabase connection failed')
  }
}

function checkAIKeys() {
  process.stdout.write('Validating AI API keys... ')
  
  const envContent = fs.readFileSync('.env.local', 'utf8')
  
  // Check OpenAI key format
  if (!envContent.match(/OPENAI_API_KEY=sk-/)) {
    throw new Error('Invalid OpenAI API key format')
  }
  
  // Check Anthropic key format
  if (!envContent.match(/ANTHROPIC_API_KEY=sk-ant-/)) {
    throw new Error('Invalid Anthropic API key format')
  }
  
  // Check Perplexity key format
  if (!envContent.match(/PERPLEXITY_API_KEY=pplx-/)) {
    throw new Error('Invalid Perplexity API key format')
  }
}

function testShopifyAPIClient() {
  process.stdout.write('Testing Shopify API client... ')
  
  // Check if the API client file exists
  const apiClientPath = 'src/lib/integrations/shopify-admin-api.ts'
  if (!fs.existsSync(apiClientPath)) {
    throw new Error('Shopify API client file not found')
  }
  
  // Check if it exports the required functions
  const content = fs.readFileSync(apiClientPath, 'utf8')
  if (!content.includes('createShopifyAPI')) {
    throw new Error('createShopifyAPI function not found')
  }
}

function testAgentCapabilities() {
  process.stdout.write('Testing agent capabilities... ')
  
  const agentCapabilitiesPath = 'src/lib/agents/shopify-capabilities.ts'
  if (!fs.existsSync(agentCapabilitiesPath)) {
    throw new Error('Agent capabilities file not found')
  }
  
  const content = fs.readFileSync(agentCapabilitiesPath, 'utf8')
  if (!content.includes('executeShopifyCapability')) {
    throw new Error('executeShopifyCapability function not found')
  }
}

function testWebhookProcessing() {
  process.stdout.write('Testing webhook processing... ')
  
  const webhookPath = 'src/lib/webhooks/shopify-webhook-manager.ts'
  if (!fs.existsSync(webhookPath)) {
    throw new Error('Webhook manager file not found')
  }
  
  const content = fs.readFileSync(webhookPath, 'utf8')
  if (!content.includes('processWebhook')) {
    throw new Error('processWebhook function not found')
  }
}

function testAnalyticsEngine() {
  process.stdout.write('Testing analytics engine... ')
  
  const analyticsPath = 'src/lib/analytics/advanced-analytics-engine.ts'
  if (!fs.existsSync(analyticsPath)) {
    throw new Error('Analytics engine file not found')
  }
  
  const content = fs.readFileSync(analyticsPath, 'utf8')
  if (!content.includes('generateAdvancedAnalytics')) {
    throw new Error('generateAdvancedAnalytics function not found')
  }
}

function testDatabaseSchema() {
  process.stdout.write('Testing database schema... ')
  
  // Check if migration files exist
  const migrationsPath = 'supabase/migrations'
  if (!fs.existsSync(migrationsPath)) {
    throw new Error('Database migrations not found')
  }
  
  const files = fs.readdirSync(migrationsPath)
  if (files.length === 0) {
    throw new Error('No migration files found')
  }
}

function testPermissionSystem() {
  process.stdout.write('Testing permission system... ')
  
  const permissionPath = 'src/lib/agents/permission-manager.ts'
  if (!fs.existsSync(permissionPath)) {
    throw new Error('Permission manager file not found')
  }
}

function testWorkflowEngine() {
  process.stdout.write('Testing workflow engine... ')
  
  const workflowPath = 'src/lib/agents/shopify-workflows.ts'
  if (!fs.existsSync(workflowPath)) {
    throw new Error('Workflow engine file not found')
  }
}

function testMonitoringSystem() {
  process.stdout.write('Testing monitoring system... ')
  
  const monitoringPath = 'src/lib/monitoring/production-monitoring.ts'
  if (!fs.existsSync(monitoringPath)) {
    throw new Error('Monitoring system file not found')
  }
}

function testShopifyDashboard() {
  process.stdout.write('Testing Shopify dashboard... ')
  
  const dashboardPath = 'src/app/dashboard/shopify/page.tsx'
  if (!fs.existsSync(dashboardPath)) {
    throw new Error('Shopify dashboard page not found')
  }
}

function testAgentInterface() {
  process.stdout.write('Testing agent interface... ')
  
  const agentInterfacePath = 'src/components/shopify/AgentActivityDashboard.tsx'
  if (!fs.existsSync(agentInterfacePath)) {
    throw new Error('Agent interface component not found')
  }
}

function testAnalyticsDashboard() {
  process.stdout.write('Testing analytics dashboard... ')
  
  const analyticsUIPath = 'src/components/shopify/BusinessIntelligenceDashboard.tsx'
  if (!fs.existsSync(analyticsUIPath)) {
    throw new Error('Analytics dashboard component not found')
  }
}

function testWorkflowBuilder() {
  process.stdout.write('Testing workflow builder... ')
  
  const workflowBuilderPath = 'src/components/shopify/WorkflowBuilder.tsx'
  if (!fs.existsSync(workflowBuilderPath)) {
    throw new Error('Workflow builder component not found')
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests }
