// Enhanced Chat Orchestrator
// Integrates all conversational AI features into a unified system with maritime agent integration

import { EnhancedMemoryManager, ConversationContext } from './enhanced-memory'
import { AdvancedIntentRecognizer, IntentAnalysis } from './advanced-intent-recognition'
import { SmartQuestionGenerator, QuestionFlow } from './smart-questions'
import { EnhancedStoreIntelligence, StoreIntelligence } from './enhanced-store-intelligence'
import { LivePreviewSystem, PreviewAction } from './live-previews'
import { OneClickEnhancementSystem, EnhancementSuggestion } from './one-click-enhancements'
import { MaritimeAgentRouter, RoutingDecision } from './maritime-agent-router'
import { CrossAgentContextManager, CrossAgentContext, AgentHandoffData } from './cross-agent-context'
import { predictiveResponseSystem, PredictionContext } from './predictive-response-system'
import { ShopifyActionExecutor, ShopifyAction, ActionResult } from './shopify-action-executor'
import { FeedbackLearningSystem } from './feedback-learning-system'
import { AgentEndpointBridge, AgentEndpointResponse } from './agent-endpoint-bridge'
import { SmartContextCompressor, CompressedContext, CompressionLevel } from './smart-context-compressor'
import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'
import { Agent, AGENTS } from '@/lib/agents'

export interface EnhancedChatResponse {
  response: string
  intentAnalysis: IntentAnalysis
  questionFlow?: QuestionFlow
  enhancements?: EnhancementSuggestion
  previews?: PreviewAction[]
  storeInsights?: Partial<StoreIntelligence>
  conversationState: any
  suggestedActions: SuggestedAction[]
  confidence: number
  requiresFollowUp: boolean
  // New maritime agent integration fields
  selectedAgent: Agent
  routingDecision: RoutingDecision
  agentHandoff?: AgentHandoffData
  executedActions?: ActionResult[]
  maritimePersonality: {
    shouldIntroduce: boolean
    personalityMessage?: string
    agentSwitchMessage?: string
  }
  // Smart Context Compression metadata
  compressionMetadata?: {
    level: CompressionLevel
    processingTime: number
    tokensEstimate: number
    cacheHit: boolean
  }
  // Predictive Response Pre-loading metadata
  predictiveMetadata?: {
    predictionsGenerated: number
    preloadingTriggered: boolean
    cacheCheckPerformed: boolean
    wasPreloadedResponse: boolean
  }
}

export interface SuggestedAction {
  id: string
  title: string
  description: string
  type: 'question' | 'enhancement' | 'preview' | 'execute'
  priority: 'low' | 'medium' | 'high'
  parameters?: any
}

export interface ChatRequest {
  message: string
  userId: string
  agentId: string
  threadId?: string
  sessionId?: string
  context?: any
  attachments?: any[]
}

export class EnhancedChatOrchestrator {
  private memoryManager?: EnhancedMemoryManager
  private intentRecognizer?: AdvancedIntentRecognizer
  private questionGenerator?: SmartQuestionGenerator
  private storeIntelligence?: EnhancedStoreIntelligence
  private previewSystem?: LivePreviewSystem
  private enhancementSystem?: OneClickEnhancementSystem
  private llm: ChatOpenAI
  // New maritime agent integration components
  private agentRouter: MaritimeAgentRouter
  private contextManager: CrossAgentContextManager
  private actionExecutor: ShopifyActionExecutor
  private feedbackSystem: FeedbackLearningSystem
  private agentBridge: AgentEndpointBridge
  private crossAgentContext?: CrossAgentContext
  // Smart Context Compression
  private contextCompressor: SmartContextCompressor
  private compressedContext?: CompressedContext

