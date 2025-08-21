'use client'

import { useEffect, useState } from 'react'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import { Store, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

interface StoreInfo {
  id: string
  storeName: string
  domain: string
  isConnected: boolean
  lastSync?: string
  planName?: string
  email?: string
}

export default function StoreConnectionStatus() {
  const { selectedStore, stores, isLoading } = useShopifyStore()
  const [storeDetails, setStoreDetails] = useState<StoreInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedStore) {
      fetchStoreDetails(selectedStore.id)
    }
  }, [selectedStore])

  const fetchStoreDetails = async (storeId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shopify/store-info?storeId=${storeId}`)
      if (response.ok) {
        const data = await response.json()
        setStoreDetails(data.store)
      }
    } catch (error) {
      console.error('Error fetching store details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-800">Checking store connection...</span>
        </div>
      </div>
    )
  }

  if (!selectedStore) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">No Shopify store connected</span>
        </div>
        <p className="text-xs text-yellow-700 mt-1">
          Go to <a href="/dashboard/shopify" className="underline">Shopify Dashboard</a> to connect a store
        </p>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Store className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-green-900">{selectedStore.storeName}</h4>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm text-green-700">{selectedStore.domain}</p>
            {storeDetails && (
              <div className="mt-1 space-y-1">
                {storeDetails.email && (
                  <p className="text-xs text-green-600">Owner: {storeDetails.email}</p>
                )}
                {storeDetails.planName && (
                  <p className="text-xs text-green-600">Plan: {storeDetails.planName}</p>
                )}
                {storeDetails.lastSync && (
                  <p className="text-xs text-green-600">
                    Last sync: {new Date(storeDetails.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <a
            href={`https://${selectedStore.domain}/admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
          >
            <span>Admin</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={`https://${selectedStore.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
          >
            <span>Store</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {stores.length > 1 && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-700 mb-2">
            Other connected stores ({stores.length - 1}):
          </p>
          <div className="flex flex-wrap gap-2">
            {stores
              .filter(store => store.id !== selectedStore.id)
              .map(store => (
                <span
                  key={store.id}
                  className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                >
                  {store.storeName}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-green-200">
        <p className="text-xs text-green-700">
          ✅ Products published through this test will be added to <strong>{selectedStore.storeName}</strong>
        </p>
      </div>
    </div>
  )
}
