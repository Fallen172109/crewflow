import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'

interface ProductModificationRequest {
  currentProduct: any
  modificationRequest: string
  storeId: string
  storeCurrency?: string
  context?: string
}

interface ProductModification {
  field: string
  oldValue: any
  newValue: any
  reasoning: string
}

interface ModificationResponse {
  response: string
  updatedProduct: any
  modifications: ProductModification[]
  success: boolean
}

const PRODUCT_MODIFICATION_PROMPT = `You are an expert Shopify product optimization specialist. You help merchants refine and improve their product listings through natural language requests.

## Your Capabilities:

### 1. Content Optimization
- Refine product titles for better SEO and appeal
- Enhance product descriptions for higher conversions
- Adjust pricing strategies based on market feedback
- Optimize tags and categories for discoverability

### 2. Variant Management
- Add, remove, or modify product variants
- Adjust pricing for different variants
- Update inventory quantities and SKUs
- Manage variant-specific attributes

### 3. SEO Enhancement
- Improve meta titles and descriptions
- Optimize keywords and tags
- Enhance product URLs and handles
- Improve search visibility

### 4. Marketing Optimization
- Adjust copy for different target audiences
- Enhance value propositions
- Improve call-to-action elements
- Optimize for conversion rates

## Modification Guidelines:
- Always explain what changes you're making and why
- Preserve the core product identity unless explicitly asked to change it
- Make incremental improvements rather than complete overhauls
- Consider SEO impact of any changes
- Maintain consistency with brand voice and style
- Ensure all changes are commercially viable

## Response Format:
Provide a conversational explanation of the changes, followed by the updated product data and a detailed list of modifications made.

Remember: You're helping merchants optimize their products for better performance, not just making random changes. Every modification should have a clear business rationale.`

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body: ProductModificationRequest = await request.json()
    const { currentProduct, modificationRequest, storeId, storeCurrency = 'USD', context } = body

    if (!currentProduct || !modificationRequest) {
      return NextResponse.json(
        { error: 'Current product data and modification request are required' },
        { status: 400 }
      )
    }

    // Initialize AI service
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      return NextResponse.json({
        response: "I apologize, but the AI service is not properly configured. Please contact support.",
        success: false
      })
    }

    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-4-turbo-preview',
      maxTokens: 4000,
      temperature: 0.3 // Lower temperature for more consistent modifications
    })

    // Build comprehensive context
    let systemPrompt = PRODUCT_MODIFICATION_PROMPT
    
    systemPrompt += `\n\nStore Context:
- Currency: ${storeCurrency}
- Store ID: ${storeId}`

    if (context) {
      systemPrompt += `\n\nAdditional Context: ${context}`
    }

    // Create the modification request
    const userPrompt = `Please modify the following product based on the user's request:

CURRENT PRODUCT:
${JSON.stringify(currentProduct, null, 2)}

MODIFICATION REQUEST:
${modificationRequest}

Please:
1. Analyze the current product data
2. Understand what the user wants to change
3. Make the requested modifications while maintaining product quality
4. Explain your changes and reasoning
5. Return the updated product data
6. List all specific modifications made

Respond with a JSON object containing:
- response: Conversational explanation of changes
- updatedProduct: The modified product data
- modifications: Array of specific changes made
- success: Boolean indicating if modifications were successful`

    const startTime = Date.now()
    const aiResponse = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])
    const endTime = Date.now()

    const responseContent = aiResponse.content as string

    // Parse the JSON response
    let modificationResult: ModificationResponse
    try {
      // Extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseContent
      modificationResult = JSON.parse(jsonText)
    } catch (parseError) {
      // If JSON parsing fails, create a basic response
      modificationResult = {
        response: responseContent,
        updatedProduct: currentProduct,
        modifications: [],
        success: false
      }
    }

    // Validate the response
    if (!modificationResult.updatedProduct) {
      modificationResult.updatedProduct = currentProduct
    }

    if (!modificationResult.modifications) {
      modificationResult.modifications = []
    }

    // Log the modification for analytics
    const supabase = await createSupabaseServerClient()
    await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      agent_name: 'shopify-ai-modification',
      model_used: 'gpt-4-turbo-preview',
      tokens_used: Math.ceil(responseContent.length / 4),
      latency_ms: endTime - startTime,
      request_type: 'product_modification',
      success: modificationResult.success,
      metadata: {
        store_id: storeId,
        product_title: currentProduct.title,
        modification_request: modificationRequest,
        changes_made: modificationResult.modifications.length
      }
    })

    // Store the modification history
    if (modificationResult.success && modificationResult.modifications.length > 0) {
      await supabase.from('product_modification_history').insert({
        user_id: user.id,
        store_id: storeId,
        product_title: currentProduct.title,
        original_product: currentProduct,
        modified_product: modificationResult.updatedProduct,
        modification_request: modificationRequest,
        modifications: modificationResult.modifications,
        created_at: new Date().toISOString()
      })
    }

    return NextResponse.json({
      response: modificationResult.response,
      updatedProduct: modificationResult.updatedProduct,
      modifications: modificationResult.modifications,
      success: modificationResult.success,
      metadata: {
        tokensUsed: Math.ceil(responseContent.length / 4),
        latency: endTime - startTime,
        model: 'gpt-4-turbo-preview',
        modificationsCount: modificationResult.modifications.length
      }
    })

  } catch (error) {
    console.error('Error in product modification:', error)
    
    return NextResponse.json({
      response: "I apologize, but I encountered an error while modifying your product. Please try again or contact support if the issue persists.",
      updatedProduct: null,
      modifications: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for modification history
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const productTitle = searchParams.get('productTitle')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    let query = supabase
      .from('product_modification_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (productTitle) {
      query = query.eq('product_title', productTitle)
    }

    const { data: history, error } = await query

    if (error) {
      console.error('Error fetching modification history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch modification history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      history: history || [],
      count: history?.length || 0
    })

  } catch (error) {
    console.error('Error fetching modification history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Utility function to compare products and identify changes
function identifyProductChanges(original: any, modified: any): ProductModification[] {
  const modifications: ProductModification[] = []
  
  // Compare basic fields
  const fieldsToCheck = ['title', 'description', 'price', 'category', 'tags']
  
  fieldsToCheck.forEach(field => {
    if (original[field] !== modified[field]) {
      modifications.push({
        field,
        oldValue: original[field],
        newValue: modified[field],
        reasoning: `Updated ${field} based on user request`
      })
    }
  })

  // Compare variants if they exist
  if (original.variants && modified.variants) {
    if (JSON.stringify(original.variants) !== JSON.stringify(modified.variants)) {
      modifications.push({
        field: 'variants',
        oldValue: original.variants,
        newValue: modified.variants,
        reasoning: 'Updated product variants'
      })
    }
  }

  return modifications
}
