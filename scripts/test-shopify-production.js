#!/usr/bin/env node

/**
 * Shopify Production OAuth Test Script
 * Tests the Shopify OAuth configuration for production deployment
 */

const https = require('https')
const url = require('url')

// Test configuration
const PRODUCTION_URL = 'https://crewflow.dev'
const TEST_SHOP = 'test-store.myshopify.com' // Replace with actual test store

console.log('🔍 Shopify Production OAuth Test')
console.log('=' .repeat(50))

// Test 1: Environment Variables
console.log('\n📋 Test 1: Environment Variables')
console.log('-'.repeat(30))

const requiredEnvVars = [
  'SHOPIFY_CLIENT_ID',
  'SHOPIFY_CLIENT_SECRET', 
  'SHOPIFY_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL'
]

let envOk = true
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`   ✅ ${envVar}: Present`)
  } else {
    console.log(`   ❌ ${envVar}: Missing`)
    envOk = false
  }
}

if (!envOk) {
  console.log('\n❌ Environment variables missing. Please check your .env.local file.')
  process.exit(1)
}

// Test 2: OAuth URL Generation
console.log('\n🔗 Test 2: OAuth URL Generation')
console.log('-'.repeat(30))

const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
const redirectUri = `${PRODUCTION_URL}/api/auth/shopify/callback`
const state = 'test-state-' + Date.now()
const scopes = [
  'read_products',
  'write_products', 
  'read_orders',
  'write_orders',
  'read_customers',
  'read_analytics',
  'read_inventory',
  'write_inventory',
  'read_fulfillments',
  'write_fulfillments'
].join(',')

const oauthUrl = new URL(`https://${TEST_SHOP}/admin/oauth/authorize`)
oauthUrl.searchParams.set('client_id', clientId)
oauthUrl.searchParams.set('scope', scopes)
oauthUrl.searchParams.set('redirect_uri', redirectUri)
oauthUrl.searchParams.set('state', state)
oauthUrl.searchParams.set('grant_options[]', 'per-user')

console.log(`   Client ID: ${clientId}`)
console.log(`   Redirect URI: ${redirectUri}`)
console.log(`   Scopes: ${scopes}`)
console.log(`   OAuth URL: ${oauthUrl.toString()}`)

// Test 3: Production API Endpoint Test
console.log('\n🌐 Test 3: Production API Endpoint Test')
console.log('-'.repeat(30))

function testProductionEndpoint() {
  return new Promise((resolve, reject) => {
    const testUrl = `${PRODUCTION_URL}/api/auth/shopify?shop=${TEST_SHOP}`
    
    console.log(`   Testing: ${testUrl}`)
    
    const parsedUrl = url.parse(testUrl)
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'CrewFlow-OAuth-Test/1.0'
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`)
        console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`)
        
        if (res.statusCode === 302 || res.statusCode === 301) {
          console.log(`   ✅ Redirect detected (expected for OAuth)`)
          console.log(`   Location: ${res.headers.location}`)
          resolve({ success: true, redirect: res.headers.location })
        } else if (res.statusCode === 401) {
          console.log(`   ⚠️  Authentication required (expected if not logged in)`)
          resolve({ success: true, authRequired: true })
        } else if (res.statusCode >= 400) {
          console.log(`   ❌ Error response: ${data}`)
          resolve({ success: false, error: data })
        } else {
          console.log(`   ✅ Response received`)
          resolve({ success: true, data })
        }
      })
    })
    
    req.on('error', (error) => {
      console.log(`   ❌ Request failed: ${error.message}`)
      reject(error)
    })
    
    req.setTimeout(10000, () => {
      console.log(`   ❌ Request timeout`)
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

// Test 4: Shopify Partner Dashboard Configuration Check
console.log('\n⚙️  Test 4: Configuration Recommendations')
console.log('-'.repeat(30))

console.log('   📋 Shopify Partner Dashboard Checklist:')
console.log('   □ App type set to "Public" (not Embedded)')
console.log('   □ Redirect URI: https://crewflow.dev/api/auth/shopify/callback')
console.log('   □ All required scopes enabled')
console.log('   □ App distribution set to "Custom" or "Private"')
console.log('   □ Client ID matches environment variable')

// Run the test
async function runTests() {
  try {
    console.log('\n🚀 Running Production Test...')
    const result = await testProductionEndpoint()
    
    if (result.success) {
      if (result.redirect) {
        console.log('\n✅ OAuth flow appears to be working!')
        console.log('   The endpoint correctly redirects to Shopify OAuth')
      } else if (result.authRequired) {
        console.log('\n✅ Endpoint is working but requires authentication')
        console.log('   This is expected behavior for the OAuth flow')
      } else {
        console.log('\n✅ Endpoint is responding')
      }
    } else {
      console.log('\n❌ OAuth flow has issues')
      console.log('   Check the Shopify Partner Dashboard configuration')
    }
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message)
  }
  
  console.log('\n📝 Next Steps:')
  console.log('   1. Fix any issues identified above')
  console.log('   2. Update Shopify Partner Dashboard settings')
  console.log('   3. Test OAuth flow manually on production')
  console.log('   4. Submit app for Shopify review')
}

runTests()
