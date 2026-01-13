'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, TrendingUp, Clock, DollarSign, Zap, Target } from 'lucide-react'
import RealTimeMetrics from '@/components/analytics/RealTimeMetrics'

interface AnalyticsData {
  totalRequests: number
  totalCost: number
  averageResponseTime: number
  successRate?: number
  dailyUsage: Array<{
    date: string
    requests: number
    cost: number
  }>
}

export default function AnalyticsPage() {
  const { user } = useAuth()
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
      const emptyData: AnalyticsData = {
        totalRequests: 0,
        totalCost: 0,
        averageResponseTime: 0,
        dailyUsage: []
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
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            Monitor your AI assistant usage and performance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <p className="text-green-700 text-sm mt-1">AI interactions</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">${analyticsData.totalCost.toFixed(2)}</p>
              {analyticsData.totalCost > 0 && (
                <p className="text-blue-700 text-sm mt-1">Total spend</p>
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
                <p className="text-yellow-700 text-sm mt-1">Avg response</p>
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
              <p className="text-2xl font-bold text-gray-900">{analyticsData.successRate?.toFixed(1) || '100.0'}%</p>
              {(analyticsData.successRate ?? 100) > 0 && (
                <p className="text-green-700 text-sm mt-1">Success rate</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Usage Trends */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h3>
        <div className="h-64 flex items-end space-x-1">
          {analyticsData.dailyUsage && analyticsData.dailyUsage.length > 0 ? (
            analyticsData.dailyUsage.map((day, index) => {
              const maxRequests = Math.max(...analyticsData.dailyUsage.map(d => d.requests), 1)
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                    style={{ height: `${(day.requests / maxRequests) * 100}%`, minHeight: day.requests > 0 ? '4px' : '0' }}
                    title={`${day.date}: ${day.requests} requests, $${day.cost.toFixed(2)}`}
                  ></div>
                  {index % 5 === 0 && (
                    <span className="text-xs text-gray-600 mt-2">
                      {new Date(day.date).getDate()}
                    </span>
                  )}
                </div>
              )
            })
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No usage data yet</p>
                <p className="text-gray-400 text-sm">Start using the AI assistant to see analytics</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
