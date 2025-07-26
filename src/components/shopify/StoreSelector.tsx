'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  ChevronDown, 
  Store, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Crown,
  Star,
  Zap,
  Globe,
  Plus,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'

interface StoreSelectorProps {
  onConnect?: () => void
  className?: string
  showAddButton?: boolean
}

export default function StoreSelector({ 
  onConnect, 
  className = '',
  showAddButton = true 
}: StoreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { 
    stores, 
    selectedStore, 
    setSelectedStore, 
    loading, 
    refreshStores,
    hasStores 
  } = useShopifyStore()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-3 h-3 text-green-600" />
      case 'syncing':
        return <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-600" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const getPlanIcon = (planName?: string) => {
    if (!planName) return <Store className="w-3 h-3 text-gray-400" />
    
    switch (planName.toLowerCase()) {
      case 'shopify plus':
        return <Crown className="w-3 h-3 text-purple-600" />
      case 'advanced':
        return <Star className="w-3 h-3 text-blue-600" />
      case 'shopify':
        return <Zap className="w-3 h-3 text-orange-600" />
      default:
        return <Store className="w-3 h-3 text-gray-600" />
    }
  }

  const handleStoreSelect = (store: any) => {
    setSelectedStore(store)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
      </div>
    )
  }

  if (!hasStores) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Store className="w-5 h-5" />
          <span className="text-sm">No stores connected</span>
        </div>
        {showAddButton && onConnect && (
          <button
            onClick={onConnect}
            className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Store</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Store Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-64 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          {selectedStore ? (
            <>
              <div className="flex items-center space-x-2">
                {getPlanIcon(selectedStore.plan_name)}
                <span className="font-medium text-gray-900">{selectedStore.store_name}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                {getSyncStatusIcon(selectedStore.sync_status)}
                {selectedStore.is_primary && (
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    Primary
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Select store</span>
            </div>
          )}
        </div>
        
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {/* Store List */}
            <div className="py-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStoreSelect(store)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedStore?.id === store.id ? 'bg-orange-50 border-r-2 border-orange-500' : ''
                  } ${!store.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getPlanIcon(store.plan_name)}
                        <span className="font-medium text-gray-900">{store.store_name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {getSyncStatusIcon(store.sync_status)}
                        {store.is_primary && (
                          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-medium">
                            Primary
                          </span>
                        )}
                        {!store.is_active && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {selectedStore?.id === store.id && (
                      <CheckCircle className="w-4 h-4 text-orange-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Globe className="w-3 h-3" />
                      <span>{store.shop_domain}</span>
                    </div>
                    {store.plan_name && (
                      <span>{store.plan_name} Plan</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 py-2">
              <button
                onClick={() => {
                  refreshStores()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Stores</span>
              </button>
              
              {showAddButton && onConnect && (
                <button
                  onClick={() => {
                    onConnect()
                    setIsOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Connect New Store</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
