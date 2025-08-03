// Response Pre-loader 🚀
// Generates responses for predicted questions in the background

import { PredictedQuestion, PreloadedResponse } from './predictive-response-system'
import { EnhancedChatOrchestrator, ChatRequest } from './enhanced-chat-orchestrator'
import { cache } from '@/lib/performance/optimization-system'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'

export interface PreloadingContext {
  userId: string
  threadId: string
  sessionId: string
  agentId: string
  storeContext?: any
}

export interface PreloadingResult {
  success: boolean
  response?: PreloadedResponse
  error?: string
  metrics: {
    generationTime: number
    tokensUsed: number
    cacheStored: boolean
  }
}

export class ResponsePreloader {
  private supabase = createSupabaseServerClient()
  private orchestrator: EnhancedChatOrchestrator
  private activeJobs = new Map<string, Promise<PreloadingResult>>()

  constructor() {
    this.orchestrator = new EnhancedChatOrchestrator()
  }

  /**
   * Pre-generate response for a predicted question
   */
  async preloadResponse(
    prediction: PredictedQuestion, 
    context: PreloadingContext
  ): Promise<PreloadingResult> {
    const startTime = Date.now()
    const jobKey = `${prediction.id}_${context.userId}`

    // Prevent duplicate jobs for the same prediction
    if (this.activeJobs.has(jobKey)) {
      console.log(`🚀 PRELOADER: Job already running for ${prediction.question}`)
      return await this.activeJobs.get(jobKey)!
    }

    const jobPromise = this.executePreloading(prediction, context, startTime)
    this.activeJobs.set(jobKey, jobPromise)

    try {
      const result = await jobPromise
      return result
    } finally {
      this.activeJobs.delete(jobKey)
    }
  }

