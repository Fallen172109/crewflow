'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Zap, TrendingUp, Clock, DollarSign } from 'lucide-react'

interface CacheStats {
  hits: number
  misses: number
  saves: number
  errors: number
  hitRate: number
  total: number
}

interface CacheTestResult {
  firstCall: {
    latency: number
    cached: boolean
    response: string
  }
  secondCall: {
    latency: number
    cached: boolean
    response: string
    speedImprovement: number
  }
  cacheStats: CacheStats
  performanceGain: {
    latencyReduction: number
    percentageImprovement: number
  }
}

export default function AICacheMonitor() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [testResult, setTestResult] = useState<CacheTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/ai-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cache_stats' })
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const runPerformanceTest = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/test/ai-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test_cache_performance',
          agentId: 'anchor',
          message: 'What are the best practices for e-commerce automation?'
        })
      })
      const data = await response.json()
      if (data.success) {
        setTestResult(data.results)
        setStats(data.results.cacheStats)
      }
    } catch (error) {
      console.error('Failed to run performance test:', error)
    } finally {
      setTesting(false)
    }
  }

  const clearCache = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/ai-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_cache' })
      })
      const data = await response.json()
      if (data.success) {
        await fetchStats() // Refresh stats after clearing
      }
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const estimateCostSavings = (hits: number) => {
    // Rough estimate: $0.03 per 1K tokens for GPT-4, average 200 tokens per request
    const avgTokensPerRequest = 200
    const costPer1kTokens = 0.03
    const totalTokensSaved = hits * avgTokensPerRequest
    const savings = (totalTokensSaved / 1000) * costPer1kTokens
    return savings.toFixed(2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Response Cache Monitor</h2>
        <div className="flex gap-2">
          <Button 
            onClick={fetchStats} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={runPerformanceTest} 
            disabled={testing}
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            {testing ? 'Testing...' : 'Run Test'}
          </Button>
          <Button 
            onClick={clearCache} 
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Cache Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hitRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.hits} hits / {stats.total} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hits</CardTitle>
              <Zap className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.hits}</div>
              <p className="text-xs text-muted-foreground">
                Requests served from cache
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Misses</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.misses}</div>
              <p className="text-xs text-muted-foreground">
                Requests that hit AI APIs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Est. Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${estimateCostSavings(stats.hits)}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated cost savings
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">First Call (Cache Miss)</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {formatLatency(testResult.firstCall.latency)}
                  </Badge>
                  <Badge variant={testResult.firstCall.cached ? "default" : "secondary"}>
                    {testResult.firstCall.cached ? "Cached" : "API Call"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Second Call (Cache Hit)</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {formatLatency(testResult.secondCall.latency)}
                  </Badge>
                  <Badge variant={testResult.secondCall.cached ? "default" : "secondary"}>
                    {testResult.secondCall.cached ? "Cached" : "API Call"}
                  </Badge>
                  {testResult.performanceGain.percentageImprovement > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      {testResult.performanceGain.percentageImprovement}% faster
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold">Performance Improvement</h4>
              <div className="text-sm text-muted-foreground">
                <p>Latency reduction: {formatLatency(testResult.performanceGain.latencyReduction)}</p>
                <p>Speed improvement: {testResult.performanceGain.percentageImprovement}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium">TTL Settings</h5>
              <ul className="text-muted-foreground space-y-1">
                <li>General queries: 2 hours</li>
                <li>Personalized: 30 minutes</li>
                <li>Time-sensitive: 15 minutes</li>
                <li>Knowledge: 6 hours</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium">Agent-Specific TTL</h5>
              <ul className="text-muted-foreground space-y-1">
                <li>Shopify agents: 15 minutes</li>
                <li>Research agents: 1 hour</li>
                <li>Creative agents: 2 hours</li>
                <li>Multi-agent: 2 hours</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
