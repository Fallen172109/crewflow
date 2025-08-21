// AI Store Manager Chat Handler
// Handles AI Store Manager functionality for business automation

import {
  ChatHandler,
  UnifiedChatRequest,
  UnifiedChatResponse,
  ChatHandlerError
} from '../types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { analyzeFiles } from '@/lib/ai/file-analysis'
import { getContextManager } from '@/lib/context/ContextManager'
import { withAICache } from '@/lib/ai/response-cache'
import { SmartContextCompressor } from '@/lib/ai/smart-context-compressor'
import { actionDetector, ActionDetectionResult } from '@/lib/ai/action-detection'
import { ShopifyActionExecutor, ActionResult } from '@/lib/ai/shopify-action-executor'

export class AIStoreManagerHandler implements ChatHandler {
  // DEBUG: Force recompilation v3
  private contextCompressor = new SmartContextCompressor()

  canHandle(request: UnifiedChatRequest): boolean {
    return request.chatType === 'ai-store-manager' ||
           request.taskType === 'business_automation'
  }

  async process(request: UnifiedChatRequest, user: any): Promise<UnifiedChatResponse> {
    try {
      console.log('🏪 AI STORE MANAGER HANDLER: Processing request [DEBUG v2]', {
        taskType: request.taskType,
        threadId: request.threadId,
        messageLength: request.message.length,
        attachmentsCount: request.attachments?.length || 0
      })

      if (!request.threadId) {
        throw new ChatHandlerError('Thread ID is required for AI Store Manager conversations', 400)
      }

      const supabase = await createSupabaseServerClient()

      // TEMPORARY: Create minimal thread context to bypass database issues
      let thread = {
        id: request.threadId,
        user_id: user.id,
        agent_name: 'ai_store_manager',
        task_type: request.taskType || 'business_automation',
        title: `AI Store Manager - ${new Date().toLocaleDateString()}`,
        context: request.context ? JSON.stringify(request.context) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('🏪 AI STORE MANAGER HANDLER: Using bypass thread context:', {
        threadId: thread.id,
        userId: user.id
      })

      console.log('🏪 AI STORE MANAGER HANDLER: Thread context ready:', {
        threadId: thread.id
      })

      // Get compressed context for this conversation
      const compressedContext = await this.contextCompressor.getCompressedContext(
        user.id,
        request.threadId,
        thread.session_id,
        {
          level: 'BALANCED', // Use balanced compression for store management
          maxRecentMessages: 12,
          maxSummaries: 4,
          maxContextItems: 8,
          relevanceThreshold: 0.4,
          timeRangeHours: 24,
          includeStoreContext: true,
          forceRefresh: false
        }
      )

      console.log('🏪 AI STORE MANAGER HANDLER: Loaded compressed context', {
        recentMessages: compressedContext.recentMessages.length,
        summaries: compressedContext.summarizedHistory.length,
        contextItems: compressedContext.relevantContext.length,
        compressionRatio: (compressedContext.compressionMetadata.compressionRatio * 100).toFixed(1) + '%',
        processingTime: compressedContext.compressionMetadata.processingTime + 'ms',
        tokensEstimate: compressedContext.totalTokensEstimate,
        cacheHit: compressedContext.compressionMetadata.cacheHit
      })

      // Convert recent messages to LangChain format
      const history = compressedContext.recentMessages

      // Process file attachments if present
      let fileAnalysis = ''
      if (request.attachments && request.attachments.length > 0) {
        try {
          fileAnalysis = await analyzeFiles(request.attachments)
          console.log('🏪 AI STORE MANAGER HANDLER: File analysis completed', {
            analysisLength: fileAnalysis.length
          })
        } catch (error) {
          console.error('🏪 AI STORE MANAGER HANDLER: File analysis error:', error)
          // Continue without file analysis
        }
      }

      // Get business context (store data, performance metrics, etc.)
      let businessContext = ''
      try {
        const { data: storeData } = await supabase
          .from('shopify_stores')
          .select('shop_domain, access_token, store_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (storeData) {
          const shopifyAPI = createShopifyAPI(storeData.shop_domain, storeData.access_token)
          
          // Get business metrics for context
          const [storeInfo, orderStats] = await Promise.all([
            shopifyAPI.getStoreInfo(),
            shopifyAPI.getOrderStatistics()
          ])

          businessContext = `Business Context:
Store: ${storeInfo.name} (${storeInfo.domain})
Plan: ${storeInfo.plan_name}
Recent Orders: ${orderStats.recent_orders_count}
Revenue Trend: ${orderStats.revenue_trend}`
        }
      } catch (error) {
        console.log('🏪 AI STORE MANAGER HANDLER: No business context available:', error)
        // Continue without business context
      }

      // Build enhanced system prompt with compressed context
      const systemPrompt = this.buildEnhancedStoreManagerSystemPrompt(
        request.taskType || 'business_automation',
        businessContext,
        fileAnalysis,
        thread.context,
        compressedContext
      )

      // Prepare conversation messages
      const messages = [new SystemMessage(systemPrompt)]

      // Add conversation history from intelligent context
      if (history && history.length > 0) {
        history.forEach(msg => {
          if (msg.message_type === 'user') {
            messages.push(new HumanMessage(msg.content))
          } else if (msg.message_type === 'agent') {
            messages.push(new AIMessage(msg.content))
          }
        })
      }

      // Add current user message
      messages.push(new HumanMessage(request.message))

      // Initialize AI model
      const aiConfig = getAIConfig()

      console.log('🏪 AI STORE MANAGER HANDLER: AI Config check', {
        hasOpenAIKey: !!aiConfig.openai.apiKey,
        keyLength: aiConfig.openai.apiKey?.length || 0,
        model: aiConfig.openai.model
      })

      if (!aiConfig.openai.apiKey) {
        console.error('🏪 AI STORE MANAGER HANDLER: OpenAI API key not configured')
        return {
          response: "I apologize, but the AI service is not properly configured. Please contact support.",
          success: false,
          threadId: request.threadId,
          agent: {
            id: 'ai-store-manager',
            name: 'AI Store Manager',
            framework: 'langchain'
          }
        }
      }

      const model = new ChatOpenAI({
        openAIApiKey: aiConfig.openai.apiKey,
        modelName: aiConfig.openai.model,
        temperature: aiConfig.openai.temperature,
        maxTokens: aiConfig.openai.maxTokens,
      })

      console.log('🏪 AI STORE MANAGER HANDLER: Sending to AI model', {
        messageCount: messages.length,
        model: aiConfig.openai.model,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
      })

      // Get AI response
      console.log('🏪 AI STORE MANAGER HANDLER: About to call AI model...')
      const response = await model.invoke(messages)
      console.log('🏪 AI STORE MANAGER HANDLER: AI model call completed', {
        hasResponse: !!response,
        hasContent: !!response?.content,
        contentType: typeof response?.content
      })

      let responseText = response.content as string

      console.log('🏪 AI STORE MANAGER HANDLER: AI response received', {
        responseLength: responseText?.length || 0,
        responsePreview: responseText?.substring(0, 200) || 'NO CONTENT',
        fullResponse: responseText
      })

      // Fallback if no response
      if (!responseText || responseText.trim().length === 0) {
        console.error('🏪 AI STORE MANAGER HANDLER: Empty AI response, using fallback')
        responseText = "I'm ready to help you manage your Shopify store! What would you like me to do?"
      }

      // Process actions in response - always check for actions
      let actionProcessingResult = {
        hasActions: false,
        executedActions: [],
        enhancedResponse: responseText,
        detectedActions: []
      }

      console.log('🏪 AI STORE MANAGER HANDLER: Checking for actions', {
        hasContext: !!request.context,
        hasStoreId: !!request.context?.storeId,
        contextKeys: request.context ? Object.keys(request.context) : [],
        message: request.message
      })

      // Always check the user's original message for actions (even without storeId)
      const userMessageActions = actionDetector.detectActions(request.message, {
        storeId: request.context?.storeId || 'default-store',
        userId: user.id,
        context: request.context || {}
      })

      console.log('🏪 AI STORE MANAGER HANDLER: User message action detection result', {
        hasActions: userMessageActions.hasActions,
        actionsCount: userMessageActions.detectedActions?.length || 0,
        actions: userMessageActions.detectedActions
      })

      if (request.context?.storeId) {
        // Then check the AI response for actions
        actionProcessingResult = await this.processActionsInResponse(
          responseText,
          user.id,
          request.context.storeId,
          request
        )
      }

      // Combine actions from both user message and AI response
      if (userMessageActions.hasActions) {
        actionProcessingResult.detectedActions = [
          ...(actionProcessingResult.detectedActions || []),
          ...userMessageActions.detectedActions
        ]
        actionProcessingResult.hasActions = true
      }

      console.log('🏪 AI STORE MANAGER HANDLER: Final action processing result', {
        hasActions: actionProcessingResult.hasActions,
        totalActionsCount: actionProcessingResult.detectedActions?.length || 0,
        detectedActions: actionProcessingResult.detectedActions
      })

      responseText = actionProcessingResult.enhancedResponse

      // Save conversation to database
      const { data: savedMessages } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: user.id,
            thread_id: request.threadId,
            agent_name: 'ai_store_manager',
            message_type: 'user',
            content: request.message,
            task_type: request.taskType || 'business_automation'
          },
          {
            user_id: user.id,
            thread_id: request.threadId,
            agent_name: 'ai_store_manager',
            message_type: 'agent',
            content: responseText,
            task_type: request.taskType || 'business_automation'
          }
        ])
        .select('id')

