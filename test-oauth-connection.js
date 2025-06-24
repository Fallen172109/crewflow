#!/usr/bin/env node

/**
 * Test OAuth Connection Script
 * Tests if the OAuth system is working by making a direct API call
 */

const fs = require('fs')
const path = require('path')

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found')
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

async function testOAuthEndpoint() {
  try {
    console.log('🧪 Testing OAuth Connect Endpoint...\n')
    
    const response = await fetch('http://localhost:3000/api/integrations/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper auth, but we can see the error
      },
      body: JSON.stringify({ 
        integrationId: 'facebook-business' 
      })
    })

    const data = await response.json()
    
    console.log('Response Status:', response.status)
    console.log('Response Data:', JSON.stringify(data, null, 2))
    
    if (response.status === 401) {
      console.log('\n✅ API endpoint is working (authentication required as expected)')
    } else if (response.status === 400 && data.error?.includes('OAuth client not configured')) {
      console.log('\n✅ API endpoint is working (OAuth credentials needed)')
      console.log('💡 Add FACEBOOK_BUSINESS_CLIENT_ID and FACEBOOK_BUSINESS_CLIENT_SECRET to .env.local')
    } else {
      console.log('\n❌ Unexpected response')
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    console.log('\n💡 Make sure your development server is running: npm run dev')
  }
}

async function main() {
  console.log('🚀 CrewFlow OAuth Connection Test\n')
  
  const env = loadEnvFile()
  
  // Check if server is likely running
  console.log('📡 Checking development server...')
  
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health').catch(() => null)
    if (!healthCheck) {
      console.log('❌ Development server not responding')
      console.log('💡 Start the server with: npm run dev')
      return
    }
    console.log('✅ Development server is running\n')
  } catch (error) {
    console.log('❌ Cannot reach development server')
    console.log('💡 Start the server with: npm run dev')
    return
  }
  
  await testOAuthEndpoint()
  
  console.log('\n📋 Next Steps:')
  console.log('1. Add OAuth credentials to .env.local')
  console.log('2. Visit http://localhost:3000/dashboard/integrations')
  console.log('3. Click "Connect" on any integration')
  console.log('4. Check browser console for detailed error messages')
}

if (require.main === module) {
  main()
}
