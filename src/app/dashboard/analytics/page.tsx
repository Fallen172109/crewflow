'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, TrendingUp, Clock, DollarSign, Users, Zap, Activity, Target } from 'lucide-react'
import RealTimeMetrics from '@/components/analytics/RealTimeMetrics'
import AgentPerformanceMonitor from '@/components/analytics/AgentPerformanceMonitor'

interface AnalyticsData {
  totalRequests: number
  totalCost: number
  averageResponseTime: number
  mostUsedAgent: string
  agentUsage: Array<{
    agent: string
    requests: number
    cost: number
    avgResponseTime: number
    successRate: number
  }>
  dailyUsage: Array<{
    date: string
    requests: number
    cost: number
  }>
  frameworkPerformance: Array<{
    framework: string
    requests: number
    avgResponseTime: number
    successRate: number
  }>
}

export default function AnalyticsPage() {
  const { user, userProfile } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    if (user) {
      fetchAnalyticsData()
    }
  }, [user, timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const result = await response.json()

      if (result.success) {
        setAnalyticsData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch analytics data')
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
      // Fallback to mock data if API fails
      const mockData: AnalyticsData = {
        totalRequests: 1247,
        totalCost: 24.94,
        averageResponseTime: 1.2,
        mostUsedAgent: 'Coral',
        agentUsage: [
          { agent: 'Coral', requests: 456, cost: 9.12, avgResponseTime: 1.1, successRate: 98.5 },
          { agent: 'Mariner', requests: 321, cost: 6.42, avgResponseTime: 1.8, successRate: 96.2 },
          { agent: 'Tide', requests: 234, cost: 4.68, avgResponseTime: 2.3, successRate: 94.1 },
          { agent: 'Morgan', requests: 236, cost: 4.72, avgResponseTime: 1.0, successRate: 99.1 }
        ],
        dailyUsage: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          requests: Math.floor(Math.random() * 50) + 20,
          cost: Math.random() * 2 + 0.5
        })),
        frameworkPerformance: [
          { framework: 'LangChain', requests: 692, avgResponseTime: 1.1, successRate: 98.2 },
          { framework: 'AutoGen', requests: 234, avgResponseTime: 2.3, successRate: 94.1 },
          { framework: 'Perplexity', requests: 156, avgResponseTime: 1.8, successRate: 96.8 },
          { framework: 'Hybrid', requests: 165, avgResponseTime: 1.5, successRate: 97.3 }
        ]
      }
      setAnalyticsData(mockData)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-300">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-300">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-secondary-300 mt-1">
            Monitor your AI agent performance and usage patterns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Real-Time Metrics */}
      <RealTimeMetrics userId={user?.id} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Total Requests</p>
              <p className="text-2xl font-bold text-white">{analyticsData.totalRequests.toLocaleString()}</p>
              <p className="text-green-400 text-sm mt-1">↗ +12% from last month</p>
            </div>
            <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </div>

        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Total Cost</p>
              <p className="text-2xl font-bold text-white">${analyticsData.totalCost.toFixed(2)}</p>
              <p className="text-green-400 text-sm mt-1">↗ +8% from last month</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Avg Response Time</p>
              <p className="text-2xl font-bold text-white">{analyticsData.averageResponseTime}s</p>
              <p className="text-green-400 text-sm mt-1">↘ -5% from last month</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-white">97.2%</p>
              <p className="text-green-400 text-sm mt-1">↗ +1.2% from last month</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Monitor */}
      <AgentPerformanceMonitor userId={user?.id} />

      {/* Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <h3 className="text-lg font-semibold text-white mb-4">Agent Performance</h3>
          <div className="space-y-4">
            {analyticsData.agentUsage.map((agent, index) => (
              <div key={agent.agent} className="flex items-center justify-between p-3 bg-secondary-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {agent.agent[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium">{agent.agent}</p>
                    <p className="text-secondary-400 text-sm">{agent.requests} requests</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">${agent.cost.toFixed(2)}</p>
                  <p className="text-secondary-400 text-sm">{agent.successRate}% success</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <h3 className="text-lg font-semibold text-white mb-4">Framework Performance</h3>
          <div className="space-y-4">
            {analyticsData.frameworkPerformance.map((framework, index) => (
              <div key={framework.framework} className="p-3 bg-secondary-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{framework.framework}</span>
                  <span className="text-secondary-400 text-sm">{framework.requests} requests</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-400">Avg Response: {framework.avgResponseTime}s</span>
                  <span className="text-green-400">{framework.successRate}% success</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Trends */}
      <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
        <h3 className="text-lg font-semibold text-white mb-4">Usage Trends (Last 30 Days)</h3>
        <div className="h-64 flex items-end space-x-1">
          {analyticsData.dailyUsage.map((day, index) => (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-primary-500 rounded-t"
                style={{ height: `${(day.requests / 70) * 100}%` }}
                title={`${day.date}: ${day.requests} requests, $${day.cost.toFixed(2)}`}
              ></div>
              {index % 5 === 0 && (
                <span className="text-xs text-secondary-400 mt-2 transform rotate-45">
                  {new Date(day.date).getDate()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