      // Update thread timestamp
      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', request.threadId)

      // Track usage
      try {
        await supabase.rpc('increment_agent_usage', {
          p_user_id: user.id,
          p_agent_name: 'ai_store_manager'
        })
      } catch (error) {
        console.error('🏪 AI STORE MANAGER HANDLER: Usage tracking error:', error)
      }

      // Extract product preview if product creation was detected
      let productPreview = null
      if (actionProcessingResult.detectedActions) {
        for (const detectedAction of actionProcessingResult.detectedActions) {
          if (detectedAction.action.type === 'product' && detectedAction.action.action.includes('create')) {
            const params = detectedAction.action.parameters
            productPreview = {
              title: params.title || 'New Product',
              description: params.description || 'Product created via AI assistant',
              price: parseFloat(params.price) || 0,
              category: params.product_type || params.category,
              tags: params.tags || [],
              variants: params.variants || [{
                title: 'Default Title',
                price: parseFloat(params.price) || 0,
                inventory_quantity: params.inventory_quantity || 0
              }]
            }
            break // Only return the first product preview
          }
        }
      }

      return {
        response: responseText,
        success: true,
        threadId: request.threadId,
        messageId: savedMessages?.[1]?.id,
        agent: {
          id: 'ai-store-manager',
          name: 'AI Store Manager',
          framework: 'langchain'
        },
        tokensUsed: response.response_metadata?.tokenUsage?.totalTokens,
        detectedActions: actionProcessingResult.detectedActions,
        productPreview
      }

    } catch (error) {
      console.error('🏪 AI STORE MANAGER HANDLER: Error:', error)
      
      if (error instanceof ChatHandlerError) {
        throw error
      }

      throw new ChatHandlerError(
        `Failed to process AI Store Manager chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  async processStreaming(
    request: UnifiedChatRequest,
    user: any,
    onChunk: (chunk: { content: string; messageId?: string; metadata?: any }) => void
  ): Promise<UnifiedChatResponse> {
    try {
      console.log('🏪 AI STORE MANAGER HANDLER: Processing streaming request', {
        taskType: request.taskType,
        threadId: request.threadId,
        messageLength: request.message.length,
        attachmentsCount: request.attachments?.length || 0
      })

      if (!request.threadId) {
        throw new ChatHandlerError('Thread ID is required for AI Store Manager conversations', 400)
      }

      const supabase = await createSupabaseServerClient()

      // For streaming, we'll trust that the thread exists since it was created by the UI
      // We'll create a minimal thread context to proceed with streaming
      let thread = {
        id: request.threadId,
        user_id: user.id,
        agent_name: 'ai_store_manager',
        title: 'AI Store Manager Chat',
        context: {
          taskType: request.taskType || 'business_automation',
          streaming: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('🏪 AI STORE MANAGER HANDLER: Using streaming thread context:', {
        threadId: thread.id,
        userId: user.id
      })

      // Get compressed context for this conversation (streaming)
      const compressedContext = await this.contextCompressor.getCompressedContext(
        user.id,
        request.threadId,
        thread.session_id,
        {
          level: 'BALANCED', // Use balanced compression for streaming
          maxRecentMessages: 10, // Slightly fewer for streaming performance
          maxSummaries: 3,
          maxContextItems: 6,
          relevanceThreshold: 0.5, // Higher threshold for streaming
          timeRangeHours: 24,
          includeStoreContext: true,
          forceRefresh: false
        }
      )

      console.log('🏪 AI STORE MANAGER HANDLER: Loaded compressed context for streaming', {
        recentMessages: compressedContext.recentMessages.length,
        summaries: compressedContext.summarizedHistory.length,
        contextItems: compressedContext.relevantContext.length,
        compressionRatio: (compressedContext.compressionMetadata.compressionRatio * 100).toFixed(1) + '%',
        processingTime: compressedContext.compressionMetadata.processingTime + 'ms',
        tokensEstimate: compressedContext.totalTokensEstimate,
        cacheHit: compressedContext.compressionMetadata.cacheHit
      })

      // Convert recent messages to LangChain format
      const history = compressedContext.recentMessages

      // Process file attachments if present
      let fileAnalysis = ''
      if (request.attachments && request.attachments.length > 0) {
        try {
          fileAnalysis = await analyzeFiles(request.attachments)
          console.log('🏪 AI STORE MANAGER HANDLER: File analysis completed for streaming', {
            analysisLength: fileAnalysis.length
          })
        } catch (error) {
          console.error('🏪 AI STORE MANAGER HANDLER: File analysis error:', error)
          // Continue without file analysis
        }
      }

      // Get business context (store data, performance metrics, etc.)
      let businessContext = ''
      try {
        const { data: storeData } = await supabase
          .from('shopify_stores')
          .select('shop_domain, access_token, store_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (storeData) {
          const shopifyAPI = createShopifyAPI(storeData.shop_domain, storeData.access_token)

          // Get business metrics for context
          const [storeInfo, orderStats] = await Promise.all([
            shopifyAPI.getStoreInfo(),
            shopifyAPI.getOrderStatistics()
          ])

          businessContext = `Business Context:
Store: ${storeInfo.name} (${storeInfo.domain})
Plan: ${storeInfo.plan_name}
Recent Orders: ${orderStats.recent_orders_count}
Revenue Trend: ${orderStats.revenue_trend}`
        }
      } catch (error) {
        console.log('🏪 AI STORE MANAGER HANDLER: No business context available for streaming:', error)
        // Continue without business context
      }

      // Build enhanced system prompt with compressed context
      const systemPrompt = this.buildEnhancedStoreManagerSystemPrompt(
        request.taskType || 'business_automation',
        businessContext,
        fileAnalysis,
        thread.context,
        compressedContext
      )

      // Prepare conversation messages
      const messages = [new SystemMessage(systemPrompt)]

      // Add conversation history from intelligent context
      if (history && history.length > 0) {
        history.forEach(msg => {
          if (msg.message_type === 'user') {
            messages.push(new HumanMessage(msg.content))
          } else if (msg.message_type === 'agent') {
            messages.push(new AIMessage(msg.content))
          }
        })
      }

      // Add current user message
      messages.push(new HumanMessage(request.message))

      // Initialize AI model
      const aiConfig = getAIConfig()

      console.log('🏪 AI STORE MANAGER HANDLER: AI Config check for streaming', {
        hasOpenAIKey: !!aiConfig.openai.apiKey,
        keyLength: aiConfig.openai.apiKey?.length || 0,
        model: aiConfig.openai.model
      })

      if (!aiConfig.openai.apiKey) {
        console.error('🏪 AI STORE MANAGER HANDLER: OpenAI API key not configured for streaming')
        // Send error chunk
        onChunk({
          content: "I apologize, but the AI service is not properly configured. Please contact support.",
          messageId: `error-${Date.now()}`,
          metadata: { error: true }
        })

        return {
          response: "I apologize, but the AI service is not properly configured. Please contact support.",
          success: false,
          threadId: request.threadId,
          agent: {
            id: 'ai-store-manager',
            name: 'AI Store Manager',
            framework: 'langchain'
          }
        }
      }

      const model = new ChatOpenAI({
        openAIApiKey: aiConfig.openai.apiKey,
        modelName: aiConfig.openai.model,
        temperature: aiConfig.openai.temperature,
        maxTokens: aiConfig.openai.maxTokens,
        streaming: true, // Enable streaming
      })

      console.log('🏪 AI STORE MANAGER HANDLER: Starting streaming response', {
        messageCount: messages.length,
        model: aiConfig.openai.model,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
      })

      // Stream AI response
      let fullResponse = ''
      let tokenCount = 0
      const messageId = `msg-${Date.now()}`

      const stream = await model.stream(messages)

      for await (const chunk of stream) {
        const content = chunk.content as string
        if (content) {
          fullResponse += content
          tokenCount++

          // Send chunk to client
          onChunk({
            content,
            messageId,
            metadata: {
              streaming: true,
              chunkIndex: tokenCount,
              totalLength: fullResponse.length
            }
          })
        }
      }

      console.log('🏪 AI STORE MANAGER HANDLER: Streaming completed', {
        responseLength: fullResponse.length,
        chunks: tokenCount
      })

      // Process actions in response if store context is available
      let actionProcessingResult = {
        hasActions: false,
        executedActions: [],
        enhancedResponse: fullResponse,
        detectedActions: []
      }

      console.log('🏪 AI STORE MANAGER HANDLER: Checking storeId for action processing', {
        hasContext: !!request.context,
        storeId: request.context?.storeId,
        storeIdType: typeof request.context?.storeId,
        storeIdValid: request.context?.storeId && request.context.storeId !== 'no-store'
      })

      if (request.context?.storeId && request.context.storeId !== 'no-store') {
        console.log('🏪 AI STORE MANAGER HANDLER: Valid storeId found, processing actions')

        // First check the user's original message for actions
        const userMessageActions = actionDetector.detectActions(request.message, {
          storeId: request.context.storeId,
          userId: user.id,
          context: request.context
        })

        // Then check the AI response for actions
        console.log('🏪 AI STORE MANAGER HANDLER: About to process actions in response', {
          responseLength: fullResponse.length,
          userId: user.id,
          storeId: request.context.storeId,
          hasStoreId: !!request.context.storeId
        })

        actionProcessingResult = await this.processActionsInResponse(
          fullResponse,
          user.id,
          request.context.storeId,
          request
        )

        console.log('🏪 AI STORE MANAGER HANDLER: Action processing completed', {
          hasActions: actionProcessingResult.hasActions,
          actionsCount: actionProcessingResult.detectedActions?.length || 0,
          enhancedResponse: actionProcessingResult.enhancedResponse !== fullResponse
        })

        // Combine actions from both user message and AI response
        if (userMessageActions.hasActions) {
          actionProcessingResult.detectedActions = [
            ...(actionProcessingResult.detectedActions || []),
            ...userMessageActions.detectedActions
          ]
          actionProcessingResult.hasActions = true
        }

        // If actions were detected and response was enhanced, send the additional content
        if (actionProcessingResult.enhancedResponse !== fullResponse) {
          const additionalContent = actionProcessingResult.enhancedResponse.substring(fullResponse.length)
          if (additionalContent) {
            onChunk({
              content: additionalContent,
              messageId,
              metadata: {
                streaming: true,
                actionEnhancement: true,
                actionsDetected: actionProcessingResult.hasActions
              }
            })
          }
        }

        fullResponse = actionProcessingResult.enhancedResponse
      } else {
        console.log('🏪 AI STORE MANAGER HANDLER: No valid storeId, skipping action processing', {
          hasContext: !!request.context,
          storeId: request.context?.storeId,
          reason: !request.context?.storeId ? 'No storeId in context' : 'StoreId is no-store'
        })
      }

      // Save conversation to database
      const { data: savedMessages } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: user.id,
            thread_id: request.threadId,
            agent_name: 'ai_store_manager',
            message_type: 'user',
            content: request.message,
            task_type: request.taskType || 'business_automation'
          },
          {
            user_id: user.id,
            thread_id: request.threadId,
            agent_name: 'ai_store_manager',
            message_type: 'agent',
            content: fullResponse,
            task_type: request.taskType || 'business_automation'
          }
        ])
        .select('id')

      // Update thread timestamp
      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', request.threadId)

      // Track usage
      try {
        await supabase.rpc('increment_agent_usage', {
          p_user_id: user.id,
          p_agent_name: 'ai_store_manager'
        })
      } catch (error) {
        console.error('🏪 AI STORE MANAGER HANDLER: Usage tracking error:', error)
      }

      // Extract product preview if product creation was detected
      let productPreview = null
      if (actionProcessingResult.detectedActions) {
        for (const detectedAction of actionProcessingResult.detectedActions) {
          if (detectedAction.action.type === 'product' && detectedAction.action.action.includes('create')) {
            const params = detectedAction.action.parameters
            productPreview = {
              title: params.title || 'New Product',
              description: params.description || 'Product created via AI assistant',
              price: parseFloat(params.price) || 0,
              category: params.product_type || params.category,
              tags: params.tags || [],
              variants: params.variants || [{
                title: 'Default Title',
                price: parseFloat(params.price) || 0,
                inventory_quantity: params.inventory_quantity || 0
              }]
            }
            break // Only return the first product preview
          }
        }
      }

      return {
        response: fullResponse,
        success: true,
        threadId: request.threadId,
        messageId: savedMessages?.[1]?.id || messageId,
        agent: {
          id: 'ai-store-manager',
          name: 'AI Store Manager',
          framework: 'langchain'
        },
        tokensUsed: tokenCount,
        detectedActions: actionProcessingResult.detectedActions,
        productPreview
      }

    } catch (error) {
      console.error('🏪 AI STORE MANAGER HANDLER: Streaming error:', error)

      if (error instanceof ChatHandlerError) {
        throw error
      }

      throw new ChatHandlerError(
        `Failed to process streaming AI Store Manager chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  private buildEnhancedStoreManagerSystemPrompt(
    taskType: string,
    businessContext: string,
    fileAnalysis: string,
    threadContext?: string,
    contextResult?: any
  ): string {
    const basePrompt = `You are an AI Store Manager, a sophisticated business automation assistant specializing in e-commerce operations, strategic planning, and growth optimization.

CORE EXPERTISE:
- Business process automation and workflow optimization
- Strategic planning and growth initiatives
- Performance analytics and KPI monitoring
- Customer lifecycle management and retention strategies
- Inventory optimization and supply chain management
- Financial planning and revenue optimization
- Team management and operational efficiency
- Market analysis and competitive intelligence

PERSONALITY:
- Executive-level strategic thinking with practical implementation focus
- Data-driven decision making with clear ROI considerations
- Proactive in identifying opportunities and potential issues
- Maritime-themed professional communication style
- Results-oriented with emphasis on measurable outcomes

RESPONSE APPROACH:
- Provide strategic recommendations with tactical implementation steps
- Include relevant metrics, benchmarks, and success indicators
- Structure responses with clear priorities and timelines
- Ask strategic questions to understand business objectives
- Suggest automation opportunities and efficiency improvements
- Consider both short-term wins and long-term strategic goals

BUSINESS AUTOMATION FOCUS:
- Identify repetitive tasks suitable for automation
- Recommend tools and integrations for workflow optimization
- Design scalable processes that grow with the business
- Monitor and optimize automated systems for maximum efficiency

ACTIONABLE LANGUAGE FOR SHOPIFY OPERATIONS:
When suggesting Shopify actions, use clear, actionable language such as:
- "I will create a product..." or "Let me create a new product..."
- "I'll add this product to your store..."
- "I can set up this product listing..."
This enables automatic action detection and execution with user confirmation.`

    // Add task-specific context
    const taskPrompts = {
      business_automation: `
CURRENT FOCUS: Business Process Automation
- Identify manual processes that can be automated
- Recommend workflow tools and integration strategies
- Design scalable systems for business growth
- Focus on ROI and efficiency improvements`,

      strategic_planning: `
CURRENT FOCUS: Strategic Business Planning
- Develop comprehensive growth strategies
- Analyze market opportunities and competitive positioning
- Create actionable roadmaps with measurable milestones
- Balance risk management with growth initiatives`,

      performance_optimization: `
CURRENT FOCUS: Performance & Analytics
- Analyze business metrics and identify improvement opportunities
- Optimize conversion rates and customer acquisition costs
- Implement tracking systems for key performance indicators
- Provide data-driven recommendations for growth`,

      operations_management: `
CURRENT FOCUS: Operations Management
- Streamline operational processes and workflows
- Optimize inventory management and fulfillment
- Improve team productivity and resource allocation
- Implement quality control and performance monitoring systems`
    }

    let prompt = basePrompt + (taskPrompts[taskType as keyof typeof taskPrompts] || taskPrompts.business_automation)

    if (businessContext) {
      prompt += `\n\nBUSINESS CONTEXT:\n${businessContext}`
    }

    if (threadContext) {
      prompt += `\n\nTHREAD CONTEXT:\n${threadContext}`
    }

    if (fileAnalysis) {
      prompt += `\n\nFILE ANALYSIS:\n${fileAnalysis}`
    }

    // Add compressed context information
    if (contextResult) {
      prompt += `\n\nCOMPRESSED CONVERSATION CONTEXT:`

      // Add compression metadata
      if (contextResult.compressionMetadata) {
        const metadata = contextResult.compressionMetadata
        prompt += `\nContext Compression: ${metadata.compressionLevel} level, ${metadata.totalMessagesProcessed} messages processed, ${(metadata.compressionRatio * 100).toFixed(1)}% compressed (${metadata.processingTime}ms)`
      }

      // Add recent conversation messages
      if (contextResult.recentMessages && contextResult.recentMessages.length > 0) {
        prompt += `\n\nRECENT CONVERSATION:`
        contextResult.recentMessages.slice(-6).forEach((msg: any) => {
          const relevanceIndicator = msg.relevance_score && msg.relevance_score > 0.7 ? ' ⭐' : ''
          prompt += `\n${msg.message_type}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}${relevanceIndicator}`
        })
      }

      // Add conversation summaries
      if (contextResult.summarizedHistory && contextResult.summarizedHistory.length > 0) {
        prompt += `\n\nCONVERSATION SUMMARIES:`
        contextResult.summarizedHistory.slice(0, 3).forEach((summary: any, index: number) => {
          prompt += `\n${index + 1}. ${summary.timeRange.start.toLocaleDateString()} - ${summary.timeRange.end.toLocaleDateString()}: ${summary.summary}`
          if (summary.keyTopics.length > 0) {
            prompt += `\n   Topics: ${summary.keyTopics.join(', ')}`
          }
          if (summary.importantDecisions.length > 0) {
            prompt += `\n   Decisions: ${summary.importantDecisions.join(', ')}`
          }
        })
      }

      // Add relevant context items
      if (contextResult.relevantContext && contextResult.relevantContext.length > 0) {
        prompt += `\n\nRELEVANT CONTEXT:`
        contextResult.relevantContext.slice(0, 3).forEach((ctx: any, index: number) => {
          prompt += `\n${index + 1}. ${ctx.context_type}: ${JSON.stringify(ctx.context_data).substring(0, 150)}...`
        })
      }

      // Add store context if available
      if (contextResult.storeContext) {
        prompt += `\n\nSTORE CONTEXT:`
        if (contextResult.storeContext.store) {
          prompt += `\nStore: ${contextResult.storeContext.store.name} (${contextResult.storeContext.store.domain})`
        }
        if (contextResult.storeContext.criticalMetrics && contextResult.storeContext.criticalMetrics.length > 0) {
          prompt += `\nCritical Metrics: ${contextResult.storeContext.criticalMetrics.map((m: any) => `${m.metric_name}: ${m.metric_value}`).join(', ')}`
        }
      }

      prompt += `\n\nIMPORTANT: This context has been intelligently compressed for optimal performance. Use the recent messages for immediate context, summaries for historical understanding, and relevant context for personalized responses. The compression ensures you have the most important information while maintaining fast response times.`
    }

    return prompt
  }

  /**
   * Process actions detected in AI response and execute them
   */
  private async processActionsInResponse(
    responseText: string,
    userId: string,
    storeId?: string,
    request?: UnifiedChatRequest
  ): Promise<{
    hasActions: boolean
    executedActions: ActionResult[]
    enhancedResponse: string
    detectedActions?: any[]
  }> {
    try {
      // Detect actions in the response
      console.log('⚡ AI STORE MANAGER HANDLER: About to detect actions', {
        responseText: responseText.substring(0, 100) + '...',
        storeId,
        userId,
        hasContext: !!request?.context
      })

      const detectionResult = actionDetector.detectActions(responseText, {
        storeId,
        userId,
        context: request?.context
      })

      console.log('⚡ AI STORE MANAGER HANDLER: Action detection result', {
        hasActions: detectionResult.hasActions,
        actionsCount: detectionResult.detectedActions?.length || 0,
        storeId,
        storeIdValid: !!storeId
      })

      if (!detectionResult.hasActions || !storeId) {
        console.log('⚡ AI STORE MANAGER HANDLER: Skipping action processing', {
          reason: !detectionResult.hasActions ? 'No actions detected' : 'No storeId provided',
          hasActions: detectionResult.hasActions,
          storeId
        })
        return {
          hasActions: false,
          executedActions: [],
          enhancedResponse: responseText
        }
      }

      console.log('⚡ AI STORE MANAGER HANDLER: Actions detected', {
        actionsCount: detectionResult.detectedActions.length,
        storeId
      })

      const executor = new ShopifyActionExecutor()
      const executedActions: ActionResult[] = []
      let enhancedResponse = responseText

      // Process each detected action
      for (const detectedAction of detectionResult.detectedActions) {
        const { action, confidence, requiresUserConfirmation } = detectedAction

        console.log('⚡ AI STORE MANAGER HANDLER: Processing action', {
          actionId: action.id,
          actionType: action.type,
          confidence,
          requiresConfirmation: requiresUserConfirmation
        })

        // For product creation, always generate preview and require confirmation
        if (action.type === 'product' && action.action.includes('create')) {
          try {
            // Generate preview for product creation
            const preview = await executor.previewAction(userId, storeId, action)

            // Add preview to response
            enhancedResponse += `\n\n🔍 **Product Preview**`
            enhancedResponse += `\n**Title:** ${preview.previewData?.title || 'New Product'}`
            enhancedResponse += `\n**Price:** ${preview.previewData?.price || 'TBD'}`
            enhancedResponse += `\n**Description:** ${preview.previewData?.description || 'Product description'}`

            if (preview.warnings && preview.warnings.length > 0) {
              enhancedResponse += `\n**⚠️ Warnings:** ${preview.warnings.join(', ')}`
            }

            enhancedResponse += `\n\n🎯 **Suggested Action**: ${action.description}`
            enhancedResponse += `\n*⚠️ This action requires your confirmation before execution.*`

          } catch (error) {
            console.error('⚡ AI STORE MANAGER HANDLER: Preview generation error:', error)
            enhancedResponse += `\n\n🎯 **Suggested Action**: ${action.description}`
            enhancedResponse += `\n*⚠️ This action requires your confirmation before execution.*`
          }
        } else {
          // For high-confidence, low-risk actions, execute immediately
          // For others, suggest the action but don't execute
          if (confidence > 0.8 && !requiresUserConfirmation && action.riskLevel === 'low') {
            try {
              const result = await executor.executeAction(userId, storeId, action, true)
              executedActions.push(result)

              // Add execution result to response
              if (result.success) {
                enhancedResponse += `\n\n✅ **Action Executed**: ${result.maritimeMessage || 'Action completed successfully'}`
              } else {
                enhancedResponse += `\n\n❌ **Action Failed**: ${result.error || 'Unknown error occurred'}`
              }
            } catch (error) {
              console.error('⚡ AI STORE MANAGER HANDLER: Action execution error:', error)
              enhancedResponse += `\n\n⚠️ **Action Error**: Failed to execute ${action.description}`
            }
          } else {
            // Suggest the action for user confirmation
            enhancedResponse += `\n\n🎯 **Suggested Action**: ${action.description}`
            enhancedResponse += `\n*Risk Level: ${action.riskLevel.toUpperCase()}* | *Estimated Time: ${action.estimatedTime}*`

            if (requiresUserConfirmation) {
              enhancedResponse += `\n*⚠️ This action requires your confirmation before execution.*`
            }
          }
        }
      }

      return {
        hasActions: true,
        executedActions,
        enhancedResponse,
        detectedActions: detectionResult.detectedActions.map(da => da.action)
      }

    } catch (error) {
      console.error('⚡ AI STORE MANAGER HANDLER: Action processing error:', error)
      return {
        hasActions: false,
        executedActions: [],
        enhancedResponse: responseText
      }
    }
  }
}
