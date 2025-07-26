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

interface ShopifyStore {
  id: string
  shop_domain: string
  store_name: string
  store_email?: string
  currency: string
  timezone?: string
  plan_name?: string
  is_active: boolean
  is_primary: boolean
  connected_at: string
  last_sync_at?: string
  sync_status: 'never' | 'syncing' | 'synced' | 'error'
  sync_error?: string
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
        throw new Error('Failed to toggle store status')
      }
      
      await loadStores()
    } catch (err) {
      console.error('Error toggling store status:', err)
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

  const filteredStores = showInactive ? stores : stores.filter(store => store.is_active)
  const activeStores = stores.filter(store => store.is_active)
  const inactiveStores = stores.filter(store => !store.is_active)

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
                    selectedStore?.id === store.id
                      ? 'border-orange-500 bg-orange-50'
                      : store.is_active
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
                          {getPlanIcon(store.plan_name)}
                          <h3 className="font-semibold text-gray-900">{store.store_name}</h3>
                          {store.is_primary && (
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                              Primary
                            </span>
                          )}
                          {!store.is_active && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getSyncStatusIcon(store.sync_status)}
                          <span className="text-xs text-gray-500 capitalize">{store.sync_status}</span>
                        </div>
                      </div>

                      {/* Store Details */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{store.shop_domain}</span>
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
                          window.open(`https://${store.shop_domain}`, '_blank')
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Open store"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: Open store settings modal
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Store settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
