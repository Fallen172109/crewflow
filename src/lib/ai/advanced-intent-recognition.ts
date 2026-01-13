// Advanced Intent Recognition System
// Sophisticated intent detection with context awareness and confidence scoring

import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'
import { ConversationContext } from './enhanced-memory'

export interface IntentAnalysis {
  primaryIntent: Intent
  secondaryIntents: Intent[]
  confidence: number
  complexity: 'simple' | 'moderate' | 'complex'
  urgency: 'low' | 'medium' | 'high'
  requiredInformation: RequiredInfo[]
  suggestedActions: SuggestedAction[]
  contextualFactors: ContextualFactor[]
}

export interface Intent {
  type: string
  category: string
  subcategory?: string
  confidence: number
  parameters: Record<string, any>
  description: string
}

export interface RequiredInfo {
  field: string
  description: string
  type: 'text' | 'number' | 'selection' | 'file' | 'confirmation'
  options?: string[]
  priority: 'critical' | 'important' | 'optional'
  currentValue?: any
}

export interface SuggestedAction {
  id: string
  title: string
  description: string
  type: 'immediate' | 'workflow' | 'information'
  confidence: number
  estimatedTime: string
  impact: 'low' | 'medium' | 'high'
  prerequisites?: string[]
}

export interface ContextualFactor {
  type: string
  value: any
  influence: 'positive' | 'negative' | 'neutral'
  weight: number
}

// Intent patterns for different domains
const SHOPIFY_INTENT_PATTERNS = {
  product_management: {
    create: ['create product', 'add product', 'new product', 'make product'],
    update: ['update product', 'edit product', 'modify product', 'change product'],
    delete: ['delete product', 'remove product', 'archive product'],
    search: ['find product', 'search product', 'look for product'],
    optimize: ['optimize product', 'improve product', 'enhance product']
  },
  inventory_management: {
    check: ['check inventory', 'inventory levels', 'stock levels'],
    update: ['update inventory', 'adjust stock', 'change quantity'],
    alert: ['low stock', 'out of stock', 'inventory alert'],
    forecast: ['inventory forecast', 'predict demand', 'stock planning']
  },
  order_management: {
    view: ['view orders', 'check orders', 'order status'],
    process: ['process order', 'fulfill order', 'ship order'],
    refund: ['refund order', 'return order', 'cancel order'],
    track: ['track order', 'order tracking', 'shipping status']
  },
  analytics: {
    sales: ['sales report', 'revenue analysis', 'sales data'],
    performance: ['store performance', 'metrics', 'analytics'],
    trends: ['sales trends', 'customer trends', 'market trends'],
    forecast: ['sales forecast', 'revenue prediction', 'growth projection']
  },
  customer_service: {
    support: ['customer support', 'help customer', 'customer issue'],
    communication: ['email customer', 'contact customer', 'customer message'],
    feedback: ['customer feedback', 'reviews', 'satisfaction']
  }
}

const GENERAL_INTENT_PATTERNS = {
  information: {
    question: ['what is', 'how to', 'can you', 'tell me about'],
    explanation: ['explain', 'describe', 'clarify', 'help me understand'],
    guidance: ['guide me', 'walk me through', 'show me how']
  },
  action: {
    execute: ['do this', 'perform', 'execute', 'run'],
    schedule: ['schedule', 'plan', 'set up', 'arrange'],
    automate: ['automate', 'set up automation', 'create workflow']
  },
  troubleshooting: {
    problem: ['problem', 'issue', 'error', 'not working'],
    fix: ['fix', 'resolve', 'solve', 'repair'],
    debug: ['debug', 'troubleshoot', 'diagnose']
  }
}

export class AdvancedIntentRecognizer {
  private llm: ChatOpenAI
  private context: ConversationContext

