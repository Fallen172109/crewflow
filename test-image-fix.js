// Test the fixed image generation flow
const fetch = require('node-fetch');

async function testImageGeneration() {
  console.log('🧪 Testing Fixed Image Generation Flow...\n');

  try {
    // Test the Splash agent with image generation action
    const response = await fetch('http://localhost:3010/api/agents/splash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'visual_content_creator',
        params: {
          prompt: 'A cat doing benchpress at the gym',
          style: 'Digital Art',
          aspect_ratio: 'Square (1:1)',
          quality: 'standard'
        },
        message: 'Create an image of a cat doing benchpress at the gym',
        userId: 'test-user'
      })
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Image generation test successful!');
      console.log('🖼️ Response includes image markdown:', data.response.includes('!['));
      console.log('🔧 Framework used:', data.framework);
      console.log('📊 Success flag:', data.success);
      
      // Check if image URL is present
      const imageUrlMatch = data.response.match(/!\[.*?\]\((.*?)\)/);
      if (imageUrlMatch) {
        console.log('🎯 Image URL found:', imageUrlMatch[1].substring(0, 80) + '...');
        
        // Test if the image URL is accessible
        try {
          const imageResponse = await fetch(imageUrlMatch[1], { method: 'HEAD' });
          console.log('🖼️ Image accessibility test:', imageResponse.ok ? 'PASS' : 'FAIL');
          console.log('📊 Image response status:', imageResponse.status);
        } catch (error) {
          console.log('❌ Image accessibility test failed:', error.message);
        }
      } else {
        console.log('❌ No image URL found in response');
      }
      
      console.log('\n📝 Full response preview:');
      console.log(data.response.substring(0, 200) + '...');
      
    } else {
      console.log('❌ Image generation failed');
      const errorText = await response.text();
      console.log('Error:', errorText);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testImageGeneration();
