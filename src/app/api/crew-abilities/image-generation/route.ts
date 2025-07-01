import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createImageGenerationService, type ImageGenerationRequest } from '@/lib/ai/image-generation'

export async function POST(request: NextRequest) {
  try {
    const { prompt, style, aspectRatio, quality, userId } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Image description is required' },
        { status: 400 }
      )
    }

    // Verify user authentication if userId provided
    let userProfile = null
    if (userId) {
      const supabase = await createSupabaseServerClient()
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      userProfile = profile
    }

    const startTime = Date.now()

    try {
      const imageService = createImageGenerationService()

      // Create image generation request
      const imageRequest: ImageGenerationRequest = {
        prompt: prompt.trim(),
        style: style || 'Digital Art',
        aspectRatio: aspectRatio || 'Square (1:1)',
        quality: quality === 'hd' ? 'hd' : 'standard',
        isModification: false,
        userId: userId // Pass userId for secure storage
      }

      console.log('Standalone image generation request:', imageRequest)
      const imageResult = await imageService.generateImage(imageRequest)

      if (imageResult.success && imageResult.imageUrl) {
        // Log usage analytics if user is authenticated
        if (userId && userProfile) {
          const { trackRealUsage } = await import('@/lib/ai-usage-tracker')

          await trackRealUsage(
            userId,
            'crew-abilities',
            'Image Generator',
            'langchain', // Use valid framework value instead of 'standalone'
            'openai', // Using OpenAI DALL-E
            'tool_execution', // Use valid message_type
            {
              usage: {
                total_tokens: imageResult.tokensUsed,
                prompt_tokens: Math.floor(imageResult.tokensUsed * 0.1), // Estimate
                completion_tokens: Math.floor(imageResult.tokensUsed * 0.9) // Estimate
              }
            },
            imageResult.latency,
            true,
            undefined,
            {
              image_generated: true,
              style: imageRequest.style,
              aspect_ratio: imageRequest.aspectRatio,
              quality: imageRequest.quality,
              framework: 'langchain', // Use valid framework value
              service_type: 'crew_ability'
            }
          )
        }

        return NextResponse.json({
          success: true,
          imageUrl: imageResult.imageUrl,
          revisedPrompt: imageResult.revisedPrompt,
          tokensUsed: imageResult.tokensUsed,
          latency: imageResult.latency,
          model: imageResult.model,
          metadata: {
            originalPrompt: imageRequest.prompt,
            enhancedPrompt: imageResult.metadata?.enhancedPrompt,
            style: imageRequest.style,
            aspectRatio: imageRequest.aspectRatio,
            quality: imageRequest.quality,
            supabaseStored: imageResult.metadata?.supabaseStored || false
          }
        })
      } else {
        throw new Error(imageResult.error || 'Image generation failed')
      }
    } catch (imageError) {
      console.error('Image generation error:', imageError)
      
      // Log failed usage if user is authenticated
      if (userId && userProfile) {
        const { trackRealUsage } = await import('@/lib/ai-usage-tracker')

        await trackRealUsage(
          userId,
          'crew-abilities',
          'Image Generator',
          'langchain', // Use valid framework value
          'openai',
          'tool_execution', // Use valid message_type
          null,
          Date.now() - startTime,
          false,
          imageError instanceof Error ? imageError.message : 'Unknown error',
          {
            image_generated: false,
            error: true,
            framework: 'langchain', // Use valid framework value
            service_type: 'crew_ability'
          }
        )
      }

      return NextResponse.json({
        success: false,
        error: imageError instanceof Error ? imageError.message : 'Image generation failed',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: 'dall-e-3'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Crew abilities image generation API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'crew-abilities-image-generation',
    status: 'active',
    description: 'Standalone image generation service for general crew abilities',
    capabilities: [
      'image_generation',
      'style_customization',
      'aspect_ratio_control',
      'quality_selection'
    ],
    models: ['dall-e-3'],
    supported_styles: [
      'Photorealistic',
      'Digital Art',
      'Oil Painting',
      'Watercolor',
      'Sketch',
      'Cartoon',
      'Abstract'
    ],
    supported_ratios: [
      'Square (1:1)',
      'Portrait (3:4)',
      'Landscape (4:3)',
      'Wide (16:9)'
    ]
  })
}
