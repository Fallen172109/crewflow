// AI Response Caching System
// Provides intelligent caching for AI model responses to reduce costs and improve performance

import crypto from 'crypto'
import { cache } from '@/lib/performance/optimization-system'
import { getCacheTTL, isCacheEnabled, getCacheTags, AI_CACHE_CONFIG } from './cache-config'

// Minimal Agent interface for caching purposes
export interface Agent {
  id: string
  name?: string
  framework?: string
}

export interface AICacheConfig {
  // Cache TTL settings (in milliseconds)
  defaultTTL: number
  shortTermTTL: number    // For time-sensitive queries
  longTermTTL: number     // For stable knowledge queries
  personalizedTTL: number // For user-specific responses
  
  // Cache behavior
  enableCaching: boolean
  enablePersonalization: boolean
  maxCacheSize: number
  
  // Cache invalidation
  invalidateOnPromptChange: boolean
  invalidateOnModelChange: boolean
}

export interface AICacheKey {
  messageHash: string
  agentId: string
  modelConfig: string
  userContext?: string
  systemPromptHash: string
  timestamp?: number
}

export interface CachedAIResponse {
  response: string
  tokensUsed: number
  latency: number
  model: string
  framework: string
  success: boolean
  metadata?: any
  cachedAt: number
  hitCount: number
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: AICacheConfig = {
  defaultTTL: 60 * 60 * 1000,      // 1 hour
  shortTermTTL: 15 * 60 * 1000,    // 15 minutes
  longTermTTL: 24 * 60 * 60 * 1000, // 24 hours
  personalizedTTL: 30 * 60 * 1000,  // 30 minutes
  enableCaching: true,
  enablePersonalization: true,
  maxCacheSize: 10000,
  invalidateOnPromptChange: true,
  invalidateOnModelChange: true
}

class AICacheManager {
  private config: AICacheConfig
  private cacheStats = {
    hits: 0,
    misses: 0,
    saves: 0,
    errors: 0
  }

  constructor(config: Partial<AICacheConfig> = {}) {
    this.config = {
      ...DEFAULT_CACHE_CONFIG,
      ...config,
      enableCaching: AI_CACHE_CONFIG.enabled
    }
  }

  /**
   * Generate a consistent cache key for AI requests
   */
  generateCacheKey(params: {
    message: string
    agent: Agent
    systemPrompt: string
    modelConfig: {
      model?: string
      temperature?: number
      maxTokens?: number
      [key: string]: any
    }
    userContext?: {
      userId?: string
      preferences?: any
      [key: string]: any
    }
  }): string {
    const { message, agent, systemPrompt, modelConfig, userContext } = params

    // Create hash of message content
    const messageHash = this.createHash(message.trim().toLowerCase())
    
    // Create hash of system prompt
    const systemPromptHash = this.createHash(systemPrompt)
    
    // Create hash of model configuration
    const modelConfigStr = JSON.stringify({
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      // Include other relevant config parameters
      ...Object.fromEntries(
        Object.entries(modelConfig).filter(([key]) => 
          !['model', 'temperature', 'maxTokens'].includes(key)
        )
      )
    })
    const modelConfigHash = this.createHash(modelConfigStr)

    // Create user context hash (if personalization is enabled)
    let userContextHash = ''
    if (this.config.enablePersonalization && userContext) {
      const contextStr = JSON.stringify({
        userId: userContext.userId,
        preferences: userContext.preferences
      })
      userContextHash = this.createHash(contextStr)
    }

    // Combine all components into cache key
    const keyComponents = [
      'ai_response',
      agent.id,
      messageHash,
      systemPromptHash,
      modelConfigHash,
      userContextHash
    ].filter(Boolean)

    return keyComponents.join(':')
  }

  /**
   * Get cached AI response if available
   */
  async getCachedResponse(cacheKey: string): Promise<CachedAIResponse | null> {
    if (!this.config.enableCaching) {
      return null
    }

    try {
      const cached = await cache.get<CachedAIResponse>(cacheKey)
      
      if (cached) {
        this.cacheStats.hits++
        
        // Update hit count
        cached.hitCount = (cached.hitCount || 0) + 1
        await cache.set(cacheKey, cached, undefined, ['ai_response'])
        
        console.log('🎯 AI CACHE HIT:', {
          key: cacheKey.substring(0, 50) + '...',
          hitCount: cached.hitCount,
          age: Date.now() - cached.cachedAt
        })
        
        return cached
      }
      
      this.cacheStats.misses++
      return null
    } catch (error) {
      this.cacheStats.errors++
      console.error('AI Cache get error:', error)
      return null
    }
  }

