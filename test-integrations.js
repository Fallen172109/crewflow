#!/usr/bin/env node

/**
 * CrewFlow Integration Testing Script
 * Tests all OAuth integrations to ensure they're properly configured
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local')
  if (!fs.existsSync(envPath)) {
    log('❌ .env.local file not found', 'red')
    log('Please copy .env.example to .env.local and configure your OAuth credentials', 'yellow')
    return {}
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  const env = {}
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim()
    }
  })

  return env
}

// Integration configurations to test
const integrations = [
  { id: 'salesforce', name: 'Salesforce', envPrefix: 'SALESFORCE' },
  { id: 'hubspot', name: 'HubSpot', envPrefix: 'HUBSPOT' },
  { id: 'shopify', name: 'Shopify', envPrefix: 'SHOPIFY' },
  { id: 'google-ads', name: 'Google Ads', envPrefix: 'GOOGLE_ADS' },
  { id: 'facebook-business', name: 'Facebook Business', envPrefix: 'FACEBOOK_BUSINESS' },
  { id: 'facebook-ads', name: 'Facebook Ads', envPrefix: 'FACEBOOK_ADS' },
  { id: 'mailchimp', name: 'Mailchimp', envPrefix: 'MAILCHIMP' },
  { id: 'jira', name: 'Jira', envPrefix: 'JIRA' },
  { id: 'asana', name: 'Asana', envPrefix: 'ASANA' },
  { id: 'monday', name: 'Monday.com', envPrefix: 'MONDAY' },
  { id: 'slack', name: 'Slack', envPrefix: 'SLACK' },
  { id: 'discord', name: 'Discord', envPrefix: 'DISCORD' },
  { id: 'twitter', name: 'Twitter/X', envPrefix: 'TWITTER' },
  { id: 'linkedin', name: 'LinkedIn', envPrefix: 'LINKEDIN' }
]

function testIntegrationConfig(integration, env) {
  const clientIdKey = `${integration.envPrefix}_CLIENT_ID`
  const clientSecretKey = `${integration.envPrefix}_CLIENT_SECRET`
  
  const hasClientId = env[clientIdKey] && env[clientIdKey].length > 0
  const hasClientSecret = env[clientSecretKey] && env[clientSecretKey].length > 0
  
  return {
    configured: hasClientId && hasClientSecret,
    clientId: hasClientId,
    clientSecret: hasClientSecret,
    clientIdKey,
    clientSecretKey
  }
}

function testCoreServices(env) {
  log('\n🔧 Testing Core Services', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  const coreServices = [
    { name: 'Supabase URL', key: 'NEXT_PUBLIC_SUPABASE_URL' },
    { name: 'Supabase Anon Key', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
    { name: 'Supabase Service Key', key: 'SUPABASE_SERVICE_ROLE_KEY' },
    { name: 'OpenAI API Key', key: 'OPENAI_API_KEY' },
    { name: 'Perplexity API Key', key: 'PERPLEXITY_API_KEY' }
  ]
  
  let coreConfigured = 0
  
  coreServices.forEach(service => {
    const configured = env[service.key] && env[service.key].length > 0
    const status = configured ? '✅' : '❌'
    const color = configured ? 'green' : 'red'
    
    log(`${status} ${service.name}`, color)
    if (configured) coreConfigured++
  })
  
  log(`\n📊 Core Services: ${coreConfigured}/${coreServices.length} configured`, 
      coreConfigured === coreServices.length ? 'green' : 'yellow')
  
  return coreConfigured === coreServices.length
}

function testOAuthIntegrations(env) {
  log('\n🔗 Testing OAuth Integrations', 'cyan')
  log('=' .repeat(50), 'cyan')
  
  let configuredCount = 0
  const results = []
  
  integrations.forEach(integration => {
    const result = testIntegrationConfig(integration, env)
    results.push({ integration, result })
    
    const status = result.configured ? '✅' : '⚠️'
    const color = result.configured ? 'green' : 'yellow'
    
    log(`${status} ${integration.name}`, color)
    
    if (!result.configured) {
      if (!result.clientId) {
        log(`   Missing: ${result.clientIdKey}`, 'red')
      }
      if (!result.clientSecret) {
        log(`   Missing: ${result.clientSecretKey}`, 'red')
      }
    }
    
    if (result.configured) configuredCount++
  })
  
  log(`\n📊 OAuth Integrations: ${configuredCount}/${integrations.length} configured`, 
      configuredCount > 0 ? 'green' : 'yellow')
  
  return { configuredCount, total: integrations.length, results }
}

function generateSetupInstructions(oauthResults) {
  log('\n📋 Setup Instructions', 'magenta')
  log('=' .repeat(50), 'magenta')
  
  const unconfigured = oauthResults.results.filter(r => !r.result.configured)
  
  if (unconfigured.length === 0) {
    log('🎉 All integrations are configured!', 'green')
    return
  }
  
  log('To configure the remaining integrations:', 'yellow')
  log('1. Open .env.local in your editor', 'white')
  log('2. Add the following environment variables:', 'white')
  
  unconfigured.forEach(({ integration, result }) => {
    log(`\n# ${integration.name}`, 'cyan')
    log(`${result.clientIdKey}=your_${integration.id.replace('-', '_')}_client_id`, 'white')
    log(`${result.clientSecretKey}=your_${integration.id.replace('-', '_')}_client_secret`, 'white')
  })
  
  log('\n3. See OAUTH_INTEGRATIONS_SETUP.md for detailed setup instructions', 'yellow')
  log('4. Restart your development server after adding credentials', 'yellow')
}

function main() {
  log('🚀 CrewFlow Integration Test', 'bright')
  log('Testing OAuth integrations and core services\n', 'white')
  
  const env = loadEnvFile()
  
  // Test core services
  const coreOk = testCoreServices(env)
  
  // Test OAuth integrations
  const oauthResults = testOAuthIntegrations(env)
  
  // Generate setup instructions
  generateSetupInstructions(oauthResults)
  
  // Summary
  log('\n🎯 Summary', 'bright')
  log('=' .repeat(50), 'bright')
  
  if (coreOk) {
    log('✅ Core services are configured', 'green')
  } else {
    log('❌ Core services need configuration', 'red')
  }
  
  if (oauthResults.configuredCount > 0) {
    log(`✅ ${oauthResults.configuredCount} OAuth integrations ready`, 'green')
  } else {
    log('⚠️  No OAuth integrations configured', 'yellow')
  }
  
  log('\n🌐 Next Steps:', 'cyan')
  log('1. Visit http://localhost:3000/dashboard/integrations', 'white')
  log('2. Test OAuth connections by clicking "Connect"', 'white')
  log('3. Use connected integrations with your AI agents', 'white')
  
  if (!coreOk || oauthResults.configuredCount === 0) {
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
