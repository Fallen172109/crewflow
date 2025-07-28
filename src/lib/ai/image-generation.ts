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
  isModification?: boolean
  previousImageContext?: string
  modificationInstructions?: string
  userId?: string
}

export interface ImageGenerationResponse {
  success: boolean
  imageUrl?: string
  imagePath?: string
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
    supabaseStored?: boolean
    originalOpenAIUrl?: string
    isSecureUrl?: boolean
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

  private async uploadImageToSupabase(imageUrl: string, prompt: string, userId?: string): Promise<{ imageUrl: string | null; imagePath: string | null }> {
    try {
      // Download the image from OpenAI
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error('Failed to download image from OpenAI')
      }

      const imageBuffer = await response.arrayBuffer()
      const fileName = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`

      // Create user-specific path for better organization and security
      const imagePath = userId ? `user-${userId}/${fileName}` : `public/${fileName}`

      // Upload to Supabase storage using service role client
      const supabase = createSupabaseServiceClient()
      const { data, error } = await supabase.storage
        .from('generated-images')
        .upload(imagePath, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase storage upload error:', error)
        return { imageUrl: null, imagePath: null }
      }

      // For authenticated users, create a signed URL that expires in 24 hours
      // For public access, use the public URL
      let finalImageUrl: string

      if (userId) {
        // Create signed URL for authenticated access
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('generated-images')
          .createSignedUrl(imagePath, 86400) // 24 hours

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError)
          // Fallback to public URL if signed URL fails
          const { data: publicUrlData } = supabase.storage
            .from('generated-images')
            .getPublicUrl(imagePath)
          finalImageUrl = publicUrlData.publicUrl
        } else {
          finalImageUrl = signedUrlData.signedUrl
        }
      } else {
        // Use public URL for non-authenticated requests
        const { data: publicUrlData } = supabase.storage
          .from('generated-images')
          .getPublicUrl(imagePath)
        finalImageUrl = publicUrlData.publicUrl
      }

      return { imageUrl: finalImageUrl, imagePath }
    } catch (error) {
      console.error('Error uploading image to Supabase:', error)
      return { imageUrl: null, imagePath: null }
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now()

    try {
      // Check if this is a modification request
      const isModification = request.isModification || this.isImageModificationRequest(request.prompt)

      // Enhance the prompt based on style and aspect ratio preferences
      const enhancedPrompt = this.enhancePrompt(
        request.prompt,
        request.style,
        request.aspectRatio,
        isModification,
        request.previousImageContext
      )
      
      // Determine optimal size based on aspect ratio
      const size = this.getOptimalSize(request.aspectRatio)

      console.log('🎨 Image Generation Debug:', {
        originalPrompt: request.prompt,
        selectedStyle: request.style,
        aspectRatio: request.aspectRatio,
        enhancedPrompt: enhancedPrompt,
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

      // Upload image to Supabase storage for persistence with user-specific path
      const { imageUrl: supabaseImageUrl, imagePath } = await this.uploadImageToSupabase(
        imageData.url!,
        request.prompt,
        request.userId
      )

      return {
        success: true,
        imageUrl: supabaseImageUrl || imageData.url, // Fallback to OpenAI URL if upload fails
        imagePath,
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
          originalOpenAIUrl: imageData.url,
          isSecureUrl: !!request.userId && !!supabaseImageUrl
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

  // Detect if this is an image modification request
  private isImageModificationRequest(prompt: string): boolean {
    const modificationKeywords = [
      // Direct modification commands
      /make.*the.*\w+.*\w+/i, // "make the water blue"
      /change.*the.*\w+/i, // "change the dog"
      /turn.*the.*\w+.*into/i, // "turn the dog into a husky"
      /modify.*the.*\w+/i, // "modify the image"
      /edit.*the.*\w+/i, // "edit the background"
      /update.*the.*\w+/i, // "update the colors"
      /replace.*the.*\w+/i, // "replace the dog"
      /add.*to.*the.*\w+/i, // "add clouds to the sky"
      /remove.*the.*\w+/i, // "remove the background"

      // Reference to previous images
      /in.*the.*\w+.*image/i, // "in the dog surfing image"
      /from.*the.*previous.*image/i, // "from the previous image"
      /in.*that.*image/i, // "in that image"
      /the.*image.*above/i, // "the image above"
      /the.*last.*image/i, // "the last image"
      /that.*image/i, // "that image"
      /this.*image/i, // "this image"
      /previous.*image/i, // "previous image"
      /last.*image/i, // "last image"

      // Contextual modification phrases
      /but.*make.*it/i, // "but make it blue"
      /but.*change.*it/i, // "but change it to"
      /but.*with/i, // "but with different colors"
      /same.*but/i, // "same but with"
      /similar.*but/i, // "similar but with"
      /like.*that.*but/i, // "like that but with"
      /except.*make/i, // "except make the"
      /except.*change/i, // "except change the"

      // Gaming/streaming specific modifications
      /modify.*this.*gamer/i, // "modify this gamer image"
      /change.*this.*streamer/i, // "change this streamer"
      /make.*them.*play/i, // "make them playing League of Legends"
      /show.*them.*playing/i, // "show them playing"
      /but.*playing/i, // "but playing League of Legends"
      /instead.*of.*playing/i // "instead of playing"
    ]

    return modificationKeywords.some(pattern => pattern.test(prompt))
  }

  // Extract modification context from prompt
  private extractModificationContext(prompt: string): { baseDescription: string, modifications: string } {
    // Try to identify what's being modified and how
    const modificationPatterns = [
      { pattern: /make.*the.*(\w+).*(\w+.*)/i, extract: (match: RegExpMatchArray) => ({ target: match[1], change: match[2] }) },
      { pattern: /change.*the.*(\w+).*to.*(\w+.*)/i, extract: (match: RegExpMatchArray) => ({ target: match[1], change: match[2] }) },
      { pattern: /turn.*the.*(\w+).*into.*(\w+.*)/i, extract: (match: RegExpMatchArray) => ({ target: match[1], change: match[2] }) }
    ]

    for (const { pattern, extract } of modificationPatterns) {
      const match = prompt.match(pattern)
      if (match) {
        const { target, change } = extract(match)
        return {
          baseDescription: `image with ${target}`,
          modifications: `${target} should be ${change}`
        }
      }
    }

    // Fallback: treat the whole prompt as modification instructions
    return {
      baseDescription: 'previous image',
      modifications: prompt
    }
  }

  private enhancePrompt(prompt: string, style?: string, aspectRatio?: string, isModification?: boolean, previousContext?: string): string {
    let enhanced = prompt

    // Handle image modification requests
    if (isModification && previousContext) {
      const { baseDescription, modifications } = this.extractModificationContext(prompt)
      enhanced = `Based on the previous image (${previousContext}), create a new image with these modifications: ${modifications}. Maintain the overall composition and style of the original while incorporating the requested changes.`
    } else {
      // Enhance specific types of image requests (but preserve style intent)
      enhanced = this.enhanceSpecificImageTypes(enhanced, style)
    }

    // Add powerful style-specific modifiers with technical parameters
    if (style && style !== 'default') {
      const styleModifiers = {
        'Photorealistic': 'photorealistic, ultra-realistic, high-resolution photography, professional camera quality, sharp focus, natural lighting, realistic textures, lifelike details, DSLR quality, 8K resolution',
        'Digital Art': 'digital art, concept art, detailed digital illustration, digital painting, artstation quality, professional digital artwork, vibrant colors, clean digital rendering',
        'Oil Painting': 'oil painting, traditional oil on canvas, classical painting technique, visible brush strokes, rich oil paint texture, museum quality, fine art painting, artistic masterpiece',
        'Watercolor': 'watercolor painting, watercolor on paper, soft watercolor washes, translucent colors, artistic brush strokes, traditional watercolor technique, delicate color blending',
        'Sketch': 'pencil sketch, hand-drawn illustration, graphite drawing, artistic line work, detailed sketching, traditional drawing technique, pencil shading, sketch art style',
        'Cartoon': 'cartoon illustration, animated style, vibrant cartoon colors, stylized cartoon art, playful cartoon design, animation-quality artwork, cartoon character style',
        'Abstract': 'abstract art, modern abstract painting, non-representational art, abstract expressionism, contemporary abstract style, artistic interpretation, creative abstraction'
      }

      const modifier = styleModifiers[style as keyof typeof styleModifiers]
      if (modifier) {
        // Place style modifier at the beginning for stronger influence
        enhanced = `${modifier}. ${enhanced}`
      }
    }

    // Add composition hints based on aspect ratio
    if (aspectRatio) {
      const compositionHints = {
        'Portrait (3:4)': 'vertical composition, portrait orientation, well-framed vertical layout',
        'Landscape (4:3)': 'horizontal composition, landscape orientation, wide horizontal framing',
        'Wide (16:9)': 'wide panoramic composition, cinematic aspect ratio, cinematic framing',
        'Square (1:1)': 'centered composition, balanced square framing, symmetrical layout'
      }

      const hint = compositionHints[aspectRatio as keyof typeof compositionHints]
      if (hint) {
        enhanced = `${enhanced}, ${hint}`
      }
    }

    // Add style-appropriate quality enhancers
    const qualityEnhancers = this.getStyleSpecificQualityEnhancers(style)
    enhanced = `${enhanced}, ${qualityEnhancers}`

    return enhanced
  }

  // Get style-specific quality enhancers
  private getStyleSpecificQualityEnhancers(style?: string): string {
    const qualityEnhancers = {
      'Photorealistic': 'professional quality, studio lighting, crisp details, realistic rendering',
      'Digital Art': 'high quality digital art, professional illustration, detailed artwork',
      'Oil Painting': 'fine art quality, masterful brushwork, rich color palette, artistic excellence',
      'Watercolor': 'artistic quality, delicate technique, beautiful color harmony, traditional artistry',
      'Sketch': 'skilled draftsmanship, precise line work, artistic detail, professional sketch quality',
      'Cartoon': 'polished cartoon art, vibrant illustration, professional animation quality',
      'Abstract': 'sophisticated abstract composition, artistic vision, creative excellence'
    }

    return qualityEnhancers[style as keyof typeof qualityEnhancers] || 'high quality, detailed, professional'
  }

  // Enhance specific types of image requests with better context (style-aware)
  private enhanceSpecificImageTypes(prompt: string, style?: string): string {
    const lowerPrompt = prompt.toLowerCase()

    // Streamer/Gaming content - style-aware enhancements
    if (/\b(streamer|gamer|gaming|twitch|youtube)\b/i.test(prompt)) {
      if (/\b(icon|logo|avatar)\b/i.test(prompt)) {
        const itemType = prompt.includes('icon') ? 'icon' : prompt.includes('logo') ? 'logo' : 'avatar'
        if (style === 'Photorealistic') {
          return `Professional gaming/streaming ${itemType}: ${prompt}, modern design, suitable for streaming platforms`
        } else if (style === 'Cartoon') {
          return `Cartoon gaming/streaming ${itemType}: ${prompt}, playful design, animated style, gaming mascot aesthetic`
        }
        return `Professional gaming/streaming ${itemType}: ${prompt}, modern design, gaming aesthetic, suitable for streaming platforms`
      }

      if (style === 'Photorealistic') {
        return `Gaming/streaming themed: ${prompt}, modern realistic design`
      } else if (style === 'Cartoon') {
        return `Gaming/streaming themed: ${prompt}, cartoon gaming style, animated aesthetic`
      }
      return `Gaming/streaming themed: ${prompt}, modern gaming aesthetic`
    }

    // Professional/Business content - style-aware
    if (/\b(professional|business|corporate|company)\b/i.test(prompt)) {
      if (style === 'Photorealistic') {
        return `Professional business: ${prompt}, corporate photography style, clean professional aesthetic`
      } else if (style === 'Digital Art') {
        return `Professional business: ${prompt}, modern corporate design, clean digital illustration`
      }
      return `Professional business: ${prompt}, clean design, corporate aesthetic, modern and trustworthy`
    }

    // Logo/Icon requests - style-aware
    if (/\b(logo|icon)\b/i.test(prompt)) {
      const itemType = prompt.includes('logo') ? 'logo' : 'icon'
      if (style === 'Photorealistic') {
        return `Professional ${itemType} design: ${prompt}, realistic 3D rendering, modern branding`
      } else if (style === 'Abstract') {
        return `Abstract ${itemType} design: ${prompt}, creative abstract concept, modern artistic branding`
      }
      return `Professional ${itemType} design: ${prompt}, clean, modern, scalable design, suitable for branding`
    }

    // Avatar/Profile requests - style-aware
    if (/\b(avatar|profile|headshot)\b/i.test(prompt)) {
      if (style === 'Photorealistic') {
        return `Professional portrait photography: ${prompt}, studio lighting, professional headshot quality`
      } else if (style === 'Cartoon') {
        return `Cartoon avatar illustration: ${prompt}, character design, animated profile style`
      }
      return `Professional avatar/profile image: ${prompt}, clean background, well-composed, professional appearance`
    }

    // Social media content - style-aware
    if (/\b(social|media|post|story|instagram|facebook|twitter)\b/i.test(prompt)) {
      if (style === 'Photorealistic') {
        return `Social media photography: ${prompt}, professional social content, engaging realistic imagery`
      } else if (style === 'Digital Art') {
        return `Social media digital art: ${prompt}, eye-catching illustration, social platform optimized`
      }
      return `Social media content: ${prompt}, eye-catching, engaging design, optimized for social platforms`
    }

    return prompt
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

// Convenience function for generating images (wrapper around service)
export async function generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  const service = createImageGenerationService()
  return service.generateImage(request)
}
