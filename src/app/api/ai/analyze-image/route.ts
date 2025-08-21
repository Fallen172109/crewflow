import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { getAIConfig } from '@/lib/ai/config'
import OpenAI from 'openai'

interface ImageAnalysisRequest {
  imageUrl: string
  fileName: string
  context?: string
  additionalPrompt?: string
}

interface ImageAnalysisResult {
  description: string
  productRelevance: string
  suggestedTags: string[]
  qualityScore: number
  suitableForEcommerce: boolean
  detectedObjects?: string[]
  colors?: string[]
  style?: string
  mood?: string
}

const ANALYSIS_PROMPT = `You are an expert e-commerce image analyst. Analyze this image and provide insights for online product listings.

Please analyze the image and return a JSON response with the following structure:
{
  "description": "Detailed description of what's in the image",
  "productRelevance": "How suitable this image is for product listings",
  "suggestedTags": ["tag1", "tag2", "tag3"], // 3-5 relevant tags
  "qualityScore": 0.85, // Score from 0-1 for image quality
  "suitableForEcommerce": true, // Boolean for e-commerce suitability
  "detectedObjects": ["object1", "object2"], // Main objects/items in image
  "colors": ["color1", "color2"], // Dominant colors
  "style": "modern/vintage/minimalist/etc", // Visual style
  "mood": "professional/casual/elegant/etc" // Overall mood/feeling
}

Focus on:
- Image quality and clarity
- Professional appearance for e-commerce
- Product visibility and presentation
- Background and lighting quality
- Potential for use in online stores
- SEO-relevant keywords and tags

Be concise but thorough in your analysis.`

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: ImageAnalysisRequest = await request.json()
    const { imageUrl, fileName, context, additionalPrompt } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Initialize OpenAI with GPT-4 Vision
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: aiConfig.openai.apiKey
    })

    // Build context-aware prompt
    let contextPrompt = ANALYSIS_PROMPT
    
    if (context === 'shopify-product-image') {
      contextPrompt += `\n\nSPECIAL CONTEXT: This image is being analyzed for Shopify product listings. Focus on:
- Product photography best practices
- Shopify image requirements and recommendations
- E-commerce conversion optimization
- Professional product presentation`
    }

    if (additionalPrompt) {
      contextPrompt += `\n\nADDITIONAL CONTEXT: ${additionalPrompt}`
    }

    console.log('🔍 Analyzing image:', fileName, 'for user:', user.id)

    // Call GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 with vision capabilities
      messages: [
        {
          role: 'system',
          content: contextPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this image (${fileName}) and provide comprehensive e-commerce insights in JSON format.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high' // High detail for better analysis
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.3 // Lower temperature for more consistent analysis
    })

    const analysisText = response.choices[0]?.message?.content
    if (!analysisText) {
      throw new Error('No analysis received from AI')
    }

    console.log('🤖 Raw AI response:', analysisText)

    // Parse JSON response
    let analysisResult: ImageAnalysisResult
    try {
      // Extract JSON from response (in case there's additional text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : analysisText
      analysisResult = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('JSON parsing failed, creating structured response from text')
      // If JSON parsing fails, create structured response from text
      analysisResult = {
        description: analysisText.substring(0, 200) + '...',
        productRelevance: 'Analysis completed but format parsing failed',
        suggestedTags: ['image', 'product', 'upload'],
        qualityScore: 0.7,
        suitableForEcommerce: true,
        detectedObjects: [],
        colors: [],
        style: 'unknown',
        mood: 'neutral'
      }
    }

    // Validate and enhance the analysis
    const enhancedAnalysis: ImageAnalysisResult = {
      description: analysisResult.description || 'Image analysis completed',
      productRelevance: analysisResult.productRelevance || 'Suitable for product listings',
      suggestedTags: Array.isArray(analysisResult.suggestedTags) 
        ? analysisResult.suggestedTags.slice(0, 5) 
        : ['product', 'image'],
      qualityScore: typeof analysisResult.qualityScore === 'number' 
        ? Math.max(0, Math.min(1, analysisResult.qualityScore))
        : 0.7,
      suitableForEcommerce: typeof analysisResult.suitableForEcommerce === 'boolean'
        ? analysisResult.suitableForEcommerce
        : true,
      detectedObjects: Array.isArray(analysisResult.detectedObjects)
        ? analysisResult.detectedObjects.slice(0, 10)
        : [],
      colors: Array.isArray(analysisResult.colors)
        ? analysisResult.colors.slice(0, 5)
        : [],
      style: analysisResult.style || 'modern',
      mood: analysisResult.mood || 'professional'
    }

    console.log('✅ Image analysis completed:', enhancedAnalysis)

    // Log usage for analytics (optional)
    try {
      await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          service: 'openai-vision',
          model: 'gpt-4o',
          tokens_used: response.usage?.total_tokens || 0,
          cost_estimate: (response.usage?.total_tokens || 0) * 0.00001, // Rough estimate
          request_type: 'image_analysis',
          metadata: {
            fileName,
            context,
            imageUrl: imageUrl.substring(0, 100) + '...' // Truncated for privacy
          }
        })
    } catch (logError) {
      console.warn('Failed to log AI usage:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json(enhancedAnalysis)

  } catch (error) {
    console.error('Image analysis error:', error)
    
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          { error: 'AI service quota exceeded. Please contact support.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze image. Please try again.' },
      { status: 500 }
    )
  }
}

// GET method for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'image-analysis',
    model: 'gpt-4o'
  })
}
