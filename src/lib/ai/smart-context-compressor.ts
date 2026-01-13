// Smart Context Compressor
// Optimizes conversation context loading through intelligent compression, caching, and relevance filtering

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'

export interface CompressedContext {
  recentMessages: EnhancedMessage[]
  summarizedHistory: ContextSummary[]
  relevantContext: ConversationContext[]
  storeContext?: any
  compressionMetadata: CompressionMetadata
  totalTokensEstimate: number
}

export interface ContextSummary {
  id: string
  userId: string
  threadId: string
  timeRange: {
    start: Date
    end: Date
  }
  summary: string
  keyTopics: string[]
  importantDecisions: string[]
  relevanceScore: number
  messageCount: number
  tokensCompressed: number
  createdAt: Date
}

export interface CompressionMetadata {
  compressionLevel: CompressionLevel
  totalMessagesProcessed: number
  messagesCompressed: number
  compressionRatio: number
  processingTime: number
  cacheHit: boolean
  relevanceThreshold: number
}

export type CompressionLevel = 'MINIMAL' | 'BALANCED' | 'COMPREHENSIVE'

export interface CompressionOptions {
  level: CompressionLevel
  maxRecentMessages: number
  maxSummaries: number
  maxContextItems: number
  relevanceThreshold: number
  timeRangeHours: number
  includeStoreContext: boolean
  forceRefresh: boolean
}

export interface EnhancedMessage {
  id: string
  user_id: string
  thread_id: string
  message_type: 'user' | 'assistant'
  content: string
  timestamp: Date
  relevance_score?: number
  compressed?: boolean
}

export interface ConversationContext {
  id: string
  user_id: string
  context_type: string
  context_data: any
  relevance_score: number
  priority_level: string
  created_at: Date
}

class ContextCache {
  private cache = new Map<string, { data: any; expires: number }>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.TTL)
    this.cache.set(key, { data, expires })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

class RelevanceScorer {
  private static readonly RECENCY_WEIGHT = 0.3
  private static readonly TOPIC_WEIGHT = 0.25
  private static readonly INTERACTION_WEIGHT = 0.25
  private static readonly DECISION_WEIGHT = 0.2

  static scoreMessage(
    message: EnhancedMessage,
    currentIntent?: string,
    userPreferences?: any
  ): number {
    let score = 0

    // Recency scoring (newer messages score higher)
    const ageHours = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60)
    const recencyScore = Math.max(0, 1 - (ageHours / 168)) // Decay over 1 week
    score += recencyScore * this.RECENCY_WEIGHT

    // Topic relevance (if current intent is known)
    if (currentIntent && message.content) {
      const topicScore = this.calculateTopicRelevance(message.content, currentIntent)
      score += topicScore * this.TOPIC_WEIGHT
    }

    // Interaction type scoring
    const interactionScore = message.message_type === 'user' ? 0.8 : 0.6
    score += interactionScore * this.INTERACTION_WEIGHT

    // Decision/action content scoring
    const decisionScore = this.calculateDecisionRelevance(message.content)
    score += decisionScore * this.DECISION_WEIGHT

    return Math.min(1, Math.max(0, score))
  }

  private static calculateTopicRelevance(content: string, intent: string): number {
    const contentLower = content.toLowerCase()
    const intentLower = intent.toLowerCase()
    
    // Simple keyword matching - could be enhanced with embeddings
    const keywords = intentLower.split(/[_\s]+/)
    let matches = 0
    
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) matches++
    })
    
    return Math.min(1, matches / keywords.length)
  }

  private static calculateDecisionRelevance(content: string): number {
    const decisionKeywords = [
      'decided', 'choose', 'selected', 'confirmed', 'approved',
      'created', 'updated', 'changed', 'set', 'configured'
    ]
    
    const contentLower = content.toLowerCase()
    let score = 0
    
    decisionKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) score += 0.1
    })
    
    return Math.min(1, score)
  }
}

class ContextSummarizer {
  private llm: ChatOpenAI

