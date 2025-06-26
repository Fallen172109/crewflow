import { NextRequest, NextResponse } from 'next/server'
import { createImageGenerationService, type ImageGenerationRequest } from '@/lib/ai/image-generation'

export async function POST(request: NextRequest) {
  try {
    const { prompt, style, aspectRatio, quality } = await request.json()

    console.log('🧪 Direct image generation test started')
    console.log('Request params:', { prompt, style, aspectRatio, quality })

    const imageService = createImageGenerationService()
    
    const imageRequest: ImageGenerationRequest = {
      prompt: prompt || 'A cat working out at the gym, lifting weights',
      style: style || 'Digital Art',
      aspectRatio: aspectRatio || 'Square (1:1)',
      quality: quality || 'standard'
    }

    console.log('🎨 Calling image generation service with:', imageRequest)
    const result = await imageService.generateImage(imageRequest)
    
    console.log('📊 Image generation result:', {
      success: result.success,
      hasImageUrl: !!result.imageUrl,
      error: result.error,
      tokensUsed: result.tokensUsed,
      latency: result.latency,
      model: result.model
    })

    return NextResponse.json({
      success: result.success,
      imageUrl: result.imageUrl,
      revisedPrompt: result.revisedPrompt,
      tokensUsed: result.tokensUsed,
      latency: result.latency,
      model: result.model,
      error: result.error,
      metadata: result.metadata
    })

  } catch (error) {
    console.error('💥 Direct image generation test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
