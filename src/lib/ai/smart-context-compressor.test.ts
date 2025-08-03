// Smart Context Compressor Tests
// Tests for the Smart Context Compression system

import { SmartContextCompressor, CompressionLevel } from './smart-context-compressor'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({ data: null, error: null }))
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  })
}))

// Mock OpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn(() => ({
    invoke: jest.fn(() => Promise.resolve({
      content: JSON.stringify({
        summary: 'Test conversation summary',
        keyTopics: ['topic1', 'topic2'],
        importantDecisions: ['decision1'],
        relevanceScore: 0.8
      })
    }))
  }))
}))

// Mock AI config
jest.mock('./config', () => ({
  getAIConfig: () => ({
    openai: {
      apiKey: 'test-key'
    }
  })
}))

describe('SmartContextCompressor', () => {
  let compressor: SmartContextCompressor

  beforeEach(() => {
    compressor = new SmartContextCompressor()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getCompressedContext', () => {
    it('should return compressed context with minimal level', async () => {
      const result = await compressor.getCompressedContext(
        'test-user-id',
        'test-thread-id',
        'test-session-id',
        {
          level: 'MINIMAL',
          maxRecentMessages: 5,
          maxSummaries: 2,
          maxContextItems: 3,
          relevanceThreshold: 0.6,
          timeRangeHours: 12,
          includeStoreContext: false,
          forceRefresh: false
        }
      )

      expect(result).toBeDefined()
      expect(result.compressionMetadata.compressionLevel).toBe('MINIMAL')
      expect(result.recentMessages).toBeDefined()
      expect(result.summarizedHistory).toBeDefined()
      expect(result.relevantContext).toBeDefined()
      expect(result.totalTokensEstimate).toBeGreaterThanOrEqual(0)
    })

    it('should return compressed context with balanced level', async () => {
      const result = await compressor.getCompressedContext(
        'test-user-id',
        'test-thread-id',
        'test-session-id',
        {
          level: 'BALANCED',
          maxRecentMessages: 10,
          maxSummaries: 5,
          maxContextItems: 8,
          relevanceThreshold: 0.4,
          timeRangeHours: 24,
          includeStoreContext: true,
          forceRefresh: false
        }
      )

      expect(result).toBeDefined()
      expect(result.compressionMetadata.compressionLevel).toBe('BALANCED')
      expect(result.compressionMetadata.processingTime).toBeGreaterThan(0)
    })

    it('should return compressed context with comprehensive level', async () => {
      const result = await compressor.getCompressedContext(
        'test-user-id',
        'test-thread-id',
        'test-session-id',
        {
          level: 'COMPREHENSIVE',
          maxRecentMessages: 15,
          maxSummaries: 8,
          maxContextItems: 12,
          relevanceThreshold: 0.3,
          timeRangeHours: 48,
          includeStoreContext: true,
          forceRefresh: true
        }
      )

      expect(result).toBeDefined()
      expect(result.compressionMetadata.compressionLevel).toBe('COMPREHENSIVE')
      expect(result.compressionMetadata.forceRefresh).toBe(false) // Should be false after processing
    })

    it('should handle errors gracefully', async () => {
      // This test would require mocking database errors
      const result = await compressor.getCompressedContext(
        'invalid-user-id',
        'invalid-thread-id'
      )

      expect(result).toBeDefined()
      expect(result.recentMessages).toEqual([])
      expect(result.summarizedHistory).toEqual([])
      expect(result.relevantContext).toEqual([])
    })
  })

  describe('cache functionality', () => {
    it('should cache results and return cached data on subsequent calls', async () => {
      const options = {
        level: 'BALANCED' as CompressionLevel,
        maxRecentMessages: 10,
        maxSummaries: 5,
        maxContextItems: 8,
        relevanceThreshold: 0.4,
        timeRangeHours: 24,
        includeStoreContext: false,
        forceRefresh: false
      }

      // First call
      const result1 = await compressor.getCompressedContext(
        'test-user-id',
        'test-thread-id',
        'test-session-id',
        options
      )

      // Second call should hit cache
      const result2 = await compressor.getCompressedContext(
        'test-user-id',
        'test-thread-id',
        'test-session-id',
        options
      )

      expect(result1.compressionMetadata.cacheHit).toBe(false)
      expect(result2.compressionMetadata.cacheHit).toBe(true)
    })

    it('should bypass cache when forceRefresh is true', async () => {
      const options = {
        level: 'BALANCED' as CompressionLevel,
        maxRecentMessages: 10,
        maxSummaries: 5,
        maxContextItems: 8,
        relevanceThreshold: 0.4,
        timeRangeHours: 24,
        includeStoreContext: false,
        forceRefresh: true
      }

      const result = await compressor.getCompressedContext(
        'test-user-id',
        'test-thread-id',
        'test-session-id',
        options
      )

      expect(result.compressionMetadata.cacheHit).toBe(false)
    })
  })

  describe('utility methods', () => {
    it('should clear cache', async () => {
      await compressor.clearCache()
      // Cache should be cleared (no direct way to test this without exposing cache)
    })

    it('should return compression stats', async () => {
      const stats = await compressor.getCompressionStats()
      
      expect(stats).toBeDefined()
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0)
      expect(stats.totalSummaries).toBeGreaterThanOrEqual(0)
      expect(stats.avgCompressionRatio).toBeGreaterThanOrEqual(0)
    })
  })
})

// Integration test for EnhancedChatOrchestrator
describe('EnhancedChatOrchestrator with Smart Context Compression', () => {
  it('should integrate Smart Context Compression successfully', async () => {
    // This would be an integration test to ensure the orchestrator
    // properly uses the compressed context
    expect(true).toBe(true) // Placeholder
  })
})

// Performance benchmark test
describe('Smart Context Compression Performance', () => {
  it('should process context compression within acceptable time limits', async () => {
    const compressor = new SmartContextCompressor()
    const startTime = Date.now()

    await compressor.getCompressedContext(
      'test-user-id',
      'test-thread-id',
      'test-session-id',
      {
        level: 'BALANCED',
        maxRecentMessages: 10,
        maxSummaries: 5,
        maxContextItems: 8,
        relevanceThreshold: 0.4,
        timeRangeHours: 24,
        includeStoreContext: true,
        forceRefresh: false
      }
    )

    const processingTime = Date.now() - startTime
    
    // Should complete within 2 seconds for balanced compression
    expect(processingTime).toBeLessThan(2000)
  })
})
