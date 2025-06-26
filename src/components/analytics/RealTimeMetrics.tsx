'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface RealTimeMetrics {
  activeUsers: number
  requestsPerMinute: number
  averageResponseTime: number
  successRate: number
  activeAgents: string[]
  recentActivity: Array<{
    id: string
    agent: string
    action: string
    timestamp: Date
    success: boolean
  }>
}

interface RealTimeMetricsProps {
  userId?: string
  refreshInterval?: number
}

export default function RealTimeMetrics({ userId, refreshInterval = 30000 }: RealTimeMetricsProps) {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [userId, refreshInterval])

  const fetchMetrics = async () => {
    try {
      if (!userId) {
        setLoading(false)
        return
      }

      const supabase = createSupabaseClient()

      // Get current time and time ranges
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      // Fetch recent usage data for the user
      const { data: recentUsage, error: usageError } = await supabase
        .from('agent_usage_detailed')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', oneHourAgo.toISOString())
        .order('timestamp', { ascending: false })

      if (usageError) {
        console.error('Error fetching usage data:', usageError)
        // Set empty metrics on error instead of throwing
        setMetrics({
          activeUsers: 0,
          requestsPerMinute: 0,
          averageResponseTime: 0,
          successRate: 0,
          activeAgents: [],
          recentActivity: []
        })
        setLoading(false)
        return
      }

      // Calculate metrics
      const allRequests = recentUsage || []
      const recentRequests = allRequests.filter(r => new Date(r.timestamp) >= fiveMinutesAgo)
      const lastMinuteRequests = allRequests.filter(r => new Date(r.timestamp) >= oneMinuteAgo)

      // Calculate requests per minute (based on last 5 minutes)
      const requestsPerMinute = Math.round(recentRequests.length / 5)

      // Calculate average response time
      const avgResponseTime = allRequests.length > 0
        ? allRequests.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / allRequests.length / 1000
        : 0

      // Calculate success rate
      const successRate = allRequests.length > 0
        ? (allRequests.filter(r => r.success).length / allRequests.length) * 100
        : 0

      // Get active agents (agents used in last 5 minutes)
      const activeAgents = [...new Set(recentRequests.map(r => r.agent_name))]

      // Format recent activity
      const recentActivity = allRequests.slice(0, 10).map(record => ({
        id: record.id,
        agent: record.agent_name,
        action: getActionText(record.message_type),
        timestamp: new Date(record.timestamp),
        success: record.success
      }))

      const realMetrics: RealTimeMetrics = {
        activeUsers: 1, // Current user is active
        requestsPerMinute,
        averageResponseTime: avgResponseTime,
        successRate,
        activeAgents,
        recentActivity
      }

      setMetrics(realMetrics)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching real-time metrics:', error)
      // Set empty metrics on error
      setMetrics({
        activeUsers: 0,
        requestsPerMinute: 0,
        averageResponseTime: 0,
        successRate: 0,
        activeAgents: [],
        recentActivity: []
      })
      setLoading(false)
    }
  }

  // Helper function to format action text
  const getActionText = (messageType: string): string => {
    const actions = {
      'chat': 'had a conversation',
      'preset_action': 'executed preset action',
      'tool_execution': 'used a tool'
    }
    return actions[messageType as keyof typeof actions] || 'performed action'
  }

  if (loading && !metrics) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading real-time metrics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-gray-600">Failed to load real-time metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Real-Time Metrics</h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600">
            Last updated: {lastUpdate?.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-medium">Active Users</p>
              <p className="text-xl font-bold text-gray-900">{metrics.activeUsers}</p>
            </div>
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-medium">Requests/min</p>
              <p className="text-xl font-bold text-gray-900">{metrics.requestsPerMinute}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-medium">Avg Response</p>
              <p className="text-xl font-bold text-gray-900">{metrics.averageResponseTime.toFixed(1)}s</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-medium">Success Rate</p>
              <p className="text-xl font-bold text-gray-900">{metrics.successRate.toFixed(1)}%</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Active Agents */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Active Agents</h4>
        <div className="flex flex-wrap gap-2">
          {metrics.activeAgents.map((agent) => (
            <span
              key={agent}
              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm border border-orange-200"
            >
              {agent}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {metrics.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <p className="text-gray-900 text-sm">
                    <span className="font-medium">{activity.agent}</span> {activity.action}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {activity.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
