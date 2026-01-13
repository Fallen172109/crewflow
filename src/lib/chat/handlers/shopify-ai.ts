// Shopify AI Chat Handler
// Handles Shopify-specific AI interactions with deep store integration and real-time action execution

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
import { actionDetector, ActionDetectionResult } from '@/lib/ai/action-detection'
import { ShopifyActionExecutor, ActionResult } from '@/lib/ai/shopify-action-executor'

export class ShopifyAIHandler implements ChatHandler {
  canHandle(request: UnifiedChatRequest): boolean {
    // Handle shopify-ai chat type or known Shopify agent IDs
    return request.chatType === 'shopify-ai' ||
           (request.agentId ? this.isShopifyAgent(request.agentId) : false)
  }

  private isShopifyAgent(agentId: string): boolean {
    // Known Shopify-specialized agent IDs (no longer depends on agents.ts)
    const shopifyAgentIds = ['shopify-ai', 'ai-store-manager', 'store-manager']
    return shopifyAgentIds.includes(agentId)
  }

  async process(request: UnifiedChatRequest, user: any): Promise<UnifiedChatResponse> {
    try {
      console.log('🛍️ SHOPIFY AI HANDLER: Processing request', {
        taskType: request.taskType,
        threadId: request.threadId,
        messageLength: request.message.length,
        attachmentsCount: request.attachments?.length || 0
      })

      if (!request.threadId) {
        throw new ChatHandlerError('Thread ID is required for Shopify AI conversations', 400)
      }

      const supabase = await createSupabaseServerClient()

      // Handle temporary threads vs persistent threads
      let thread = null
      let history: any[] = []

      if (request.threadId.startsWith('temp-')) {
        // Temporary thread - create minimal thread context
        console.log('🛍️ SHOPIFY AI HANDLER: Using temporary thread:', request.threadId)
        thread = {
          id: request.threadId,
          user_id: user.id,
          agent_name: 'shopify-ai',
          task_type: request.taskType || 'shopify',
          title: 'Shopify Store Management',
          context: request.context ? JSON.stringify(request.context) : null,
          created_at: new Date().toISOString()
        }
      } else {
        // Persistent thread - load from database
        const { data: dbThread, error: threadError } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('id', request.threadId)
          .eq('user_id', user.id)
          .single()

        if (threadError || !dbThread) {
          throw new ChatHandlerError('Thread not found or access denied', 404)
        }

        thread = dbThread

        // Get conversation history for persistent threads
        const { data: dbHistory } = await supabase
          .from('chat_history')
          .select('message_type, content, created_at')
          .eq('thread_id', request.threadId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(20) // Last 20 messages for context

        history = dbHistory || []
      }

      // Process file attachments if present
      let fileAnalysis = ''
      if (request.attachments && request.attachments.length > 0) {
        try {
          fileAnalysis = await analyzeFiles(request.attachments)
          console.log('🛍️ SHOPIFY AI HANDLER: File analysis completed', {
            analysisLength: fileAnalysis.length
          })
        } catch (error) {
          console.error('🛍️ SHOPIFY AI HANDLER: File analysis error:', error)
          // Continue without file analysis
        }
      }

      // Get Shopify store context if available
      let shopifyContext = ''
      try {
        const { data: storeData } = await supabase
          .from('shopify_stores')
          .select('shop_domain, access_token')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (storeData) {
          // Pass user.id first, then optional credentials (correct parameter order)
          const shopifyAPI = await createShopifyAPI(user.id, storeData.access_token, storeData.shop_domain)
          if (shopifyAPI) {
            // Get basic store info for context using getShop()
            const storeInfo = await shopifyAPI.getShop()
            shopifyContext = `Connected Shopify Store: ${storeInfo.name} (${storeInfo.domain})`
          }
        }
      } catch (error) {
        console.log('🛍️ SHOPIFY AI HANDLER: No Shopify store connected or error:', error)
        // Continue without Shopify context
      }

      // Build system prompt based on task type
      const systemPrompt = this.buildShopifySystemPrompt(
        request.taskType || 'general',
        shopifyContext,
        fileAnalysis,
        thread.context
      )

      // Prepare conversation messages
      const messages = [new SystemMessage(systemPrompt)]

      // Add conversation history
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
      const model = new ChatOpenAI({
        openAIApiKey: aiConfig.openai.apiKey,
        modelName: aiConfig.openai.model,
        temperature: aiConfig.openai.temperature,
        maxTokens: aiConfig.openai.maxTokens,
      })

      console.log('🛍️ SHOPIFY AI HANDLER: Sending to AI model', {
        messageCount: messages.length,
        model: aiConfig.openai.model
      })

      // Get AI response
      const response = await model.invoke(messages)
      let responseText = response.content as string

      console.log('🛍️ SHOPIFY AI HANDLER: AI response received', {
        responseLength: responseText.length
      })

      // Detect and execute actions in the AI response
      const actionResult = await this.processActionsInResponse(
        responseText,
        user.id,
        request.context?.storeId,
        request
      )

      if (actionResult.hasActions) {
        responseText = actionResult.enhancedResponse
        console.log('⚡ SHOPIFY AI HANDLER: Actions processed', {
          actionsCount: actionResult.executedActions.length,
          hasErrors: actionResult.executedActions.some(a => !a.success)
        })
      }

      // Save conversation to database (only for persistent threads)
      let savedMessages = null
      if (!request.threadId.startsWith('temp-')) {
        const { data: dbSavedMessages } = await supabase
          .from('chat_history')
          .insert([
            {
              user_id: user.id,
              thread_id: request.threadId,
              agent_name: 'shopify_ai',
              message_type: 'user',
              content: request.message,
              task_type: request.taskType || 'general'
            },
            {
              user_id: user.id,
              thread_id: request.threadId,
              agent_name: 'shopify_ai',
              message_type: 'agent',
              content: responseText,
              task_type: request.taskType || 'general'
            }
          ])
          .select('id')

        savedMessages = dbSavedMessages

        // Update thread timestamp
        await supabase
          .from('chat_threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', request.threadId)

        console.log('🛍️ SHOPIFY AI HANDLER: Messages saved to database')
      } else {
        console.log('🛍️ SHOPIFY AI HANDLER: Temporary thread - skipping database save')
      }

      // Track usage
      try {
        await supabase.rpc('increment_agent_usage', {
          p_user_id: user.id,
          p_agent_name: 'shopify_ai'
        })
      } catch (error) {
        console.error('🛍️ SHOPIFY AI HANDLER: Usage tracking error:', error)
      }

      return {
        response: responseText,
        success: true,
        threadId: request.threadId,
        messageId: savedMessages?.[1]?.id,
        agent: {
          id: 'shopify-ai',
          name: 'Shopify AI',
          framework: 'langchain'
        },
        tokensUsed: response.response_metadata?.tokenUsage?.totalTokens,
        detectedActions: actionResult.executedActions || []
      }

    } catch (error) {
      console.error('🛍️ SHOPIFY AI HANDLER: Error:', error)
      
      if (error instanceof ChatHandlerError) {
        throw error
      }

      throw new ChatHandlerError(
        `Failed to process Shopify AI chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
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
  }> {
    try {
      // Detect actions in the response
      const detectionResult = actionDetector.detectActions(responseText, {
        storeId,
        userId,
        context: request?.context
      })

      if (!detectionResult.hasActions || !storeId) {
        return {
          hasActions: false,
          executedActions: [],
          enhancedResponse: responseText
        }
      }

      console.log('⚡ SHOPIFY AI HANDLER: Actions detected', {
        actionsCount: detectionResult.detectedActions.length,
        storeId
      })

      const executor = new ShopifyActionExecutor()
      const executedActions: ActionResult[] = []
      let enhancedResponse = responseText

      // Process each detected action
      for (const detectedAction of detectionResult.detectedActions) {
        const { action, confidence, requiresUserConfirmation } = detectedAction

        console.log('⚡ SHOPIFY AI HANDLER: Processing action', {
          actionId: action.id,
          actionType: action.type,
          confidence,
          requiresConfirmation: requiresUserConfirmation
        })

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
            console.error('⚡ SHOPIFY AI HANDLER: Action execution error:', error)
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

      return {
        hasActions: true,
        executedActions,
        enhancedResponse
      }

    } catch (error) {
      console.error('⚡ SHOPIFY AI HANDLER: Action processing error:', error)
      return {
        hasActions: false,
        executedActions: [],
        enhancedResponse: responseText
      }
    }
  }

  private buildShopifySystemPrompt(
    taskType: string, 
    shopifyContext: string, 
    fileAnalysis: string, 
    threadContext?: string
  ): string {
    const basePrompt = `You are a specialized Shopify AI assistant with deep expertise in e-commerce store management, optimization, and growth strategies.

CORE CAPABILITIES:
- Shopify store setup, configuration, and optimization
- Product management, inventory, and catalog organization
- Order processing, fulfillment, and customer service
- Marketing campaigns, SEO, and conversion optimization
- Analytics interpretation and business insights
- App recommendations and integration guidance
- Theme customization and design improvements
- Payment processing and financial management

PERSONALITY:
- Professional yet approachable maritime-themed assistant
- Practical, actionable advice focused on results
- Data-driven recommendations with clear explanations
- Proactive in suggesting optimizations and improvements

RESPONSE STYLE:
- Use clear, structured formatting with bullet points and sections
- Provide specific, actionable steps when possible
- Include relevant metrics, benchmarks, or best practices
- Ask clarifying questions when more context is needed
- Reference Shopify features, apps, or tools when relevant`

    // Add task-specific context
    const taskPrompts = {
      product_management: `
CURRENT FOCUS: Product Management
- Prioritize product catalog optimization, inventory management, and listing improvements
- Consider SEO, pricing strategies, and product presentation
- Suggest relevant apps for product management and automation`,

      order_fulfillment: `
CURRENT FOCUS: Order Fulfillment
- Focus on order processing, shipping optimization, and customer communication
- Consider automation opportunities and fulfillment efficiency
- Address inventory management and supplier relationships`,

      marketing_optimization: `
CURRENT FOCUS: Marketing & Growth
- Emphasize conversion optimization, customer acquisition, and retention strategies
- Consider email marketing, social media, and advertising opportunities
- Analyze customer behavior and suggest targeted campaigns`,

      store_analytics: `
CURRENT FOCUS: Analytics & Insights
- Interpret store performance data and identify trends
- Suggest actionable improvements based on metrics
- Focus on KPIs, conversion rates, and revenue optimization`,

      customer_service: `
CURRENT FOCUS: Customer Service
- Prioritize customer experience, support processes, and satisfaction
- Consider automation tools and communication strategies
- Address common customer issues and resolution processes`,

      general: `
CURRENT FOCUS: General Store Management
- Provide comprehensive Shopify expertise across all areas
- Identify the most impactful improvements for the store
- Balance short-term fixes with long-term growth strategies`
    }

    let prompt = basePrompt + (taskPrompts[taskType as keyof typeof taskPrompts] || taskPrompts.general)

    if (shopifyContext) {
      prompt += `\n\nSTORE CONTEXT:\n${shopifyContext}`
    }

    if (threadContext) {
      prompt += `\n\nTHREAD CONTEXT:\n${threadContext}`
    }

    if (fileAnalysis) {
      prompt += `\n\nFILE ANALYSIS:\n${fileAnalysis}`
    }

    return prompt
  }
}
