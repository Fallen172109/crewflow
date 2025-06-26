'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { AGENTS } from '@/lib/agents'

interface AgentPerformance {
  agentId: string
  agentName: string
  framework: string
  requests: number
  successRate: number
  averageResponseTime: number
  cost: number
  trend: 'up' | 'down' | 'stable'
  status: 'healthy' | 'warning' | 'critical'
  lastUsed: string
}

interface AgentPerformanceMonitorProps {
  userId?: string
  timeRange?: '1h' | '24h' | '7d'
}

export default function AgentPerformanceMonitor({ 
  userId, 
  timeRange = '24h' 
}: AgentPerformanceMonitorProps) {
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    fetchAgentPerformance()
  }, [userId, timeRange])

  const fetchAgentPerformance = async () => {
    try {
      setLoading(true)

      if (!userId) {
        setLoading(false)
        return
      }

      const supabase = createSupabaseClient()

      // Fetch user's agent usage data
      const { data: usageData, error } = await supabase
        .from('agent_usage_detailed')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error fetching agent performance data:', error)
        // Set empty performance data on error
        setAgentPerformance([])
        setLoading(false)
        return
      }

      // Group data by agent
      const agentStats = (usageData || []).reduce((acc, record) => {
        const agentId = record.agent_id
        if (!acc[agentId]) {
          acc[agentId] = {
            agentId,
            agentName: record.agent_name,
            framework: record.framework,
            requests: 0,
            successfulRequests: 0,
            totalResponseTime: 0,
            totalCost: 0,
            lastUsed: record.timestamp,
            records: []
          }
        }

        acc[agentId].requests += 1
        if (record.success) acc[agentId].successfulRequests += 1
        acc[agentId].totalResponseTime += record.response_time_ms || 0
        acc[agentId].totalCost += parseFloat(record.cost_usd || '0')
        acc[agentId].records.push(record)

        // Update last used if this record is more recent
        if (new Date(record.timestamp) > new Date(acc[agentId].lastUsed)) {
          acc[agentId].lastUsed = record.timestamp
        }

        return acc
      }, {} as Record<string, any>)

      // Convert to performance data format
      const performanceData: AgentPerformance[] = Object.values(agentStats).map((stats: any) => {
        const successRate = stats.requests > 0 ? (stats.successfulRequests / stats.requests) * 100 : 0
        const averageResponseTime = stats.requests > 0 ? stats.totalResponseTime / stats.requests / 1000 : 0

        // Calculate trend (simplified - compare recent vs older requests)
        const recentRequests = stats.records.slice(0, Math.floor(stats.records.length / 2))
        const olderRequests = stats.records.slice(Math.floor(stats.records.length / 2))
        const recentSuccessRate = recentRequests.length > 0 ?
          (recentRequests.filter((r: any) => r.success).length / recentRequests.length) * 100 : 0
        const olderSuccessRate = olderRequests.length > 0 ?
          (olderRequests.filter((r: any) => r.success).length / olderRequests.length) * 100 : 0

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (recentSuccessRate > olderSuccessRate + 2) trend = 'up'
        else if (recentSuccessRate < olderSuccessRate - 2) trend = 'down'

        // Determine status
        let status: 'healthy' | 'warning' | 'error' = 'healthy'
        if (successRate < 90) status = 'error'
        else if (successRate < 95) status = 'warning'

        // Format last used
        const lastUsedDate = new Date(stats.lastUsed)
        const now = new Date()
        const diffInMinutes = Math.floor((now.getTime() - lastUsedDate.getTime()) / (1000 * 60))
        let lastUsed = 'Never'
        if (diffInMinutes < 1) lastUsed = 'Just now'
        else if (diffInMinutes < 60) lastUsed = `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
        else if (diffInMinutes < 1440) lastUsed = `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`
        else lastUsed = `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`

        return {
          agentId: stats.agentId,
          agentName: stats.agentName,
          framework: stats.framework,
          requests: stats.requests,
          successRate: Math.round(successRate * 10) / 10,
          averageResponseTime: Math.round(averageResponseTime * 100) / 100,
          cost: Math.round(stats.totalCost * 100) / 100,
          trend,
          status,
          lastUsed
        }
      })

      setAgentPerformance(performanceData)
    } catch (error) {
      console.error('Error fetching agent performance:', error)
      // Set empty performance data on error
      setAgentPerformance([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/20'
      case 'warning': return 'text-yellow-400 bg-yellow-500/20'
      case 'critical': return 'text-red-400 bg-red-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'critical': return <AlertTriangle className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
    }
  }

  const getFrameworkBadge = (framework: string) => {
    switch (framework) {
      case 'langchain':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'autogen':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'perplexity':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'hybrid':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading agent performance...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Agent Performance Monitor</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => {/* Handle time range change */}}
            className="bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agentPerformance.map((agent) => (
          <div
            key={agent.agentId}
            className={`p-4 bg-gray-50 rounded-lg border transition-all cursor-pointer ${
              selectedAgent === agent.agentId
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)}
          >
            {/* Agent Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {agent.agentName[0]}
                </div>
                <div>
                  <h4 className="text-gray-900 font-medium">{agent.agentName}</h4>
                  <span className={`text-xs px-2 py-1 rounded border ${getFrameworkBadge(agent.framework)}`}>
                    {agent.framework}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getTrendIcon(agent.trend)}
                <div className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 ${getStatusColor(agent.status)}`}>
                  {getStatusIcon(agent.status)}
                  <span className="capitalize">{agent.status}</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-gray-600 text-xs font-medium">Requests</p>
                <p className="text-gray-900 font-semibold">{agent.requests.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-medium">Success Rate</p>
                <p className="text-gray-900 font-semibold">{agent.successRate}%</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-medium">Avg Response</p>
                <p className="text-gray-900 font-semibold">{agent.averageResponseTime}s</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-medium">Cost</p>
                <p className="text-gray-900 font-semibold">${agent.cost.toFixed(2)}</p>
              </div>
            </div>

            {/* Last Used */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Last used: {agent.lastUsed}</span>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-orange-600" />
                <span className="text-orange-600 font-medium">{agent.requests} reqs</span>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedAgent === agent.agentId && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-600 mb-1 font-medium">Performance Trend</p>
                    <div className="h-8 bg-gray-100 rounded flex items-center px-2">
                      <div className="flex-1 bg-gray-200 h-1 rounded">
                        <div
                          className="h-1 bg-orange-500 rounded"
                          style={{ width: `${agent.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 font-medium">Response Time</p>
                    <div className="h-8 bg-gray-100 rounded flex items-center px-2">
                      <Clock className="w-3 h-3 text-blue-600 mr-2" />
                      <span className="text-gray-900 font-medium">{agent.averageResponseTime}s avg</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
