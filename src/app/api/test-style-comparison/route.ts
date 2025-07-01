import { NextRequest, NextResponse } from 'next/server'
import { createImageGenerationService, type ImageGenerationRequest } from '@/lib/ai/image-generation'

export async function POST(request: NextRequest) {
  try {
    const { prompt, styles } = await request.json()

    console.log('🎨 Testing style comparison with actual image generation')
    
    const imageService = createImageGenerationService()
    
    // Test the same prompt with different styles
    const testPrompt = prompt || 'A professional portrait of a person working at a computer'
    const testStyles = styles || ['Photorealistic', 'Digital Art', 'Cartoon']
    
    const results = []
    
    for (const style of testStyles) {
      try {
        console.log(`🧪 Testing style: ${style}`)
        
        const imageRequest: ImageGenerationRequest = {
          prompt: testPrompt,
          style: style,
          aspectRatio: 'Square (1:1)',
          quality: 'standard'
        }

        const imageResult = await imageService.generateImage(imageRequest)
        
        results.push({
          style: style,
          success: imageResult.success,
          imageUrl: imageResult.imageUrl,
          originalPrompt: testPrompt,
          enhancedPrompt: imageResult.metadata?.enhancedPrompt,
          revisedPrompt: imageResult.revisedPrompt,
          tokensUsed: imageResult.tokensUsed,
          latency: imageResult.latency,
          model: imageResult.model,
          error: imageResult.error
        })

        // Add a delay between requests to avoid rate limiting (longer for more styles)
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`❌ Error generating image for style ${style}:`, error)
        results.push({
          style: style,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          originalPrompt: testPrompt
        })
      }
    }

    const successfulResults = results.filter(r => r.success)
    const failedResults = results.filter(r => !r.success)

    return NextResponse.json({
      success: true,
      testPrompt,
      results,
      summary: {
        totalStyles: testStyles.length,
        successfulGenerations: successfulResults.length,
        failedGenerations: failedResults.length,
        averageLatency: successfulResults.length > 0 
          ? Math.round(successfulResults.reduce((sum, r) => sum + (r.latency || 0), 0) / successfulResults.length)
          : 0,
        totalTokensUsed: successfulResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
        uniqueEnhancedPrompts: new Set(successfulResults.map(r => r.enhancedPrompt)).size
      }
    })

  } catch (error) {
    console.error('❌ Style comparison test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
