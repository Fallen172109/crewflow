// Test script for CrewFlow Crew Abilities fixes
// This script tests the key functionality that was fixed

const BASE_URL = 'http://localhost:3009'

async function testImageGeneration() {
  console.log('🧪 Testing Image Generation via Splash Agent...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/agents/splash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'visual_content_creator',
        params: {
          prompt: 'A cat working out at the gym, lifting weights',
          style: 'Digital Art',
          aspect_ratio: 'Square (1:1)'
        },
        message: 'Create an image of a cat working out'
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Image generation successful!')
      console.log('Response includes image URL:', data.response.includes('![Generated Image]'))
      console.log('Framework used:', data.framework)
      console.log('Image URL in metadata:', !!data.imageUrl)
      return true
    } else {
      console.log('❌ Image generation failed:', data.error)
      return false
    }
  } catch (error) {
    console.log('❌ Image generation error:', error.message)
    return false
  }
}

async function testChatHistoryAPI() {
  console.log('🧪 Testing Chat History API...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/chat/history?agent=splash&taskType=crew_ability&limit=10`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Chat history API working!')
      console.log('Messages returned:', data.messages?.length || 0)
      return true
    } else {
      console.log('❌ Chat history API failed:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Chat history API error:', error.message)
    return false
  }
}

async function testAgentChatAPI() {
  console.log('🧪 Testing Agent Chat API with task_type...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/agents/splash/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message for crew abilities',
        taskType: 'crew_ability',
        userId: 'test-user'
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Agent chat API working!')
      console.log('Response received:', !!data.response)
      console.log('Agent info:', data.agent?.name)
      return true
    } else {
      console.log('❌ Agent chat API failed:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Agent chat API error:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting CrewFlow Crew Abilities Tests...\n')
  
  const results = {
    imageGeneration: await testImageGeneration(),
    chatHistory: await testChatHistoryAPI(),
    agentChat: await testAgentChatAPI()
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log('Image Generation:', results.imageGeneration ? '✅ PASS' : '❌ FAIL')
  console.log('Chat History API:', results.chatHistory ? '✅ PASS' : '❌ FAIL')
  console.log('Agent Chat API:', results.agentChat ? '✅ PASS' : '❌ FAIL')
  
  const allPassed = Object.values(results).every(result => result)
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
  
  return allPassed
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1)
  })
}

// Export for browser testing
if (typeof window !== 'undefined') {
  window.testCrewAbilities = runAllTests
}
