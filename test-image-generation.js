// Test script to debug image generation issues in CrewFlow
const BASE_URL = 'http://localhost:3009'

async function testImageGeneration() {
  console.log('🧪 Testing CrewFlow Image Generation...\n')
  
  try {
    console.log('📡 Making API call to Splash agent...')
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
          aspect_ratio: 'Square (1:1)',
          quality: 'standard'
        },
        message: 'Create an image of a cat working out'
      })
    })

    console.log('📊 Response status:', response.status)
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    
    console.log('\n📋 Full Response Data:')
    console.log(JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('\n✅ API call successful!')
      console.log('🖼️ Response includes image markdown:', data.response.includes('![Generated Image]'))
      console.log('🔧 Framework used:', data.framework)
      console.log('🔗 Image URL in response:', !!data.imageUrl)
      console.log('📊 Success flag:', data.success)
      
      // Check if response contains actual image URL
      const imageUrlMatch = data.response.match(/!\[Generated Image\]\((https?:\/\/[^)]+)\)/)
      if (imageUrlMatch) {
        console.log('🎯 Extracted image URL:', imageUrlMatch[1])
        
        // Test if the image URL is accessible
        try {
          const imageResponse = await fetch(imageUrlMatch[1], { method: 'HEAD' })
          console.log('🖼️ Image URL status:', imageResponse.status)
          console.log('🖼️ Image content type:', imageResponse.headers.get('content-type'))
        } catch (error) {
          console.log('❌ Image URL test failed:', error.message)
        }
      } else {
        console.log('❌ No image URL found in response')
      }
      
      return true
    } else {
      console.log('\n❌ API call failed!')
      console.log('Error:', data.error)
      console.log('Full error data:', data)
      return false
    }
  } catch (error) {
    console.log('\n💥 Request failed with error:')
    console.log('Error message:', error.message)
    console.log('Error stack:', error.stack)
    return false
  }
}

async function testDirectImageService() {
  console.log('\n🔬 Testing Direct Image Generation Service...\n')
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-image-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A cat working out at the gym, lifting weights',
        style: 'Digital Art',
        aspectRatio: 'Square (1:1)',
        quality: 'standard'
      })
    })

    console.log('📊 Direct service response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Direct service test successful!')
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('❌ Direct service test failed')
      const errorData = await response.json()
      console.log('Error:', errorData)
    }
  } catch (error) {
    console.log('💥 Direct service test error:', error.message)
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔧 Testing Environment Variables...\n')
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-env`, {
      method: 'GET'
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Environment test successful!')
      console.log('OpenAI API Key present:', !!data.openaiKey)
      console.log('OpenAI API Key length:', data.openaiKey ? data.openaiKey.length : 0)
      console.log('Other keys:', data.otherKeys)
    } else {
      console.log('❌ Environment test failed')
    }
  } catch (error) {
    console.log('💥 Environment test error:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting CrewFlow Image Generation Debug Tests\n')
  console.log('=' .repeat(60))
  
  await testEnvironmentVariables()
  console.log('\n' + '=' .repeat(60))
  
  await testDirectImageService()
  console.log('\n' + '=' .repeat(60))
  
  await testImageGeneration()
  console.log('\n' + '=' .repeat(60))
  
  console.log('\n🏁 All tests completed!')
}

runAllTests().catch(console.error)
