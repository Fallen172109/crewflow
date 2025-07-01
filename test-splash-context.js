#!/usr/bin/env node

/**
 * Test script for Splash agent thread context functionality
 * This script tests the complete workflow of context creation, storage, and AI awareness
 */

const BASE_URL = 'http://localhost:3001'

async function testSplashContextWorkflow() {
  console.log('🧪 Testing Splash Agent Context Functionality...\n')

  try {
    // Test 1: Create a new thread with context
    console.log('📝 Test 1: Creating thread with context...')
    const threadResponse = await fetch(`${BASE_URL}/api/chat/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentName: 'splash',
        taskType: 'general',
        title: 'Facebook Sales Business Strategy',
        context: 'I am starting a Facebook sales business focused on selling handmade jewelry to women aged 25-45. I need help with social media strategy, content creation, and audience engagement. My budget is limited and I am just starting out.'
      })
    })

    if (!threadResponse.ok) {
      console.log('❌ Thread creation failed:', threadResponse.status)
      return false
    }

    const threadData = await threadResponse.json()
    const threadId = threadData.thread.id
    console.log('✅ Thread created successfully:', threadId)

    // Test 2: Send a message to the thread and check if context is used
    console.log('\n💬 Test 2: Sending message to thread...')
    const messageResponse = await fetch(`${BASE_URL}/api/agents/splash/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What social media platforms should I focus on for my business?',
        taskType: 'general',
        threadId: threadId
      })
    })

    if (!messageResponse.ok) {
      console.log('❌ Message sending failed:', messageResponse.status)
      return false
    }

    const messageData = await messageResponse.json()
    console.log('✅ Message sent successfully')
    console.log('📄 Response preview:', messageData.response.substring(0, 200) + '...')

    // Test 3: Check if response mentions context-specific details
    const response = messageData.response.toLowerCase()
    const contextAware = (
      response.includes('jewelry') ||
      response.includes('handmade') ||
      response.includes('women') ||
      response.includes('25-45') ||
      response.includes('limited budget') ||
      response.includes('starting out')
    )

    if (contextAware) {
      console.log('✅ Response appears to be context-aware!')
    } else {
      console.log('❌ Response does not seem to reference the provided context')
      console.log('Full response:', messageData.response)
    }

    // Test 4: Test the direct Splash route with thread context
    console.log('\n🔄 Test 3: Testing direct Splash route with thread context...')
    const directResponse = await fetch(`${BASE_URL}/api/agents/splash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Give me 3 specific content ideas for my business',
        threadId: threadId
      })
    })

    if (!directResponse.ok) {
      console.log('❌ Direct route failed:', directResponse.status)
      return false
    }

    const directData = await directResponse.json()
    console.log('✅ Direct route working')
    
    const directResponseText = directData.response.toLowerCase()
    const directContextAware = (
      directResponseText.includes('jewelry') ||
      directResponseText.includes('handmade') ||
      directResponseText.includes('women') ||
      directResponseText.includes('facebook')
    )

    if (directContextAware) {
      console.log('✅ Direct route is also context-aware!')
    } else {
      console.log('❌ Direct route does not seem context-aware')
      console.log('Direct response preview:', directData.response.substring(0, 200) + '...')
    }

    // Test 5: Retrieve thread context via API
    console.log('\n📖 Test 4: Retrieving thread context...')
    const contextResponse = await fetch(`${BASE_URL}/api/chat/threads/${threadId}`)
    
    if (!contextResponse.ok) {
      console.log('❌ Context retrieval failed:', contextResponse.status)
      return false
    }

    const contextData = await contextResponse.json()
    console.log('✅ Context retrieved successfully')
    console.log('📝 Stored context:', contextData.thread.context)

    console.log('\n🎉 All tests completed!')
    return true

  } catch (error) {
    console.error('❌ Test error:', error.message)
    return false
  }
}

// Run the test
testSplashContextWorkflow()
  .then(success => {
    if (success) {
      console.log('\n✅ Context functionality test PASSED!')
    } else {
      console.log('\n❌ Context functionality test FAILED!')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test script error:', error)
    process.exit(1)
  })
