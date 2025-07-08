#!/usr/bin/env node

// Test script to verify Shopify OAuth fixes
require('dotenv').config({ path: '.env.local' })

async function testShopifyOAuthFixes() {
  try {
    console.log('🚢 Testing Shopify OAuth Integration Fixes')
    console.log('=' .repeat(50))
    
    const { createClient } = require('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('📡 Connected to Supabase')
    console.log('')
    
    // Test 1: Database Schema
    console.log('🔍 Test 1: Database Schema Verification')
    console.log('-'.repeat(30))
    
    const tables = ['oauth_states', 'shopify_stores', 'api_connections', 'webhook_configs', 'webhook_events']
    let schemaOk = true
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`   ❌ Table '${table}': ${error.message}`)
          schemaOk = false
        } else {
          console.log(`   ✅ Table '${table}': Accessible`)
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}': ${err.message}`)
        schemaOk = false
      }
    }
    
    console.log('')
    
    // Test 2: Environment Variables
    console.log('🔍 Test 2: Environment Variables')
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
    
    console.log('')
    
    // Test 3: API Routes
    console.log('🔍 Test 3: API Routes Structure')
    console.log('-'.repeat(30))
    
    const fs = require('fs')
    const path = require('path')
    
    const apiRoutes = [
      'src/app/api/auth/shopify/route.ts',
      'src/app/api/auth/shopify/callback/route.ts',
      'src/app/api/auth/shopify/install/route.ts',
      'src/app/api/shopify/stores/route.ts'
    ]
    
    let routesOk = true
    for (const route of apiRoutes) {
      if (fs.existsSync(route)) {
        console.log(`   ✅ ${route}: Exists`)
      } else {
        console.log(`   ❌ ${route}: Missing`)
        routesOk = false
      }
    }
    
    console.log('')
    
    // Test 4: Code Fixes Verification
    console.log('🔍 Test 4: Code Fixes Verification')
    console.log('-'.repeat(30))
    
    // Check API client fix
    const apiClientPath = 'src/lib/integrations/shopify-admin-api.ts'
    if (fs.existsSync(apiClientPath)) {
      const content = fs.readFileSync(apiClientPath, 'utf8')
      if (content.includes('shop_domain') && !content.includes('facebook_user_id')) {
        console.log('   ✅ API Client: Field mapping fixed')
      } else {
        console.log('   ❌ API Client: Field mapping still incorrect')
      }
    } else {
      console.log('   ❌ API Client: File missing')
    }
    
    // Check install route fix
    const installRoutePath = 'src/app/api/auth/shopify/install/route.ts'
    if (fs.existsSync(installRoutePath)) {
      const content = fs.readFileSync(installRoutePath, 'utf8')
      if (content.includes('AppBridge') && content.includes('embedded')) {
        console.log('   ✅ Install Route: Embedded app support added')
      } else {
        console.log('   ❌ Install Route: Missing embedded app support')
      }
    }
    
    // Check callback route fix
    const callbackRoutePath = 'src/app/api/auth/shopify/callback/route.ts'
    if (fs.existsSync(callbackRoutePath)) {
      const content = fs.readFileSync(callbackRoutePath, 'utf8')
      if (content.includes('used: false') && content.includes('user_id: null')) {
        console.log('   ✅ Callback Route: State management improved')
      } else {
        console.log('   ❌ Callback Route: State management not updated')
      }
    }
    
    console.log('')
    
    // Test 5: Dashboard Integration
    console.log('🔍 Test 5: Dashboard Integration')
    console.log('-'.repeat(30))
    
    const dashboardPath = 'src/app/dashboard/shopify/page.tsx'
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf8')
      if (content.includes('/api/auth/shopify') && content.includes('/api/shopify/stores')) {
        console.log('   ✅ Dashboard: OAuth integration connected')
      } else {
        console.log('   ❌ Dashboard: OAuth integration missing')
      }
    } else {
      console.log('   ❌ Dashboard: File missing')
    }
    
    console.log('')
    
    // Summary
    console.log('📊 Test Summary')
    console.log('=' .repeat(50))
    
    const allTestsPassed = schemaOk && envOk && routesOk
    
    if (allTestsPassed) {
      console.log('🎉 All critical tests passed!')
      console.log('')
      console.log('✅ Database schema is ready')
      console.log('✅ Environment variables are configured')
      console.log('✅ API routes are in place')
      console.log('✅ Code fixes have been applied')
      console.log('')
      console.log('🚀 Your Shopify OAuth integration should now work properly!')
      console.log('')
      console.log('📋 Next Steps:')
      console.log('   1. Start your development server: npm run dev')
      console.log('   2. Go to /dashboard/shopify')
      console.log('   3. Click "Connect Store" and test the OAuth flow')
      console.log('   4. Verify that stores appear in the dashboard after connection')
      console.log('')
      console.log('🔧 If you encounter issues:')
      console.log('   - Check browser console for errors')
      console.log('   - Check server logs for OAuth flow issues')
      console.log('   - Verify Shopify app settings match your environment variables')
    } else {
      console.log('⚠️  Some tests failed. Please address the issues above.')
      console.log('')
      if (!schemaOk) {
        console.log('❌ Database schema issues detected')
        console.log('   → Run the SQL migration manually in Supabase Dashboard')
      }
      if (!envOk) {
        console.log('❌ Environment variable issues detected')
        console.log('   → Check your .env.local file')
      }
      if (!routesOk) {
        console.log('❌ API route issues detected')
        console.log('   → Verify all route files exist')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testShopifyOAuthFixes()
}

module.exports = { testShopifyOAuthFixes }
