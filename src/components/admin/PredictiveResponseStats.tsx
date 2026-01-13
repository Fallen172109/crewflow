'use client'

// Predictive Response Statistics Component
// Displays analytics and performance metrics for the predictive response system

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Brain, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Settings
} from 'lucide-react'

interface PredictiveStats {
  basic: {
    predictions: { total: number; sessions: number }
    preloaded: { total: number; averageConfidence: number }
    performance: { 
      successRate: number
      averageDuration: number
      totalTokensUsed: number
      cacheHitRate: number
    }
  }
  preloading: {
    totalPreloaded: number
    averageConfidence: number
    averageGenerationTime: number
    totalTokensUsed: number
    byAgent: Record<string, number>
    byCategory: Record<string, number>
  } | null
  jobs: {
    totalJobs: number
    successRate: number
    averageDuration: number
    totalTokensUsed: number
    cacheHitRate: number
  }
  accuracy: {
    overallAccuracy: number
    categoryAccuracy: Record<string, number>
    recentAnalyses: number
    trend: 'improving' | 'declining' | 'stable' | 'no_data' | 'error'
  } | null
}

export default function PredictiveResponseStats() {
  const [stats, setStats] = useState<PredictiveStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(24)
  const [includeDetails, setIncludeDetails] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/predictive/stats?timeRange=${timeRange}&details=${includeDetails}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch predictive stats')
      }

      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const triggerAnalysis = async () => {
    try {
      const response = await fetch('/api/predictive/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', timeRange })
      })

      if (response.ok) {
        // Refresh stats after a delay
        setTimeout(fetchStats, 2000)
      }
    } catch (err) {
      console.error('Failed to trigger analysis:', err)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [timeRange, includeDetails])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'stable': return <Minus className="h-4 w-4 text-gray-500" />
      default: return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-500" />
            Predictive Response Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-500" />
            Predictive Response Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Button onClick={fetchStats} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-green-500" />
            Predictive Response Analytics 🔮
          </h2>
          <p className="text-gray-600">Performance metrics for AI response pre-loading</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
          </select>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={triggerAnalysis} variant="outline" size="sm">
            <Target className="h-4 w-4 mr-2" />
            Analyze
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.basic.predictions.total.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {stats.basic.predictions.sessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Preloaded Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.basic.preloaded.total.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {(stats.basic.preloaded.averageConfidence * 100).toFixed(1)}% avg confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.basic.performance.successRate}%
            </div>
            <Progress value={stats.basic.performance.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.basic.performance.cacheHitRate}%
            </div>
            <Progress value={stats.basic.performance.cacheHitRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="jobs">Job Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {formatDuration(stats.basic.performance.averageDuration)}
                </div>
                <p className="text-sm text-gray-500">Average generation time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Token Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {stats.basic.performance.totalTokensUsed.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">Total tokens consumed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {((stats.basic.performance.cacheHitRate / 100) * stats.basic.performance.successRate).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500">Overall efficiency score</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-4">
          {stats.accuracy ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Overall Accuracy
                    {getTrendIcon(stats.accuracy.trend)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.accuracy.overallAccuracy.toFixed(1)}%
                  </div>
                  <Progress value={stats.accuracy.overallAccuracy} className="mt-2" />
                  <p className="text-sm text-gray-500 mt-2">
                    Based on {stats.accuracy.recentAnalyses} recent analyses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.accuracy.categoryAccuracy).map(([category, accuracy]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={accuracy} className="w-20" />
                          <span className="text-sm font-medium w-12">{accuracy.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No accuracy data available</p>
                <Button onClick={triggerAnalysis} className="mt-4" variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  Run Accuracy Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          {stats.preloading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>By Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.preloading.byAgent).map(([agent, count]) => (
                      <div key={agent} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{agent}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.preloading.byCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No distribution data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.jobs.totalJobs}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.jobs.successRate}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatDuration(stats.jobs.averageDuration)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cache Hits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.jobs.cacheHitRate}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
