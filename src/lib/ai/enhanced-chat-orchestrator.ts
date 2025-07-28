// Enhanced Chat Orchestrator
// Integrates all conversational AI features into a unified system

import { EnhancedMemoryManager, ConversationContext } from './enhanced-memory'
import { AdvancedIntentRecognizer, IntentAnalysis } from './advanced-intent-recognition'
import { SmartQuestionGenerator, QuestionFlow } from './smart-questions'
import { EnhancedStoreIntelligence, StoreIntelligence } from './enhanced-store-intelligence'
import { LivePreviewSystem, PreviewAction } from './live-previews'
import { OneClickEnhancementSystem, EnhancementSuggestion } from './one-click-enhancements'
import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'

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

  constructor() {
    const aiConfig = getAIConfig()
    this.llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    })
  }

  async processMessage(request: ChatRequest): Promise<EnhancedChatResponse> {
    // Initialize all systems
    await this.initializeSystems(request)

    // Analyze intent
    const intentAnalysis = await this.intentRecognizer!.analyzeIntent(request.message)

    // Update conversation state
    await this.memoryManager!.updateConversationState({
      currentTopic: intentAnalysis.primaryIntent.category,
      lastIntent: intentAnalysis.primaryIntent.type,
      confidence: intentAnalysis.confidence,
      conversationPhase: this.determineConversationPhase(intentAnalysis)
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

    // Generate AI response with full context
    const response = await this.generateContextualResponse(
      request,
      intentAnalysis,
      questionFlow,
      enhancements
    )

    // Record interaction for learning
    await this.memoryManager!.recordInteraction(
      intentAnalysis.primaryIntent.type,
      'chat_response',
      'success',
      request.message
    )

    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(
      intentAnalysis,
      questionFlow,
      enhancements,
      previews
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
      requiresFollowUp: this.determineFollowUpNeed(intentAnalysis, questionFlow)
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

    // Initialize intent recognizer
    this.intentRecognizer = new AdvancedIntentRecognizer(this.memoryManager.getContext())

    // Initialize store intelligence for Shopify agents
    if (request.agentId.includes('shopify') || request.agentId === 'shopify-ai') {
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
    enhancements?: EnhancementSuggestion
  ): Promise<string> {
    const contextualMemory = this.memoryManager!.getContextualMemory()
    const storeContext = await this.getStoreContextPrompt()
    
    let prompt = `You are an expert AI assistant helping with ${intentAnalysis.primaryIntent.category} tasks.

Context Memory:
${contextualMemory}

${storeContext}

User Message: "${request.message}"

Intent Analysis:
- Primary Intent: ${intentAnalysis.primaryIntent.type} (${(intentAnalysis.confidence * 100).toFixed(1)}% confidence)
- Complexity: ${intentAnalysis.complexity}
- Urgency: ${intentAnalysis.urgency}

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

    prompt += `\nInstructions:
1. Provide a helpful, contextual response to the user's message
2. If there are missing information requirements, ask the next smart question naturally
3. If there are relevant enhancements, mention them as suggestions
4. Use the conversation context to provide personalized assistance
5. Be concise but thorough
6. Maintain the agent's maritime personality if applicable

Response:`

    try {
      const aiResponse = await this.llm.invoke(prompt)
      return aiResponse.content as string
    } catch (error) {
      console.error('Error generating contextual response:', error)
      return "I apologize, but I'm having trouble processing your request right now. Could you please try again?"
    }
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

  private generateSuggestedActions(
    intentAnalysis: IntentAnalysis,
    questionFlow?: QuestionFlow,
    enhancements?: EnhancementSuggestion,
    previews?: PreviewAction[]
  ): SuggestedAction[] {
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

    // Add preview actions
    if (previews && previews.length > 0) {
      previews.forEach(preview => {
        actions.push({
          id: `preview_${preview.id}`,
          title: preview.title,
          description: preview.description,
          type: 'preview',
          priority: 'medium',
          parameters: { previewId: preview.id }
        })
      })
    }

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
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
}
