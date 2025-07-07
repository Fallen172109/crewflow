'use client'

import { useState, useEffect } from 'react'
import { 
  Store, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Settings, 
  ExternalLink,
  Ship,
  Anchor,
  Zap,
  Globe,
  Calendar,
  DollarSign,
  Package,
  Users,
  ShoppingCart
} from 'lucide-react'

interface ShopifyStore {
  id: string
  shop_domain: string
  store_name: string
  store_email?: string
  currency: string
  timezone?: string
  plan_name?: string
  status: 'active' | 'inactive' | 'suspended'
  total_products: number
  total_orders: number
  total_customers: number
  monthly_revenue: number
  last_sync: string
  sync_status: 'pending' | 'syncing' | 'completed' | 'error'
  primary_location_id?: number
  multi_location_enabled: boolean
  created_at: string
}

interface ConnectionProps {
  stores: ShopifyStore[]
  selectedStore: ShopifyStore | null
  onStoreSelect: (store: ShopifyStore) => void
  onConnect: () => void
  onRefresh: () => void
  loading?: boolean
}

export default function ShopifyConnectionStatus({
  stores,
  selectedStore,
  onStoreSelect,
  onConnect,
  onRefresh,
  loading = false
}: ConnectionProps) {
  const [syncing, setSyncing] = useState(false)

  const getConnectionStatus = () => {
    if (stores.length === 0) return 'disconnected'
    if (stores.some(store => store.status === 'active')) return 'connected'
    if (stores.some(store => store.status === 'suspended')) return 'error'
    return 'inactive'
  }

  const getSyncStatus = (store: ShopifyStore) => {
    switch (store.sync_status) {
      case 'completed': return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle }
      case 'syncing': return { color: 'text-blue-600', bg: 'bg-blue-100', icon: RefreshCw }
      case 'error': return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle }
      default: return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100'
      case 'disconnected': return 'text-gray-600 bg-gray-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'inactive': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle
      case 'disconnected': return Clock
      case 'error': return AlertCircle
      case 'inactive': return AlertCircle
      default: return Clock
    }
  }

  const handleSync = async (store: ShopifyStore) => {
    setSyncing(true)
    try {
      // TODO: Implement actual sync API call
      await new Promise(resolve => setTimeout(resolve, 2000)) // Mock delay
      onRefresh()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const connectionStatus = getConnectionStatus()
  const StatusIcon = getStatusIcon(connectionStatus)

  return (
    <div className="space-y-6">
      {/* Main Connection Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(connectionStatus)}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {connectionStatus === 'connected' ? 'Fleet Connected' : 
                 connectionStatus === 'error' ? 'Connection Issues' :
                 connectionStatus === 'inactive' ? 'Fleet Inactive' : 'No Ships Connected'}
              </h3>
              <p className="text-gray-600">
                {connectionStatus === 'connected' ? `${stores.length} Shopify store(s) under command` :
                 connectionStatus === 'error' ? 'Some stores have connection issues' :
                 connectionStatus === 'inactive' ? 'Connected stores are inactive' :
                 'Connect your Shopify stores to begin automated commerce operations'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {stores.length > 0 && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
            {connectionStatus !== 'connected' && (
              <button
                onClick={onConnect}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              >
                <Ship className="w-5 h-5" />
                <span>Connect Store</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Store List */}
      {stores.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Connected Stores</h3>
            <button
              onClick={onConnect}
              className="text-orange-600 hover:text-orange-700 flex items-center space-x-2 text-sm font-medium"
            >
              <Ship className="w-4 h-4" />
              <span>Add Store</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stores.map((store) => {
              const syncStatus = getSyncStatus(store)
              const SyncIcon = syncStatus.icon
              const isSelected = selectedStore?.id === store.id

              return (
                <div
                  key={store.id}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => onStoreSelect(store)}
                >
                  {/* Store Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                        <Store className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{store.store_name}</h4>
                        <p className="text-sm text-gray-600">{store.shop_domain}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        store.status === 'active' ? 'bg-green-100 text-green-700' :
                        store.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {store.status}
                      </div>
                    </div>
                  </div>

                  {/* Store Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Products:</span>
                      <span className="font-medium">{store.total_products.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <ShoppingCart className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Orders:</span>
                      <span className="font-medium">{store.total_orders.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Customers:</span>
                      <span className="font-medium">{store.total_customers.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-medium">${store.monthly_revenue.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Store Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{store.currency}</span>
                      </div>
                      {store.plan_name && (
                        <div className="flex items-center space-x-1">
                          <Zap className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{store.plan_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${syncStatus.bg} ${syncStatus.color}`}>
                        <SyncIcon className={`w-3 h-3 ${store.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                        <span className="capitalize">{store.sync_status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Last Sync */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Last sync: {new Date(store.last_sync).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSync(store)
                      }}
                      disabled={syncing || store.sync_status === 'syncing'}
                      className="flex items-center space-x-1 text-orange-600 hover:text-orange-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Store Details */}
      {selectedStore && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedStore.store_name} - Command Details
            </h3>
            <div className="flex items-center space-x-3">
              <a
                href={`https://${selectedStore.shop_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Visit Store</span>
              </a>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 text-sm">
                <Settings className="w-4 h-4" />
                <span>Configure</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Store Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Domain:</span>
                  <span className="font-medium">{selectedStore.shop_domain}</span>
                </div>
                {selectedStore.store_email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{selectedStore.store_email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium">{selectedStore.currency}</span>
                </div>
                {selectedStore.timezone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timezone:</span>
                    <span className="font-medium">{selectedStore.timezone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium">{selectedStore.plan_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Multi-location:</span>
                  <span className={`font-medium ${selectedStore.multi_location_enabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {selectedStore.multi_location_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium capitalize ${
                    selectedStore.status === 'active' ? 'text-green-600' :
                    selectedStore.status === 'suspended' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {selectedStore.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Performance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Revenue:</span>
                  <span className="font-medium text-green-600">
                    ${selectedStore.monthly_revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Orders:</span>
                  <span className="font-medium">{selectedStore.total_orders.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Connected:</span>
                  <span className="font-medium">{new Date(selectedStore.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
