// Cross-Agent Context Management
// Maintains conversation continuity and context sharing across different maritime agents

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Agent } from '@/lib/agents'

export interface AgentInteraction {
  agentId: string
  agentName: string
  timestamp: Date
  messageId: string
  userMessage: string
  agentResponse: string
  taskType: string
  confidence: number
  actionsTaken?: string[]
  contextData?: any
}

export interface CrossAgentContext {
  userId: string
  threadId: string
  sessionId: string
  currentAgent: Agent
  previousAgents: Agent[]
  interactionHistory: AgentInteraction[]
  sharedContext: {
    storeInfo?: any
    currentProject?: any
    userPreferences?: any
    ongoingTasks?: any[]
    maritimePersonalityState?: {
      hasIntroduced: boolean
      lastIntroduction: Date
      personalityConsistency: string
    }
  }
  conversationPhase: 'introduction' | 'working' | 'handoff' | 'completion'
  lastAgentSwitch?: Date
}

export interface AgentHandoffData {
  fromAgent: Agent
  toAgent: Agent
  reason: string
  contextSummary: string
  pendingActions: string[]
  userExpectations: string
}

export class CrossAgentContextManager {
  private supabase = createSupabaseServerClient()
  private contextCache = new Map<string, CrossAgentContext>()

  /**
   * Initialize or retrieve cross-agent context for a conversation
   */
  async initializeContext(
    userId: string,
    threadId: string,
    sessionId: string,
    currentAgent: Agent
  ): Promise<CrossAgentContext> {
    const contextKey = `${userId}-${threadId}`
    
    // Check cache first
    if (this.contextCache.has(contextKey)) {
      const context = this.contextCache.get(contextKey)!
      context.currentAgent = currentAgent
      return context
    }

    // Load from database
    const existingContext = await this.loadContextFromDatabase(userId, threadId)
    
    if (existingContext) {
      existingContext.currentAgent = currentAgent
      this.contextCache.set(contextKey, existingContext)
      return existingContext
    }

    // Create new context
    const newContext: CrossAgentContext = {
      userId,
      threadId,
      sessionId,
      currentAgent,
      previousAgents: [],
      interactionHistory: [],
      sharedContext: {
        maritimePersonalityState: {
          hasIntroduced: false,
          lastIntroduction: new Date(),
          personalityConsistency: 'professional_maritime'
        }
      },
      conversationPhase: 'introduction'
    }

    this.contextCache.set(contextKey, newContext)
    await this.saveContextToDatabase(newContext)
    
    return newContext
  }

  /**
   * Record an agent interaction
   */
  async recordInteraction(
    context: CrossAgentContext,
    interaction: Omit<AgentInteraction, 'timestamp'>
  ): Promise<void> {
    const fullInteraction: AgentInteraction = {
      ...interaction,
      timestamp: new Date()
    }

    context.interactionHistory.push(fullInteraction)
    
    // Keep only last 50 interactions for performance
    if (context.interactionHistory.length > 50) {
      context.interactionHistory = context.interactionHistory.slice(-50)
    }

    // Update conversation phase
    this.updateConversationPhase(context)

    // Save to database
    await this.saveInteractionToDatabase(context.userId, context.threadId, fullInteraction)
    await this.saveContextToDatabase(context)
  }

  /**
   * Handle agent handoff with context preservation
   */
  async handleAgentHandoff(
    context: CrossAgentContext,
    newAgent: Agent,
    handoffReason: string
  ): Promise<AgentHandoffData> {
    const handoffData: AgentHandoffData = {
      fromAgent: context.currentAgent,
      toAgent: newAgent,
      reason: handoffReason,
      contextSummary: this.generateContextSummary(context),
      pendingActions: this.extractPendingActions(context),
      userExpectations: this.inferUserExpectations(context)
    }

    // Update context
    context.previousAgents.push(context.currentAgent)
    context.currentAgent = newAgent
    context.conversationPhase = 'handoff'
    context.lastAgentSwitch = new Date()

    // Reset introduction state for new agent
    if (context.sharedContext.maritimePersonalityState) {
      context.sharedContext.maritimePersonalityState.hasIntroduced = false
    }

    await this.saveContextToDatabase(context)
    
    return handoffData
  }

