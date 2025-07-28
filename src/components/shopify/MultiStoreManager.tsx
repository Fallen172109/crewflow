'use client'

import { useState, useEffect } from 'react'
import { 
  Store, 
  Plus, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  ExternalLink,
  Ship,
  Anchor,
  Globe,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Crown,
  Star,
  Trash2,
  Eye,
  EyeOff,
  Zap,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import StoreSettingsModal from './StoreSettingsModal'

// Utility function to format Shopify store URL
const formatShopifyStoreUrl = (shopDomain: string): string | null => {
  if (!shopDomain) return null

  // Remove any existing protocol
  let domain = shopDomain.replace(/^https?:\/\//, '')

  // Ensure it's a valid Shopify domain format
  if (!domain.includes('.myshopify.com') && !domain.includes('.shopify.com')) {
    console.warn('Invalid Shopify domain format:', shopDomain)
    return null
  }

  return `https://${domain}`
}

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

interface MultiStoreManagerProps {
  onStoreSelect?: (store: ShopifyStore) => void
  selectedStore?: ShopifyStore | null
  onConnect?: () => void
  className?: string
}

export default function MultiStoreManager({ 
  onStoreSelect, 
  selectedStore, 
  onConnect,
  className = '' 
}: MultiStoreManagerProps) {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [removingStoreId, setRemovingStoreId] = useState<string | null>(null)
  const [settingsStore, setSettingsStore] = useState<ShopifyStore | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/shopify/stores')
      if (!response.ok) {
        throw new Error('Failed to load stores')
      }
      
      const data = await response.json()
      setStores(data.stores || [])
    } catch (err) {
      console.error('Error loading stores:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStores()
    setRefreshing(false)
  }

  const handleSetPrimary = async (storeId: string) => {
    try {
      const response = await fetch(`/api/shopify/stores/${storeId}/set-primary`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to set primary store')
      }
      
      await loadStores()
    } catch (err) {
      console.error('Error setting primary store:', err)
    }
  }

  const handleToggleActive = async (storeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/shopify/stores/${storeId}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Failed to toggle store status (${response.status})`
        console.error('API Error:', errorMessage)
        throw new Error(errorMessage)
      }

      await loadStores()
    } catch (err) {
      console.error('Error toggling store status:', err)
      // You could add a toast notification here to show the error to the user
      setError(err instanceof Error ? err.message : 'Failed to toggle store status')
    }
  }

  const handleRemoveStore = async (storeId: string, storeName: string) => {
    // Prevent removing primary store
    const store = stores.find(s => s.id === storeId)
    if (store?.is_primary && stores.length > 1) {
      alert('Cannot remove the primary store. Please set another store as primary first.')
      return
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to remove "${storeName}"?\n\nThis will permanently delete all store data, connections, and configurations. This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setRemovingStoreId(storeId)

      const response = await fetch('/api/shopify/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          storeId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove store')
      }

      // Reload stores after successful removal
      await loadStores()
    } catch (err) {
      console.error('Error removing store:', err)
      alert(`Failed to remove store: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setRemovingStoreId(null)
    }
  }

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getPlanIcon = (planName?: string) => {
    if (!planName) return <Store className="w-4 h-4 text-gray-400" />
    
    switch (planName.toLowerCase()) {
      case 'shopify plus':
        return <Crown className="w-4 h-4 text-purple-600" />
      case 'advanced':
        return <Star className="w-4 h-4 text-blue-600" />
      case 'shopify':
        return <Zap className="w-4 h-4 text-orange-600" />
      default:
        return <Store className="w-4 h-4 text-gray-600" />
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount)
  }

  const handleOpenSettings = (store: ShopifyStore) => {
    setSettingsStore(store)
    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
    setSettingsStore(null)
  }

  const handleSettingsSave = async (updatedSettings: Partial<ShopifyStore>) => {
    // Refresh the stores list to reflect changes
    await loadStores()
  }

  const filteredStores = showInactive ? stores : stores.filter(store => store.isActive)
  const activeStores = stores.filter(store => store.isActive)
  const inactiveStores = stores.filter(store => !store.isActive)

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Store Management</h2>
            <p className="text-sm text-gray-600">
              {activeStores.length} active store{activeStores.length !== 1 ? 's' : ''}
              {inactiveStores.length > 0 && ` • ${inactiveStores.length} inactive`}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {inactiveStores.length > 0 && (
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showInactive ? 'Hide' : 'Show'} Inactive</span>
              </button>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            
            {onConnect && (
              <button
                onClick={onConnect}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Store</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load stores</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Store List */}
      <div className="p-6">
        {filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <Ship className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stores connected</h3>
            <p className="text-gray-600 mb-6">
              Connect your first Shopify store to start managing your e-commerce operations with AI.
            </p>
            {onConnect && (
              <button
                onClick={onConnect}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Ship className="w-5 h-5" />
                <span>Connect Store</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredStores.map((store) => (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                    removingStoreId === store.id
                      ? 'border-gray-200 bg-gray-50 opacity-50 pointer-events-none'
                      : selectedStore?.id === store.id
                      ? 'border-orange-500 bg-orange-50'
                      : store.isActive
                      ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                  onClick={() => onStoreSelect?.(store)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Store Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center space-x-2">
                          {getPlanIcon(store.planName)}
                          <h3 className="font-semibold text-gray-900">{store.storeName}</h3>
                          {store.isPrimary && (
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                              Primary
                            </span>
                          )}
                          {!store.isActive && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getSyncStatusIcon(store.syncStatus)}
                          <span className="text-xs text-gray-500 capitalize">{store.syncStatus}</span>
                        </div>
                      </div>

                      {/* Store Details */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{store.shopDomain}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{store.currency}</span>
                        </div>
                        
                        {store.metadata.total_products !== undefined && (
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{store.metadata.total_products} products</span>
                          </div>
                        )}
                        
                        {store.metadata.total_customers !== undefined && (
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{store.metadata.total_customers} customers</span>
                          </div>
                        )}
                      </div>

                      {/* Revenue & Plan */}
                      {(store.metadata.monthly_revenue || store.plan_name) && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          {store.metadata.monthly_revenue && (
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(store.metadata.monthly_revenue, store.currency)} this month
                              </span>
                            </div>
                          )}
                          
                          {store.plan_name && (
                            <span className="text-sm text-gray-600">
                              {store.plan_name} Plan
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const storeUrl = formatShopifyStoreUrl(store.shopDomain)
                          if (storeUrl) {
                            window.open(storeUrl, '_blank')
                          } else {
                            console.error('Invalid store domain:', store.shopDomain)
                            // You could add a toast notification here
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Open store"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(store.id, store.isActive)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={store.isActive ? "Deactivate store" : "Activate store"}
                      >
                        {store.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenSettings(store)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Store settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveStore(store.id, store.storeName)
                        }}
                        disabled={removingStoreId === store.id}
                        className={`p-2 rounded-lg transition-colors ${
                          removingStoreId === store.id
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={removingStoreId === store.id ? "Removing store..." : "Remove store"}
                      >
                        {removingStoreId === store.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Store Settings Modal */}
      <StoreSettingsModal
        isOpen={showSettingsModal}
        onClose={handleCloseSettings}
        store={settingsStore}
        onSave={handleSettingsSave}
      />
    </div>
  )
}
