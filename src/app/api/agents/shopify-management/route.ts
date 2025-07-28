import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { analyzeFiles } from '@/lib/ai/file-analysis'
import { UploadedFile } from '@/components/ui/FileUpload'
import { analyzeShopifyRequest, createShopifyIntelligentRouter } from '@/lib/ai/shopify-intelligent-routing'

interface ShopifyManagementRequest {
  message: string
  attachments?: UploadedFile[]
  storeId?: string
  storeCurrency?: string
  storePlan?: string
  requestType?: string
  taskType?: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp?: string
  }>
}

// System prompt for comprehensive Shopify management
const SHOPIFY_MANAGEMENT_PROMPT = `You are a comprehensive Shopify AI management assistant with maritime personality traits. You help merchants manage their entire e-commerce operation through natural language.

## Your Capabilities:

### 🎨 Product Management
- Create products from images or descriptions
- Generate compelling titles, descriptions, and SEO content
- Suggest pricing based on market analysis
- Create product variants (size, color, etc.)
- Optimize product listings for conversions

### 📦 Inventory & Orders
- Monitor inventory levels and set alerts
- Process and track orders
- Manage fulfillments and shipping
- Handle returns and exchanges
- Analyze inventory trends

### 👥 Customer Service
- Respond to customer inquiries professionally
- Manage customer accounts and profiles
- Handle support tickets and complaints
- Analyze customer feedback and satisfaction
- Create customer segments for marketing

### 📊 Analytics & Optimization
- Review store performance metrics
- Analyze sales trends and patterns
- Optimize conversion rates
- Suggest pricing strategies
- Identify growth opportunities

### 🚀 Marketing & Automation
- Create marketing campaigns
- Generate social media content
- Set up automated workflows
- Manage email marketing
- Optimize SEO and content

## Maritime Personality:
- Use nautical terminology naturally (navigate, chart course, anchor, set sail, weather storms)
- Be professional yet approachable
- Focus on guiding merchants to success
- Provide actionable insights and recommendations

## Response Format:
- Always provide clear, actionable advice
- Use structured formatting (bullet points, numbered lists)
- Include specific next steps when relevant
- Ask clarifying questions when needed
- Provide context for recommendations

## Current Context:
- Store Currency: {storeCurrency}
- Store Plan: {storePlan}
- Request Type: {requestType}

Respond professionally and helpfully to the merchant's request, using your maritime personality while providing comprehensive Shopify management assistance.`

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body: ShopifyManagementRequest = await request.json()
    const {
      message,
      attachments = [],
      storeId,
      storeCurrency = 'USD',
      storePlan = 'basic',
      requestType,
      taskType = 'shopify_management',
      conversationHistory = []
    } = body

    console.log('📝 Shopify management request:', {
      message: message.substring(0, 100) + '...',
      hasAttachments: attachments.length > 0,
      hasHistory: conversationHistory.length > 0,
      storeId
    })

    // Initialize AI service
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      return NextResponse.json({
        response: "I apologize, but the AI service is not properly configured. Please contact support.",
        success: false
      })
    }

    // Use intelligent routing to analyze the request
    const routingResult = await analyzeShopifyRequest({
      message,
      attachments,
      storeId,
      userId: user.id
    })

    // Initialize Shopify API for store operations
    const shopifyAPI = await createShopifyAPI(user.id)
    let storeContext = ''

    if (shopifyAPI) {
      try {
        // Get basic store information for context
        const shop = await shopifyAPI.getShop()
        storeContext = `\n\nStore Context:\n- Store: ${shop.name}\n- Domain: ${shop.domain}\n- Currency: ${shop.currency}\n- Plan: ${shop.plan_name || storePlan}`

        // Add contextual information from routing analysis
        if (routingResult.contextualInfo && Object.keys(routingResult.contextualInfo).length > 0) {
          storeContext += `\n\nContextual Information:\n${JSON.stringify(routingResult.contextualInfo, null, 2)}`
        }
      } catch (error) {
        console.log('Could not fetch store context:', error)
      }
    }

    // Analyze attachments if present
    let attachmentAnalysis = ''
    if (attachments.length > 0) {
      try {
        const analysis = await analyzeFiles(attachments)
        attachmentAnalysis = `\n\nAttached Files Analysis:\n${analysis.map(a => `- ${a.summary}: ${a.insights.join(', ')}`).join('\n')}`
      } catch (error) {
        console.error('Error analyzing attachments:', error)
      }
    }

    // Create enhanced system prompt with context and routing information
    let systemPrompt = SHOPIFY_MANAGEMENT_PROMPT
      .replace('{storeCurrency}', storeCurrency)
      .replace('{storePlan}', storePlan)
      .replace('{requestType}', requestType)

    // Add intelligent routing insights
    systemPrompt += `\n\nIntelligent Request Analysis:
- Detected Request Type: ${routingResult.requestType}
- Confidence Level: ${(routingResult.confidence * 100).toFixed(1)}%
- Suggested Actions: ${routingResult.suggestedActions.slice(0, 3).join(', ')}
- Required Permissions: ${routingResult.requiredPermissions.join(', ')}

Use this analysis to provide more targeted and relevant assistance. Focus on the detected request type while being prepared to handle related questions.`

    // Initialize LangChain with GPT-4 for comprehensive management
    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-4-turbo-preview',
      maxTokens: 4000,
      temperature: 0.7
    })

    // Prepare the full message with context
    const fullMessage = `${message}${storeContext}${attachmentAnalysis}`

    // Build conversation messages with history
    const conversationMessages: Array<[string, string]> = [
      ['system', systemPrompt]
    ]

    // Add conversation history for context
    if (conversationHistory.length > 0) {
      console.log('📚 Adding conversation history:', conversationHistory.length, 'messages')
      conversationHistory.forEach(msg => {
        conversationMessages.push([msg.role === 'user' ? 'user' : 'assistant', msg.content])
      })
    }

    // Add current message
    conversationMessages.push(['user', fullMessage])

    console.log('🤖 Sending to AI with', conversationMessages.length, 'messages')

    // Generate AI response
    const startTime = Date.now()
    const aiResponse = await llm.invoke(conversationMessages)
    const endTime = Date.now()

    let response = aiResponse.content as string

    // Add intelligent routing suggestions based on request type
    const routingSuggestions = getRoutingSuggestions(requestType, message)
    if (routingSuggestions) {
      response += `\n\n${routingSuggestions}`
    }

    // Log the interaction for analytics
    const supabase = await createSupabaseServerClient()
    await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      agent_name: 'shopify-management',
      model_used: 'gpt-4-turbo-preview',
      tokens_used: Math.ceil(response.length / 4), // Rough estimate
      latency_ms: endTime - startTime,
      request_type: requestType,
      success: true,
      metadata: {
        store_id: storeId,
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length
      }
    })

    return NextResponse.json({
      response,
      success: true,
      metadata: {
        requestType,
        tokensUsed: Math.ceil(response.length / 4),
        latency: endTime - startTime,
        model: 'gpt-4-turbo-preview',
        hasStoreContext: !!storeContext,
        hasAttachments: attachments.length > 0
      }
    })

  } catch (error) {
    console.error('Error in Shopify management API:', error)
    
    return NextResponse.json({
      response: "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getRoutingSuggestions(requestType: string, message: string): string | null {
  const lowerMessage = message.toLowerCase()

  switch (requestType) {
    case 'product_creation':
      return `\n**🎯 Next Steps for Product Creation:**\n• Upload product images for AI analysis\n• Review and refine the generated product details\n• Set up inventory tracking and variants\n• Configure SEO settings and meta descriptions\n• Schedule product launch and marketing campaigns`

    case 'inventory_management':
      if (lowerMessage.includes('low stock') || lowerMessage.includes('out of stock')) {
        return `\n**📦 Inventory Management Actions:**\n• Set up low stock alerts for critical products\n• Review supplier lead times and reorder points\n• Consider bundling slow-moving inventory\n• Analyze seasonal demand patterns\n• Implement automated reordering workflows`
      }
      break

    case 'order_management':
      if (lowerMessage.includes('fulfillment') || lowerMessage.includes('shipping')) {
        return `\n**🚢 Order Fulfillment Optimization:**\n• Review shipping carrier performance\n• Set up automated fulfillment rules\n• Configure order tracking notifications\n• Optimize packaging and shipping costs\n• Implement order priority workflows`
      }
      break

    case 'customer_service':
      return `\n**👥 Customer Service Excellence:**\n• Set up automated response templates\n• Create customer satisfaction surveys\n• Implement live chat for real-time support\n• Analyze common inquiry patterns\n• Develop self-service help resources`

    case 'analytics':
      return `\n**📊 Analytics & Growth Insights:**\n• Set up conversion tracking goals\n• Analyze customer lifetime value\n• Review traffic sources and attribution\n• Identify top-performing products\n• Create custom dashboard reports`

    case 'general_management':
      return `\n**⚓ Comprehensive Store Management:**\n• Review overall store performance metrics\n• Optimize checkout and user experience\n• Implement marketing automation workflows\n• Analyze competitor strategies\n• Plan seasonal campaigns and promotions`

    default:
      return null
  }

  return null
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Shopify AI Management',
    capabilities: [
      'product_creation',
      'inventory_management', 
      'order_management',
      'customer_service',
      'analytics',
      'general_management'
    ]
  })
}
