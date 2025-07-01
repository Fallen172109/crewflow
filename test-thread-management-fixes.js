#!/usr/bin/env node

/**
 * Test script for CrewFlow Thread Management Fixes
 * Tests file upload, thread creation, and thread visibility
 */

const BASE_URL = 'http://localhost:3001'

// Test configuration
const TEST_CONFIG = {
  // You'll need to replace this with a valid session token from browser dev tools
  sessionToken: null, // Will be extracted from browser if needed
  agentId: 'splash',
  taskType: 'general'
}

async function testFileUploadAPI() {
  console.log('\n📎 Testing File Upload API...')
  
  try {
    // Create a simple test file
    const testContent = 'This is a test file for CrewFlow thread management'
    const blob = new Blob([testContent], { type: 'text/plain' })
    const file = new File([blob], 'test-file.txt', { type: 'text/plain' })
    
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${BASE_URL}/api/upload/file`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ File upload API working!')
      console.log('📁 Upload result:', {
        success: data.success,
        fileName: data.fileName,
        fileSize: data.fileSize,
        hasUrl: !!data.publicUrl
      })
      return data
    } else {
      const errorData = await response.json()
      console.log('❌ File upload failed:', response.status, errorData.error)
      return null
    }
  } catch (error) {
    console.log('❌ File upload API error:', error.message)
    return null
  }
}

async function testThreadCreationAPI() {
  console.log('\n🧵 Testing Thread Creation API...')
  
  try {
    const testThread = {
      agentName: TEST_CONFIG.agentId,
      taskType: TEST_CONFIG.taskType,
      title: `Test Thread ${Date.now()}`,
      context: 'This is a test thread created by the automated test script',
      attachments: [] // Empty for now, can be populated with file upload results
    }
    
    const response = await fetch(`${BASE_URL}/api/chat/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testThread),
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Thread creation API working!')
      console.log('🧵 Created thread:', {
        id: data.thread.id,
        title: data.thread.title,
        agentName: data.thread.agent_name,
        taskType: data.thread.task_type
      })
      return data.thread
    } else {
      const errorData = await response.json()
      console.log('❌ Thread creation failed:', response.status, errorData.error)
      return null
    }
  } catch (error) {
    console.log('❌ Thread creation API error:', error.message)
    return null
  }
}

async function testThreadListAPI() {
  console.log('\n📋 Testing Thread List API...')
  
  try {
    const response = await fetch(
      `${BASE_URL}/api/chat/threads?agent=${TEST_CONFIG.agentId}&taskType=${TEST_CONFIG.taskType}`,
      {
        credentials: 'include'
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Thread list API working!')
      console.log('📋 Found threads:', data.threads?.length || 0)
      
      if (data.threads && data.threads.length > 0) {
        console.log('🧵 Recent threads:')
        data.threads.slice(0, 3).forEach((thread, index) => {
          console.log(`   ${index + 1}. ${thread.title} (${thread.id.substring(0, 8)}...)`)
        })
      }
      return data.threads
    } else {
      const errorData = await response.json()
      console.log('❌ Thread list failed:', response.status, errorData.error)
      return null
    }
  } catch (error) {
    console.log('❌ Thread list API error:', error.message)
    return null
  }
}

async function runTests() {
  console.log('🚀 Starting CrewFlow Thread Management Tests...')
  console.log(`📍 Testing against: ${BASE_URL}`)
  
  // Test 1: File Upload API
  const uploadResult = await testFileUploadAPI()
  
  // Test 2: Thread Creation API
  const threadResult = await testThreadCreationAPI()
  
  // Test 3: Thread List API
  const threadsResult = await testThreadListAPI()
  
  // Summary
  console.log('\n📊 Test Summary:')
  console.log(`   File Upload: ${uploadResult ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   Thread Creation: ${threadResult ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   Thread List: ${threadsResult ? '✅ PASS' : '❌ FAIL'}`)
  
  if (uploadResult && threadResult && threadsResult) {
    console.log('\n🎉 All thread management APIs are working!')
    console.log('💡 Next steps:')
    console.log('   1. Test the UI in browser at http://localhost:3001')
    console.log('   2. Try creating a new thread with file attachments')
    console.log('   3. Verify thread appears in history dropdown')
    console.log('   4. Test thread switching and message persistence')
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.')
    console.log('💡 Common issues:')
    console.log('   - User not authenticated (need to login first)')
    console.log('   - Database connection issues')
    console.log('   - Missing environment variables')
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { testFileUploadAPI, testThreadCreationAPI, testThreadListAPI }