  constructor() {
    const aiConfig = getAIConfig()
    this.llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-5',
      temperature: 0.1,
      maxTokens: 500
    })
  }

  async summarizeMessages(
    messages: EnhancedMessage[],
    timeRange: { start: Date; end: Date }
  ): Promise<ContextSummary> {
    if (messages.length === 0) {
      throw new Error('No messages to summarize')
    }

    const conversationText = messages
      .map(m => `${m.message_type}: ${m.content}`)
      .join('\n')

    const prompt = `Summarize this conversation segment focusing on:
1. Key topics discussed
2. Important decisions made
3. Action items or tasks
4. User preferences revealed
5. Store/business context mentioned

Conversation:
${conversationText}

Provide a JSON response with:
{
  "summary": "Brief overview of the conversation",
  "keyTopics": ["topic1", "topic2", ...],
  "importantDecisions": ["decision1", "decision2", ...],
  "relevanceScore": 0.8
}`

    try {
      const response = await this.llm.invoke(prompt)
      const result = JSON.parse(response.content as string)
      
      return {
        id: `summary_${Date.now()}`,
        userId: messages[0].user_id,
        threadId: messages[0].thread_id,
        timeRange,
        summary: result.summary,
        keyTopics: result.keyTopics || [],
        importantDecisions: result.importantDecisions || [],
        relevanceScore: result.relevanceScore || 0.5,
        messageCount: messages.length,
        tokensCompressed: conversationText.length,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Error summarizing messages:', error)
      
      // Fallback summary
      return {
        id: `summary_${Date.now()}`,
        userId: messages[0].user_id,
        threadId: messages[0].thread_id,
        timeRange,
        summary: `Conversation with ${messages.length} messages covering various topics`,
        keyTopics: ['general_conversation'],
        importantDecisions: [],
        relevanceScore: 0.3,
        messageCount: messages.length,
        tokensCompressed: conversationText.length,
        createdAt: new Date()
      }
    }
  }
}

export class SmartContextCompressor {
  private supabase = createSupabaseServerClient()
  private cache = new ContextCache()
  private summarizer = new ContextSummarizer()

  private static readonly DEFAULT_OPTIONS: CompressionOptions = {
    level: 'BALANCED',
    maxRecentMessages: 10,
    maxSummaries: 5,
    maxContextItems: 8,
    relevanceThreshold: 0.4,
    timeRangeHours: 24,
    includeStoreContext: true,
    forceRefresh: false
  }

  async getCompressedContext(
    userId: string,
    threadId: string,
    sessionId?: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressedContext> {
    const startTime = Date.now()
    const opts = { ...SmartContextCompressor.DEFAULT_OPTIONS, ...options }
    
    const cacheKey = this.generateCacheKey(userId, threadId, sessionId, opts)
    
    // Check cache first (unless force refresh)
    if (!opts.forceRefresh) {
      const cached = this.cache.get(cacheKey)
      if (cached) {
        cached.compressionMetadata.cacheHit = true
        return cached
      }
    }

    console.log('🧠 SMART COMPRESSOR: Loading context with compression level:', opts.level)

    // Load context components in parallel
    const [recentMessages, existingSummaries, relevantContext, storeContext] = 
      await Promise.all([
        this.loadRecentMessages(userId, threadId, sessionId, opts),
        this.loadExistingSummaries(userId, threadId, opts),
        this.loadRelevantContext(userId, sessionId, opts),
        opts.includeStoreContext ? this.loadStoreContext(userId) : Promise.resolve(null)
      ])

    // Generate new summaries for older messages if needed
    const summaries = await this.generateMissingSummaries(
      userId, 
      threadId, 
      existingSummaries, 
      opts
    )

    // Calculate compression metadata
    const totalMessages = recentMessages.length + summaries.reduce((sum, s) => sum + s.messageCount, 0)
    const compressionRatio = summaries.length > 0 ? 
      summaries.reduce((sum, s) => sum + s.messageCount, 0) / Math.max(1, totalMessages) : 0

    const compressedContext: CompressedContext = {
      recentMessages,
      summarizedHistory: summaries,
      relevantContext,
      storeContext,
      compressionMetadata: {
        compressionLevel: opts.level,
        totalMessagesProcessed: totalMessages,
        messagesCompressed: summaries.reduce((sum, s) => sum + s.messageCount, 0),
        compressionRatio,
        processingTime: Date.now() - startTime,
        cacheHit: false,
        relevanceThreshold: opts.relevanceThreshold
      },
      totalTokensEstimate: this.estimateTokens(recentMessages, summaries, relevantContext)
    }

    // Cache the result
    this.cache.set(cacheKey, compressedContext)

    console.log('🧠 SMART COMPRESSOR: Context compressed', {
      level: opts.level,
      recentMessages: recentMessages.length,
      summaries: summaries.length,
      contextItems: relevantContext.length,
      compressionRatio: (compressionRatio * 100).toFixed(1) + '%',
      processingTime: compressedContext.compressionMetadata.processingTime + 'ms',
      estimatedTokens: compressedContext.totalTokensEstimate
    })

    return compressedContext
  }

  private async loadRecentMessages(
    userId: string,
    threadId: string,
    sessionId?: string,
    options: CompressionOptions
  ): Promise<EnhancedMessage[]> {
    try {
      let query = this.supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('timestamp', { ascending: false })
        .limit(options.maxRecentMessages)

      if (threadId) {
        query = query.eq('thread_id', threadId)
      } else if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('🧠 SMART COMPRESSOR: Error loading recent messages:', error)
        return []
      }

      const messages = (data || []).map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))

