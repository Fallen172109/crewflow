// Predictive Response Checker 🎯
// Checks for and serves preloaded responses when available

import { predictiveResponseSystem, PreloadedResponse } from './predictive-response-system'
import { UnifiedChatRequest, UnifiedChatResponse } from '@/lib/chat/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface PreloadedResponseMatch {
  response: PreloadedResponse
  similarity: number
  confidence: number
  shouldUse: boolean
  metadata: {
    matchType: 'exact' | 'similar' | 'contextual'
    processingTime: number
    cacheAge: number
  }
}

export class PredictiveResponseChecker {
  private supabase = createSupabaseServerClient()
  private similarityThreshold = 0.75
  private confidenceThreshold = 0.6

  /**
   * Check if there's a preloaded response for the incoming request
   */
  async checkForPreloadedResponse(
    request: UnifiedChatRequest,
    user: any
  ): Promise<PreloadedResponseMatch | null> {
    const startTime = Date.now()

    try {
      console.log('🎯 PREDICTIVE CHECKER: Checking for preloaded response')

      // First, try exact match
      const exactMatch = await this.findExactMatch(request, user)
      if (exactMatch) {
        return this.createMatch(exactMatch, 1.0, 'exact', startTime)
      }

      // Then try similar questions
      const similarMatch = await this.findSimilarMatch(request, user)
      if (similarMatch) {
        const similarity = this.calculateQuestionSimilarity(
          request.message,
          similarMatch.questionId
        )
        
        if (similarity >= this.similarityThreshold) {
          return this.createMatch(similarMatch, similarity, 'similar', startTime)
        }
      }

      // Finally, try contextual matches
      const contextualMatch = await this.findContextualMatch(request, user)
      if (contextualMatch) {
        return this.createMatch(contextualMatch, 0.8, 'contextual', startTime)
      }

      console.log('🎯 PREDICTIVE CHECKER: No preloaded response found')
      return null

    } catch (error) {
      console.error('🎯 PREDICTIVE CHECKER: Error checking preloaded responses:', error)
      return null
    }
  }