  /**
   * Generate maritime-themed handoff message
   */
  generateHandoffMessage(handoffData: AgentHandoffData): string {
    const fromPersonality = this.getAgentPersonality(handoffData.fromAgent.id)
    const toPersonality = this.getAgentPersonality(handoffData.toAgent.id)

    return `⚓ **Crew Change on Deck** ⚓

${fromPersonality} ${handoffData.fromAgent.name} is passing the helm to ${toPersonality} ${handoffData.toAgent.name}.

**Handoff Summary:**
${handoffData.contextSummary}

**Reason for Transfer:** ${handoffData.reason}

${handoffData.pendingActions.length > 0 ? `**Pending Actions:**
${handoffData.pendingActions.map(action => `• ${action}`).join('\n')}` : ''}

${handoffData.toAgent.name} is now ready to assist you with their specialized expertise. All previous context has been preserved for seamless continuation.`
  }

  /**
   * Check if agent should introduce themselves
   */
  shouldIntroduce(context: CrossAgentContext): boolean {
    const personalityState = context.sharedContext.maritimePersonalityState
    
    if (!personalityState?.hasIntroduced) {
      return true
    }

    // Re-introduce if it's been more than 24 hours
    const hoursSinceIntroduction = (Date.now() - personalityState.lastIntroduction.getTime()) / (1000 * 60 * 60)
    return hoursSinceIntroduction > 24
  }

  /**
   * Mark agent as introduced
   */
  markAsIntroduced(context: CrossAgentContext): void {
    if (!context.sharedContext.maritimePersonalityState) {
      context.sharedContext.maritimePersonalityState = {
        hasIntroduced: true,
        lastIntroduction: new Date(),
        personalityConsistency: 'professional_maritime'
      }
    } else {
      context.sharedContext.maritimePersonalityState.hasIntroduced = true
      context.sharedContext.maritimePersonalityState.lastIntroduction = new Date()
    }
  }

  /**
   * Get relevant context for current agent
   */
  getRelevantContextForAgent(context: CrossAgentContext, agentId: string): any {
    const relevantInteractions = context.interactionHistory
      .filter(interaction => 
        interaction.agentId === agentId || 
        this.isRelatedExpertise(interaction.agentId, agentId)
      )
      .slice(-10) // Last 10 relevant interactions

    return {
      previousInteractions: relevantInteractions,
      sharedContext: context.sharedContext,
      conversationPhase: context.conversationPhase,
      userPreferences: context.sharedContext.userPreferences,
      ongoingTasks: context.sharedContext.ongoingTasks || []
    }
  }

  private async loadContextFromDatabase(userId: string, threadId: string): Promise<CrossAgentContext | null> {
    try {
      const { data, error } = await this.supabase
        .from('cross_agent_contexts')
        .select('*')
        .eq('user_id', userId)
        .eq('thread_id', threadId)
        .single()

      if (error || !data) return null

      return {
        userId: data.user_id,
        threadId: data.thread_id,
        sessionId: data.session_id,
        currentAgent: JSON.parse(data.current_agent),
        previousAgents: JSON.parse(data.previous_agents || '[]'),
        interactionHistory: JSON.parse(data.interaction_history || '[]').map((i: any) => ({
          ...i,
          timestamp: new Date(i.timestamp)
        })),
        sharedContext: JSON.parse(data.shared_context || '{}'),
        conversationPhase: data.conversation_phase,
        lastAgentSwitch: data.last_agent_switch ? new Date(data.last_agent_switch) : undefined
      }
    } catch (error) {
      console.error('Error loading cross-agent context:', error)
      return null
    }
  }

