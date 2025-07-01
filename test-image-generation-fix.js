#!/usr/bin/env node

/**
 * Test script to verify the image generation database constraint fix
 */

const BASE_URL = 'http://localhost:3001'

async function testImageGenerationFix() {
  console.log('🧪 Testing CrewFlow Image Generation Fix...\n')
  
  try {
    const response = await fetch(`${BASE_URL}/api/crew-abilities/image-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A simple test image of a sunset over the ocean',
        style: 'Digital Art',
        aspectRatio: 'Square (1:1)',
        quality: 'standard',
        userId: 'test-user-id' // This will test the analytics tracking
      })
    })

    const data = await response.json()
    
    console.log('📊 Test Results:')
    console.log('Status:', response.status)
    console.log('Success:', data.success)
    
    if (data.success) {
      console.log('✅ Image Generation: WORKING')
      console.log('✅ Database Constraint: FIXED')
      console.log('🎨 Image URL:', data.imageUrl ? 'Generated' : 'Missing')
      console.log('⏱️ Generation Time:', (data.latency / 1000).toFixed(1) + 's')
      console.log('🔧 Model:', data.model)
    } else {
      console.log('❌ Image Generation: FAILED')
      console.log('Error:', data.error)
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message)
  }
  
  console.log('\n🎯 Fix Summary:')
  console.log('- Changed framework from "standalone" to "langchain" in analytics tracking')
  console.log('- This resolves the database constraint violation')
  console.log('- Image generation should now work without internal server errors')
}

testImageGenerationFix().catch(console.error)
