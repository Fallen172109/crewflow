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
  Trash2,
  Crown,
  Star,
  Globe,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'

interface EnhancedStoreManagerProps {
  onConnect?: () => void
  className?: string
}

interface StoreAction {
  type: 'remove' | 'settings' | 'setPrimary' | 'sync'
  storeId: string
  storeName: string
}

export default function EnhancedStoreManager({
  onConnect,
  className = ''
}: EnhancedStoreManagerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<StoreAction | null>(null)
  
  const { 
    stores, 
    selectedStore, 
    setSelectedStore, 
    loading, 
    refreshStores,
    hasStores 
  } = useShopifyStore()

  const handleRefresh = async () => {
    setIsLoading(true)
    await refreshStores()
    setIsLoading(false)
  }

  const handleStoreAction = async (action: StoreAction) => {
    setActionLoading(action.storeId)

    try {
      const response = await fetch('/api/shopify/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action.type,
          storeId: action.storeId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Action failed')
      }

      // Refresh stores after successful action
      await refreshStores()

      // Show success message (you can add a toast notification here)
      console.log(`✅ ${action.type} action completed successfully for ${action.storeName}`)

    } catch (error) {
      console.error(`❌ Failed to ${action.type} store:`, error)
      // Show error message (you can add a toast notification here)
      alert(`Failed to ${action.type} store: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
      setShowConfirmDialog(null)
    }
  }

  const handleRemoveStore = (storeId: string, storeName: string) => {
    setShowConfirmDialog({
      type: 'remove',
      storeId,
      storeName
    })
  }

  const handleStoreSettings = (storeId: string, storeName: string) => {
    // For now, we'll just show an alert. You can implement a proper settings modal later
    alert(`Store settings for ${storeName} - Feature coming soon!`)
  }

  const getPlanIcon = (planName?: string) => {
    switch (planName?.toLowerCase()) {
      case 'shopify plus':
      case 'plus':
        return <Crown className="w-4 h-4 text-purple-600" />
      case 'advanced':
        return <Star className="w-4 h-4 text-blue-600" />
      case 'professional':
        return <Zap className="w-4 h-4 text-orange-600" />
      default:
        return <Store className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never synced'
    const date = new Date(lastSync)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  return (
    <div className={`${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Store Management</h3>
              <p className="text-sm text-gray-600">
                {hasStores ? `${stores.length} store${stores.length !== 1 ? 's' : ''} connected` : 'No stores connected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasStores && (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh stores"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
                  <span className="ml-2 text-gray-600">Loading stores...</span>
                </div>
              ) : !hasStores ? (
                <div className="text-center py-8">
                  <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No stores connected</h4>
                  <p className="text-gray-600 mb-6">Connect your first Shopify store to get started</p>
                  {onConnect && (
                    <button
                      onClick={onConnect}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Connect Your First Store</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Connected Stores */}
                  {stores.map((store) => (
                    <div
                      key={store.id}
                      className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer ${
                        selectedStore?.id === store.id
                          ? 'border-orange-300 bg-orange-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedStore(store)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getPlanIcon(store.plan_name)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{store.storeName}</h4>
                              {store.isPrimary && (
                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600">{store.shopDomain}</span>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(store.syncStatus)}
                                <span className="text-xs text-gray-500">
                                  {formatLastSync(store.lastSync)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`https://${store.shopDomain}`, '_blank')
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Open store"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStoreSettings(store.id, store.storeName)
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Store settings"
                            disabled={actionLoading === store.id}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveStore(store.id, store.storeName)
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove store"
                            disabled={actionLoading === store.id}
                          >
                            {actionLoading === store.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Store Button */}
                  {onConnect && (
                    <button
                      onClick={onConnect}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 flex items-center justify-center space-x-2 text-gray-600 hover:text-orange-600"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Connect Another Store</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Store</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to remove <strong>{showConfirmDialog.storeName}</strong>?
              This will disconnect the store and remove all associated data.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={actionLoading !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStoreAction(showConfirmDialog)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                disabled={actionLoading !== null}
              >
                {actionLoading === showConfirmDialog.storeId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Store</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
