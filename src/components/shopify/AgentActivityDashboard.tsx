'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  Eye,
  Play,
  Pause,
  Settings,
  BarChart3,
  Anchor,
  Ship
} from 'lucide-react'

interface AgentActivity {
  agentId: string
  agentName: string
  status: 'active' | 'idle' | 'paused' | 'error'
  lastActivity: Date
  actionsToday: number
  successRate: number
  pendingApprovals: number
  currentTask?: string
  nextScheduledAction?: Date
  riskLevel: 'low' | 'medium' | 'high'
  permissions: {
    enabled: number
    total: number
  }
}

interface PendingApproval {
  id: string
  agentId: string
  agentName: string
  actionType: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requestedAt: Date
  expiresAt: Date
  estimatedImpact: string
}

interface SystemMetrics {
  totalActions: number
  successfulActions: number
  failedActions: number
  pendingApprovals: number
  activeAgents: number
  averageResponseTime: number
  costToday: number
  tokensUsed: number
}

export default function AgentActivityDashboard() {
  const [agents, setAgents] = useState<AgentActivity[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadDashboardData()
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedTimeframe])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Implement actual API calls when agent activity tracking is ready
      // For now, show empty state
      const emptyAgents: AgentActivity[] = []
      const emptyApprovals: PendingApproval[] = []
      const emptyMetrics: SystemMetrics = {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        pendingApprovals: 0,
        activeAgents: 0,
        averageResponseTime: 0,
        costToday: 0,
        tokensUsed: 0
      }

      setAgents(emptyAgents)
      setPendingApprovals(emptyApprovals)
      setMetrics(emptyMetrics)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'idle': return 'text-yellow-600 bg-yellow-100'
      case 'paused': return 'text-gray-600 bg-gray-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle
      case 'idle': return Clock
      case 'paused': return Pause
      case 'error': return XCircle
      default: return Clock
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`
    } else {
      return `${minutes}m ago`
    }
  }

  const formatTimeUntil = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (diff < 0) return 'Expired'
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else {
      return `${minutes}m`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="w-12 h-12 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading agent activity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Activity className="w-8 h-8 text-orange-600" />
            <span>Agent Activity Dashboard</span>
          </h2>
          <p className="text-gray-600 mt-1">Real-time monitoring of your AI crew activities</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto Refresh</span>
          </button>
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Actions</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalActions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 ml-1">
                {((metrics.successfulActions / metrics.totalActions) * 100).toFixed(1)}% success rate
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeAgents}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600 ml-1">
                {agents.length - metrics.activeAgents} idle/paused
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.pendingApprovals}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600 ml-1">
                Require attention
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Cost</p>
                <p className="text-2xl font-bold text-gray-900">${metrics.costToday.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-gray-600">
                {metrics.tokensUsed.toLocaleString()} tokens used
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Agent Status</h3>
          <div className="space-y-4">
            {agents.map((agent) => {
              const StatusIcon = getStatusIcon(agent.status)
              
              return (
                <div key={agent.agentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Anchor className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{agent.agentName}</h4>
                      <p className="text-sm text-gray-600">
                        {agent.currentTask || `Last active: ${formatTimeAgo(agent.lastActivity)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right text-sm">
                      <div className="text-gray-900 font-medium">{agent.actionsToday} actions</div>
                      <div className="text-gray-600">{agent.successRate}% success</div>
                    </div>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span className="capitalize">{agent.status}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {pendingApprovals.length} pending
            </span>
          </div>
          
          {pendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">{approval.agentName}</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          approval.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                          approval.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                          approval.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {approval.riskLevel} risk
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{approval.description}</p>
                      <p className="text-xs text-gray-600 mb-2">{approval.estimatedImpact}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Requested: {formatTimeAgo(approval.requestedAt)}</span>
                        <span>Expires: {formatTimeUntil(approval.expiresAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button className="text-gray-400 hover:text-gray-600" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                        Approve
                      </button>
                      <button className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h4>
              <p className="text-gray-600">All agent actions are running smoothly</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Mock recent activities */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Anchor</span> updated inventory for 3 products
              </p>
              <p className="text-xs text-gray-500">2 minutes ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Pearl</span> completed market analysis report
              </p>
              <p className="text-xs text-gray-500">5 minutes ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Flint</span> requested approval for price updates
              </p>
              <p className="text-xs text-gray-500">15 minutes ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Beacon</span> fulfilled order #1002
              </p>
              <p className="text-xs text-gray-500">22 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
