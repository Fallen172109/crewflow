// Test photorealistic image generation fix
const testPhotorealisticFix = async () => {
  try {
    console.log('🧪 Testing Photorealistic Style Fix...')
    
    const response = await fetch('http://localhost:3001/api/crew-abilities/image-generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A professional headshot of a person named "Fallen" for Twitch streaming, black and orange color scheme',
        style: 'Photorealistic',
        aspectRatio: 'Portrait (3:4)',
        quality: 'standard'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Request failed:', response.status, errorText)
      return
    }

    const result = await response.json()
    console.log('✅ Photorealistic test successful!')
    console.log('📊 Result:', {
      success: result.success,
      imageUrl: result.imageUrl ? 'Generated' : 'Missing',
      style: result.metadata?.style,
      enhancedPrompt: result.metadata?.enhancedPrompt
    })

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testPhotorealisticFix()
