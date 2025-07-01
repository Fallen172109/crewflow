#!/usr/bin/env node

/**
 * Final test for CrewFlow image generation database constraint fix
 */

const BASE_URL = 'http://localhost:3001'

async function testImageGenerationFinal() {
  console.log('🧪 Testing CrewFlow Image Generation - Final Fix...\n')
  
  try {
    const response = await fetch(`${BASE_URL}/api/crew-abilities/image-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A Twitch profile picture for "Fallen" with orange and black colors, gaming theme',
        style: 'Cartoon',
        aspectRatio: 'Portrait (3:4)',
        quality: 'standard',
        userId: 'test-user-id'
      })
    })

    const data = await response.json()
    
    console.log('📊 Final Test Results:')
    console.log('Status Code:', response.status)
    console.log('Success:', data.success)
    
    if (response.status === 200 && data.success) {
      console.log('✅ IMAGE GENERATION: WORKING!')
      console.log('✅ DATABASE CONSTRAINTS: FIXED!')
      console.log('🎨 Image URL:', data.imageUrl ? 'Generated Successfully' : 'Missing')
      console.log('⏱️ Generation Time:', (data.latency / 1000).toFixed(1) + 's')
      console.log('🔧 Model:', data.model)
      console.log('💰 Cost:', '$' + (data.tokensUsed * 0.00002).toFixed(4))
    } else {
      console.log('❌ Still failing...')
      console.log('Error:', data.error)
      console.log('Response:', data)
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message)
  }
  
  console.log('\n🎯 Fix Summary:')
  console.log('- Fixed framework constraint: "standalone" → "langchain"')
  console.log('- Fixed message_type constraint: "image_generation" → "tool_execution"')
  console.log('- Both constraints now use valid database values')
}

testImageGenerationFinal().catch(console.error)
