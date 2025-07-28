import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { analyzeFiles } from '@/lib/ai/file-analysis'
import { UploadedFile } from '@/components/ui/FileUpload'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ShopifyAIChatRequest {
  message: string
  taskType: string
  threadId: string
  attachments?: UploadedFile[]
  userId?: string
}

// Helper function to extract product information from AI response and attachments
function extractProductInfoFromResponse(response: string, imageAttachments: UploadedFile[]): any | null {
  try {
    // Get image URLs from attachments
    const images = imageAttachments
      .map(att => att.url || att.publicUrl || att.preview)
      .filter(Boolean)

    // If we have images, always create a product preview (be more aggressive)
    if (images.length > 0) {
      // Extract product information from the response with more flexible patterns
      const titleMatch = response.match(/(?:product|title|name|creating|making|setting up)[:\s]*["']?([^"'\n]{3,50})["']?/i) ||
                        response.match(/(?:I'll|I'm)\s+(?:create|make|set up)\s+(?:a|an|the)?\s*([^.!?\n]{5,40})/i)

      const priceMatch = response.match(/(?:price|cost|priced at)[:\s]*\$?(\d+\.?\d*)/i)
      const descriptionMatch = response.match(/(?:description|details)[:\s]*["']?([^"'\n]{20,200})["']?/i)
      const categoryMatch = response.match(/(?:category|type)[:\s]*["']?([^"'\n]{3,30})["']?/i)

      return {
        title: titleMatch ? titleMatch[1].trim() : 'New Product',
        description: descriptionMatch ? descriptionMatch[1].trim() : 'Product created from uploaded image',
        price: priceMatch ? parseFloat(priceMatch[1]) : 29.99,
        category: categoryMatch ? categoryMatch[1].trim() : 'General',
        images: images,
        tags: ['AI-generated', 'CrewFlow']
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting product info:', error)
    return null
  }
}

// Import enhanced response system
import { EnhancedResponseSystem, ResponseQualityContext } from '@/lib/ai/enhanced-response-system'
import { FeedbackLearningSystem } from '@/lib/ai/feedback-learning-system'

// Enhanced system prompt for thread-based conversations - now dynamically generated
const getEnhancedShopifyPrompt = async (context: ResponseQualityContext): Promise<string> => {
  const responseSystem = new EnhancedResponseSystem()
  return await responseSystem.generateOptimalPrompt(context)
}

// Fallback system prompt for when context loading fails
const FALLBACK_SHOPIFY_AI_SYSTEM_PROMPT = `You are CrewFlow's expert Shopify automation and advisory AI assistant. You combine maritime professionalism with authoritative e-commerce expertise.

## Core Identity:
- **Primary Role**: Shopify store management expert and automation advisor
- **Personality**: Friendly yet direct, professionally confident, maritime-themed
- **Expertise Level**: Definitive authority on Shopify capabilities and best practices
- **Communication Style**: Proactive, solution-oriented, technically precise

## Your Core Expertise:

### 🎨 Product & Catalog Management
- AI-powered product creation from images and descriptions
- **CRITICAL PRODUCT CREATION BEHAVIOR**:
  * When users upload images and request product creation, respond with "I'll create that product for you right away" or similar action-oriented language
  * Immediately proceed to create the product listing based on image analysis
  * DO NOT ask for additional information or explain what you need
  * DO NOT provide structured lists of requirements
  * Take immediate action and populate the product preview
- Analyze uploaded product images thoroughly and provide detailed insights about the product, pricing, and market positioning
- Real-time competitive price analysis and market research
- SEO optimization and content generation
- Pricing strategies with currency localization (PLN, EUR, USD, etc.)
- Inventory planning and variant management
- Product photography and visual merchandising

### 📦 Operations & Fulfillment
- Order processing and fulfillment optimization
- Inventory management and demand forecasting
- Shipping and logistics coordination
- Returns and exchange handling
- Supplier relationship management

### 👥 Customer Experience
- Customer service automation and support
- Personalization and segmentation strategies
- Loyalty program development
- Review and feedback management
- Customer journey optimization

### 📊 Analytics & Growth
- Performance metrics and KPI tracking
- Conversion rate optimization
- Marketing campaign analysis
- Financial reporting and profitability
- Market trend analysis and forecasting

### 🚀 Marketing & Automation
- Multi-channel marketing campaigns
- Email marketing and automation
- Social media strategy and content
- SEO and content marketing
- Paid advertising optimization

## Communication Style:
- **CRITICAL**: When users upload images for product creation, respond with action-oriented language like "I'll create that product for you right away" or "Perfect, I'll get that product set up for your store"
- **NO EXPLANATIONS**: Do not explain what you need to do or ask for additional information. Take immediate action based on the image analysis
- **DIRECT ACTION**: For product creation requests with images, immediately proceed to create the product listing with specific details from the image analysis
- Communicate in a direct, professional manner without emojis, excessive formatting, or conversational flourishes
- Provide concise, well-reasoned responses that demonstrate clear understanding of the user's request
- Get straight to the point without unnecessary introductions or conclusions
- Focus solely on what the user asked for without suggesting additional work
- Use clear, technical language appropriate for a development context
- Ask specific clarifying questions only when essential information is missing
- Avoid redundant explanations or overly detailed background information
- Use maritime terminology naturally but sparingly (navigate, chart course, anchor, set sail, etc.)

## Conversation Guidelines:
- Maintain context from previous messages in this thread
- Reference earlier discussions when relevant
- Build upon previous recommendations and decisions
- When users give clear instructions (upload, create, publish, etc.), take action immediately rather than asking clarifying questions
- Use your expertise to make reasonable assumptions and provide complete solutions
- Ask follow-up questions only when truly necessary for complex tasks
- Provide actionable next steps with clear priorities

## Pricing Intelligence:
- When users upload product images and ask about pricing, provide specific monetary recommendations
- Use real-time competitive analysis to support pricing decisions
- Always display prices in the store's configured currency (PLN for Polish stores, EUR for European stores, etc.)
- Include market positioning context (budget/mid-range/premium/luxury)
- Explain pricing reasoning with competitive examples
- Consider seasonal trends and demand levels in recommendations

## Response Style:
- Professional yet approachable maritime tone
- Use structured formatting for clarity
- Include specific metrics and benchmarks when possible
- Offer multiple options with pros/cons when appropriate
- Be action-oriented: when users request specific tasks, execute them with confidence
- Always end with clear next steps or questions

Remember: You're not just answering questions - you're helping merchants build successful, sustainable e-commerce businesses through expert guidance and strategic thinking.`

export async function POST(request: NextRequest) {
  try {
    console.log('🛍️ SHOPIFY AI API: Request received')

    const user = await requireAuth()
    console.log('🛍️ SHOPIFY AI API: User authenticated:', user.id)

    const body: ShopifyAIChatRequest = await request.json()
    const { message, taskType, threadId, attachments = [] } = body

    console.log('🛍️ SHOPIFY AI API: Request details:', {
      message: message.substring(0, 100) + '...',
      taskType,
      threadId,
      attachmentsCount: attachments.length,
      isTemporaryThread: threadId?.startsWith('temp-')
    })

    // Debug attachments structure
    if (attachments.length > 0) {
      console.log('🛍️ SHOPIFY AI API: Attachments details:', attachments.map(att => ({
        id: att.id,
        fileName: att.fileName,
        fileType: att.fileType,
        hasUrl: !!att.url,
        hasPublicUrl: !!att.publicUrl,
        hasPreview: !!att.preview,
        uploadStatus: att.uploadStatus
      })))
    }

    if (!threadId) {
      console.log('🛍️ SHOPIFY AI API: Error - No thread ID provided')
      return NextResponse.json(
        { error: 'Thread ID is required for chat conversations' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Get thread context and history (handle temporary threads)
    let thread = null
    let isTemporaryThread = threadId.startsWith('temp-')

    if (!isTemporaryThread) {
      const { data: existingThread, error: threadError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .single()

      if (threadError || !existingThread) {
        return NextResponse.json(
          { error: 'Thread not found or access denied' },
          { status: 404 }
        )
      }

      thread = existingThread
    } else {
      // For temporary threads, create a minimal thread object
      thread = {
        id: threadId,
        user_id: user.id,
        agent_name: 'shopify-ai',
        task_type: 'business_automation',
        title: 'Shopify AI Chat',
        context: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    // Get recent conversation history (last 20 messages for context)
    // Handle both real thread IDs and temporary session IDs
    let history = null
    let historyError = null

    if (threadId && !threadId.startsWith('temp-')) {
      // Real thread ID - get thread-specific history
      const result = await supabase
        .from('chat_history')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true })
        .limit(20)

      history = result.data
      historyError = result.error
    } else {
      // Temporary session or no thread - get recent user history for this agent
      const result = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_name', 'shopify-ai')
        .eq('task_type', 'business_automation')
        .is('thread_id', null) // Get non-threaded messages
        .order('timestamp', { ascending: true })
        .limit(20)

      history = result.data
      historyError = result.error
    }

    if (historyError) {
      console.error('Error fetching chat history:', historyError)
    }

    // Initialize AI service
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      return NextResponse.json({
        response: "I apologize, but the AI service is not properly configured. Please contact support.",
        success: false
      })
    }

    // Get store context if available
    const shopifyAPI = await createShopifyAPI(user.id)
    let storeContext = ''
    
    if (shopifyAPI) {
      try {
        const shop = await shopifyAPI.getShop()
        storeContext = `\n\nCurrent Store Context:\n- Store: ${shop.name}\n- Domain: ${shop.domain}\n- Currency: ${shop.currency}\n- Plan: ${shop.plan_name || 'Unknown'}\n- Timezone: ${shop.timezone || 'Unknown'}`
      } catch (error) {
        console.log('Could not fetch store context:', error)
      }
    }

    // Analyze attachments if present with enhanced price research
    let attachmentAnalysis = ''
    if (attachments.length > 0) {
      try {
        // Check if we have image attachments for product analysis
        const imageAttachments = attachments.filter(att => att.fileType?.startsWith('image/'))
        console.log('🛍️ SHOPIFY AI API: Image attachments found:', imageAttachments.length)

        if (imageAttachments.length > 0 && shopifyAPI) {
          // Get store currency for price research
          const shop = await shopifyAPI.getShop()
          const storeCurrency = shop.currency || 'PLN'

          // Enhanced product image analysis with price research
          const { analyzeProductImages } = await import('@/lib/ai/product-image-analysis')
          console.log('🛍️ SHOPIFY AI API: Starting image analysis for', imageAttachments.length, 'images')

          const productAnalyses = await analyzeProductImages(
            imageAttachments,
            `Store context: ${shop.name} (${storeCurrency})`,
            storeCurrency,
            true // Enable price research
          )

          console.log('🛍️ SHOPIFY AI API: Image analysis completed, results:', productAnalyses.length)
          if (productAnalyses.length > 0) {
            attachmentAnalysis = `\n\n📸 **Product Image Analysis with Price Research:**\n`

            productAnalyses.forEach((analysis, index) => {
              attachmentAnalysis += `\n**Product ${index + 1}: ${analysis.productName}**\n`
              attachmentAnalysis += `- Category: ${analysis.category}\n`
              attachmentAnalysis += `- Description: ${analysis.description}\n`
              attachmentAnalysis += `- Features: ${analysis.features.join(', ')}\n`

              if (analysis.priceResearch) {
                const research = analysis.priceResearch
                attachmentAnalysis += `\n💰 **Competitive Price Analysis:**\n`
                attachmentAnalysis += `- Market Range: ${research.minPrice} - ${research.maxPrice} ${research.currency}\n`
                attachmentAnalysis += `- Average Price: ${research.averagePrice} ${research.currency}\n`
                attachmentAnalysis += `- **Recommended Price: ${research.recommendedPrice.min} - ${research.recommendedPrice.max} ${research.currency}**\n`
                attachmentAnalysis += `- Optimal Price: **${research.recommendedPrice.optimal} ${research.currency}**\n`
                attachmentAnalysis += `- Market Position: ${research.marketInsights.marketPosition}\n`
                attachmentAnalysis += `- Demand Level: ${research.marketInsights.demandLevel}\n`
                attachmentAnalysis += `- Reasoning: ${research.recommendedPrice.reasoning}\n`

                if (research.competitorData.length > 0) {
                  attachmentAnalysis += `\n🔍 **Competitor Examples:**\n`
                  research.competitorData.slice(0, 3).forEach(comp => {
                    attachmentAnalysis += `- ${comp.source}: ${comp.price} ${comp.currency}\n`
                  })
                }
              } else {
                attachmentAnalysis += `- Suggested Price: ${analysis.suggestedPrice.min} - ${analysis.suggestedPrice.max} ${analysis.suggestedPrice.currency}\n`
              }

              attachmentAnalysis += `- Target Audience: ${analysis.targetAudience}\n`
              attachmentAnalysis += `- SEO Keywords: ${analysis.seoKeywords.join(', ')}\n`
            })
          }
        } else {
          // Regular file analysis for non-image attachments
          const analysis = await analyzeFiles(attachments)
          attachmentAnalysis = `\n\nNew Attachments:\n${analysis.map(a => `- ${a.summary}\n  Insights: ${a.insights.join(', ')}`).join('\n')}`
        }
      } catch (error) {
        console.error('Error analyzing attachments:', error)
        // Fallback to basic analysis
        try {
          const analysis = await analyzeFiles(attachments)
          attachmentAnalysis = `\n\nNew Attachments:\n${analysis.map(a => `- ${a.summary}\n  Insights: ${a.insights.join(', ')}`).join('\n')}`
        } catch (fallbackError) {
          console.error('Fallback analysis also failed:', fallbackError)
        }
      }
    }

    // Build conversation context using proper LangChain message objects
    const conversationHistory = []

    // Generate enhanced system prompt with context
    let systemPrompt: string
    try {
      const responseSystem = new EnhancedResponseSystem()
      const qualityContext = await responseSystem.loadUserContext(user.id, 'shopify-ai')

      // Add thread and store context
      if (thread.context) {
        qualityContext.currentTask = thread.context
      }
      if (threadId) {
        qualityContext.threadId = threadId
      }

      systemPrompt = await getEnhancedShopifyPrompt(qualityContext)

      // Add store context if available
      if (storeContext) {
        systemPrompt += `\n\n## Current Store Context:\n${storeContext}`
      }

      console.log('🧠 Using enhanced AI prompt system')
    } catch (error) {
      console.error('Error loading enhanced prompt context:', error)
      // Fallback to basic prompt
      systemPrompt = FALLBACK_SHOPIFY_AI_SYSTEM_PROMPT
      if (thread.context) {
        systemPrompt += `\n\nThread Context: ${thread.context}`
      }
      systemPrompt += storeContext
      console.log('⚠️ Using fallback prompt system')
    }

    conversationHistory.push(new SystemMessage(systemPrompt))

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach(msg => {
        if (msg.message_type === 'user') {
          conversationHistory.push(new HumanMessage(msg.content))
        } else {
          conversationHistory.push(new AIMessage(msg.content))
        }
      })
    }

    // Add current message
    const currentMessage = `${message}${attachmentAnalysis}`
    conversationHistory.push(new HumanMessage(currentMessage))

    // Initialize LangChain with GPT-4 - optimized for quality
    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-4-turbo-preview',
      maxTokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent, accurate responses
      topP: 0.9 // Add top-p for better quality control
    })

    // Generate AI response
    console.log('🛍️ SHOPIFY AI API: Generating AI response...')
    const startTime = Date.now()

    const aiResponse = await llm.invoke(conversationHistory)
    const endTime = Date.now()
    const response = aiResponse.content as string

    console.log('🛍️ SHOPIFY AI API: AI response generated successfully', {
      responseLength: response.length,
      latency: endTime - startTime,
      model: 'gpt-4-turbo-preview',
      enhancedPrompt: systemPrompt.includes('Response Quality Standards')
    })

    // Determine the actual thread ID to save (null for temporary sessions)
    const saveThreadId = threadId && !threadId.startsWith('temp-') ? threadId : null

    // Save user message to history
    const userMessageResult = await supabase.from('chat_history').insert({
      user_id: user.id,
      agent_name: 'shopify-ai',
      message_type: 'user',
      content: message,
      task_type: taskType,
      thread_id: saveThreadId
    }).select().single()

    // Save agent response to history
    const aiMessageResult = await supabase.from('chat_history').insert({
      user_id: user.id,
      agent_name: 'shopify-ai',
      message_type: 'agent',
      content: response,
      task_type: taskType,
      thread_id: saveThreadId
    }).select().single()

    // Store response quality metrics for learning
    if (aiMessageResult.data) {
      try {
        await supabase.from('response_quality_metrics').insert({
          message_id: aiMessageResult.data.id,
          agent_id: 'shopify-ai',
          user_id: user.id,
          response_length: response.length,
          has_code_examples: /```/.test(response),
          has_step_by_step: /\d+\.|step \d+/i.test(response),
          has_links: /https?:\/\//.test(response),
          technical_terms_count: (response.match(/\b(api|webhook|liquid|graphql|shopify|product|order)\b/gi) || []).length,
          user_experience_level: 'intermediate', // This would come from user context
          task_complexity: message.length > 100 ? 'complex' : 'simple'
        })
        console.log('📊 Response quality metrics stored')
      } catch (error) {
        console.error('Error storing quality metrics:', error)
      }
    }

    // Update thread's updated_at timestamp if this is a real thread
    if (saveThreadId) {
      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', saveThreadId)
        .eq('user_id', user.id)
    }

    // Save attachments if present
    if (attachments.length > 0) {
      const attachmentRecords = attachments.map(att => ({
        user_id: user.id,
        thread_id: saveThreadId, // Use the actual thread ID (null for temp sessions)
        file_name: att.fileName,
        file_type: att.fileType,
        file_size: att.fileSize,
        storage_path: att.storagePath,
        public_url: att.publicUrl,
        upload_status: 'completed',
        metadata: {
          ...att.metadata || {},
          session_id: threadId // Keep the original session ID for reference
        }
      }))

      await supabase.from('chat_attachments').insert(attachmentRecords)
    }

    // Log usage for analytics
    await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      agent_name: 'shopify-ai',
      model_used: 'gpt-4-turbo-preview',
      tokens_used: Math.ceil(response.length / 4),
      latency_ms: endTime - startTime,
      request_type: taskType,
      success: true,
      metadata: {
        thread_id: threadId,
        has_attachments: attachments.length > 0,
        conversation_length: conversationHistory.length
      }
    })

    // Check if this is a product creation request and we have image attachments
    let productPreview = null
    const hasImages = attachments.length > 0 && attachments.some(att => att.fileType?.startsWith('image/'))
    const isProductCreation = message.toLowerCase().includes('create product') ||
                             message.toLowerCase().includes('turn this into a product') ||
                             message.toLowerCase().includes('make this a product') ||
                             message.toLowerCase().includes('add to store') ||
                             message.toLowerCase().includes('sell this') ||
                             message.toLowerCase().includes('make a product') ||
                             message.toLowerCase().includes('product for this') ||
                             message.toLowerCase().includes('product on the shopify store') ||
                             message.toLowerCase().includes('product for the store') ||
                             // If user uploads image and mentions store/product/sell, assume product creation
                             (hasImages && (message.toLowerCase().includes('store') ||
                                          message.toLowerCase().includes('product') ||
                                          message.toLowerCase().includes('sell')))

    if (isProductCreation && attachments.length > 0) {
      const imageAttachments = attachments.filter(att => att.fileType?.startsWith('image/'))
      if (imageAttachments.length > 0) {
        // Extract product information from the AI response and image analysis
        const productInfo = extractProductInfoFromResponse(response, imageAttachments)
        if (productInfo) {
          productPreview = productInfo
        }
      }
    }

    return NextResponse.json({
      response,
      success: true,
      messageId: aiMessageResult.data?.id, // Include message ID for feedback
      productPreview,
      metadata: {
        threadId,
        tokensUsed: Math.ceil(response.length / 4),
        latency: endTime - startTime,
        model: 'gpt-4-turbo-preview',
        conversationLength: conversationHistory.length
      }
    })

  } catch (error) {
    console.error('🛍️ SHOPIFY AI API: Error occurred:', error)
    console.error('🛍️ SHOPIFY AI API: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json({
      response: "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// OPTIONS endpoint for CORS and endpoint checking
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Shopify AI Chat endpoint is available',
      methods: ['GET', 'POST', 'OPTIONS'],
      threadSupport: true
    },
    {
      status: 200,
      headers: {
        'Allow': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    }
  )
}

// GET endpoint for thread information
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Get thread information
    const { data: thread, error } = await supabase
      .from('chat_threads')
      .select(`
        *,
        chat_history(count)
      `)
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (error || !thread) {
      return NextResponse.json(
        { error: 'Thread not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      thread: {
        ...thread,
        message_count: thread.chat_history?.[0]?.count || 0
      }
    })

  } catch (error) {
    console.error('Error fetching thread info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
