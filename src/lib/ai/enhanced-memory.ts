// Enhanced Conversational Memory System
// Provides persistent context, user preferences, and learning capabilities

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getShopifyContextData } from '@/lib/agents/shopify-context'

export interface ConversationContext {
  userId: string
  agentId: string
  threadId?: string
  sessionId: string
  preferences: UserPreferences
  conversationState: ConversationState
  storeContext?: ShopifyStoreContext
  recentInteractions: RecentInteraction[]
  learningData: LearningData
}

export interface UserPreferences {
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly'
  responseLength: 'brief' | 'detailed' | 'comprehensive'
  preferredActions: string[]
  avoidedTopics: string[]
  timezone: string
  language: string
  businessContext: {
    industry?: string
    storeType?: string
    primaryGoals?: string[]
    experienceLevel?: 'beginner' | 'intermediate' | 'expert'
  }
}

export interface ConversationState {
  currentTopic: string
  activeWorkflow?: string
  pendingActions: PendingAction[]
  contextVariables: Record<string, any>
  lastIntent: string
  confidence: number
  conversationPhase: 'greeting' | 'discovery' | 'action' | 'followup' | 'closing'
}

export interface ShopifyStoreContext {
  storeId: string
  storeName: string
  recentProducts: any[]
  recentOrders: any[]
  currentInventoryIssues: any[]
  performanceMetrics: any
  lastSyncAt: string
}

export interface RecentInteraction {
  timestamp: Date
  intent: string
  action: string
  outcome: 'success' | 'failure' | 'partial'
  userSatisfaction?: number
  context: string
}

export interface LearningData {
  successfulPatterns: string[]
  failedPatterns: string[]
  userBehaviorInsights: string[]
  preferredSolutions: Record<string, string>
  timeBasedPatterns: Record<string, any>
}

export interface PendingAction {
  id: string
  type: string
  description: string
  parameters: any
  requiresConfirmation: boolean
  estimatedImpact: 'low' | 'medium' | 'high'
  createdAt: Date
}

export class EnhancedMemoryManager {
  private context: ConversationContext
  private supabase = createSupabaseServerClient()

  constructor(context: ConversationContext) {
    this.context = context
  }

