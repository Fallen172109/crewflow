// AI Response Cache Configuration
// Centralized configuration for AI response caching behavior

export interface CacheSettings {
  enabled: boolean
  defaultTTL: number
  queryTypeTTL: {
    general: number
    personalized: number
    time_sensitive: number
    knowledge: number
  }
  agentSpecificTTL: {
    [agentId: string]: number
  }
  frameworkSpecificTTL: {
    langchain: number
    perplexity: number
    autogen: number
    openai: number
  }
}

// Cache TTL values in milliseconds
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const AI_CACHE_CONFIG: CacheSettings = {
  enabled: process.env.AI_CACHE_ENABLED !== 'false', // Default to enabled
  defaultTTL: 1 * HOUR, // 1 hour default

  // Query type specific TTL
  queryTypeTTL: {
    general: 2 * HOUR,        // General queries can be cached longer
    personalized: 30 * MINUTE, // User-specific responses expire faster
    time_sensitive: 15 * MINUTE, // Time-sensitive data expires quickly
    knowledge: 6 * HOUR       // Knowledge-based queries can be cached longest
  },

  // Agent-specific TTL overrides
  agentSpecificTTL: {
    // Shopify-related agents need shorter cache due to dynamic store data
    'shopify-ai': 15 * MINUTE,
    'ai-store-manager': 15 * MINUTE,
    
    // Research agents can cache longer for knowledge queries
    'pearl': 1 * HOUR,
    'anchor': 45 * MINUTE,
    
    // Customer support needs fresh responses
    'coral': 30 * MINUTE,
    
    // Creative agents can cache longer
    'splash': 2 * HOUR,
    'drake': 1 * HOUR,
    
    // Planning agents can cache longer
    'helm': 1 * HOUR,
    'ledger': 1 * HOUR,
    'patch': 1 * HOUR,
    
    // Multi-agent workflows can cache longer due to complexity
    'flint': 2 * HOUR,
    'beacon': 2 * HOUR
  },

  // Framework-specific TTL
  frameworkSpecificTTL: {
    langchain: 1 * HOUR,
    perplexity: 30 * MINUTE,  // Shorter due to real-time web data
    autogen: 2 * HOUR,        // Longer due to complex multi-agent workflows
    openai: 1 * HOUR
  }
}

/**
 * Get the appropriate TTL for a specific cache scenario
 */
export function getCacheTTL(params: {
  agentId?: string
  framework?: string
  queryType?: 'general' | 'personalized' | 'time_sensitive' | 'knowledge'
  customTTL?: number
}): number {
  const { agentId, framework, queryType, customTTL } = params

  // Custom TTL takes precedence
  if (customTTL) {
    return customTTL
  }

  // Agent-specific TTL
  if (agentId && AI_CACHE_CONFIG.agentSpecificTTL[agentId]) {
    return AI_CACHE_CONFIG.agentSpecificTTL[agentId]
  }

  // Query type TTL
  if (queryType && AI_CACHE_CONFIG.queryTypeTTL[queryType]) {
    return AI_CACHE_CONFIG.queryTypeTTL[queryType]
  }

  // Framework-specific TTL
  if (framework && AI_CACHE_CONFIG.frameworkSpecificTTL[framework as keyof typeof AI_CACHE_CONFIG.frameworkSpecificTTL]) {
    return AI_CACHE_CONFIG.frameworkSpecificTTL[framework as keyof typeof AI_CACHE_CONFIG.frameworkSpecificTTL]
  }

  // Default TTL
  return AI_CACHE_CONFIG.defaultTTL
}

/**
 * Check if caching is enabled for a specific scenario
 */
export function isCacheEnabled(params: {
  agentId?: string
  framework?: string
  queryType?: string
}): boolean {
  // Global cache setting
  if (!AI_CACHE_CONFIG.enabled) {
    return false
  }

  // Add any specific disable conditions here
  // For example, disable caching for certain agents or query types
  
  return true
}

/**
 * Get cache tags for a specific scenario
 */
export function getCacheTags(params: {
  agentId?: string
  framework?: string
  userId?: string
  queryType?: string
}): string[] {
  const { agentId, framework, userId, queryType } = params
  const tags: string[] = ['ai_response']

  if (agentId) tags.push(`agent:${agentId}`)
  if (framework) tags.push(`framework:${framework}`)
  if (userId) tags.push(`user:${userId}`)
  if (queryType) tags.push(`type:${queryType}`)

  return tags
}

/**
 * Cache invalidation strategies
 */
export const CACHE_INVALIDATION = {
  // Invalidate all AI responses for a user
  invalidateUserCache: (userId: string) => [`user:${userId}`],
  
  // Invalidate all responses for an agent
  invalidateAgentCache: (agentId: string) => [`agent:${agentId}`],
  
  // Invalidate all responses for a framework
  invalidateFrameworkCache: (framework: string) => [`framework:${framework}`],
  
  // Invalidate by query type
  invalidateQueryTypeCache: (queryType: string) => [`type:${queryType}`],
  
  // Invalidate all AI responses
  invalidateAllAICache: () => ['ai_response']
}

/**
 * Performance monitoring for cache
 */
export interface CacheMetrics {
  hitRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  averageResponseTime: number
  costSavings: number // Estimated cost savings from cache hits
}

/**
 * Estimate cost savings from cache hits
 */
export function estimateCostSavings(metrics: {
  cacheHits: number
  averageTokensPerRequest: number
  modelCostPer1kTokens: number
}): number {
  const { cacheHits, averageTokensPerRequest, modelCostPer1kTokens } = metrics
  const totalTokensSaved = cacheHits * averageTokensPerRequest
  const costSavings = (totalTokensSaved / 1000) * modelCostPer1kTokens
  return Math.round(costSavings * 100) / 100 // Round to 2 decimal places
}

export default AI_CACHE_CONFIG
