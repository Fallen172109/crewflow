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
      // TODO: Implement actual API calls
      // Mock data for demonstration
      
      const mockAgents: AgentActivity[] = [
        {
          agentId: 'anchor',
          agentName: 'Anchor (Quartermaster)',
          status: 'active',
          lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          actionsToday: 23,
          successRate: 95.7,
          pendingApprovals: 1,
          currentTask: 'Monitoring inventory levels',
          nextScheduledAction: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
          riskLevel: 'low',
          permissions: { enabled: 8, total: 10 }
        },
        {
          agentId: 'pearl',
          agentName: 'Pearl (Research)',
          status: 'active',
          lastActivity: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
          actionsToday: 12,
          successRate: 100,
          pendingApprovals: 0,
          currentTask: 'Analyzing market trends',
          nextScheduledAction: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
          riskLevel: 'low',
          permissions: { enabled: 5, total: 6 }
        },
        {
          agentId: 'flint',
          agentName: 'Flint (Marketing)',
          status: 'idle',
          lastActivity: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          actionsToday: 8,
          successRate: 87.5,
          pendingApprovals: 2,
          riskLevel: 'medium',
          permissions: { enabled: 6, total: 8 }
        },
        {
          agentId: 'beacon',
          agentName: 'Beacon (Support)',
          status: 'active',
          lastActivity: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
          actionsToday: 31,
          successRate: 96.8,
          pendingApprovals: 0,
          currentTask: 'Processing customer inquiries',
          riskLevel: 'low',
          permissions: { enabled: 7, total: 7 }
        },
        {
          agentId: 'splash',
          agentName: 'Splash (Creative)',
          status: 'paused',
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          actionsToday: 5,
          successRate: 100,
          pendingApprovals: 0,
          riskLevel: 'low',
          permissions: { enabled: 4, total: 5 }
        },
        {
          agentId: 'drake',
          agentName: 'Drake (Strategy)',
          status: 'error',
          lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          actionsToday: 3,
          successRate: 66.7,
          pendingApprovals: 1,
          riskLevel: 'high',
          permissions: { enabled: 3, total: 6 }
        }
      ]

      const mockApprovals: PendingApproval[] = [
        {
          id: '1',
          agentId: 'flint',
          agentName: 'Flint (Marketing)',
          actionType: 'price_update',
          description: 'Update pricing for 5 navigation products',
          riskLevel: 'critical',
          requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          estimatedImpact: '5 products, ~$2,500 revenue impact'
        },
        {
          id: '2',
          agentId: 'anchor',
          agentName: 'Anchor (Quartermaster)',
          actionType: 'bulk_operations',
          description: 'Bulk inventory adjustment for seasonal items',
          riskLevel: 'high',
          requestedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
          estimatedImpact: '25 products, inventory rebalancing'
        },
        {
          id: '3',
          agentId: 'drake',
          agentName: 'Drake (Strategy)',
          actionType: 'marketing_campaign',
          description: 'Launch winter promotion campaign',
          riskLevel: 'medium',
          requestedAt: new Date(Date.now() - 30 * 60 * 1000),
          expiresAt: new Date(Date.now() + 5.5 * 60 * 60 * 1000),
          estimatedImpact: '$500 budget, 30-day campaign'
        }
      ]

      const mockMetrics: SystemMetrics = {
        totalActions: 82,
        successfulActions: 76,
        failedActions: 6,
        pendingApprovals: 3,
        activeAgents: 3,
        averageResponseTime: 2.4,
        costToday: 1.23,
        tokensUsed: 15420
      }

      setAgents(mockAgents)
      setPendingApprovals(mockApprovals)
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
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
