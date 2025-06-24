'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react'

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
      
      // Mock data - in production this would fetch from the analytics API
      const mockPerformance: AgentPerformance[] = [
        {
          agentId: 'coral',
          agentName: 'Coral',
          framework: 'langchain',
          requests: 456,
          successRate: 98.5,
          averageResponseTime: 1.1,
          cost: 9.12,
          trend: 'up',
          status: 'healthy',
          lastUsed: '2 minutes ago'
        },
        {
          agentId: 'mariner',
          agentName: 'Mariner',
          framework: 'hybrid',
          requests: 321,
          successRate: 96.2,
          averageResponseTime: 1.8,
          cost: 6.42,
          trend: 'stable',
          status: 'healthy',
          lastUsed: '15 minutes ago'
        },
        {
          agentId: 'tide',
          agentName: 'Tide',
          framework: 'autogen',
          requests: 234,
          successRate: 94.1,
          averageResponseTime: 2.3,
          cost: 4.68,
          trend: 'down',
          status: 'warning',
          lastUsed: '1 hour ago'
        },
        {
          agentId: 'morgan',
          agentName: 'Morgan',
          framework: 'langchain',
          requests: 189,
          successRate: 99.1,
          averageResponseTime: 1.0,
          cost: 3.78,
          trend: 'up',
          status: 'healthy',
          lastUsed: '30 minutes ago'
        }
      ]
      
      setAgentPerformance(mockPerformance)
    } catch (error) {
      console.error('Error fetching agent performance:', error)
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
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'autogen':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'perplexity':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'hybrid':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-secondary-300 text-sm">Loading agent performance...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Agent Performance Monitor</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => {/* Handle time range change */}}
            className="bg-secondary-700 border border-secondary-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className={`p-4 bg-secondary-700 rounded-lg border transition-all cursor-pointer ${
              selectedAgent === agent.agentId 
                ? 'border-primary-500 bg-secondary-600' 
                : 'border-secondary-600 hover:border-secondary-500'
            }`}
            onClick={() => setSelectedAgent(selectedAgent === agent.agentId ? null : agent.agentId)}
          >
            {/* Agent Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {agent.agentName[0]}
                </div>
                <div>
                  <h4 className="text-white font-medium">{agent.agentName}</h4>
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
                <p className="text-secondary-400 text-xs">Requests</p>
                <p className="text-white font-semibold">{agent.requests.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-secondary-400 text-xs">Success Rate</p>
                <p className="text-white font-semibold">{agent.successRate}%</p>
              </div>
              <div>
                <p className="text-secondary-400 text-xs">Avg Response</p>
                <p className="text-white font-semibold">{agent.averageResponseTime}s</p>
              </div>
              <div>
                <p className="text-secondary-400 text-xs">Cost</p>
                <p className="text-white font-semibold">${agent.cost.toFixed(2)}</p>
              </div>
            </div>

            {/* Last Used */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary-400">Last used: {agent.lastUsed}</span>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-primary-400" />
                <span className="text-primary-400">{agent.requests} reqs</span>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedAgent === agent.agentId && (
              <div className="mt-4 pt-4 border-t border-secondary-600">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-secondary-400 mb-1">Performance Trend</p>
                    <div className="h-8 bg-secondary-600 rounded flex items-center px-2">
                      <div className="flex-1 bg-secondary-500 h-1 rounded">
                        <div 
                          className="h-1 bg-primary-500 rounded" 
                          style={{ width: `${agent.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-secondary-400 mb-1">Response Time</p>
                    <div className="h-8 bg-secondary-600 rounded flex items-center px-2">
                      <Clock className="w-3 h-3 text-blue-400 mr-2" />
                      <span className="text-white">{agent.averageResponseTime}s avg</span>
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
