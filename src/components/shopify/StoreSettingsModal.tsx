'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Settings, 
  Shield, 
  Users, 
  RefreshCw, 
  Save, 
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  DollarSign,
  Store,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react'

interface ShopifyStore {
  id: string
  shopDomain: string
  storeName: string
  storeEmail?: string
  currency: string
  timezone?: string
  planName?: string
  isActive: boolean
  isPrimary: boolean
  connectedAt: string
  lastSyncAt?: string
  syncStatus: 'never' | 'syncing' | 'synced' | 'error'
  syncError?: string
  metadata: {
    shop_id?: number
    country_code?: string
    phone?: string
    total_products?: number
    total_orders?: number
    total_customers?: number
    monthly_revenue?: number
  }
  permissions: {
    read_products: boolean
    write_products: boolean
    read_orders: boolean
    write_orders: boolean
    read_customers: boolean
    read_analytics: boolean
    read_inventory: boolean
    write_inventory: boolean
  }
  agent_access: {
    [agentId: string]: {
      enabled: boolean
      permissions: string[]
      last_activity?: string
    }
  }
}

interface StoreSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  store: ShopifyStore | null
  onSave?: (updatedStore: Partial<ShopifyStore>) => void
}

type TabType = 'general' | 'permissions' | 'agents' | 'sync'

const agentDefinitions = {
  anchor: {
    name: 'Anchor',
    description: 'Inventory & Supply Chain Management',
    icon: '⚓',
    color: 'text-blue-600',
    permissions: ['inventory_management', 'order_fulfillment', 'supplier_management']
  },
  pearl: {
    name: 'Pearl',
    description: 'Market Research & Analytics',
    icon: '🔍',
    color: 'text-purple-600',
    permissions: ['market_analysis', 'customer_behavior_analysis', 'product_research']
  },
  flint: {
    name: 'Flint',
    description: 'Sales & Marketing Automation',
    icon: '🔥',
    color: 'text-red-600',
    permissions: ['product_optimization', 'discount_management', 'abandoned_cart_recovery']
  },
  beacon: {
    name: 'Beacon',
    description: 'Customer Service & Support',
    icon: '💡',
    color: 'text-yellow-600',
    permissions: ['customer_service', 'order_tracking', 'support_automation']
  }
}

export default function StoreSettingsModal({ isOpen, onClose, store, onSave }: StoreSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Local state for form data
  const [formData, setFormData] = useState<Partial<ShopifyStore>>({})

  useEffect(() => {
    if (store) {
      setFormData({
        permissions: { ...store.permissions },
        agent_access: { ...store.agent_access },
        isActive: store.isActive
      })
    }
  }, [store])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  if (!isOpen || !store) return null

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`/api/shopify/stores/${store.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const result = await response.json()
      setSuccess('Settings saved successfully!')
      
      if (onSave) {
        onSave(formData)
      }
      
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        onClose()
      }, 1500)
      
    } catch (err) {
      console.error('Error saving store settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePermissionToggle = (permission: keyof ShopifyStore['permissions']) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions?.[permission]
      }
    }))
  }

  const handleAgentToggle = (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      agent_access: {
        ...prev.agent_access,
        [agentId]: {
          ...prev.agent_access?.[agentId],
          enabled: !prev.agent_access?.[agentId]?.enabled,
          permissions: prev.agent_access?.[agentId]?.permissions || agentDefinitions[agentId as keyof typeof agentDefinitions]?.permissions || []
        }
      }
    }))
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'agents', label: 'AI Agents', icon: Users },
    { id: 'sync', label: 'Sync Settings', icon: RefreshCw }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Store Settings</h2>
              <p className="text-sm text-gray-600">{store.storeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="flex h-[calc(90vh-200px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Globe className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Domain</p>
                            <p className="text-sm text-gray-600">{store.shopDomain}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Currency</p>
                            <p className="text-sm text-gray-600">{store.currency}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Connected</p>
                            <p className="text-sm text-gray-600">
                              {new Date(store.connectedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Zap className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Plan</p>
                            <p className="text-sm text-gray-600">{store.planName || 'Unknown'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Status</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Store Active</p>
                        <p className="text-sm text-gray-600">
                          {formData.isActive ? 'Store is active and accessible to agents' : 'Store is inactive'}
                        </p>
                      </div>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.isActive ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'permissions' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Shopify API Permissions</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Control what data and actions are available for this store. Changes will affect all AI agents.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(formData.permissions || {}).map(([permission, enabled]) => {
                        const isWrite = permission.startsWith('write_')
                        const resource = permission.replace(/^(read_|write_)/, '')
                        const displayName = resource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

                        return (
                          <div key={permission} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isWrite ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                                {isWrite ? (
                                  <Eye className={`w-4 h-4 ${enabled ? 'text-red-600' : 'text-gray-400'}`} />
                                ) : (
                                  <EyeOff className={`w-4 h-4 ${enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {isWrite ? 'Write' : 'Read'} {displayName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {isWrite ? `Modify ${resource} data` : `View ${resource} data`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handlePermissionToggle(permission as keyof ShopifyStore['permissions'])}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                enabled ? 'bg-green-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'agents' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Agent Access</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Configure which AI agents can access this store and what they can do.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(agentDefinitions).map(([agentId, agent]) => {
                        const agentAccess = formData.agent_access?.[agentId] || { enabled: false, permissions: [] }

                        return (
                          <div key={agentId} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="text-2xl">{agent.icon}</div>
                                <div>
                                  <p className={`font-semibold ${agent.color}`}>{agent.name}</p>
                                  <p className="text-sm text-gray-600">{agent.description}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAgentToggle(agentId)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  agentAccess.enabled ? 'bg-green-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    agentAccess.enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {agentAccess.enabled && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-sm font-medium text-gray-700 mb-2">Capabilities:</p>
                                <div className="flex flex-wrap gap-2">
                                  {agent.permissions.map((permission) => (
                                    <span
                                      key={permission}
                                      className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                                    >
                                      {permission.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Settings</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Configure how CrewFlow syncs data with your Shopify store.
                    </p>

                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">Current Sync Status</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            store.syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
                            store.syncStatus === 'syncing' ? 'bg-yellow-100 text-yellow-700' :
                            store.syncStatus === 'error' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {store.syncStatus}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {store.lastSyncAt
                            ? `Last synced: ${new Date(store.lastSyncAt).toLocaleString()}`
                            : 'Never synced'
                          }
                        </p>
                        {store.syncError && (
                          <p className="text-sm text-red-600 mt-2">Error: {store.syncError}</p>
                        )}
                      </div>

                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Manual Sync</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Trigger an immediate sync of your store data.
                        </p>
                        <button
                          onClick={() => {
                            // TODO: Implement manual sync
                            console.log('Manual sync triggered for store:', store.id)
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Sync Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