  constructor(context: ConversationContext) {
    this.context = context
    const aiConfig = getAIConfig()
    this.llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-5',
      temperature: 0.1,
      maxTokens: 1000
    })
  }

  async analyzeIntent(message: string): Promise<IntentAnalysis> {
    // Multi-layered intent analysis
    const patternAnalysis = this.analyzePatterns(message)
    const contextualAnalysis = this.analyzeContext(message)
    const aiAnalysis = await this.analyzeWithAI(message)
    
    // Combine analyses with weighted scoring
    const primaryIntent = this.determinePrimaryIntent(patternAnalysis, contextualAnalysis, aiAnalysis)
    const secondaryIntents = this.determineSecondaryIntents(patternAnalysis, contextualAnalysis, aiAnalysis)
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(primaryIntent, secondaryIntents, contextualAnalysis)
    
    // Determine complexity and urgency
    const complexity = this.determineComplexity(message, primaryIntent)
    const urgency = this.determineUrgency(message, primaryIntent, contextualAnalysis)
    
    // Identify required information
    const requiredInformation = this.identifyRequiredInformation(primaryIntent, message)
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(primaryIntent, secondaryIntents)
    
    // Identify contextual factors
    const contextualFactors = this.identifyContextualFactors(message, contextualAnalysis)

    return {
      primaryIntent,
      secondaryIntents,
      confidence,
      complexity,
      urgency,
      requiredInformation,
      suggestedActions,
      contextualFactors
    }
  }

  private analyzePatterns(message: string): any {
    const lowerMessage = message.toLowerCase()
    const results: any = { matches: [], confidence: 0 }
    
    // Check Shopify patterns
    for (const [category, actions] of Object.entries(SHOPIFY_INTENT_PATTERNS)) {
      for (const [action, patterns] of Object.entries(actions)) {
        for (const pattern of patterns) {
          if (lowerMessage.includes(pattern)) {
            results.matches.push({
              type: `shopify_${category}_${action}`,
              category: 'shopify',
              subcategory: category,
              confidence: this.calculatePatternConfidence(pattern, lowerMessage),
              pattern
            })
          }
        }
      }
    }
    
    // Check general patterns
    for (const [category, actions] of Object.entries(GENERAL_INTENT_PATTERNS)) {
      for (const [action, patterns] of Object.entries(actions)) {
        for (const pattern of patterns) {
          if (lowerMessage.includes(pattern)) {
            results.matches.push({
              type: `general_${category}_${action}`,
              category: 'general',
              subcategory: category,
              confidence: this.calculatePatternConfidence(pattern, lowerMessage),
              pattern
            })
          }
        }
      }
    }
    
    return results
  }

  private analyzeContext(message: string): any {
    const { conversationState, storeContext, recentInteractions } = this.context
    
    const contextFactors = {
      currentTopic: conversationState.currentTopic,
      conversationPhase: conversationState.conversationPhase,
      lastIntent: conversationState.lastIntent,
      hasStoreContext: !!storeContext,
      recentPatterns: recentInteractions.slice(0, 3).map(i => i.intent),
      pendingActions: conversationState.pendingActions.length
    }
    
    return contextFactors
  }

  private async analyzeWithAI(message: string): Promise<any> {
    const contextMemory = this.context ? this.getContextualPrompt() : ''
    
    const prompt = `Analyze the following user message for intent, considering the conversation context:

Message: "${message}"

Context: ${contextMemory}

Provide a JSON response with:
{
  "primary_intent": {
    "type": "specific_intent_type",
    "category": "main_category",
    "confidence": 0.0-1.0,
    "description": "what the user wants to accomplish"
  },
  "complexity": "simple|moderate|complex",
  "urgency": "low|medium|high",
  "missing_information": ["list", "of", "required", "info"],
  "user_goal": "ultimate goal the user is trying to achieve"
}`

    try {
      const response = await this.llm.invoke(prompt)
      return JSON.parse(response.content as string)
    } catch (error) {
      console.error('AI intent analysis error:', error)
      return { primary_intent: { type: 'unknown', category: 'general', confidence: 0.3 } }
    }
  }

  private determinePrimaryIntent(patternAnalysis: any, contextualAnalysis: any, aiAnalysis: any): Intent {
    // Combine pattern matching with AI analysis
    let bestIntent: Intent
    
    if (patternAnalysis.matches.length > 0) {
      const bestMatch = patternAnalysis.matches.reduce((best: any, current: any) => 
        current.confidence > best.confidence ? current : best
      )
      
      bestIntent = {
        type: bestMatch.type,
        category: bestMatch.category,
        subcategory: bestMatch.subcategory,
        confidence: bestMatch.confidence,
        parameters: {},
        description: `${bestMatch.category} ${bestMatch.subcategory} action`
      }
    } else if (aiAnalysis.primary_intent) {
      bestIntent = {
        type: aiAnalysis.primary_intent.type,
        category: aiAnalysis.primary_intent.category,
        confidence: aiAnalysis.primary_intent.confidence,
        parameters: {},
        description: aiAnalysis.primary_intent.description
      }
    } else {
      bestIntent = {
        type: 'general_conversation',
        category: 'general',
        confidence: 0.5,
        parameters: {},
        description: 'General conversation or unclear intent'
      }
    }
    
    // Adjust confidence based on context
    if (contextualAnalysis.currentTopic && bestIntent.category === contextualAnalysis.currentTopic) {
      bestIntent.confidence = Math.min(1.0, bestIntent.confidence + 0.2)
    }
    
    return bestIntent
  }

  private determineSecondaryIntents(patternAnalysis: any, contextualAnalysis: any, aiAnalysis: any): Intent[] {
    return patternAnalysis.matches
      .filter((match: any) => match.confidence > 0.3)
      .slice(1, 4) // Top 3 secondary intents
      .map((match: any) => ({
        type: match.type,
        category: match.category,
        subcategory: match.subcategory,
        confidence: match.confidence,
        parameters: {},
        description: `Secondary: ${match.category} ${match.subcategory}`
      }))
  }

  private calculateConfidence(primaryIntent: Intent, secondaryIntents: Intent[], contextualAnalysis: any): number {
    let confidence = primaryIntent.confidence
    
    // Boost confidence if we have supporting secondary intents
    if (secondaryIntents.length > 0) {
      confidence += 0.1
    }
    
    // Boost confidence if intent aligns with conversation context
    if (contextualAnalysis.currentTopic === primaryIntent.category) {
      confidence += 0.15
    }
    
    // Boost confidence if intent follows recent patterns
    if (contextualAnalysis.recentPatterns.includes(primaryIntent.type)) {
      confidence += 0.1
    }
    
    return Math.min(1.0, confidence)
  }

  private determineComplexity(message: string, primaryIntent: Intent): 'simple' | 'moderate' | 'complex' {
    const messageLength = message.split(' ').length
    const hasMultipleRequests = message.includes(' and ') || message.includes(' then ') || message.includes(' also ')
    const hasConditionals = message.includes(' if ') || message.includes(' when ') || message.includes(' unless ')
    
    if (messageLength > 30 || hasMultipleRequests || hasConditionals) {
      return 'complex'
    } else if (messageLength > 15 || primaryIntent.category === 'shopify') {
      return 'moderate'
    } else {
      return 'simple'
    }
  }

  private determineUrgency(message: string, primaryIntent: Intent, contextualAnalysis: any): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now', 'quickly']
    const hasUrgentWords = urgentWords.some(word => message.toLowerCase().includes(word))
    
    if (hasUrgentWords) return 'high'
    if (primaryIntent.type.includes('error') || primaryIntent.type.includes('problem')) return 'high'
    if (contextualAnalysis.pendingActions > 0) return 'medium'
    
    return 'low'
  }

  private identifyRequiredInformation(primaryIntent: Intent, message: string): RequiredInfo[] {
    const required: RequiredInfo[] = []
    
    // Intent-specific required information
    if (primaryIntent.type.includes('product_create')) {
      if (!message.includes('title') && !message.includes('name')) {
        required.push({
          field: 'product_title',
          description: 'Product title or name',
          type: 'text',
          priority: 'critical'
        })
      }
      if (!message.includes('price')) {
        required.push({
          field: 'product_price',
          description: 'Product price',
          type: 'number',
          priority: 'critical'
        })
      }
    }
    
    if (primaryIntent.type.includes('inventory_update')) {
      if (!message.includes('quantity') && !message.includes('stock')) {
        required.push({
          field: 'quantity',
          description: 'New inventory quantity',
          type: 'number',
          priority: 'critical'
        })
      }
    }
    
    return required
  }

  private generateSuggestedActions(primaryIntent: Intent, secondaryIntents: Intent[]): SuggestedAction[] {
    const actions: SuggestedAction[] = []
    
    // Generate actions based on primary intent
    if (primaryIntent.type.includes('product')) {
      actions.push({
        id: 'view_products',
        title: 'View Products',
        description: 'Show current product list',
        type: 'immediate',
        confidence: 0.8,
        estimatedTime: '1 minute',
        impact: 'low'
      })
    }
    
    if (primaryIntent.type.includes('inventory')) {
      actions.push({
        id: 'check_inventory',
        title: 'Check Inventory Levels',
        description: 'Review current stock levels',
        type: 'immediate',
        confidence: 0.9,
        estimatedTime: '2 minutes',
        impact: 'medium'
      })
    }
    
    return actions
  }

  private identifyContextualFactors(message: string, contextualAnalysis: any): ContextualFactor[] {
    const factors: ContextualFactor[] = []
    
    // Time-based factors
    const hour = new Date().getHours()
    if (hour < 9 || hour > 17) {
      factors.push({
        type: 'time_of_day',
        value: 'outside_business_hours',
        influence: 'neutral',
        weight: 0.1
      })
    }
    
    // Context continuity
    if (contextualAnalysis.currentTopic !== 'general') {
      factors.push({
        type: 'topic_continuity',
        value: contextualAnalysis.currentTopic,
        influence: 'positive',
        weight: 0.3
      })
    }
    
    return factors
  }

  private calculatePatternConfidence(pattern: string, message: string): number {
    const exactMatch = message.includes(pattern)
    const wordMatch = pattern.split(' ').every(word => message.includes(word))
    
    if (exactMatch) return 0.9
    if (wordMatch) return 0.7
    return 0.3
  }

  private getContextualPrompt(): string {
    const { conversationState, storeContext } = this.context
    
    let prompt = `Current conversation context:
- Topic: ${conversationState.currentTopic}
- Phase: ${conversationState.conversationPhase}
- Last Intent: ${conversationState.lastIntent}`
    
    if (storeContext) {
      prompt += `\n- Store: ${storeContext.storeName}
- Recent Activity: ${storeContext.recentOrders.length} orders, ${storeContext.recentProducts.length} products`
    }
    
    return prompt
  }
}