  constructor() {
    const aiConfig = getAIConfig()
    this.llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    })

    // Initialize maritime agent integration components
    this.agentRouter = new MaritimeAgentRouter()
    this.contextManager = new CrossAgentContextManager()
    this.actionExecutor = new ShopifyActionExecutor()
    this.feedbackSystem = new FeedbackLearningSystem()
    this.agentBridge = new AgentEndpointBridge()

    // Initialize Smart Context Compression
    this.contextCompressor = new SmartContextCompressor()
  }

  async processMessage(request: ChatRequest): Promise<EnhancedChatResponse> {
    const startTime = Date.now()

    // Load compressed context first (parallel with system initialization)
    const [_, compressedContext] = await Promise.all([
      this.initializeSystems(request),
      this.loadCompressedContext(request)
    ])

    this.compressedContext = compressedContext

    // Analyze intent with compressed context
    const intentAnalysis = await this.intentRecognizer!.analyzeIntent(request.message)

    // Route to appropriate maritime agent
    const routingDecision = this.agentRouter.routeToAgent(
      request.message,
      intentAnalysis,
      request.context
    )

    // Handle agent handoff if needed
    let agentHandoff: AgentHandoffData | undefined
    if (this.crossAgentContext &&
        this.crossAgentContext.currentAgent.id !== routingDecision.selectedAgent.id) {
      agentHandoff = await this.contextManager.handleAgentHandoff(
        this.crossAgentContext,
        routingDecision.selectedAgent,
        routingDecision.reasoning
      )
    }

    // Update conversation state with agent context
    await this.memoryManager!.updateConversationState({
      currentTopic: intentAnalysis.primaryIntent.category,
      lastIntent: intentAnalysis.primaryIntent.type,
      confidence: intentAnalysis.confidence,
      conversationPhase: this.determineConversationPhase(intentAnalysis),
      currentAgent: routingDecision.selectedAgent.id,
      agentConfidence: routingDecision.confidence
    })

    // Generate smart questions if needed
    let questionFlow: QuestionFlow | undefined
    if (intentAnalysis.requiredInformation.length > 0) {
      this.questionGenerator = new SmartQuestionGenerator(
        this.memoryManager!.getContext(),
        intentAnalysis
      )
      questionFlow = await this.questionGenerator.generateQuestionFlow()
    }

    // Generate enhancements based on context
    let enhancements: EnhancementSuggestion | undefined
    if (this.shouldSuggestEnhancements(intentAnalysis)) {
      const storeIntelligence = await this.getStoreIntelligence()
      enhancements = await this.enhancementSystem!.generateEnhancementSuggestions(
        intentAnalysis.primaryIntent.category as any,
        request.context
      )
    }

    // Generate previews for actionable intents
    let previews: PreviewAction[] = []
    if (this.shouldGeneratePreviews(intentAnalysis)) {
      previews = await this.generatePreviewActions(intentAnalysis, request)
    }

    // Check if agent should introduce themselves
    const maritimePersonality = {
      shouldIntroduce: this.contextManager.shouldIntroduce(this.crossAgentContext!),
      personalityMessage: undefined as string | undefined,
      agentSwitchMessage: undefined as string | undefined
    }

    if (agentHandoff) {
      maritimePersonality.agentSwitchMessage = this.contextManager.generateHandoffMessage(agentHandoff)
    }

    // Execute any direct Shopify actions if requested
    const executedActions: ActionResult[] = []
    const suggestedShopifyActions = await this.actionExecutor.getSuggestedActions(
      request.userId,
      request.context?.storeId || '',
      request.context
    )

    // Call the actual agent endpoint through the bridge
    const agentResponse = await this.callAgentEndpoint(
      request,
      routingDecision,
      maritimePersonality
    )

    // Generate contextual response with maritime agent personality
    const response = agentResponse.success ?
      agentResponse.response :
      await this.generateContextualResponse(
        request,
        intentAnalysis,
        questionFlow,
        enhancements,
        routingDecision,
        maritimePersonality
      )

    // Mark agent as introduced if this is their first interaction
    if (maritimePersonality.shouldIntroduce) {
      this.contextManager.markAsIntroduced(this.crossAgentContext!)
    }

    // Record this interaction
    await this.contextManager.recordInteraction(this.crossAgentContext!, {
      agentId: routingDecision.selectedAgent.id,
      agentName: routingDecision.selectedAgent.name,
      messageId: `msg-${Date.now()}`,
      userMessage: request.message,
      agentResponse: response,
      taskType: intentAnalysis.primaryIntent.type,
      confidence: routingDecision.confidence,
      actionsTaken: executedActions.map(a => a.actionId),
      contextData: request.context
    })

    // Generate suggested actions including Shopify actions
    const suggestedActions = await this.generateSuggestedActions(
      intentAnalysis,
      questionFlow,
      enhancements,
      suggestedShopifyActions
    )

    // Trigger predictive response pre-loading in background (non-blocking)
    const predictiveMetadata = await this.triggerPredictivePreloading(
      request,
      intentAnalysis,
      routingDecision,
      startTime
    )

    return {
      response,
      intentAnalysis,
      questionFlow,
      enhancements,
      previews,
      storeInsights: await this.getRelevantStoreInsights(intentAnalysis),
      conversationState: this.memoryManager!.getContext().conversationState,
      suggestedActions,
      confidence: intentAnalysis.confidence,
      requiresFollowUp: this.determineFollowUpNeed(intentAnalysis, questionFlow),
      // New maritime agent integration fields
      selectedAgent: routingDecision.selectedAgent,
      routingDecision,
      agentHandoff,
      executedActions,
      maritimePersonality,
      // Smart Context Compression metadata
      compressionMetadata: this.compressedContext ? {
        level: this.compressedContext.compressionMetadata.compressionLevel,
        processingTime: Date.now() - startTime,
        tokensEstimate: this.compressedContext.totalTokensEstimate,
        cacheHit: this.compressedContext.compressionMetadata.cacheHit
      } : undefined,
      // Predictive Response Pre-loading metadata
      predictiveMetadata
    }
  }

  private async loadCompressedContext(request: ChatRequest): Promise<CompressedContext> {
    try {
      // Determine compression level based on request complexity or user preferences
      const compressionLevel: CompressionLevel = this.determineCompressionLevel(request)

      console.log('🧠 ENHANCED ORCHESTRATOR: Loading compressed context', {
        level: compressionLevel,
        threadId: request.threadId,
        sessionId: request.sessionId
      })

      return await this.contextCompressor.getCompressedContext(
        request.userId,
        request.threadId || `temp-${Date.now()}`,
        request.sessionId,
        {
          level: compressionLevel,
          maxRecentMessages: compressionLevel === 'MINIMAL' ? 5 :
                           compressionLevel === 'BALANCED' ? 10 : 15,
          maxSummaries: compressionLevel === 'MINIMAL' ? 2 :
                       compressionLevel === 'BALANCED' ? 5 : 8,
          maxContextItems: compressionLevel === 'MINIMAL' ? 5 :
                          compressionLevel === 'BALANCED' ? 8 : 12,
          relevanceThreshold: compressionLevel === 'MINIMAL' ? 0.6 :
                             compressionLevel === 'BALANCED' ? 0.4 : 0.3,
          timeRangeHours: compressionLevel === 'MINIMAL' ? 12 :
                         compressionLevel === 'BALANCED' ? 24 : 48,
          includeStoreContext: request.agentId.includes('shopify') || request.context?.storeId,
          forceRefresh: false
        }
      )
    } catch (error) {
      console.error('🧠 ENHANCED ORCHESTRATOR: Error loading compressed context:', error)

      // Fallback to minimal context
      return {
        recentMessages: [],
        summarizedHistory: [],
        relevantContext: [],
        storeContext: null,
        compressionMetadata: {
          compressionLevel: 'MINIMAL',
          totalMessagesProcessed: 0,
          messagesCompressed: 0,
          compressionRatio: 0,
          processingTime: 0,
          cacheHit: false,
          relevanceThreshold: 0.5
        },
        totalTokensEstimate: 0
      }
    }
  }

  private determineCompressionLevel(request: ChatRequest): CompressionLevel {
    // Use MINIMAL for simple queries, BALANCED for most cases, COMPREHENSIVE for complex tasks
    const messageLength = request.message.length
    const hasAttachments = request.attachments && request.attachments.length > 0
    const isComplexAgent = request.agentId.includes('shopify') || request.agentId === 'anchor'

    if (messageLength < 50 && !hasAttachments && !isComplexAgent) {
      return 'MINIMAL'
    } else if (messageLength > 200 || hasAttachments || isComplexAgent) {
      return 'COMPREHENSIVE'
    } else {
      return 'BALANCED'
    }
  }

  private async initializeSystems(request: ChatRequest): Promise<void> {
    // Initialize memory manager
    this.memoryManager = await EnhancedMemoryManager.initialize(
      request.userId,
      request.agentId,
      request.threadId,
      request.sessionId
    )

    // Initialize cross-agent context
    const currentAgent = AGENTS[request.agentId] || AGENTS.anchor // Default to Anchor
    this.crossAgentContext = await this.contextManager.initializeContext(
      request.userId,
      request.threadId || `temp-${Date.now()}`,
      request.sessionId || `session-${Date.now()}`,
      currentAgent
    )

    // Initialize intent recognizer
    this.intentRecognizer = new AdvancedIntentRecognizer(this.memoryManager.getContext())

    // Initialize store intelligence for Shopify agents
    if (request.agentId.includes('shopify') || request.agentId === 'shopify-ai' ||
        request.context?.storeId) {
      this.storeIntelligence = new EnhancedStoreIntelligence(request.userId)
    }

    // Initialize preview system
    this.previewSystem = new LivePreviewSystem(request.userId)

    // Initialize enhancement system
    this.enhancementSystem = new OneClickEnhancementSystem(
      request.userId,
      this.memoryManager.getContext(),
      await this.getStoreIntelligence()
    )
  }

  private async generateContextualResponse(
    request: ChatRequest,
    intentAnalysis: IntentAnalysis,
    questionFlow?: QuestionFlow,
    enhancements?: EnhancementSuggestion,
    routingDecision?: RoutingDecision,
    maritimePersonality?: any
  ): Promise<string> {
    // Use compressed context instead of full memory
    const compressedContextPrompt = this.buildCompressedContextPrompt()
    const storeContext = this.compressedContext?.storeContext ?
      this.buildStoreContextPrompt(this.compressedContext.storeContext) : ''

    // Get agent-specific context and personality
    const agentContext = routingDecision ?
      this.contextManager.getRelevantContextForAgent(this.crossAgentContext!, routingDecision.selectedAgent.id) :
      {}

    const selectedAgent = routingDecision?.selectedAgent || AGENTS.anchor
    const agentExpertise = this.agentRouter.getAgentExpertise(selectedAgent.id)

    let prompt = `You are ${selectedAgent.name}, ${selectedAgent.title} in the CrewFlow maritime AI platform.

${agentExpertise ? `Maritime Personality: ${agentExpertise.maritimePersonality}` : ''}

Your Shopify Expertise: ${agentExpertise?.shopifyCapabilities.join(', ') || 'General store management'}

Compressed Context Memory:
${compressedContextPrompt}

Cross-Agent Context:
${JSON.stringify(agentContext.previousInteractions?.slice(-3) || [], null, 2)}

${storeContext}

User Message: "${request.message}"

Intent Analysis:
- Primary Intent: ${intentAnalysis.primaryIntent.type} (${(intentAnalysis.confidence * 100).toFixed(1)}% confidence)
- Complexity: ${intentAnalysis.complexity}
- Urgency: ${intentAnalysis.urgency}
- Agent Routing Confidence: ${routingDecision ? (routingDecision.confidence * 100).toFixed(1) : 'N/A'}%

`

    // Add question flow context
    if (questionFlow && questionFlow.questions.length > 0) {
      const nextQuestion = questionFlow.questions[questionFlow.currentQuestionIndex]
      if (nextQuestion) {
        prompt += `\nNext Question to Ask:
${nextQuestion.question}
Context: ${nextQuestion.context}
`
      }
    }

    // Add enhancement context
    if (enhancements && enhancements.buttons.length > 0) {
      prompt += `\nAvailable Enhancements:
${enhancements.buttons.slice(0, 3).map(b => `- ${b.title}: ${b.description}`).join('\n')}
`
    }

    // Add maritime personality instructions
    if (maritimePersonality?.agentSwitchMessage) {
      prompt += `\nAgent Handoff Message:
${maritimePersonality.agentSwitchMessage}

`
    }

    prompt += `\nInstructions:
1. Respond as ${selectedAgent.name} with your maritime personality
2. ${maritimePersonality?.shouldIntroduce ? 'Introduce yourself briefly with your maritime role and expertise' : 'Continue the conversation without re-introducing yourself'}
3. Use maritime terminology naturally (navigate, chart course, anchor, set sail, etc.)
4. Focus on your Shopify specialization: ${agentExpertise?.shopifyCapabilities.slice(0, 3).join(', ') || 'general management'}
5. If there are missing information requirements, ask the next smart question naturally
6. If there are relevant enhancements, mention them as suggestions
7. Use the conversation context and previous agent interactions for continuity
8. Be concise but thorough, maintaining professional maritime authority
9. If this is an agent handoff, acknowledge the transition smoothly

Response:`

    try {
      const aiResponse = await this.llm.invoke(prompt)
      return aiResponse.content as string
    } catch (error) {
      console.error('Error generating contextual response:', error)
      return "I apologize, but I'm having trouble processing your request right now. Could you please try again?"
    }
  }

  private buildCompressedContextPrompt(): string {
    if (!this.compressedContext) return 'No context available'

    let prompt = ''

    // Add recent messages
    if (this.compressedContext.recentMessages.length > 0) {
      prompt += 'Recent Conversation:\n'
      this.compressedContext.recentMessages
        .slice(0, 8) // Limit to most recent
        .reverse() // Show in chronological order
        .forEach(msg => {
          const relevanceIndicator = msg.relevance_score && msg.relevance_score > 0.7 ? ' ⭐' : ''
          prompt += `${msg.message_type}: ${msg.content}${relevanceIndicator}\n`
        })
      prompt += '\n'
    }

    // Add summarized history
    if (this.compressedContext.summarizedHistory.length > 0) {
      prompt += 'Previous Conversation Summaries:\n'
      this.compressedContext.summarizedHistory.forEach(summary => {
        prompt += `📝 ${summary.timeRange.start.toLocaleDateString()} - ${summary.timeRange.end.toLocaleDateString()}:\n`
        prompt += `   Summary: ${summary.summary}\n`
        if (summary.keyTopics.length > 0) {
          prompt += `   Topics: ${summary.keyTopics.join(', ')}\n`
        }
        if (summary.importantDecisions.length > 0) {
          prompt += `   Decisions: ${summary.importantDecisions.join(', ')}\n`
        }
        prompt += '\n'
      })
    }

    // Add relevant context
    if (this.compressedContext.relevantContext.length > 0) {
      prompt += 'Relevant Context:\n'
      this.compressedContext.relevantContext
        .slice(0, 5) // Limit context items
        .forEach(ctx => {
          prompt += `- ${ctx.context_type}: ${JSON.stringify(ctx.context_data).substring(0, 200)}...\n`
        })
      prompt += '\n'
    }

    // Add compression metadata for transparency
    const metadata = this.compressedContext.compressionMetadata
    prompt += `Context Compression: ${metadata.compressionLevel} level, ${metadata.totalMessagesProcessed} messages processed, ${(metadata.compressionRatio * 100).toFixed(1)}% compressed\n\n`

    return prompt
  }

  private buildStoreContextPrompt(storeContext: any): string {
    if (!storeContext) return ''

    let prompt = 'Store Context:\n'

    if (storeContext.store) {
      prompt += `- Store: ${storeContext.store.name} (${storeContext.store.domain})\n`
      prompt += `- Plan: ${storeContext.store.plan}\n`
    }

    if (storeContext.criticalMetrics && storeContext.criticalMetrics.length > 0) {
      prompt += '- Critical Metrics:\n'
      storeContext.criticalMetrics.forEach((metric: any) => {
        prompt += `  • ${metric.metric_name}: ${metric.metric_value}\n`
      })
    }

    return prompt + '\n'
  }

  private async getStoreIntelligence(): Promise<StoreIntelligence | undefined> {
    if (!this.storeIntelligence) return undefined
    
    try {
      return await this.storeIntelligence.generateStoreIntelligence()
    } catch (error) {
      console.error('Error getting store intelligence:', error)
      return undefined
    }
  }

  private async getStoreContextPrompt(): Promise<string> {
    const intelligence = await this.getStoreIntelligence()
    if (!intelligence) return ''

    return `Store Context:
- Store: ${intelligence.storeProfile.storeName} (${intelligence.storeProfile.industry})
- Growth Stage: ${intelligence.storeProfile.growthStage}
- Average Order Value: $${intelligence.storeProfile.averageOrderValue.toFixed(2)}
- Top Categories: ${intelligence.storeProfile.topCategories.join(', ')}
- Active Recommendations: ${intelligence.recommendations.length}
- Inventory Alerts: ${intelligence.inventoryInsights.filter(i => i.urgency === 'high').length}
`
  }

  private async getRelevantStoreInsights(intentAnalysis: IntentAnalysis): Promise<Partial<StoreIntelligence> | undefined> {
    const intelligence = await this.getStoreIntelligence()
    if (!intelligence) return undefined

    // Return relevant subset based on intent
    const insights: Partial<StoreIntelligence> = {}

    if (intentAnalysis.primaryIntent.category === 'inventory') {
      insights.inventoryInsights = intelligence.inventoryInsights.slice(0, 10)
      insights.realTimeMetrics = intelligence.realTimeMetrics.filter(m => 
        m.name.toLowerCase().includes('inventory') || m.name.toLowerCase().includes('stock')
      )
    }

    if (intentAnalysis.primaryIntent.category === 'product') {
      insights.recommendations = intelligence.recommendations.filter(r => r.type === 'product')
      insights.marketTrends = intelligence.marketTrends
    }

    if (intentAnalysis.primaryIntent.category === 'analytics') {
      insights.salesPatterns = intelligence.salesPatterns
      insights.predictiveAnalytics = intelligence.predictiveAnalytics
      insights.realTimeMetrics = intelligence.realTimeMetrics
    }

    return insights
  }

  private shouldSuggestEnhancements(intentAnalysis: IntentAnalysis): boolean {
    // Suggest enhancements for certain intent types
    const enhancementIntents = [
      'product_management',
      'inventory_management',
      'store_optimization',
      'general_conversation'
    ]
    
    return enhancementIntents.some(intent => 
      intentAnalysis.primaryIntent.type.includes(intent) ||
      intentAnalysis.primaryIntent.category.includes(intent)
    )
  }

  private shouldGeneratePreviews(intentAnalysis: IntentAnalysis): boolean {
    // Generate previews for actionable intents
    const previewIntents = [
      'product_create',
      'product_update',
      'inventory_update',
      'price_update'
    ]
    
    return previewIntents.some(intent => intentAnalysis.primaryIntent.type.includes(intent))
  }

  private async generatePreviewActions(
    intentAnalysis: IntentAnalysis,
    request: ChatRequest
  ): Promise<PreviewAction[]> {
    const actions: PreviewAction[] = []
    
    // Generate preview actions based on intent
    if (intentAnalysis.primaryIntent.type.includes('product_create')) {
      actions.push({
        id: `preview_${Date.now()}`,
        type: 'product_create',
        title: 'Preview New Product',
        description: 'See how your new product will look before creating it',
        parameters: request.context || {},
        estimatedImpact: {
          scope: 'single_item',
          affectedItems: 1,
          timeToComplete: '2-3 minutes',
          confidence: 0.8
        },
        risks: [],
        dependencies: [],
        reversible: true,
        previewData: null
      })
    }
    
    return actions
  }

  private async generateSuggestedActions(
    intentAnalysis: IntentAnalysis,
    questionFlow?: QuestionFlow,
    enhancements?: EnhancementSuggestion,
    suggestedShopifyActions?: ShopifyAction[]
  ): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = []

    // Add question actions
    if (questionFlow && questionFlow.questions.length > 0) {
      const nextQuestion = questionFlow.questions[questionFlow.currentQuestionIndex]
      if (nextQuestion) {
        actions.push({
          id: `question_${nextQuestion.id}`,
          title: 'Answer Required Question',
          description: nextQuestion.question,
          type: 'question',
          priority: nextQuestion.priority === 'critical' ? 'high' : 'medium',
          parameters: { questionId: nextQuestion.id }
        })
      }
    }

    // Add enhancement actions
    if (enhancements && enhancements.buttons.length > 0) {
      enhancements.buttons.slice(0, 3).forEach(button => {
        actions.push({
          id: `enhancement_${button.id}`,
          title: button.title,
          description: button.description,
          type: 'enhancement',
          priority: button.priority === 'critical' || button.priority === 'high' ? 'high' : 'medium',
          parameters: { buttonId: button.id }
        })
      })
    }

    // Add Shopify action suggestions
    if (suggestedShopifyActions && suggestedShopifyActions.length > 0) {
      suggestedShopifyActions.slice(0, 5).forEach(shopifyAction => {
        actions.push({
          id: `shopify_${shopifyAction.id}`,
          title: `⚓ ${shopifyAction.description}`,
          description: `${shopifyAction.type.toUpperCase()}: ${shopifyAction.action} (${shopifyAction.estimatedTime})`,
          type: 'execute',
          priority: shopifyAction.riskLevel === 'high' ? 'high' :
                   shopifyAction.riskLevel === 'medium' ? 'medium' : 'low',
          parameters: {
            shopifyActionId: shopifyAction.id,
            requiresConfirmation: shopifyAction.requiresConfirmation,
            riskLevel: shopifyAction.riskLevel
          }
        })
      })
    }

    // Add agent-specific suggestions based on current context
    if (this.crossAgentContext) {
      const agentExpertise = this.agentRouter.getAgentExpertise(this.crossAgentContext.currentAgent.id)
      if (agentExpertise) {
        // Add expertise-based quick actions
        agentExpertise.preferredTaskTypes.slice(0, 2).forEach((taskType, index) => {
          actions.push({
            id: `agent_expertise_${taskType}`,
            title: `🚢 ${agentExpertise.agent.name} Specialty`,
            description: `Get help with ${taskType.replace('_', ' ')} using ${agentExpertise.maritimePersonality}`,
            type: 'question',
            priority: 'medium',
            parameters: {
              agentId: agentExpertise.agentId,
              taskType,
              expertise: true
            }
          })
        })
      }
    }

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Call the actual agent endpoint through the bridge
   */
  private async callAgentEndpoint(
    request: ChatRequest,
    routingDecision: RoutingDecision,
    maritimePersonality: any
  ): Promise<AgentEndpointResponse> {
    try {
      const agentRequest = {
        message: request.message,
        context: request.context,
        userId: request.userId,
        threadId: request.threadId,
        routingDecision,
        crossAgentContext: this.crossAgentContext
      }

      // Try primary agent with fallback support
      return await this.agentBridge.routeWithFallback(
        routingDecision.selectedAgent,
        routingDecision.fallbackAgents,
        agentRequest
      )
    } catch (error) {
      console.error('Error calling agent endpoint:', error)

      // Return fallback response
      return {
        success: false,
        response: `⚠️ ${routingDecision.selectedAgent.name} is currently navigating through technical waters. Please try again in a moment.`,
        usage: {
          tokensUsed: 0,
          latency: 0,
          model: 'fallback',
          cost: 0
        },
        maritimePersonality: {
          introduced: false,
          personalityMessage: 'Technical difficulties encountered'
        }
      }
    }
  }

  private determineConversationPhase(intentAnalysis: IntentAnalysis): string {
    if (intentAnalysis.confidence < 0.5) return 'discovery'
    if (intentAnalysis.requiredInformation.length > 0) return 'discovery'
    if (intentAnalysis.primaryIntent.type.includes('execute') || 
        intentAnalysis.primaryIntent.type.includes('create') ||
        intentAnalysis.primaryIntent.type.includes('update')) return 'action'
    return 'followup'
  }

  private determineFollowUpNeed(
    intentAnalysis: IntentAnalysis,
    questionFlow?: QuestionFlow
  ): boolean {
    // Require follow-up if there are unanswered questions or low confidence
    return (questionFlow && !questionFlow.canProceed) || 
           intentAnalysis.confidence < 0.7 ||
           intentAnalysis.complexity === 'complex'
  }

  // Public methods for handling specific actions
  async answerQuestion(
    userId: string,
    questionId: string,
    answer: any
  ): Promise<{ success: boolean; nextQuestion?: any; canProceed: boolean }> {
    // This would update the question flow and return next steps
    return {
      success: true,
      canProceed: true
    }
  }

  async executeEnhancement(
    userId: string,
    enhancementId: string
  ): Promise<{ success: boolean; message: string; results?: any }> {
    if (!this.enhancementSystem) {
      return { success: false, message: 'Enhancement system not initialized' }
    }

    try {
      const result = await this.enhancementSystem.executeEnhancement(enhancementId)
      return {
        success: result.success,
        message: result.message,
        results: result
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async generatePreview(
    userId: string,
    previewId: string,
    parameters: any
  ): Promise<{ success: boolean; preview?: any; message: string }> {
    if (!this.previewSystem) {
      return { success: false, message: 'Preview system not initialized' }
    }

    try {
      const action: PreviewAction = {
        id: previewId,
        type: parameters.type,
        title: parameters.title || 'Preview Action',
        description: parameters.description || '',
        parameters,
        estimatedImpact: {
          scope: 'single_item',
          affectedItems: 1,
          timeToComplete: '2-3 minutes',
          confidence: 0.8
        },
        risks: [],
        dependencies: [],
        reversible: true,
        previewData: null
      }

      const preview = await this.previewSystem.generatePreview(action)
      return {
        success: preview.result.success,
        preview: preview.result.preview,
        message: preview.result.success ? 'Preview generated successfully' : 'Failed to generate preview'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Trigger predictive response pre-loading in background
   */
  private async triggerPredictivePreloading(
    request: ChatRequest,
    intentAnalysis: IntentAnalysis,
    routingDecision: RoutingDecision,
    startTime: number
  ): Promise<any> {
    try {
      console.log('🔮 ENHANCED ORCHESTRATOR: Checking for predictive opportunities')

      // First, check if this response was already preloaded
      const wasPreloaded = await this.checkIfResponseWasPreloaded(request)

      // Build prediction context
      const predictionContext: PredictionContext = {
        currentIntent: intentAnalysis,
        conversationContext: this.memoryManager!.getContext(),
        routingDecision,
        userPatterns: await this.getUserPredictionPatterns(request.userId),
        storeContext: request.context?.storeId ? {
          storeId: request.context.storeId,
          ...request.context
        } : undefined
      }

      // Trigger predictive pre-loading (non-blocking)
      const preloadingPromise = predictiveResponseSystem.triggerPredictivePreloading(predictionContext)

      // Don't await - let it run in background
      preloadingPromise.catch(error => {
        console.error('🔮 ENHANCED ORCHESTRATOR: Predictive pre-loading error:', error)
      })

      return {
        predictionsGenerated: 0, // Will be updated by background process
        preloadingTriggered: true,
        cacheCheckPerformed: true,
        wasPreloadedResponse: wasPreloaded
      }

    } catch (error) {
      console.error('🔮 ENHANCED ORCHESTRATOR: Error in predictive pre-loading:', error)
      return {
        predictionsGenerated: 0,
        preloadingTriggered: false,
        cacheCheckPerformed: false,
        wasPreloadedResponse: false
      }
    }
  }

  /**
   * Check if the current response was served from predictive cache
   */
  private async checkIfResponseWasPreloaded(request: ChatRequest): Promise<boolean> {
    try {
      const preloadedResponse = await predictiveResponseSystem.getPreloadedResponse(
        request.message,
        {
          userId: request.userId,
          agentId: request.agentId,
          storeId: request.context?.storeId
        }
      )

      return preloadedResponse !== null
    } catch (error) {
      console.error('🔮 ENHANCED ORCHESTRATOR: Error checking preloaded response:', error)
      return false
    }
  }

  /**
   * Get user's prediction patterns for better predictions
   */
  private async getUserPredictionPatterns(userId: string): Promise<any> {
    try {
      // This would typically come from user analytics/learning data
      // For now, return default patterns
      return {
        commonFollowUps: [
          'How do I implement this?',
          'What are the next steps?',
          'Can you explain more about this?',
          'What are the best practices?',
          'How long will this take?'
        ],
        preferredQuestionTypes: ['how-to', 'explanation', 'best-practices'],
        conversationFlow: ['discovery', 'action', 'followup'],
        timeBasedPatterns: {
          'morning': ['planning', 'strategy'],
          'afternoon': ['implementation', 'troubleshooting'],
          'evening': ['review', 'optimization']
        },
        topicTransitions: {
          'product_management': ['inventory_management', 'pricing', 'marketing'],
          'inventory_management': ['forecasting', 'suppliers', 'automation'],
          'store_optimization': ['seo', 'conversion', 'analytics']
        }
      }
    } catch (error) {
      console.error('🔮 ENHANCED ORCHESTRATOR: Error getting user patterns:', error)
      return {
        commonFollowUps: [],
        preferredQuestionTypes: [],
        conversationFlow: [],
        timeBasedPatterns: {},
        topicTransitions: {}
      }
    }
  }
}