  private async saveContextToDatabase(context: CrossAgentContext): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cross_agent_contexts')
        .upsert({
          user_id: context.userId,
          thread_id: context.threadId,
          session_id: context.sessionId,
          current_agent: JSON.stringify(context.currentAgent),
          previous_agents: JSON.stringify(context.previousAgents),
          interaction_history: JSON.stringify(context.interactionHistory),
          shared_context: JSON.stringify(context.sharedContext),
          conversation_phase: context.conversationPhase,
          last_agent_switch: context.lastAgentSwitch?.toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving cross-agent context:', error)
      }
    } catch (error) {
      console.error('Error saving cross-agent context:', error)
    }
  }

  private async saveInteractionToDatabase(
    userId: string,
    threadId: string,
    interaction: AgentInteraction
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('agent_interactions')
        .insert({
          user_id: userId,
          thread_id: threadId,
          agent_id: interaction.agentId,
          agent_name: interaction.agentName,
          message_id: interaction.messageId,
          user_message: interaction.userMessage,
          agent_response: interaction.agentResponse,
          task_type: interaction.taskType,
          confidence: interaction.confidence,
          actions_taken: JSON.stringify(interaction.actionsTaken || []),
          context_data: JSON.stringify(interaction.contextData || {}),
          created_at: interaction.timestamp.toISOString()
        })

      if (error) {
        console.error('Error saving agent interaction:', error)
      }
    } catch (error) {
      console.error('Error saving agent interaction:', error)
    }
  }

  private updateConversationPhase(context: CrossAgentContext): void {
    const recentInteractions = context.interactionHistory.slice(-5)
    
    if (recentInteractions.length === 1) {
      context.conversationPhase = 'introduction'
    } else if (recentInteractions.length > 1 && recentInteractions.length < 10) {
      context.conversationPhase = 'working'
    } else {
      context.conversationPhase = 'completion'
    }
  }

  private generateContextSummary(context: CrossAgentContext): string {
    const recentInteractions = context.interactionHistory.slice(-3)
    const summary = recentInteractions
      .map(i => `${i.agentName}: ${i.taskType}`)
      .join(', ')
    
    return summary || 'Initial conversation'
  }

  private extractPendingActions(context: CrossAgentContext): string[] {
    const pendingActions: string[] = []
    
    context.interactionHistory.forEach(interaction => {
      if (interaction.actionsTaken) {
        interaction.actionsTaken.forEach(action => {
          if (action.includes('pending') || action.includes('incomplete')) {
            pendingActions.push(action)
          }
        })
      }
    })

    return pendingActions
  }

  private inferUserExpectations(context: CrossAgentContext): string {
    const lastInteraction = context.interactionHistory[context.interactionHistory.length - 1]
    return lastInteraction ? `Continue with ${lastInteraction.taskType}` : 'General assistance'
  }

  private getAgentPersonality(agentId: string): string {
    const personalities: Record<string, string> = {
      anchor: '⚓ Supply Chain Admiral',
      sage: '📚 Knowledge Navigator',
      helm: '⚙️ Operations Helmsman',
      ledger: '💰 Financial Treasurer',
      patch: '🔧 Technical Engineer',
      pearl: '🔍 Market Explorer',
      flint: '⚡ Sales Strategist',
      beacon: '🗼 Project Coordinator',
      splash: '🎨 Creative Artist',
      drake: '🤝 Customer Captain'
    }
    
    return personalities[agentId] || '⚓ Crew Member'
  }

  private isRelatedExpertise(agentId1: string, agentId2: string): boolean {
    const expertiseGroups = [
      ['anchor', 'ledger'], // Supply chain and finance
      ['sage', 'pearl'], // Research and intelligence
      ['helm', 'patch'], // Operations and technical
      ['splash', 'flint'], // Creative and sales
      ['beacon', 'drake'] // Coordination and customer service
    ]

    return expertiseGroups.some(group => 
      group.includes(agentId1) && group.includes(agentId2)
    )
  }
}
