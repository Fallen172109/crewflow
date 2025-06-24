'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

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
      // Mock real-time data - in production this would connect to a real-time API
      const mockMetrics: RealTimeMetrics = {
        activeUsers: Math.floor(Math.random() * 50) + 20,
        requestsPerMinute: Math.floor(Math.random() * 30) + 10,
        averageResponseTime: Math.random() * 2 + 0.5,
        successRate: 95 + Math.random() * 4,
        activeAgents: ['Coral', 'Mariner', 'Tide', 'Morgan'].slice(0, Math.floor(Math.random() * 4) + 1),
        recentActivity: Array.from({ length: 5 }, (_, i) => ({
          id: `activity-${i}`,
          agent: ['Coral', 'Mariner', 'Tide', 'Morgan'][Math.floor(Math.random() * 4)],
          action: [
            'Generated customer response',
            'Created marketing campaign',
            'Analyzed data trends',
            'Processed order'
          ][Math.floor(Math.random() * 4)],
          timestamp: new Date(Date.now() - Math.random() * 300000), // Last 5 minutes
          success: Math.random() > 0.1 // 90% success rate
        }))
      }
      
      setMetrics(mockMetrics)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching real-time metrics:', error)
      setLoading(false)
    }
  }

  if (loading && !metrics) {
    return (
      <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-secondary-300 text-sm">Loading real-time metrics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-secondary-300">Failed to load real-time metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Real-Time Metrics</h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-secondary-400">
            Last updated: {lastUpdate?.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-secondary-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-xs">Active Users</p>
              <p className="text-xl font-bold text-white">{metrics.activeUsers}</p>
            </div>
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        <div className="bg-secondary-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-xs">Requests/min</p>
              <p className="text-xl font-bold text-white">{metrics.requestsPerMinute}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
        </div>

        <div className="bg-secondary-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-xs">Avg Response</p>
              <p className="text-xl font-bold text-white">{metrics.averageResponseTime.toFixed(1)}s</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
        </div>

        <div className="bg-secondary-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-xs">Success Rate</p>
              <p className="text-xl font-bold text-white">{metrics.successRate.toFixed(1)}%</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
        </div>
      </div>

      {/* Active Agents */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white mb-3">Active Agents</h4>
        <div className="flex flex-wrap gap-2">
          {metrics.activeAgents.map((agent) => (
            <span
              key={agent}
              className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm border border-primary-500/30"
            >
              {agent}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3">Recent Activity</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {metrics.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-2 bg-secondary-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <div>
                  <p className="text-white text-sm">
                    <span className="font-medium">{activity.agent}</span> {activity.action}
                  </p>
                  <p className="text-secondary-400 text-xs">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {activity.success ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
