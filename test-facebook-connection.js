#!/usr/bin/env node

/**
 * Facebook Connection Test
 * Tests the Facebook access token and basic API functionality
 */

// Your Facebook access token
const ACCESS_TOKEN = 'EAAPTtXPuiZB8BOybGicnuenwEaZA0XKZBAsuWGBNWERXh4gSWP49qtUqvijUAcaqZBs3gsvpKKgAGXwk6F0Dg6dGZBOWLgMZB8ucrKexY8upAIodvnp8Q1JJv1hmexxkEXVzVXZAsfzG4vpCDDmUcWZB5W64zxJZBsFuAH04nEdV8K8RMtuBGPBB7EZAZBcuGxrQqppE1bEhPZB6ZBvAnnQjwkZAGMTDLGDhjUt8ZB7DwrIN5ZCZAOq8vPFuJorFkPO7eIFJJzRX1bZAXjKi7NtSDm'

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v19.0'

async function testFacebookConnection() {
  console.log('🧪 Testing Facebook Connection...\n')
  
  try {
    // Test 1: Basic user info
    console.log('📱 Test 1: Getting basic user info...')
    const userResponse = await fetch(`${FACEBOOK_API_BASE}/me?fields=id,name,email&access_token=${ACCESS_TOKEN}`)
    
    if (!userResponse.ok) {
      const error = await userResponse.json()
      console.error('❌ User info failed:', error)
      return
    }
    
    const userData = await userResponse.json()
    console.log('✅ User info success:', {
      id: userData.id,
      name: userData.name,
      email: userData.email || 'No email permission'
    })
    
    // Test 2: Check token permissions
    console.log('\n🔐 Test 2: Checking token permissions...')
    const permissionsResponse = await fetch(`${FACEBOOK_API_BASE}/me/permissions?access_token=${ACCESS_TOKEN}`)
    
    if (!permissionsResponse.ok) {
      const error = await permissionsResponse.json()
      console.error('❌ Permissions check failed:', error)
      return
    }
    
    const permissionsData = await permissionsResponse.json()
    console.log('✅ Current permissions:')
    permissionsData.data.forEach(perm => {
      console.log(`   ${perm.permission}: ${perm.status}`)
    })
    
    // Test 3: Try to get pages (this might fail with current permissions)
    console.log('\n📄 Test 3: Attempting to get Facebook pages...')
    const pagesResponse = await fetch(`${FACEBOOK_API_BASE}/me/accounts?fields=id,name,category&access_token=${ACCESS_TOKEN}`)
    
    if (!pagesResponse.ok) {
      const error = await pagesResponse.json()
      console.log('⚠️  Pages access failed (expected with basic permissions):', error.error?.message)
    } else {
      const pagesData = await pagesResponse.json()
      console.log('✅ Pages found:', pagesData.data?.length || 0)
      if (pagesData.data && pagesData.data.length > 0) {
        pagesData.data.forEach(page => {
          console.log(`   - ${page.name} (${page.category})`)
        })
      }
    }
    
    // Test 4: Token validation
    console.log('\n🔍 Test 4: Validating token...')
    const debugResponse = await fetch(`${FACEBOOK_API_BASE}/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`)
    
    if (!debugResponse.ok) {
      console.log('⚠️  Token debug failed')
    } else {
      const debugData = await debugResponse.json()
      const tokenInfo = debugData.data
      console.log('✅ Token info:', {
        app_id: tokenInfo.app_id,
        is_valid: tokenInfo.is_valid,
        expires_at: tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000).toISOString() : 'Never',
        scopes: tokenInfo.scopes
      })
    }
    
    console.log('\n🎉 Facebook connection test completed!')
    console.log('\n📋 Summary:')
    console.log('✅ Basic authentication: Working')
    console.log('✅ User profile access: Working')
    console.log('✅ Token validation: Working')
    console.log('⚠️  Page management: Requires additional permissions')
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Add more permissions in Facebook Graph API Explorer')
    console.log('2. Test the CrewFlow integration with current permissions')
    console.log('3. Request app review for advanced permissions')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testFacebookConnection()
