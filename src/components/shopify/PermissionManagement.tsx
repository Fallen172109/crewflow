'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Zap,
  Lock,
  Unlock,
  Eye,
  Edit3,
  Save,
  RefreshCw,
  Info,
  Anchor,
  Ship
} from 'lucide-react'

interface Permission {
  id: string
  integration_id: string
  action_type: string
  enabled: boolean
  max_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  restrictions: {
    maxActions: number
    requiresApproval?: boolean
    allowedHours?: string[]
    emergencyStop?: boolean
  }
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  agentAccess: string[]
}

interface AgentPermissionGroup {
  agentId: string
  agentName: string
  permissions: Permission[]
  totalEnabled: number
  highRiskEnabled: number
  lastActivity?: string
}

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [agentGroups, setAgentGroups] = useState<AgentPermissionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [emergencyStopActive, setEmergencyStopActive] = useState(false)

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      // TODO: Implement actual API call
      // Mock data for demonstration
      const mockPermissions: Permission[] = [
        {
          id: 'shopify_product_create',
          integration_id: 'shopify',
          action_type: 'product_create',
          enabled: true,
          max_frequency: 'daily',
          restrictions: {
            maxActions: 10,
            requiresApproval: false,
            allowedHours: ['09:00-17:00']
          },
          description: 'Create new products in the store',
          riskLevel: 'medium',
          agentAccess: ['anchor', 'splash']
        },
        {
          id: 'shopify_product_update',
          integration_id: 'shopify',
          action_type: 'product_update',
          enabled: true,
          max_frequency: 'hourly',
          restrictions: {
            maxActions: 50,
            requiresApproval: false
          },
          description: 'Update existing product information',
          riskLevel: 'low',
          agentAccess: ['anchor', 'splash', 'flint']
        },
        {
          id: 'shopify_price_update',
          integration_id: 'shopify',
          action_type: 'price_update',
          enabled: false,
          max_frequency: 'daily',
          restrictions: {
            maxActions: 5,
            requiresApproval: true
          },
          description: 'Update product pricing',
          riskLevel: 'critical',
          agentAccess: ['anchor', 'drake']
        },
        {
          id: 'shopify_inventory_update',
          integration_id: 'shopify',
          action_type: 'inventory_update',
          enabled: true,
          max_frequency: 'hourly',
          restrictions: {
            maxActions: 100,
            requiresApproval: false
          },
          description: 'Update inventory levels',
          riskLevel: 'low',
          agentAccess: ['anchor']
        },
        {
          id: 'shopify_order_fulfill',
          integration_id: 'shopify',
          action_type: 'order_fulfill',
          enabled: true,
          max_frequency: 'hourly',
          restrictions: {
            maxActions: 25,
            requiresApproval: false
          },
          description: 'Process order fulfillments',
          riskLevel: 'medium',
          agentAccess: ['anchor', 'beacon']
        },
        {
          id: 'shopify_bulk_operations',
          integration_id: 'shopify',
          action_type: 'bulk_operations',
          enabled: false,
          max_frequency: 'daily',
          restrictions: {
            maxActions: 2,
            requiresApproval: true
          },
          description: 'Perform bulk operations on multiple items',
          riskLevel: 'critical',
          agentAccess: ['anchor', 'drake']
        }
      ]

      setPermissions(mockPermissions)
      
      // Group permissions by agent
      const agents = ['anchor', 'pearl', 'flint', 'beacon', 'splash', 'drake']
      const groups = agents.map(agentId => {
        const agentPermissions = mockPermissions.filter(p => p.agentAccess.includes(agentId))
        return {
          agentId,
          agentName: getAgentName(agentId),
          permissions: agentPermissions,
          totalEnabled: agentPermissions.filter(p => p.enabled).length,
          highRiskEnabled: agentPermissions.filter(p => p.enabled && (p.riskLevel === 'high' || p.riskLevel === 'critical')).length,
          lastActivity: '2 hours ago'
        }
      })
      
      setAgentGroups(groups)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAgentName = (agentId: string): string => {
    const names: Record<string, string> = {
      anchor: 'Anchor (Quartermaster)',
      pearl: 'Pearl (Research)',
      flint: 'Flint (Marketing)',
      beacon: 'Beacon (Support)',
      splash: 'Splash (Creative)',
      drake: 'Drake (Strategy)'
    }
    return names[agentId] || agentId
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-green-600 bg-green-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return CheckCircle
      case 'medium': return Clock
      case 'high': return AlertTriangle
      case 'critical': return XCircle
      default: return Info
    }
  }

  const handlePermissionToggle = async (permissionId: string, enabled: boolean) => {
    try {
      setSaving(true)
      
      // Update local state
      setPermissions(prev => prev.map(p => 
        p.id === permissionId ? { ...p, enabled } : p
      ))
      
      // Update agent groups
      setAgentGroups(prev => prev.map(group => ({
        ...group,
        permissions: group.permissions.map(p => 
          p.id === permissionId ? { ...p, enabled } : p
        ),
        totalEnabled: group.permissions.filter(p => 
          p.id === permissionId ? enabled : p.enabled
        ).length,
        highRiskEnabled: group.permissions.filter(p => 
          (p.id === permissionId ? enabled : p.enabled) && 
          (p.riskLevel === 'high' || p.riskLevel === 'critical')
        ).length
      })))
      
      // TODO: Implement actual API call
      console.log(`Permission ${permissionId} ${enabled ? 'enabled' : 'disabled'}`)
      
    } catch (error) {
      console.error('Failed to update permission:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEmergencyStop = async () => {
    try {
      setSaving(true)
      setEmergencyStopActive(!emergencyStopActive)
      
      // TODO: Implement actual emergency stop API call
      console.log(`Emergency stop ${emergencyStopActive ? 'deactivated' : 'activated'}`)
      
    } catch (error) {
      console.error('Failed to toggle emergency stop:', error)
    } finally {
      setSaving(false)
    }
  }

  const filteredPermissions = selectedAgent === 'all' 
    ? permissions 
    : permissions.filter(p => p.agentAccess.includes(selectedAgent))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="w-12 h-12 text-green-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading permission settings...</p>
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
            <Shield className="w-8 h-8 text-green-600" />
            <span>Agent Permissions</span>
          </h2>
          <p className="text-gray-600 mt-1">Control what your AI crew can do with your Shopify store</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            <span>Advanced</span>
          </button>
          <button
            onClick={handleEmergencyStop}
            disabled={saving}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              emergencyStopActive 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {emergencyStopActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{emergencyStopActive ? 'All Stopped' : 'Emergency Stop'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Stop Alert */}
      {emergencyStopActive && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Emergency Stop Active</h3>
              <p className="text-red-700 text-sm">All agent activities have been paused. Click "Emergency Stop" again to resume operations.</p>
            </div>
          </div>
        </div>
      )}

      {/* Agent Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentGroups.map((group) => (
          <div key={group.agentId} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Anchor className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{group.agentName}</h3>
                  <p className="text-sm text-gray-500">Last active: {group.lastActivity}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(group.agentId)}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Configure
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Permissions:</span>
                <span className="font-medium ml-2">{group.totalEnabled}/{group.permissions.length}</span>
              </div>
              <div>
                <span className="text-gray-600">High Risk:</span>
                <span className={`font-medium ml-2 ${group.highRiskEnabled > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {group.highRiskEnabled}
                </span>
              </div>
            </div>
            
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(group.totalEnabled / group.permissions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Permission Details</h3>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Agents</option>
            {agentGroups.map(group => (
              <option key={group.agentId} value={group.agentId}>
                {group.agentName}
              </option>
            ))}
          </select>
        </div>

        {/* Permissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermissions.map((permission) => {
                const RiskIcon = getRiskIcon(permission.riskLevel)
                
                return (
                  <tr key={permission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {permission.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-gray-500">{permission.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Agents: {permission.agentAccess.join(', ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(permission.riskLevel)}`}>
                        <RiskIcon className="w-3 h-3" />
                        <span className="capitalize">{permission.riskLevel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 capitalize">{permission.max_frequency}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div>Max: {permission.restrictions.maxActions} actions</div>
                        {permission.restrictions.requiresApproval && (
                          <div className="text-xs text-green-600">Requires approval</div>
                        )}
                        {permission.restrictions.allowedHours && (
                          <div className="text-xs text-gray-500">Hours: {permission.restrictions.allowedHours.join(', ')}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => handlePermissionToggle(permission.id, !permission.enabled)}
                          disabled={saving || emergencyStopActive}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                            permission.enabled ? 'bg-green-600' : 'bg-gray-200'
                          } ${(saving || emergencyStopActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              permission.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`ml-3 text-sm ${permission.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                          {permission.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-400 hover:text-gray-600" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600" title="Edit Settings">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredPermissions.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions found</h3>
            <p className="text-gray-600">
              {selectedAgent === 'all' 
                ? 'No permissions configured yet'
                : `No permissions found for ${getAgentName(selectedAgent)}`
              }
            </p>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Global Rate Limit
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option>Conservative (50% of API limits)</option>
                <option>Balanced (75% of API limits)</option>
                <option>Aggressive (90% of API limits)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Timeout
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option>1 hour</option>
                <option>4 hours</option>
                <option>24 hours</option>
                <option>Never expire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Preferences
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" defaultChecked />
                  <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" defaultChecked />
                  <span className="ml-2 text-sm text-gray-700">In-app notifications</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="ml-2 text-sm text-gray-700">SMS for critical actions</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup & Recovery
              </label>
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                Export Permission Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