  /**
   * Execute the actual pre-loading process
   */
  private async executePreloading(
    prediction: PredictedQuestion,
    context: PreloadingContext,
    startTime: number
  ): Promise<PreloadingResult> {
    try {
      console.log(`🚀 PRELOADER: Starting preload for: ${prediction.question}`)

      // Validate agent exists
      const agent = getAgent(prediction.agentId)
      if (!agent) {
        throw new Error(`Agent ${prediction.agentId} not found`)
      }

      // Create chat request for the predicted question
      const chatRequest: ChatRequest = {
        message: prediction.question,
        userId: context.userId,
        agentId: prediction.agentId,
        threadId: context.threadId,
        sessionId: context.sessionId,
        context: {
          ...prediction.context,
          ...context.storeContext,
          isPredictivePreload: true,
          originalPrediction: prediction
        }
      }

      // Generate response using the orchestrator
      const orchestratorResponse = await this.orchestrator.processMessage(chatRequest)

      // Create preloaded response object
      const preloadedResponse: PreloadedResponse = {
        questionId: prediction.id,
        response: orchestratorResponse.response,
        confidence: orchestratorResponse.confidence,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + this.calculateTTL(prediction)),
        agentId: prediction.agentId,
        context: prediction.context,
        metadata: {
          tokensUsed: this.estimateTokens(orchestratorResponse.response),
          generationTime: Date.now() - startTime,
          cacheHit: false
        }
      }

      // Store in cache with appropriate TTL
      const cacheKey = this.generateCacheKey(prediction.question, context)
      const ttl = this.calculateTTL(prediction)
      
      await cache.set(cacheKey, preloadedResponse, ttl, [
        'predictive',
        `user_${context.userId}`,
        `agent_${prediction.agentId}`,
        prediction.category
      ])

      // Store in database for analytics
      await this.storePreloadedResponse(preloadedResponse, context)

      console.log(`🚀 PRELOADER: Successfully preloaded response for: ${prediction.question} (${Date.now() - startTime}ms)`)

      return {
        success: true,
        response: preloadedResponse,
        metrics: {
          generationTime: Date.now() - startTime,
          tokensUsed: preloadedResponse.metadata.tokensUsed,
          cacheStored: true
        }
      }

    } catch (error) {
      console.error(`🚀 PRELOADER: Error preloading response for ${prediction.question}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          generationTime: Date.now() - startTime,
          tokensUsed: 0,
          cacheStored: false
        }
      }
    }
  }

  /**
   * Calculate TTL for cached response based on prediction characteristics
   */
  private calculateTTL(prediction: PredictedQuestion): number {
    // Base TTL: 30 minutes
    let ttl = 30 * 60 * 1000

    // Adjust based on priority
    switch (prediction.priority) {
      case 'high':
        ttl = 60 * 60 * 1000 // 1 hour
        break
      case 'medium':
        ttl = 45 * 60 * 1000 // 45 minutes
        break
      case 'low':
        ttl = 20 * 60 * 1000 // 20 minutes
        break
    }

    // Adjust based on probability
    if (prediction.probability > 0.8) {
      ttl *= 1.5 // Extend for high-probability predictions
    } else if (prediction.probability < 0.4) {
      ttl *= 0.7 // Reduce for low-probability predictions
    }

    // Adjust based on category
    const categoryMultipliers: Record<string, number> = {
      'product_management': 1.2,
      'inventory_management': 1.1,
      'store_optimization': 1.3,
      'customer_service': 0.9,
      'conversation_flow': 0.8,
      'user_pattern': 1.1
    }

    const multiplier = categoryMultipliers[prediction.category] || 1.0
    ttl *= multiplier

    return Math.round(ttl)
  }

  /**
   * Generate cache key for the prediction
   */
  private generateCacheKey(question: string, context: PreloadingContext): string {
    const questionHash = this.hashString(question)
    const contextHash = this.hashString(JSON.stringify({
      userId: context.userId,
      agentId: context.agentId,
      storeId: context.storeContext?.storeId
    }))
    
    return `preload_${questionHash}_${contextHash}`
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Estimate token count for a response (simple approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  /**
   * Store preloaded response in database for analytics
   */
  private async storePreloadedResponse(
    response: PreloadedResponse, 
    context: PreloadingContext
  ): Promise<void> {
    try {
      await this.supabase.from('preloaded_responses').insert({
        question_id: response.questionId,
        user_id: context.userId,
        agent_id: response.agentId,
        response_text: response.response,
        confidence: response.confidence,
        generated_at: response.generatedAt.toISOString(),
        expires_at: response.expiresAt.toISOString(),
        context: response.context,
        metadata: response.metadata
      })
    } catch (error) {
      console.error('🚀 PRELOADER: Error storing preloaded response:', error)
      // Don't throw - this is just for analytics
    }
  }

  /**
   * Batch preload multiple predictions
   */
  async batchPreload(
    predictions: PredictedQuestion[],
    context: PreloadingContext
  ): Promise<PreloadingResult[]> {
    console.log(`🚀 PRELOADER: Starting batch preload for ${predictions.length} predictions`)

    // Process high-priority predictions first
    const highPriority = predictions.filter(p => p.priority === 'high')
    const mediumPriority = predictions.filter(p => p.priority === 'medium')
    const lowPriority = predictions.filter(p => p.priority === 'low')

    const results: PreloadingResult[] = []

    // Process high priority immediately
    for (const prediction of highPriority) {
      const result = await this.preloadResponse(prediction, context)
      results.push(result)
    }

    // Process medium priority with small delays
    for (const prediction of mediumPriority) {
      setTimeout(async () => {
        const result = await this.preloadResponse(prediction, context)
        results.push(result)
      }, 2000) // 2 second delay
    }

    // Process low priority with larger delays
    for (const prediction of lowPriority) {
      setTimeout(async () => {
        const result = await this.preloadResponse(prediction, context)
        results.push(result)
      }, 5000) // 5 second delay
    }

    return results
  }

  /**
   * Check if a response is already being preloaded
   */
  isPreloading(predictionId: string, userId: string): boolean {
    const jobKey = `${predictionId}_${userId}`
    return this.activeJobs.has(jobKey)
  }

  /**
   * Get statistics about preloading performance
   */
  async getPreloadingStats(userId: string, timeRange: number = 24): Promise<any> {
    const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000))

    try {
      const { data, error } = await this.supabase
        .from('preloaded_responses')
        .select('*')
        .eq('user_id', userId)
        .gte('generated_at', since.toISOString())

      if (error) throw error

      const stats = {
        totalPreloaded: data.length,
        averageConfidence: data.reduce((sum, r) => sum + r.confidence, 0) / data.length,
        averageGenerationTime: data.reduce((sum, r) => sum + r.metadata.generationTime, 0) / data.length,
        totalTokensUsed: data.reduce((sum, r) => sum + r.metadata.tokensUsed, 0),
        byAgent: data.reduce((acc, r) => {
          acc[r.agent_id] = (acc[r.agent_id] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        byCategory: data.reduce((acc, r) => {
          const category = r.context?.category || 'unknown'
          acc[category] = (acc[category] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      return stats
    } catch (error) {
      console.error('🚀 PRELOADER: Error getting stats:', error)
      return null
    }
  }

  /**
   * Invalidate preloaded responses for a user/context
   */
  async invalidatePreloadedResponses(
    userId: string, 
    filters?: { agentId?: string; category?: string }
  ): Promise<void> {
    const tags = [`user_${userId}`]
    
    if (filters?.agentId) {
      tags.push(`agent_${filters.agentId}`)
    }
    
    if (filters?.category) {
      tags.push(filters.category)
    }

    await cache.invalidateByTags(tags)
    console.log(`🚀 PRELOADER: Invalidated preloaded responses for user ${userId}`)
  }
}

// Export singleton instance
export const responsePreloader = new ResponsePreloader()