      // Score messages for relevance
      return messages.map(msg => ({
        ...msg,
        relevance_score: RelevanceScorer.scoreMessage(msg)
      }))
    } catch (error) {
      console.error('🧠 SMART COMPRESSOR: Failed to load recent messages:', error)
      return []
    }
  }

  private async loadExistingSummaries(
    userId: string,
    threadId: string,
    options: CompressionOptions
  ): Promise<ContextSummary[]> {
    try {
      const { data, error } = await this.supabase
        .from('context_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('thread_id', threadId)
        .gte('relevance_score', options.relevanceThreshold)
        .order('created_at', { ascending: false })
        .limit(options.maxSummaries)

      if (error) {
        console.error('🧠 SMART COMPRESSOR: Error loading summaries:', error)
        return []
      }

      return (data || []).map(summary => ({
        ...summary,
        timeRange: {
          start: new Date(summary.time_range_start),
          end: new Date(summary.time_range_end)
        },
        createdAt: new Date(summary.created_at)
      }))
    } catch (error) {
      console.error('🧠 SMART COMPRESSOR: Failed to load summaries:', error)
      return []
    }
  }

  private async loadRelevantContext(
    userId: string,
    sessionId?: string,
    options: CompressionOptions
  ): Promise<ConversationContext[]> {
    try {
      let query = this.supabase
        .from('conversation_context')
        .select('*')
        .eq('user_id', userId)
        .gte('relevance_score', options.relevanceThreshold)
        .order('relevance_score', { ascending: false })
        .limit(options.maxContextItems)

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      // Only get context that's still valid
      query = query.or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())

      const { data, error } = await query

      if (error) {
        console.error('🧠 SMART COMPRESSOR: Error loading context:', error)
        return []
      }

      return (data || []).map(ctx => ({
        ...ctx,
        created_at: new Date(ctx.created_at)
      }))
    } catch (error) {
      console.error('🧠 SMART COMPRESSOR: Failed to load context:', error)
      return []
    }
  }

  private async loadStoreContext(userId: string): Promise<any> {
    try {
      // Load essential store context only
      const { data: storeData } = await this.supabase
        .from('shopify_stores')
        .select('id, name, domain, plan, created_at')
        .eq('user_id', userId)
        .single()

      if (!storeData) return null

      // Load recent critical metrics only
      const { data: metrics } = await this.supabase
        .from('store_metrics')
        .select('metric_name, metric_value, updated_at')
        .eq('store_id', storeData.id)
        .in('metric_name', ['total_orders', 'revenue_today', 'inventory_alerts'])
        .order('updated_at', { ascending: false })
        .limit(10)

      return {
        store: storeData,
        criticalMetrics: metrics || []
      }
    } catch (error) {
      console.error('🧠 SMART COMPRESSOR: Failed to load store context:', error)
      return null
    }
  }

  private async generateMissingSummaries(
    userId: string,
    threadId: string,
    existingSummaries: ContextSummary[],
    options: CompressionOptions
  ): Promise<ContextSummary[]> {
    try {
      // Find gaps in summarized history
      const cutoffDate = new Date(Date.now() - (options.timeRangeHours * 60 * 60 * 1000))
      const recentCutoff = new Date(Date.now() - (2 * 60 * 60 * 1000)) // 2 hours ago

      // Get messages that need summarization (older than 2 hours, not yet summarized)
      const { data: unsummarizedMessages } = await this.supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('thread_id', threadId)
        .lt('timestamp', recentCutoff.toISOString())
        .gte('timestamp', cutoffDate.toISOString())
        .eq('archived', false)
        .order('timestamp', { ascending: true })

      if (!unsummarizedMessages || unsummarizedMessages.length === 0) {
        return existingSummaries
      }

      // Group messages by time windows (e.g., 4-hour chunks)
      const messageGroups = this.groupMessagesByTimeWindow(unsummarizedMessages, 4)
      const newSummaries: ContextSummary[] = []

      // Generate summaries for each group (limit to avoid excessive API calls)
      for (const group of messageGroups.slice(0, 3)) {
        if (group.messages.length >= 3) { // Only summarize if there are enough messages
          try {
            const summary = await this.summarizer.summarizeMessages(
              group.messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              })),
              group.timeRange
            )

            // Save summary to database
            await this.saveSummaryToDatabase(summary)
            newSummaries.push(summary)
          } catch (error) {
            console.error('🧠 SMART COMPRESSOR: Error generating summary:', error)
          }
        }
      }

      return [...existingSummaries, ...newSummaries]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, options.maxSummaries)
    } catch (error) {
      console.error('🧠 SMART COMPRESSOR: Failed to generate summaries:', error)
      return existingSummaries
    }
  }

  private groupMessagesByTimeWindow(
    messages: any[],
    windowHours: number
  ): Array<{ messages: any[]; timeRange: { start: Date; end: Date } }> {
    if (messages.length === 0) return []

    const groups: Array<{ messages: any[]; timeRange: { start: Date; end: Date } }> = []
    const windowMs = windowHours * 60 * 60 * 1000

    let currentGroup: any[] = []
    let groupStart = new Date(messages[0].timestamp)

    for (const message of messages) {
      const messageTime = new Date(message.timestamp)

      if (messageTime.getTime() - groupStart.getTime() > windowMs) {
        // Start new group
        if (currentGroup.length > 0) {
          groups.push({
            messages: currentGroup,
            timeRange: {
              start: groupStart,
              end: new Date(currentGroup[currentGroup.length - 1].timestamp)
            }
          })
        }
        currentGroup = [message]
        groupStart = messageTime
      } else {
        currentGroup.push(message)
      }
    }

    // Add final group
    if (currentGroup.length > 0) {
      groups.push({
        messages: currentGroup,
        timeRange: {
          start: groupStart,
          end: new Date(currentGroup[currentGroup.length - 1].timestamp)
        }
      })
    }

    return groups
  }

  private async saveSummaryToDatabase(summary: ContextSummary): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('context_summaries')
        .insert({
          id: summary.id,
          user_id: summary.userId,
          thread_id: summary.threadId,
          time_range_start: summary.timeRange.start.toISOString(),
          time_range_end: summary.timeRange.end.toISOString(),
          summary: summary.summary,
          key_topics: summary.keyTopics,
          important_decisions: summary.importantDecisions,
          relevance_score: summary.relevanceScore,
          message_count: summary.messageCount,
          tokens_compressed: summary.tokensCompressed,
          created_at: summary.createdAt.toISOString()
        })

      if (error) {
        console.error('🧠 SMART COMPRESSOR: Error saving summary:', error)
      }
    } catch (error) {
      console.error('🧠 SMART COMPRESSOR: Failed to save summary:', error)
    }
  }

  private estimateTokens(
    messages: EnhancedMessage[],
    summaries: ContextSummary[],
    context: ConversationContext[]
  ): number {
    // Rough token estimation (4 characters ≈ 1 token)
    let totalChars = 0

    // Count message content
    messages.forEach(msg => {
      totalChars += (msg.content || '').length
    })

    // Count summary content
    summaries.forEach(summary => {
      totalChars += summary.summary.length
      totalChars += summary.keyTopics.join(' ').length
      totalChars += summary.importantDecisions.join(' ').length
    })

    // Count context data
    context.forEach(ctx => {
      totalChars += JSON.stringify(ctx.context_data || {}).length
    })

    return Math.ceil(totalChars / 4)
  }

  private generateCacheKey(
    userId: string,
    threadId: string,
    sessionId?: string,
    options?: CompressionOptions
  ): string {
    const optionsHash = options ?
      `${options.level}_${options.maxRecentMessages}_${options.relevanceThreshold}` :
      'default'
    return `context_${userId}_${threadId}_${sessionId || 'no-session'}_${optionsHash}`
  }

  // Public utility methods
  async clearCache(): Promise<void> {
    this.cache.clear()
    console.log('🧠 SMART COMPRESSOR: Cache cleared')
  }

  async getCompressionStats(): Promise<{
    cacheSize: number
    totalSummaries: number
    avgCompressionRatio: number
  }> {
    try {
      const { data: summaries } = await this.supabase
        .from('context_summaries')
        .select('message_count, tokens_compressed')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const totalSummaries = summaries?.length || 0
      const avgCompressionRatio = summaries && summaries.length > 0 ?
        summaries.reduce((sum, s) => sum + (s.tokens_compressed / Math.max(1, s.message_count)), 0) / summaries.length :
        0

      return {
        cacheSize: this.cache.size(),
        totalSummaries,
        avgCompressionRatio
      }
    } catch (error) {
      console.error('🧠 SMART COMPRESSOR: Error getting stats:', error)
      return {
        cacheSize: this.cache.size(),
        totalSummaries: 0,
        avgCompressionRatio: 0
      }
    }
  }
}