  /**
   * Convert a preloaded response to a unified chat response
   */
  convertToUnifiedResponse(
    match: PreloadedResponseMatch,
    request: UnifiedChatRequest
  ): UnifiedChatResponse {
    const { response } = match.response

    return {
      response: this.enhancePreloadedResponse(response, match),
      success: true,
      threadId: request.threadId || `thread_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
      agent: {
        id: match.response.agentId,
        name: this.getAgentName(match.response.agentId),
        color: this.getAgentColor(match.response.agentId)
      },
      tokensUsed: match.response.metadata.tokensUsed,
      // Add metadata to indicate this was a preloaded response
      details: {
        preloaded: true,
        similarity: match.similarity,
        confidence: match.confidence,
        matchType: match.metadata.matchType,
        cacheAge: match.metadata.cacheAge,
        originalGenerationTime: match.response.metadata.generationTime
      }
    }
  }

  /**
   * Find exact match for the question
   */
  private async findExactMatch(
    request: UnifiedChatRequest,
    user: any
  ): Promise<PreloadedResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('preloaded_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', request.agentId || 'anchor')
        .gt('expires_at', new Date().toISOString())
        .ilike('response_text', `%${request.message.toLowerCase()}%`)
        .order('confidence', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return this.mapToPreloadedResponse(data)
    } catch (error) {
      console.error('🎯 PREDICTIVE CHECKER: Error finding exact match:', error)
      return null
    }
  }

  /**
   * Find similar questions using text similarity
   */
  private async findSimilarMatch(
    request: UnifiedChatRequest,
    user: any
  ): Promise<PreloadedResponse | null> {
    try {
      // Get recent preloaded responses for similarity comparison
      const { data, error } = await this.supabase
        .from('preloaded_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', request.agentId || 'anchor')
        .gt('expires_at', new Date().toISOString())
        .order('confidence', { ascending: false })
        .limit(10)

      if (error || !data || data.length === 0) return null

      // Find the most similar question
      let bestMatch: any = null
      let bestSimilarity = 0

      for (const response of data) {
        const similarity = this.calculateQuestionSimilarity(
          request.message,
          response.question_id
        )

        if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
          bestSimilarity = similarity
          bestMatch = response
        }
      }

      return bestMatch ? this.mapToPreloadedResponse(bestMatch) : null
    } catch (error) {
      console.error('🎯 PREDICTIVE CHECKER: Error finding similar match:', error)
      return null
    }
  }

  /**
   * Find contextual matches based on conversation context
   */
  private async findContextualMatch(
    request: UnifiedChatRequest,
    user: any
  ): Promise<PreloadedResponse | null> {
    try {
      // Look for responses with similar context
      const contextFilter = request.context ? JSON.stringify(request.context) : '{}'
      
      const { data, error } = await this.supabase
        .from('preloaded_responses')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('confidence', { ascending: false })
        .limit(5)

      if (error || !data || data.length === 0) return null

      // Find response with most similar context
      for (const response of data) {
        const contextSimilarity = this.calculateContextSimilarity(
          request.context || {},
          response.context || {}
        )

        if (contextSimilarity >= 0.7 && response.confidence >= this.confidenceThreshold) {
          return this.mapToPreloadedResponse(response)
        }
      }

      return null
    } catch (error) {
      console.error('🎯 PREDICTIVE CHECKER: Error finding contextual match:', error)
      return null
    }
  }

  /**
   * Calculate similarity between two questions
   */
  private calculateQuestionSimilarity(q1: string, q2: string): number {
    const words1 = this.tokenizeQuestion(q1)
    const words2 = this.tokenizeQuestion(q2)
    
    const commonWords = words1.filter(word => words2.includes(word))
    const totalWords = new Set([...words1, ...words2]).size
    
    if (totalWords === 0) return 0
    
    // Weight common words more heavily
    const similarity = (commonWords.length * 2) / (words1.length + words2.length)
    return Math.min(similarity, 1.0)
  }

  /**
   * Calculate similarity between two contexts
   */
  private calculateContextSimilarity(ctx1: any, ctx2: any): number {
    const keys1 = Object.keys(ctx1)
    const keys2 = Object.keys(ctx2)
    
    if (keys1.length === 0 && keys2.length === 0) return 1.0
    if (keys1.length === 0 || keys2.length === 0) return 0.0
    
    const commonKeys = keys1.filter(key => keys2.includes(key))
    const matchingValues = commonKeys.filter(key => ctx1[key] === ctx2[key])
    
    return matchingValues.length / Math.max(keys1.length, keys2.length)
  }

  /**
   * Tokenize question for similarity comparison
   */
  private tokenizeQuestion(question: string): string[] {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word))
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'can', 'could', 'should',
      'would', 'will', 'shall', 'may', 'might', 'must', 'how', 'what', 'when',
      'where', 'why', 'who', 'which', 'this', 'that', 'these', 'those'
    ]
    return stopWords.includes(word)
  }

  /**
   * Create a match object
   */
  private createMatch(
    response: PreloadedResponse,
    similarity: number,
    matchType: 'exact' | 'similar' | 'contextual',
    startTime: number
  ): PreloadedResponseMatch {
    const cacheAge = Date.now() - response.generatedAt.getTime()
    
    return {
      response,
      similarity,
      confidence: response.confidence,
      shouldUse: response.confidence >= this.confidenceThreshold,
      metadata: {
        matchType,
        processingTime: Date.now() - startTime,
        cacheAge
      }
    }
  }

  /**
   * Map database record to PreloadedResponse
   */
  private mapToPreloadedResponse(data: any): PreloadedResponse {
    return {
      questionId: data.question_id,
      response: data.response_text,
      confidence: data.confidence,
      generatedAt: new Date(data.generated_at),
      expiresAt: new Date(data.expires_at),
      agentId: data.agent_id,
      context: data.context || {},
      metadata: data.metadata || {
        tokensUsed: 0,
        generationTime: 0,
        cacheHit: true
      }
    }
  }

  /**
   * Enhance preloaded response with current context
   */
  private enhancePreloadedResponse(
    response: string,
    match: PreloadedResponseMatch
  ): string {
    // Add a subtle indicator that this was a fast response
    const indicator = match.metadata.matchType === 'exact' 
      ? '⚡ ' 
      : match.metadata.matchType === 'similar' 
      ? '🔮 ' 
      : '🎯 '

    // Don't modify the response content, just add metadata in development
    if (process.env.NODE_ENV === 'development') {
      return `${indicator}${response}\n\n*[Served from predictive cache - ${match.metadata.matchType} match]*`
    }

    return response
  }

  /**
   * Get agent name by ID
   */
  private getAgentName(agentId: string): string {
    const agentNames: Record<string, string> = {
      'anchor': 'Anchor',
      'sage': 'Sage',
      'helm': 'Helm',
      'ledger': 'Ledger',
      'patch': 'Patch',
      'pearl': 'Pearl',
      'flint': 'Flint',
      'beacon': 'Beacon',
      'splash': 'Splash',
      'drake': 'Drake'
    }
    return agentNames[agentId] || 'AI Assistant'
  }

  /**
   * Get agent color by ID
   */
  private getAgentColor(agentId: string): string {
    const agentColors: Record<string, string> = {
      'anchor': '#FF6A3D',
      'sage': '#4A90E2',
      'helm': '#7ED321',
      'ledger': '#F5A623',
      'patch': '#D0021B',
      'pearl': '#9013FE',
      'flint': '#FF5722',
      'beacon': '#00BCD4',
      'splash': '#E91E63',
      'drake': '#795548'
    }
    return agentColors[agentId] || '#FF6A3D'
  }

  /**
   * Update similarity and confidence thresholds
   */
  updateThresholds(similarity: number, confidence: number): void {
    this.similarityThreshold = Math.max(0.1, Math.min(1.0, similarity))
    this.confidenceThreshold = Math.max(0.1, Math.min(1.0, confidence))
    
    console.log(`🎯 PREDICTIVE CHECKER: Updated thresholds - similarity: ${this.similarityThreshold}, confidence: ${this.confidenceThreshold}`)
  }
}

// Export singleton instance
export const predictiveResponseChecker = new PredictiveResponseChecker()
