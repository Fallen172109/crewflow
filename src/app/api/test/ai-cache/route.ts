// AI Cache Testing Endpoint
// Test and validate the AI response caching system

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { aiCacheManager, withAICache } from '@/lib/ai/response-cache'
import { getAgent } from '@/lib/agents'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { action, message, agentId, testType } = await request.json()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    switch (action) {
      case 'test_cache_performance':
        return await testCachePerformance(message, agentId)
      
      case 'cache_stats':
        return NextResponse.json({
          success: true,
          stats: aiCacheManager.getCacheStats(),
          message: 'Cache statistics retrieved'
        })
      
      case 'test_cache_hit':
        return await testCacheHit(message, agentId)
      
      case 'clear_cache':
        await aiCacheManager.invalidateByTags(['ai_response'])
        return NextResponse.json({
          success: true,
          message: 'AI cache cleared'
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          availableActions: ['test_cache_performance', 'cache_stats', 'test_cache_hit', 'clear_cache']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('AI Cache test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testCachePerformance(message: string, agentId: string) {
  const agent = getAgent(agentId)
  if (!agent) {
    return NextResponse.json({
      success: false,
      error: `Agent ${agentId} not found`
    }, { status: 404 })
  }

  const testMessage = message || "What are the best practices for e-commerce automation?"
  const systemPrompt = `You are ${agent.name}, a ${agent.title} specialist.`

  // Test 1: First call (should be cache miss)
  const startTime1 = Date.now()
  const response1 = await withAICache(
    {
      message: testMessage,
      agent: agent,
      systemPrompt: systemPrompt,
      modelConfig: {
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 500
      },
      userContext: {
        userId: 'test-user',
        testMode: true
      }
    },
    async () => {
      // Simulate AI call with a mock response for testing
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API latency
      return {
        response: `Mock response from ${agent.name}: This is a test response about e-commerce automation best practices.`,
        tokensUsed: 150,
        latency: 1000,
        model: 'gpt-4-turbo-preview',
        success: true,
        framework: agent.framework
      }
    },
    {
      queryType: 'general'
    }
  )
  const latency1 = Date.now() - startTime1

  // Test 2: Second call (should be cache hit)
  const startTime2 = Date.now()
  const response2 = await withAICache(
    {
      message: testMessage,
      agent: agent,
      systemPrompt: systemPrompt,
      modelConfig: {
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 500
      },
      userContext: {
        userId: 'test-user',
        testMode: true
      }
    },
    async () => {
      // This should not be called due to cache hit
      await new Promise(resolve => setTimeout(resolve, 1000))
      return {
        response: "This should not be returned due to cache hit",
        tokensUsed: 150,
        latency: 1000,
        model: 'gpt-4-turbo-preview',
        success: true,
        framework: agent.framework
      }
    },
    {
      queryType: 'general'
    }
  )
  const latency2 = Date.now() - startTime2

  const stats = aiCacheManager.getCacheStats()

  return NextResponse.json({
    success: true,
    message: 'Cache performance test completed',
    results: {
      firstCall: {
        latency: latency1,
        cached: response1.cachedAt ? true : false,
        response: response1.response.substring(0, 100) + '...'
      },
      secondCall: {
        latency: latency2,
        cached: response2.cachedAt ? true : false,
        response: response2.response.substring(0, 100) + '...',
        speedImprovement: latency1 > 0 ? Math.round(((latency1 - latency2) / latency1) * 100) : 0
      },
      cacheStats: stats,
      performanceGain: {
        latencyReduction: latency1 - latency2,
        percentageImprovement: latency1 > 0 ? Math.round(((latency1 - latency2) / latency1) * 100) : 0
      }
    }
  })
}

async function testCacheHit(message: string, agentId: string) {
  const agent = getAgent(agentId)
  if (!agent) {
    return NextResponse.json({
      success: false,
      error: `Agent ${agentId} not found`
    }, { status: 404 })
  }

  const testMessage = message || "How do I optimize my Shopify store?"
  const systemPrompt = `You are ${agent.name}, a ${agent.title} specialist.`

  // Generate cache key to check if it exists
  const cacheKey = aiCacheManager.generateCacheKey({
    message: testMessage,
    agent: agent,
    systemPrompt: systemPrompt,
    modelConfig: {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 500
    },
    userContext: {
      userId: 'test-user'
    }
  })

  // Check if cached response exists
  const cachedResponse = await aiCacheManager.getCachedResponse(cacheKey)

  return NextResponse.json({
    success: true,
    message: 'Cache hit test completed',
    results: {
      cacheKey: cacheKey.substring(0, 50) + '...',
      cacheHit: cachedResponse ? true : false,
      cachedResponse: cachedResponse ? {
        responseLength: cachedResponse.response.length,
        tokensUsed: cachedResponse.tokensUsed,
        hitCount: cachedResponse.hitCount,
        age: Date.now() - cachedResponse.cachedAt,
        preview: cachedResponse.response.substring(0, 100) + '...'
      } : null,
      stats: aiCacheManager.getCacheStats()
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const stats = aiCacheManager.getCacheStats()

    return NextResponse.json({
      success: true,
      message: 'AI Cache Test Endpoint',
      cacheStats: stats,
      endpoints: {
        'POST /api/test/ai-cache': {
          actions: {
            test_cache_performance: 'Test cache performance with two identical requests',
            cache_stats: 'Get current cache statistics',
            test_cache_hit: 'Test if a specific query would hit cache',
            clear_cache: 'Clear all AI response cache'
          },
          parameters: {
            action: 'Required action to perform',
            message: 'Optional test message (defaults provided)',
            agentId: 'Agent ID to test with (e.g., "anchor", "pearl")',
            testType: 'Optional test type specification'
          }
        }
      },
      availableAgents: ['anchor', 'pearl', 'helm', 'ledger', 'patch', 'splash', 'drake', 'flint', 'beacon', 'coral']
    })

  } catch (error) {
    console.error('AI Cache test GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
