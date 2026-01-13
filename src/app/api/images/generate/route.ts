import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { ImageGenerationService, validateImageRequest } from '@/lib/ai/image-generation'
import { createLogger } from '@/lib/logger'

const log = createLogger('ImageGenerateAPI')

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 images per hour

// Allowed values for validation
const VALID_STYLES = ['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Sketch', 'Cartoon', 'Abstract']
const VALID_ASPECT_RATIOS = ['Square (1:1)', 'Portrait (3:4)', 'Landscape (4:3)', 'Wide (16:9)']
const VALID_QUALITIES = ['standard', 'hd']

/**
 * Check rate limit for image generation
 * Returns { allowed: boolean, remaining: number, resetAt: Date }
 */
async function checkRateLimit(userId: string, supabase: Awaited<ReturnType<typeof createSupabaseServerClientWithCookies>>) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

  try {
    const { count, error } = await supabase
      .from('image_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart)

    if (error) {
      // If table doesn't exist, allow the request (first use)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) }
      }
      log.warn('Rate limit check failed, allowing request:', error)
      return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) }
    }

    const currentCount = count || 0
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount)
    const allowed = currentCount < RATE_LIMIT_MAX_REQUESTS

    return { allowed, remaining, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) }
  } catch (err) {
    log.warn('Rate limit check error:', err)
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW_MS) }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check rate limit before processing
    const rateLimit = await checkRateLimit(user.id, supabase)
    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded for image generation', { userId: user.id })
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt.getTime() / 1000)),
            'Retry-After': String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))
          }
        }
      )
    }

    const body = await request.json()
    const { prompt, style, aspectRatio, quality } = body

    // Validate request
    const validation = validateImageRequest({ prompt })
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Server-side validation of style, aspectRatio, quality
    const validatedStyle = VALID_STYLES.includes(style) ? style : 'Photorealistic'
    const validatedAspectRatio = VALID_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : 'Square (1:1)'
    const validatedQuality = VALID_QUALITIES.includes(quality) ? quality : 'standard'

    log.debug('Image generation request', {
      userId: user.id,
      prompt: prompt.substring(0, 100),
      style: validatedStyle,
      aspectRatio: validatedAspectRatio,
      quality: validatedQuality
    })

    // Generate image
    const imageService = new ImageGenerationService()
    const result = await imageService.generateImage({
      prompt,
      style: validatedStyle,
      aspectRatio: validatedAspectRatio,
      quality: validatedQuality,
      userId: user.id
    })

    if (!result.success) {
      log.error('Image generation failed', { error: result.error })
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate image' },
        { status: 500 }
      )
    }

    // Save generation record to database for history
    try {
      await supabase.from('image_generations').insert({
        user_id: user.id,
        prompt,
        style: style || 'Photorealistic',
        aspect_ratio: aspectRatio || 'Square (1:1)',
        quality: quality || 'standard',
        image_url: result.imageUrl,
        image_path: result.imagePath,
        revised_prompt: result.revisedPrompt,
        tokens_used: result.tokensUsed,
        latency_ms: result.latency,
        model: result.model,
        metadata: result.metadata
      })
    } catch (dbError) {
      // Log but don't fail the request if history save fails
      log.warn('Failed to save generation history', { error: dbError })
    }

    log.debug('Image generated successfully', {
      userId: user.id,
      latency: result.latency,
      stored: result.metadata?.supabaseStored
    })

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
        metadata: result.metadata
      }
    })

  } catch (error) {
    log.error('Image generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate image'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve user's generation history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    // Validate and bound limit/offset to prevent abuse
    const rawLimit = parseInt(searchParams.get('limit') || '20')
    const rawOffset = parseInt(searchParams.get('offset') || '0')
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 100)
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0)

    const { data, error, count } = await supabase
      .from('image_generations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      // Handle missing table gracefully
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        log.debug('image_generations table does not exist, returning empty history')
        return NextResponse.json({
          success: true,
          data: {
            images: [],
            total: 0,
            limit,
            offset
          }
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        images: data || [],
        total: count || 0,
        limit,
        offset
      }
    })

  } catch (error) {
    log.error('Error fetching generation history:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch history'  // Generic error, don't expose internals
      },
      { status: 500 }
    )
  }
}
