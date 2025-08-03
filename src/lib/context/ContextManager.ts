// Enhanced Context Management System for CrewFlow
// Provides intelligent context tracking, summarization, and cross-session continuity
// Focus on Shopify AI Store Manager functionality

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseClient } from '@/lib/supabase/client'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

export interface ConversationSession {
  id: string
  user_id: string
  session_id: string
  store_id?: string
  store_name?: string
  store_context: any
  session_metadata: any
  active_thread_id?: string
  thread_count: number
  message_count: number
  is_active: boolean
  last_interaction_type?: string
  last_store_action?: string
  created_at: string
  last_activity_at: string
  expires_at: string
}

export interface ConversationContext {
  id: string
  user_id: string
  thread_id?: string
  session_id?: string
  context_type: 'summary' | 'intent' | 'store_state' | 'user_preference' | 'conversation_phase' | 'action_history' | 'business_context'
  context_data: any
  context_summary?: string
  relevance_score: number
  priority_level: 'low' | 'medium' | 'high' | 'critical'
  valid_from: string
  valid_until?: string
  last_accessed_at: string
  access_count: number
  source_message_id?: string
  created_by_agent?: string
  created_at: string
  updated_at: string
}

export interface ContextSummary {
  id: string
  user_id: string
  thread_id?: string
  session_id?: string
  summary_type: 'conversation' | 'session' | 'store_activity' | 'user_behavior' | 'business_insights'
  summary_text: string
  summary_data: any
  covers_from: string
  covers_until: string
  message_count: number
  completeness_score: number
  accuracy_score: number
  last_used_at: string
  usage_count: number
  created_at: string
  updated_at: string
}

export interface EnhancedMessage {
  id: string
  user_id: string
  agent_name: string
  message_type: 'user' | 'agent'
  content: string
  timestamp: string
  thread_id?: string
  session_id?: string
  context_metadata: any
  store_state_snapshot: any
  message_importance_score: number
  user_intent?: string
  ai_confidence_score: number
  response_quality_score?: number
  context_used: any
}

export interface ContextRetrievalOptions {
  includeStoreContext?: boolean
  includeHistoricalSummaries?: boolean
  maxMessages?: number
  maxContextItems?: number
  priorityThreshold?: number
  timeRangeHours?: number
}

export interface IntelligentContextResult {
  immediateContext: EnhancedMessage[]
  sessionContext: ConversationContext[]
  historicalSummaries: ContextSummary[]
  storeContext: any
  contextPriority: {
    recent: number
    store: number
    historical: number
    user: number
  }
  totalRelevanceScore: number
}

export class ContextManager {
  private supabase: any
  private aiModel: ChatOpenAI | null = null

  constructor(isServerSide: boolean = false) {
    this.supabase = isServerSide ? createSupabaseServerClient() : createSupabaseClient()
    this.initializeAI()
  }

  private async initializeAI() {
    try {
      const aiConfig = getAIConfig()
      this.aiModel = new ChatOpenAI({
        openAIApiKey: aiConfig.openai.apiKey,
        modelName: aiConfig.openai.model,
        temperature: 0.3, // Lower temperature for more consistent summaries
        maxTokens: 1000,
      })
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to initialize AI model:', error)
    }
  }

  // =====================================================
  // Session Management
  // =====================================================

  async createOrUpdateSession(
    userId: string,
    sessionId: string,
    storeContext?: any,
    metadata?: any
  ): Promise<ConversationSession> {
    try {
      const sessionData = {
        user_id: userId,
        session_id: sessionId,
        store_id: storeContext?.store_id,
        store_name: storeContext?.store_name,
        store_context: storeContext || {},
        session_metadata: metadata || {},
        is_active: true,
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }

      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .upsert(sessionData, {
          onConflict: 'user_id,session_id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (error) {
        console.error('🧠 CONTEXT MANAGER: Session creation error:', error)
        throw error
      }

      console.log('🧠 CONTEXT MANAGER: Session created/updated:', data.id)
      return data
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to create/update session:', error)
      throw error
    }
  }

  async getActiveSession(userId: string, sessionId: string): Promise<ConversationSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('🧠 CONTEXT MANAGER: Session retrieval error:', error)
        return null
      }

