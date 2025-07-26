import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { generateImage } from '@/lib/ai/image-generation'
import { getModelForProductCreation, logCostEstimate } from '@/lib/ai/model-config'

interface ProductPreview {
  title: string
  description: string
  price?: number
  images?: string[]
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory_quantity?: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, attachments, storeId, storeCurrency, storePlan } = body

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Initialize AI service
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      return NextResponse.json({
        response: "I apologize, but the AI service is not properly configured. Please contact support.",
        productPreview: null
      })
    }

    // Use GPT-4 for optimal product creation quality
    const modelConfig = getModelForProductCreation()

    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: modelConfig.name,
      maxTokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature
    })

    // Log cost estimate for development
    logCostEstimate(modelConfig.name, 500, 800, 'Product Creation')

    // Analyze attachments if present
    let imageAnalysis = ''
    if (attachments && attachments.length > 0) {
      const imageAttachments = attachments.filter((att: any) => att.type.startsWith('image/'))
      if (imageAttachments.length > 0) {
        // For now, we'll use the image URL directly
        // In a full implementation, you'd use vision AI to analyze the image
        imageAnalysis = `\n\nImage Analysis: User has uploaded ${imageAttachments.length} product image(s). The images show the product they want to create.`
      }
    }

    // Build system prompt for product creation
    const systemPrompt = `You are Splash, CrewFlow's creative AI assistant specializing in Shopify product creation. You help merchants create compelling product listings from images or descriptions.

Store Context:
- Store Currency: ${storeCurrency || 'USD'}
- Store Plan: ${storePlan || 'Basic'}

Your capabilities:
1. Generate compelling product titles (SEO-optimized, 60 chars max)
2. Write persuasive product descriptions (highlight benefits, features, use cases)
3. Suggest competitive pricing based on product type and market
4. Create relevant product categories and tags
5. Generate product variants if applicable
6. Suggest product images if none provided

Guidelines:
- Keep titles concise but descriptive
- Write descriptions that sell (benefits over features)
- Price competitively based on perceived value
- Use relevant, searchable tags
- Consider the store's plan limitations
- Always provide a structured product preview

Response Format:
Provide a conversational response explaining what you've created, followed by a structured product preview in JSON format.

Example response structure:
"I've created an amazing product listing for you! Here's what I came up with:

[Your conversational explanation]

PRODUCT_PREVIEW_START
{
  "title": "Product Title",
  "description": "Detailed product description...",
  "price": 29.99,
  "category": "Category Name",
  "tags": ["tag1", "tag2", "tag3"],
  "variants": [
    {
      "title": "Default Title",
      "price": 29.99,
      "inventory_quantity": 100
    }
  ]
}
PRODUCT_PREVIEW_END"

Always include the PRODUCT_PREVIEW_START and PRODUCT_PREVIEW_END markers with valid JSON between them.`

    // Create user prompt
    const userPrompt = `Please help me create a Shopify product listing.

User Request: ${message}${imageAnalysis}

Please analyze this request and create a complete product listing with title, description, pricing, category, and tags. Make it compelling and ready to sell!`

    // Get AI response
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])

    const aiResponse = response.content as string

    // Extract product preview from response
    let productPreview: ProductPreview | null = null
    const previewMatch = aiResponse.match(/PRODUCT_PREVIEW_START\s*([\s\S]*?)\s*PRODUCT_PREVIEW_END/)
    
    if (previewMatch) {
      try {
        productPreview = JSON.parse(previewMatch[1].trim())
      } catch (error) {
        console.error('Error parsing product preview:', error)
      }
    }

    // Clean response (remove the JSON part for display)
    const cleanResponse = aiResponse.replace(/PRODUCT_PREVIEW_START[\s\S]*?PRODUCT_PREVIEW_END/, '').trim()

    // Generate product image if none provided and user requested it
    let generatedImageUrl = null
    if (!attachments?.length && productPreview && message.toLowerCase().includes('generate image')) {
      try {
        const imagePrompt = `A high-quality product photo of ${productPreview.title} on a clean white background, professional e-commerce style, well-lit, detailed`
        const imageResult = await generateImage(imagePrompt, user.id)
        if (imageResult.imageUrl) {
          generatedImageUrl = imageResult.imageUrl
          if (productPreview.images) {
            productPreview.images.push(imageResult.imageUrl)
          } else {
            productPreview.images = [imageResult.imageUrl]
          }
        }
      } catch (error) {
        console.error('Error generating product image:', error)
      }
    }

    // Store the product creation session for potential publishing
    if (productPreview) {
      await supabase.from('product_drafts').insert({
        user_id: user.id,
        store_id: storeId,
        title: productPreview.title,
        description: productPreview.description,
        price: productPreview.price,
        category: productPreview.category,
        tags: productPreview.tags,
        variants: productPreview.variants,
        images: productPreview.images,
        created_at: new Date().toISOString()
      })
    }

    return NextResponse.json({
      response: cleanResponse,
      productPreview,
      generatedImage: generatedImageUrl
    })

  } catch (error) {
    console.error('Error in product creation:', error)
    return NextResponse.json(
      { 
        response: "I apologize, but I encountered an error while creating your product. Please try again or contact support if the issue persists.",
        productPreview: null
      },
      { status: 500 }
    )
  }
}
