// Real AI Image Generation Implementation
// Uses OpenAI DALL-E API for actual image generation

import OpenAI from 'openai'
import { getAIConfig } from './config'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

export interface ImageGenerationRequest {
  prompt: string
  style?: string
  aspectRatio?: string
  quality?: 'standard' | 'hd'
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  n?: number
}

export interface ImageGenerationResponse {
  success: boolean
  imageUrl?: string
  revisedPrompt?: string
  tokensUsed: number
  latency: number
  model: string
  error?: string
  metadata?: {
    originalPrompt: string
    enhancedPrompt: string
    style: string
    aspectRatio: string
  }
}

export class ImageGenerationService {
  private openai: OpenAI
  private model: string = 'dall-e-3'

  constructor() {
    const aiConfig = getAIConfig()
    this.openai = new OpenAI({
      apiKey: aiConfig.openai.apiKey
    })
  }

  private async uploadImageToSupabase(imageUrl: string, prompt: string): Promise<string | null> {
    try {
      // Download the image from OpenAI
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error('Failed to download image from OpenAI')
      }

      const imageBuffer = await response.arrayBuffer()
      const fileName = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`

      // Upload to Supabase storage using service role client
      const supabase = createSupabaseServiceClient()
      const { data, error } = await supabase.storage
        .from('generated-images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase storage upload error:', error)
        return null
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(fileName)

      return publicUrlData.publicUrl
    } catch (error) {
      console.error('Error uploading image to Supabase:', error)
      return null
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now()

    try {
      // Enhance the prompt based on style and aspect ratio preferences
      const enhancedPrompt = this.enhancePrompt(request.prompt, request.style, request.aspectRatio)
      
      // Determine optimal size based on aspect ratio
      const size = this.getOptimalSize(request.aspectRatio)

      console.log('Generating image with DALL-E:', {
        prompt: enhancedPrompt,
        size,
        quality: request.quality || 'standard'
      })

      const response = await this.openai.images.generate({
        model: this.model,
        prompt: enhancedPrompt,
        size: size,
        quality: request.quality || 'standard',
        n: 1, // DALL-E 3 only supports n=1
        response_format: 'url'
      })

      const imageData = response.data[0]

      // Upload image to Supabase storage for persistence
      const supabaseImageUrl = await this.uploadImageToSupabase(imageData.url!, request.prompt)

      return {
        success: true,
        imageUrl: supabaseImageUrl || imageData.url, // Fallback to OpenAI URL if upload fails
        revisedPrompt: imageData.revised_prompt,
        tokensUsed: this.estimateTokenUsage(enhancedPrompt),
        latency: Date.now() - startTime,
        model: this.model,
        metadata: {
          originalPrompt: request.prompt,
          enhancedPrompt,
          style: request.style || 'default',
          aspectRatio: request.aspectRatio || 'square',
          supabaseStored: !!supabaseImageUrl,
          originalOpenAIUrl: imageData.url
        }
      }
    } catch (error) {
      console.error('DALL-E image generation error:', error)
      return {
        success: false,
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.model,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private enhancePrompt(prompt: string, style?: string, aspectRatio?: string): string {
    let enhanced = prompt

    // Add style modifiers
    if (style && style !== 'default') {
      const styleModifiers = {
        'Photorealistic': 'photorealistic, high detail, professional photography',
        'Digital Art': 'digital art, concept art, detailed illustration',
        'Oil Painting': 'oil painting, classical art style, painterly texture',
        'Watercolor': 'watercolor painting, soft colors, artistic brush strokes',
        'Sketch': 'pencil sketch, hand-drawn, artistic line work',
        'Cartoon': 'cartoon style, animated, colorful and playful',
        'Abstract': 'abstract art, modern, artistic interpretation'
      }
      
      const modifier = styleModifiers[style as keyof typeof styleModifiers]
      if (modifier) {
        enhanced = `${enhanced}, ${modifier}`
      }
    }

    // Add composition hints based on aspect ratio
    if (aspectRatio) {
      const compositionHints = {
        'Portrait (3:4)': 'vertical composition, portrait orientation',
        'Landscape (4:3)': 'horizontal composition, landscape orientation', 
        'Wide (16:9)': 'wide panoramic composition, cinematic aspect ratio',
        'Square (1:1)': 'centered composition, balanced framing'
      }
      
      const hint = compositionHints[aspectRatio as keyof typeof compositionHints]
      if (hint) {
        enhanced = `${enhanced}, ${hint}`
      }
    }

    // Add quality enhancers
    enhanced = `${enhanced}, high quality, detailed, professional`

    return enhanced
  }

  private getOptimalSize(aspectRatio?: string): '1024x1024' | '1792x1024' | '1024x1792' {
    switch (aspectRatio) {
      case 'Portrait (3:4)':
        return '1024x1792'
      case 'Landscape (4:3)':
      case 'Wide (16:9)':
        return '1792x1024'
      case 'Square (1:1)':
      default:
        return '1024x1024'
    }
  }

  private estimateTokenUsage(prompt: string): number {
    // DALL-E doesn't use traditional tokens, but we estimate for tracking
    // Base cost is roughly equivalent to ~100 tokens for image generation
    return Math.max(100, Math.ceil(prompt.length / 4))
  }

  // Preset image generation functions for common use cases
  async generateMarketingImage(description: string, brand?: string): Promise<ImageGenerationResponse> {
    const prompt = `Professional marketing image: ${description}${brand ? ` for ${brand}` : ''}, clean design, modern aesthetic, commercial quality`
    return this.generateImage({
      prompt,
      style: 'Digital Art',
      aspectRatio: 'Landscape (4:3)',
      quality: 'hd'
    })
  }

  async generateSocialMediaImage(description: string, platform?: string): Promise<ImageGenerationResponse> {
    const aspectRatio = platform === 'instagram' ? 'Square (1:1)' : 'Landscape (4:3)'
    const prompt = `Social media content: ${description}, engaging, eye-catching, ${platform || 'social media'} optimized`
    return this.generateImage({
      prompt,
      style: 'Digital Art',
      aspectRatio,
      quality: 'standard'
    })
  }

  async generateIllustration(description: string, style: string = 'Digital Art'): Promise<ImageGenerationResponse> {
    const prompt = `Illustration: ${description}, creative, artistic, detailed illustration`
    return this.generateImage({
      prompt,
      style,
      aspectRatio: 'Square (1:1)',
      quality: 'hd'
    })
  }
}

// Factory function to create image generation service
export function createImageGenerationService(): ImageGenerationService {
  return new ImageGenerationService()
}

// Utility function to validate image generation request
export function validateImageRequest(request: ImageGenerationRequest): { isValid: boolean; error?: string } {
  if (!request.prompt || request.prompt.trim().length === 0) {
    return { isValid: false, error: 'Image prompt is required' }
  }

  if (request.prompt.length > 1000) {
    return { isValid: false, error: 'Image prompt is too long (max 1000 characters)' }
  }

  return { isValid: true }
}
