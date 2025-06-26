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
  successRate?: number
  mostUsedAgent: string
  agentBreakdown: Array<{
    agentId: string
    agentName: string
    requests: number
    cost: number
    averageResponseTime: number
    successRate: number
    framework: string
    lastUsed: string
  }>
  dailyUsage: Array<{
    date: string
    requests: number
    cost: number
  }>
  frameworkPerformance: Array<{
    framework: string
    requests: number
    averageResponseTime: number
    successRate: number
    totalCost: number
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
      // Set empty data on error
      const emptyData: AnalyticsData = {
        totalRequests: 0,
        totalCost: 0,
        averageResponseTime: 0,
        mostUsedAgent: 'None',
        agentBreakdown: [],
        dailyUsage: [],
        frameworkPerformance: []
      }
      setAnalyticsData(emptyData)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor your AI agent performance and usage patterns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalRequests.toLocaleString()}</p>
              {analyticsData.totalRequests > 0 && (
                <p className="text-green-700 text-sm mt-1">📊 Real-time data</p>
              )}
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.totalCost.toFixed(2)}</p>
              {analyticsData.totalCost > 0 && (
                <p className="text-blue-700 text-sm mt-1">💰 Total spend</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.averageResponseTime}s</p>
              {analyticsData.averageResponseTime > 0 && (
                <p className="text-yellow-700 text-sm mt-1">⚡ Avg response</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.successRate?.toFixed(1) || '0.0'}%</p>
              {analyticsData.successRate > 0 && (
                <p className="text-green-700 text-sm mt-1">✅ Success rate</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Monitor */}
      <AgentPerformanceMonitor userId={user?.id} />

      {/* Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
          <div className="space-y-4">
            {analyticsData.agentBreakdown && analyticsData.agentBreakdown.length > 0 ? (
              analyticsData.agentBreakdown.map((agent, index) => (
                <div key={agent.agentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {agent.agentName[0]}
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">{agent.agentName}</p>
                      <p className="text-gray-600 text-sm">{agent.requests} requests</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 font-medium">${agent.cost.toFixed(2)}</p>
                    <p className="text-gray-600 text-sm">{agent.successRate}% success</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No agent usage data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Framework Performance</h3>
          <div className="space-y-4">
            {analyticsData.frameworkPerformance && analyticsData.frameworkPerformance.length > 0 ? (
              analyticsData.frameworkPerformance.map((framework, index) => (
                <div key={framework.framework} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-900 font-medium">{framework.framework}</span>
                    <span className="text-gray-600 text-sm">{framework.requests} requests</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Avg Response: {framework.averageResponseTime}s</span>
                    <span className="text-green-700 font-medium">{framework.successRate}% success</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No framework performance data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Trends */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends (Last 30 Days)</h3>
        <div className="h-64 flex items-end space-x-1">
          {analyticsData.dailyUsage && analyticsData.dailyUsage.length > 0 ? (
            analyticsData.dailyUsage.map((day, index) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-orange-500 rounded-t"
                  style={{ height: `${(day.requests / 70) * 100}%` }}
                  title={`${day.date}: ${day.requests} requests, $${day.cost.toFixed(2)}`}
                ></div>
                {index % 5 === 0 && (
                  <span className="text-xs text-gray-600 mt-2 transform rotate-45">
                    {new Date(day.date).getDate()}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-gray-500">No usage trend data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
