import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { getModelForProductCreation, logCostEstimate } from '@/lib/ai/model-config'

interface ProductData {
  id?: string
  title: string
  description: string
  price?: number
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory_quantity?: number
  }>
  images?: string[]
}

interface ProductChange {
  field: string
  oldValue: any
  newValue: any
  description: string
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
    const { message, currentProduct, storeId, storeCurrency } = body

    if (!storeId || !currentProduct) {
      return NextResponse.json(
        { error: 'Store ID and current product are required' },
        { status: 400 }
      )
    }

    // Initialize AI service with GPT-4 for quality editing
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      return NextResponse.json({
        response: "I apologize, but the AI service is not properly configured. Please contact support.",
        updatedProduct: null,
        changes: []
      })
    }

    const modelConfig = getModelForProductCreation()

    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: modelConfig.name,
      maxTokens: modelConfig.maxTokens,
      temperature: 0.3 // Lower temperature for more consistent edits
    })

    logCostEstimate(modelConfig.name, 400, 600, 'Product Editing')

    // Build system prompt for product editing
    const systemPrompt = `You are Splash, CrewFlow's creative AI assistant specializing in Shopify product editing. You help merchants modify their product listings through natural language commands.

Store Context:
- Store Currency: ${storeCurrency || 'USD'}

Your capabilities:
1. Modify product titles, descriptions, pricing
2. Add, remove, or modify product variants
3. Update product tags and categories
4. Improve product copy and descriptions
5. Adjust pricing strategies

Current Product Data:
${JSON.stringify(currentProduct, null, 2)}

Guidelines:
- Make only the changes requested by the user
- Preserve existing data unless specifically asked to change it
- Provide clear explanations of what you changed
- Validate that changes make sense (e.g., prices > 0)
- Keep the same structure and format
- Be conservative - don't make unnecessary changes

Response Format:
Provide a conversational response explaining what you changed, followed by the updated product data and change log.

UPDATED_PRODUCT_START
{updated product JSON}
UPDATED_PRODUCT_END

CHANGES_START
[
  {
    "field": "field_name",
    "oldValue": "old_value",
    "newValue": "new_value", 
    "description": "Human readable description of change"
  }
]
CHANGES_END

Always include both markers with valid JSON between them.`

    // Create user prompt
    const userPrompt = `Please help me edit this product based on the following request:

"${message}"

Current product: ${currentProduct.title}

Please make the requested changes and explain what you modified.`

    // Get AI response
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])

    const aiResponse = response.content as string

    // Extract updated product from response
    let updatedProduct: ProductData | null = null
    const productMatch = aiResponse.match(/UPDATED_PRODUCT_START\s*([\s\S]*?)\s*UPDATED_PRODUCT_END/)
    
    if (productMatch) {
      try {
        updatedProduct = JSON.parse(productMatch[1].trim())
      } catch (error) {
        console.error('Error parsing updated product:', error)
        updatedProduct = currentProduct // Fallback to current product
      }
    }

    // Extract changes from response
    let changes: ProductChange[] = []
    const changesMatch = aiResponse.match(/CHANGES_START\s*([\s\S]*?)\s*CHANGES_END/)
    
    if (changesMatch) {
      try {
        changes = JSON.parse(changesMatch[1].trim())
      } catch (error) {
        console.error('Error parsing changes:', error)
        changes = []
      }
    }

    // Clean response (remove the JSON parts for display)
    const cleanResponse = aiResponse
      .replace(/UPDATED_PRODUCT_START[\s\S]*?UPDATED_PRODUCT_END/, '')
      .replace(/CHANGES_START[\s\S]*?CHANGES_END/, '')
      .trim()

    // Validate the updated product
    if (updatedProduct) {
      // Ensure required fields are present
      if (!updatedProduct.title?.trim()) {
        updatedProduct.title = currentProduct.title
      }
      if (!updatedProduct.description?.trim()) {
        updatedProduct.description = currentProduct.description
      }
      
      // Validate pricing
      if (updatedProduct.price && updatedProduct.price <= 0) {
        updatedProduct.price = currentProduct.price
      }
      
      // Validate variants
      if (updatedProduct.variants) {
        updatedProduct.variants = updatedProduct.variants.filter(variant => 
          variant.title?.trim() && variant.price > 0
        )
      }
    }

    // Update product draft in database
    if (updatedProduct) {
      await supabase
        .from('product_drafts')
        .update({
          title: updatedProduct.title,
          description: updatedProduct.description,
          price: updatedProduct.price,
          category: updatedProduct.category,
          tags: updatedProduct.tags,
          variants: updatedProduct.variants,
          images: updatedProduct.images,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .eq('title', currentProduct.title)
    }

    return NextResponse.json({
      response: cleanResponse || "I've made the requested changes to your product.",
      updatedProduct: updatedProduct || currentProduct,
      changes: changes
    })

  } catch (error) {
    console.error('Error in product editing:', error)
    return NextResponse.json(
      { 
        response: "I apologize, but I encountered an error while editing your product. Please try again or contact support if the issue persists.",
        updatedProduct: null,
        changes: []
      },
      { status: 500 }
    )
  }
}
