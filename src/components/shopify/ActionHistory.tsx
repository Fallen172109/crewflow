'use client'

import { useState, useEffect } from 'react'
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  Tag,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  Zap
} from 'lucide-react'

interface ActionLog {
  id: string
  timestamp: Date
  agentId: string
  agentName: string
  actionType: string
  actionDescription: string
  status: 'completed' | 'failed' | 'pending' | 'cancelled'
  integrationId: string
  duration: number
  tokensUsed?: number
  cost?: number
  metadata: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  approvalRequired: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  userTriggered: boolean
  errorMessage?: string
}

interface FilterOptions {
  agentId: string
  actionType: string
  status: string
  dateRange: string
  riskLevel: string
}

export default function ActionHistory() {
  const [actions, setActions] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ActionLog | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    agentId: 'all',
    actionType: 'all',
    status: 'all',
    dateRange: '7d',
    riskLevel: 'all'
  })

  useEffect(() => {
    loadActionHistory()
  }, [filters, searchQuery])

  const loadActionHistory = async () => {
    try {
      setLoading(true)
      // TODO: Implement actual API call
      // Mock data for demonstration
      const mockActions: ActionLog[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          agentId: 'anchor',
          agentName: 'Anchor (Quartermaster)',
          actionType: 'inventory_update',
          actionDescription: 'Updated inventory for Maritime Navigation Compass',
          status: 'completed',
          integrationId: 'shopify',
          duration: 1.2,
          tokensUsed: 0,
          cost: 0,
          metadata: {
            product_id: 123,
            product_title: 'Maritime Navigation Compass',
            old_quantity: 45,
            new_quantity: 50,
            location_id: 456
          },
          riskLevel: 'low',
          approvalRequired: false,
          userTriggered: false
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          agentId: 'flint',
          agentName: 'Flint (Marketing)',
          actionType: 'price_update',
          actionDescription: 'Requested price update for 5 products',
          status: 'pending',
          integrationId: 'shopify',
          duration: 0,
          metadata: {
            product_count: 5,
            price_changes: [
              { product_id: 123, old_price: 149.99, new_price: 139.99 },
              { product_id: 124, old_price: 299.99, new_price: 279.99 }
            ]
          },
          riskLevel: 'critical',
          approvalRequired: true,
          approvalStatus: 'pending',
          userTriggered: false
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          agentId: 'beacon',
          agentName: 'Beacon (Support)',
          actionType: 'order_fulfill',
          actionDescription: 'Fulfilled order #1001',
          status: 'completed',
          integrationId: 'shopify',
          duration: 2.8,
          metadata: {
            order_id: 1001,
            order_number: '#1001',
            tracking_number: 'TRK123456789',
            customer_email: 'captain.smith@maritime.com'
          },
          riskLevel: 'medium',
          approvalRequired: false,
          userTriggered: true
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          agentId: 'pearl',
          agentName: 'Pearl (Research)',
          actionType: 'market_analysis',
          actionDescription: 'Analyzed product performance trends',
          status: 'completed',
          integrationId: 'shopify',
          duration: 15.4,
          tokensUsed: 2500,
          cost: 0.05,
          metadata: {
            products_analyzed: 156,
            trends_identified: 8,
            recommendations: 12
          },
          riskLevel: 'low',
          approvalRequired: false,
          userTriggered: false
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          agentId: 'anchor',
          agentName: 'Anchor (Quartermaster)',
          actionType: 'bulk_operations',
          actionDescription: 'Bulk inventory update failed',
          status: 'failed',
          integrationId: 'shopify',
          duration: 5.2,
          metadata: {
            operation_type: 'inventory_update',
            items_attempted: 50,
            items_failed: 15
          },
          riskLevel: 'high',
          approvalRequired: true,
          approvalStatus: 'approved',
          userTriggered: false,
          errorMessage: 'API rate limit exceeded during bulk operation'
        }
      ]

      setActions(mockActions)
    } catch (error) {
      console.error('Failed to load action history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'cancelled': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'failed': return XCircle
      case 'pending': return Clock
      case 'cancelled': return XCircle
      default: return Clock
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-green-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`
    } else {
      return `${minutes}m ago`
    }
  }

  const filteredActions = actions.filter(action => {
    const matchesSearch = action.actionDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         action.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         action.actionType.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAgent = filters.agentId === 'all' || action.agentId === filters.agentId
    const matchesType = filters.actionType === 'all' || action.actionType === filters.actionType
    const matchesStatus = filters.status === 'all' || action.status === filters.status
    const matchesRisk = filters.riskLevel === 'all' || action.riskLevel === filters.riskLevel
    
    return matchesSearch && matchesAgent && matchesType && matchesStatus && matchesRisk
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <History className="w-12 h-12 text-green-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading action history...</p>
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
            <History className="w-8 h-8 text-green-600" />
            <span>Action History & Audit Log</span>
          </h2>
          <p className="text-gray-600 mt-1">Complete history of all agent actions and system events</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadActionHistory}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actions, agents, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <select
              value={filters.agentId}
              onChange={(e) => setFilters(prev => ({ ...prev, agentId: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Agents</option>
              <option value="anchor">Anchor</option>
              <option value="pearl">Pearl</option>
              <option value="flint">Flint</option>
              <option value="beacon">Beacon</option>
              <option value="splash">Splash</option>
              <option value="drake">Drake</option>
            </select>

            <select
              value={filters.actionType}
              onChange={(e) => setFilters(prev => ({ ...prev, actionType: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Actions</option>
              <option value="inventory_update">Inventory Update</option>
              <option value="price_update">Price Update</option>
              <option value="order_fulfill">Order Fulfill</option>
              <option value="product_create">Product Create</option>
              <option value="market_analysis">Market Analysis</option>
              <option value="bulk_operations">Bulk Operations</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        )}
      </div>

      {/* Action List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActions.map((action) => {
                const StatusIcon = getStatusIcon(action.status)
                
                return (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{action.actionDescription}</div>
                        <div className="text-sm text-gray-500">
                          {action.actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        {action.approvalRequired && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Shield className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600">
                              Approval {action.approvalStatus || 'required'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{action.agentName}</span>
                      </div>
                      {action.userTriggered && (
                        <div className="text-xs text-blue-600 mt-1">User triggered</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(action.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="capitalize">{action.status}</span>
                      </div>
                      {action.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={action.errorMessage}>
                          {action.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium capitalize ${getRiskColor(action.riskLevel)}`}>
                        {action.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {action.duration > 0 ? formatDuration(action.duration) : '-'}
                      </div>
                      {action.tokensUsed && (
                        <div className="text-xs text-gray-500">{action.tokensUsed.toLocaleString()} tokens</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{formatTimestamp(action.timestamp)}</div>
                      <div className="text-xs text-gray-500">
                        {action.timestamp.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedAction(action)
                          setShowDetails(true)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredActions.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No actions found</h3>
            <p className="text-gray-600">
              {searchQuery || Object.values(filters).some(f => f !== 'all' && f !== '7d') 
                ? 'Try adjusting your search or filters'
                : 'No agent actions have been recorded yet'
              }
            </p>
          </div>
        )}
      </div>

      {/* Action Details Modal */}
      {showDetails && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Action Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Action ID:</span>
                      <span className="font-medium">{selectedAction.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Agent:</span>
                      <span className="font-medium">{selectedAction.agentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{selectedAction.actionType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium capitalize ${getRiskColor(selectedAction.status)}`}>
                        {selectedAction.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk Level:</span>
                      <span className={`font-medium capitalize ${getRiskColor(selectedAction.riskLevel)}`}>
                        {selectedAction.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">
                        {selectedAction.duration > 0 ? formatDuration(selectedAction.duration) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tokens Used:</span>
                      <span className="font-medium">
                        {selectedAction.tokensUsed ? selectedAction.tokensUsed.toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-medium">
                        {selectedAction.cost ? `$${selectedAction.cost.toFixed(4)}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="font-medium">{selectedAction.timestamp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="font-medium text-gray-900">Action Metadata</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedAction.metadata, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Error Details */}
                {selectedAction.errorMessage && (
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="font-medium text-gray-900">Error Details</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">{selectedAction.errorMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