  // Initialize or load existing conversation context
  static async initialize(
    userId: string,
    agentId: string,
    threadId?: string,
    sessionId?: string
  ): Promise<EnhancedMemoryManager> {
    const supabase = createSupabaseServerClient()
    
    // Load user preferences
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Load conversation state
    const { data: convState } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .eq('thread_id', threadId || null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    // Load recent interactions
    const { data: recentInteractions } = await supabase
      .from('conversation_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Load learning data
    const { data: learningData } = await supabase
      .from('user_learning_data')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .single()

    // Get Shopify store context if applicable
    let storeContext: ShopifyStoreContext | undefined
    if (agentId === 'shopify-ai' || agentId.includes('shopify')) {
      const shopifyData = await getShopifyContextData(userId)
      if (shopifyData) {
        storeContext = {
          storeId: 'primary',
          storeName: shopifyData.store.name,
          recentProducts: shopifyData.recentActivity.recentProducts,
          recentOrders: shopifyData.recentActivity.recentOrders,
          currentInventoryIssues: shopifyData.alerts.lowStock,
          performanceMetrics: shopifyData.metrics,
          lastSyncAt: new Date().toISOString()
        }
      }
    }

    const context: ConversationContext = {
      userId,
      agentId,
      threadId,
      sessionId: sessionId || `session-${Date.now()}`,
      preferences: userPrefs?.preferences || getDefaultPreferences(),
      conversationState: convState?.state || getDefaultConversationState(),
      storeContext,
      recentInteractions: recentInteractions || [],
      learningData: learningData?.learning_data || getDefaultLearningData()
    }

    return new EnhancedMemoryManager(context)
  }

  // Update conversation state with new information
  async updateConversationState(updates: Partial<ConversationState>): Promise<void> {
    this.context.conversationState = {
      ...this.context.conversationState,
      ...updates
    }

    await this.supabase
      .from('conversation_states')
      .upsert({
        user_id: this.context.userId,
        agent_id: this.context.agentId,
        thread_id: this.context.threadId || null,
        session_id: this.context.sessionId,
        state: this.context.conversationState,
        updated_at: new Date().toISOString()
      })
  }

  // Record a new interaction for learning
  async recordInteraction(
    intent: string,
    action: string,
    outcome: 'success' | 'failure' | 'partial',
    context: string,
    userSatisfaction?: number
  ): Promise<void> {
    const interaction: RecentInteraction = {
      timestamp: new Date(),
      intent,
      action,
      outcome,
      userSatisfaction,
      context
    }

    this.context.recentInteractions.unshift(interaction)
    if (this.context.recentInteractions.length > 10) {
      this.context.recentInteractions.pop()
    }

    await this.supabase
      .from('conversation_interactions')
      .insert({
        user_id: this.context.userId,
        agent_id: this.context.agentId,
        thread_id: this.context.threadId || null,
        session_id: this.context.sessionId,
        intent,
        action,
        outcome,
        user_satisfaction: userSatisfaction,
        context,
        created_at: new Date().toISOString()
      })

    // Update learning data based on interaction
    await this.updateLearningData(interaction)
  }

  // Get contextual memory for AI prompt
  getContextualMemory(): string {
    const { preferences, conversationState, storeContext, recentInteractions } = this.context
    
    let memory = `User Context:
- Communication Style: ${preferences.communicationStyle}
- Response Preference: ${preferences.responseLength}
- Experience Level: ${preferences.businessContext.experienceLevel || 'unknown'}
- Current Topic: ${conversationState.currentTopic}
- Conversation Phase: ${conversationState.conversationPhase}
- Last Intent: ${conversationState.lastIntent} (confidence: ${conversationState.confidence})`

    if (storeContext) {
      memory += `\n\nStore Context:
- Store: ${storeContext.storeName}
- Recent Products: ${storeContext.recentProducts.length} items
- Recent Orders: ${storeContext.recentOrders.length} orders
- Inventory Issues: ${storeContext.currentInventoryIssues.length} items need attention`
    }

    if (recentInteractions.length > 0) {
      memory += `\n\nRecent Interaction Patterns:
${recentInteractions.slice(0, 3).map(i => 
  `- ${i.intent} → ${i.action} (${i.outcome})`
).join('\n')}`
    }

    if (conversationState.pendingActions.length > 0) {
      memory += `\n\nPending Actions:
${conversationState.pendingActions.map(a => 
  `- ${a.description} (${a.estimatedImpact} impact)`
).join('\n')}`
    }

    return memory
  }

  // Add pending action
  async addPendingAction(action: Omit<PendingAction, 'id' | 'createdAt'>): Promise<string> {
    const pendingAction: PendingAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    }

    this.context.conversationState.pendingActions.push(pendingAction)
    await this.updateConversationState(this.context.conversationState)
    
    return pendingAction.id
  }

  // Remove pending action
  async removePendingAction(actionId: string): Promise<void> {
    this.context.conversationState.pendingActions = 
      this.context.conversationState.pendingActions.filter(a => a.id !== actionId)
    await this.updateConversationState(this.context.conversationState)
  }

  // Get conversation context
  getContext(): ConversationContext {
    return this.context
  }

  // Update learning data based on interaction patterns
  private async updateLearningData(interaction: RecentInteraction): Promise<void> {
    const { learningData } = this.context

    if (interaction.outcome === 'success') {
      const pattern = `${interaction.intent}:${interaction.action}`
      if (!learningData.successfulPatterns.includes(pattern)) {
        learningData.successfulPatterns.push(pattern)
      }
    } else if (interaction.outcome === 'failure') {
      const pattern = `${interaction.intent}:${interaction.action}`
      if (!learningData.failedPatterns.includes(pattern)) {
        learningData.failedPatterns.push(pattern)
      }
    }

    // Update time-based patterns
    const hour = interaction.timestamp.getHours()
    const timeKey = `hour_${hour}`
    if (!learningData.timeBasedPatterns[timeKey]) {
      learningData.timeBasedPatterns[timeKey] = []
    }
    learningData.timeBasedPatterns[timeKey].push(interaction.intent)

    await this.supabase
      .from('user_learning_data')
      .upsert({
        user_id: this.context.userId,
        agent_id: this.context.agentId,
        learning_data: learningData,
        updated_at: new Date().toISOString()
      })
  }
}

// Default configurations
function getDefaultPreferences(): UserPreferences {
  return {
    communicationStyle: 'friendly',
    responseLength: 'detailed',
    preferredActions: [],
    avoidedTopics: [],
    timezone: 'UTC',
    language: 'en',
    businessContext: {
      experienceLevel: 'intermediate'
    }
  }
}

function getDefaultConversationState(): ConversationState {
  return {
    currentTopic: 'general',
    pendingActions: [],
    contextVariables: {},
    lastIntent: 'greeting',
    confidence: 0.5,
    conversationPhase: 'greeting'
  }
}

function getDefaultLearningData(): LearningData {
  return {
    successfulPatterns: [],
    failedPatterns: [],
    userBehaviorInsights: [],
    preferredSolutions: {},
    timeBasedPatterns: {}
  }
}