      return data || null
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to get active session:', error)
      return null
    }
  }

  async updateSessionActivity(
    userId: string,
    sessionId: string,
    interactionType?: string,
    storeAction?: string
  ): Promise<void> {
    try {
      const updates: any = {
        last_activity_at: new Date().toISOString()
      }

      if (interactionType) updates.last_interaction_type = interactionType
      if (storeAction) updates.last_store_action = storeAction

      await this.supabase
        .from('conversation_sessions')
        .update(updates)
        .eq('user_id', userId)
        .eq('session_id', sessionId)

    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to update session activity:', error)
    }
  }

  // =====================================================
  // Context Retrieval and Prioritization
  // =====================================================

  async getIntelligentContext(
    userId: string,
    threadId?: string,
    sessionId?: string,
    options: ContextRetrievalOptions = {}
  ): Promise<IntelligentContextResult> {
    const {
      includeStoreContext = true,
      includeHistoricalSummaries = true,
      maxMessages = 15,
      maxContextItems = 10,
      priorityThreshold = 5,
      timeRangeHours = 24
    } = options

    try {
      // Get immediate conversation context (recent messages)
      const immediateContext = await this.getRecentMessages(
        userId,
        threadId,
        sessionId,
        maxMessages
      )

      // Get session-level context
      const sessionContext = await this.getSessionContext(
        userId,
        sessionId,
        maxContextItems,
        priorityThreshold
      )

      // Get historical summaries if requested
      let historicalSummaries: ContextSummary[] = []
      if (includeHistoricalSummaries) {
        historicalSummaries = await this.getRelevantSummaries(
          userId,
          threadId,
          sessionId,
          timeRangeHours
        )
      }

      // Get store context if requested
      let storeContext: any = {}
      if (includeStoreContext && sessionId) {
        storeContext = await this.getStoreContext(userId, sessionId)
      }

      // Calculate context priority weights
      const contextPriority = this.calculateContextPriority(
        immediateContext,
        sessionContext,
        historicalSummaries,
        storeContext
      )

      // Calculate total relevance score
      const totalRelevanceScore = this.calculateTotalRelevance(
        immediateContext,
        sessionContext,
        historicalSummaries
      )

      return {
        immediateContext,
        sessionContext,
        historicalSummaries,
        storeContext,
        contextPriority,
        totalRelevanceScore
      }

    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to get intelligent context:', error)
      throw error
    }
  }

  private async getRecentMessages(
    userId: string,
    threadId?: string,
    sessionId?: string,
    limit: number = 15
  ): Promise<EnhancedMessage[]> {
    try {
      let query = this.supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (threadId) {
        query = query.eq('thread_id', threadId)
      } else if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('🧠 CONTEXT MANAGER: Recent messages error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to get recent messages:', error)
      return []
    }
  }

  private async getSessionContext(
    userId: string,
    sessionId?: string,
    limit: number = 10,
    priorityThreshold: number = 5
  ): Promise<ConversationContext[]> {
    try {
      let query = this.supabase
        .from('conversation_context')
        .select('*')
        .eq('user_id', userId)
        .gte('relevance_score', priorityThreshold)
        .order('relevance_score', { ascending: false })
        .limit(limit)

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      // Only get context that's still valid
      query = query.or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())

      const { data, error } = await query

      if (error) {
        console.error('🧠 CONTEXT MANAGER: Session context error:', error)
        return []
      }

      // Update access tracking
      if (data && data.length > 0) {
        await this.updateContextAccess(data.map(c => c.id))
      }

      return data || []
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to get session context:', error)
      return []
    }
  }

  private async getRelevantSummaries(
    userId: string,
    threadId?: string,
    sessionId?: string,
    timeRangeHours: number = 24
  ): Promise<ContextSummary[]> {
    try {
      const timeThreshold = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString()

      let query = this.supabase
        .from('context_summaries')
        .select('*')
        .eq('user_id', userId)
        .gte('covers_until', timeThreshold)
        .order('last_used_at', { ascending: false })
        .limit(5)

      if (threadId) {
        query = query.eq('thread_id', threadId)
      } else if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('🧠 CONTEXT MANAGER: Summaries error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to get relevant summaries:', error)
      return []
    }
  }

  private async getStoreContext(userId: string, sessionId: string): Promise<any> {
    try {
      const session = await this.getActiveSession(userId, sessionId)
      return session?.store_context || {}
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to get store context:', error)
      return {}
    }
  }

  private calculateContextPriority(
    immediateContext: EnhancedMessage[],
    sessionContext: ConversationContext[],
    historicalSummaries: ContextSummary[],
    storeContext: any
  ) {
    const recent = Math.min(immediateContext.length / 10, 1) * 10
    const store = Object.keys(storeContext).length > 0 ? 8 : 0
    const historical = Math.min(historicalSummaries.length / 3, 1) * 6
    const user = Math.min(sessionContext.length / 5, 1) * 7

    return { recent, store, historical, user }
  }

  private calculateTotalRelevance(
    immediateContext: EnhancedMessage[],
    sessionContext: ConversationContext[],
    historicalSummaries: ContextSummary[]
  ): number {
    const messageRelevance = immediateContext.reduce((sum, msg) => sum + msg.message_importance_score, 0)
    const contextRelevance = sessionContext.reduce((sum, ctx) => sum + ctx.relevance_score, 0)
    const summaryRelevance = historicalSummaries.reduce((sum, summary) => sum + (summary.completeness_score * 10), 0)

    return messageRelevance + contextRelevance + summaryRelevance
  }

  private async updateContextAccess(contextIds: string[]): Promise<void> {
    try {
      await this.supabase
        .from('conversation_context')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: this.supabase.raw('access_count + 1')
        })
        .in('id', contextIds)
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to update context access:', error)
    }
  }

  // =====================================================
  // Context Storage and Management
  // =====================================================

  async storeContext(
    userId: string,
    contextType: ConversationContext['context_type'],
    contextData: any,
    options: {
      threadId?: string
      sessionId?: string
      relevanceScore?: number
      priorityLevel?: ConversationContext['priority_level']
      validUntil?: Date
      sourceMessageId?: string
      createdByAgent?: string
      summary?: string
    } = {}
  ): Promise<string> {
    try {
      const contextRecord = {
        user_id: userId,
        thread_id: options.threadId,
        session_id: options.sessionId,
        context_type: contextType,
        context_data: contextData,
        context_summary: options.summary,
        relevance_score: options.relevanceScore || 5,
        priority_level: options.priorityLevel || 'medium',
        valid_until: options.validUntil?.toISOString(),
        source_message_id: options.sourceMessageId,
        created_by_agent: options.createdByAgent
      }

      const { data, error } = await this.supabase
        .from('conversation_context')
        .insert(contextRecord)
        .select('id')
        .single()

      if (error) {
        console.error('🧠 CONTEXT MANAGER: Context storage error:', error)
        throw error
      }

      console.log('🧠 CONTEXT MANAGER: Context stored:', data.id)
      return data.id
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to store context:', error)
      throw error
    }
  }

  // =====================================================
  // Intelligent Summarization
  // =====================================================

  async generateConversationSummary(
    userId: string,
    threadId: string,
    messageCount?: number
  ): Promise<string> {
    if (!this.aiModel) {
      throw new Error('AI model not initialized')
    }

    try {
      // Get recent messages for summarization
      const messages = await this.getRecentMessages(userId, threadId, undefined, messageCount || 20)
      
      if (messages.length === 0) {
        return 'No conversation history available for summarization.'
      }

      // Prepare conversation text
      const conversationText = messages
        .reverse() // Chronological order
        .map(msg => `${msg.message_type.toUpperCase()}: ${msg.content}`)
        .join('\n\n')

      // Generate summary using AI
      const summaryPrompt = new SystemMessage(`You are an intelligent conversation summarizer for CrewFlow's maritime AI system. 

Create a concise but comprehensive summary of this Shopify store management conversation. Focus on:
1. Key topics discussed
2. Important decisions made
3. Actions taken or planned
4. Store context and business insights
5. User preferences and patterns

Keep the maritime theme subtle and professional. Limit to 200 words.`)

      const userPrompt = new HumanMessage(`Please summarize this conversation:\n\n${conversationText}`)

      const response = await this.aiModel.invoke([summaryPrompt, userPrompt])
      const summaryText = response.content as string

      // Store the summary
      await this.storeSummary(
        userId,
        threadId,
        'conversation',
        summaryText,
        {
          message_count: messages.length,
          covers_from: messages[0]?.timestamp,
          covers_until: messages[messages.length - 1]?.timestamp
        }
      )

      return summaryText
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to generate conversation summary:', error)
      throw error
    }
  }

  private async storeSummary(
    userId: string,
    threadId: string,
    summaryType: ContextSummary['summary_type'],
    summaryText: string,
    metadata: {
      message_count: number
      covers_from: string
      covers_until: string
      sessionId?: string
    }
  ): Promise<string> {
    try {
      const summaryRecord = {
        user_id: userId,
        thread_id: threadId,
        session_id: metadata.sessionId,
        summary_type: summaryType,
        summary_text: summaryText,
        summary_data: metadata,
        covers_from: metadata.covers_from,
        covers_until: metadata.covers_until,
        message_count: metadata.message_count,
        completeness_score: 0.85,
        accuracy_score: 0.90
      }

      const { data, error } = await this.supabase
        .from('context_summaries')
        .insert(summaryRecord)
        .select('id')
        .single()

      if (error) {
        console.error('🧠 CONTEXT MANAGER: Summary storage error:', error)
        throw error
      }

      return data.id
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to store summary:', error)
      throw error
    }
  }

  // =====================================================
  // Cleanup and Maintenance
  // =====================================================

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('cleanup_expired_sessions')

      if (error) {
        console.error('🧠 CONTEXT MANAGER: Cleanup error:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('🧠 CONTEXT MANAGER: Failed to cleanup expired sessions:', error)
      return 0
    }
  }
}

// Singleton instance for client-side usage
let contextManagerInstance: ContextManager | null = null

export function getContextManager(isServerSide: boolean = false): ContextManager {
  if (!contextManagerInstance || isServerSide) {
    contextManagerInstance = new ContextManager(isServerSide)
  }
  return contextManagerInstance
}

export default ContextManager