  /**
   * Cache an AI response
   */
  async cacheResponse(
    cacheKey: string,
    response: any,
    options: {
      ttl?: number
      tags?: string[]
      queryType?: 'general' | 'personalized' | 'time_sensitive' | 'knowledge'
      agentId?: string
      framework?: string
      userId?: string
    } = {}
  ): Promise<void> {
    if (!this.config.enableCaching) {
      return
    }

    try {
      // Use configuration-based TTL
      const ttl = getCacheTTL({
        agentId: options.agentId,
        framework: options.framework,
        queryType: options.queryType,
        customTTL: options.ttl
      })

      const cachedResponse: CachedAIResponse = {
        ...response,
        cachedAt: Date.now(),
        hitCount: 0
      }

      // Use configuration-based tags
      const tags = getCacheTags({
        agentId: options.agentId,
        framework: options.framework,
        userId: options.userId,
        queryType: options.queryType
      })

      await cache.set(cacheKey, cachedResponse, ttl, [...tags, ...(options.tags || [])])
      this.cacheStats.saves++

      console.log('💾 AI CACHE SAVE:', {
        key: cacheKey.substring(0, 50) + '...',
        ttl: Math.round(ttl / 1000 / 60), // minutes
        queryType: options.queryType || 'general',
        agentId: options.agentId,
        framework: options.framework
      })
    } catch (error) {
      this.cacheStats.errors++
      console.error('AI Cache save error:', error)
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      await cache.invalidateByTags(tags)
      console.log('🗑️ AI CACHE INVALIDATED:', { tags })
    } catch (error) {
      console.error('AI Cache invalidation error:', error)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses
    const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0
    
    return {
      ...this.cacheStats,
      hitRate: Math.round(hitRate * 100) / 100,
      total
    }
  }

  /**
   * Create SHA-256 hash of input string
   */
  private createHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16)
  }

  /**
   * Determine query type for appropriate caching strategy
   */
  determineQueryType(message: string, agent: Agent): 'general' | 'personalized' | 'time_sensitive' | 'knowledge' {
    const lowerMessage = message.toLowerCase()
    
    // Time-sensitive queries
    if (lowerMessage.includes('today') || 
        lowerMessage.includes('now') || 
        lowerMessage.includes('current') ||
        lowerMessage.includes('latest')) {
      return 'time_sensitive'
    }
    
    // Personalized queries
    if (lowerMessage.includes('my ') || 
        lowerMessage.includes('i ') ||
        lowerMessage.includes('me ') ||
        agent.id === 'shopify-ai') {
      return 'personalized'
    }
    
    // Knowledge-based queries
    if (lowerMessage.includes('what is') ||
        lowerMessage.includes('how to') ||
        lowerMessage.includes('explain') ||
        lowerMessage.includes('define')) {
      return 'knowledge'
    }
    
    return 'general'
  }
}

// Global cache manager instance
export const aiCacheManager = new AICacheManager()

/**
 * Wrapper function to cache AI API calls
 */
export async function withAICache<T>(
  params: {
    message: string
    agent: Agent
    systemPrompt: string
    modelConfig: any
    userContext?: any
  },
  fetcher: () => Promise<T>,
  options: {
    queryType?: 'general' | 'personalized' | 'time_sensitive' | 'knowledge'
    tags?: string[]
  } = {}
): Promise<T> {
  // Check if caching is enabled for this scenario
  if (!isCacheEnabled({
    agentId: params.agent.id,
    framework: params.agent.framework,
    queryType: options.queryType
  })) {
    console.log('🚫 AI CACHE DISABLED for', params.agent.id)
    return await fetcher()
  }

  // Generate cache key
  const cacheKey = aiCacheManager.generateCacheKey(params)

  // Try to get cached response
  const cached = await aiCacheManager.getCachedResponse(cacheKey)
  if (cached) {
    return cached as T
  }

  // Execute the AI call
  const result = await fetcher()

  // Determine query type if not provided
  const queryType = options.queryType ||
    aiCacheManager.determineQueryType(params.message, params.agent)

  // Cache the result with enhanced options
  await aiCacheManager.cacheResponse(cacheKey, result, {
    queryType,
    agentId: params.agent.id,
    framework: params.agent.framework,
    userId: params.userContext?.userId,
    tags: options.tags
  })

  return result
}

export { AICacheManager }
