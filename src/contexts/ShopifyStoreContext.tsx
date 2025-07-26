'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

interface ShopifyStoreContextType {
  stores: ShopifyStore[]
  selectedStore: ShopifyStore | null
  primaryStore: ShopifyStore | null
  loading: boolean
  error: string | null
  setSelectedStore: (store: ShopifyStore | null) => void
  refreshStores: () => Promise<void>
  hasStores: boolean
  hasActiveStores: boolean
}

const ShopifyStoreContext = createContext<ShopifyStoreContextType | undefined>(undefined)

interface ShopifyStoreProviderProps {
  children: ReactNode
}

export function ShopifyStoreProvider({ children }: ShopifyStoreProviderProps) {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primaryStore = stores.find(store => store.is_primary) || null
  const hasStores = stores.length > 0
  const hasActiveStores = stores.some(store => store.is_active)

  const refreshStores = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/shopify/stores')
      if (!response.ok) {
        throw new Error('Failed to fetch stores')
      }
      
      const data = await response.json()
      const fetchedStores = data.stores || []
      
      setStores(fetchedStores)
      
      // Auto-select primary store if no store is selected
      if (!selectedStore && fetchedStores.length > 0) {
        const primary = fetchedStores.find((store: ShopifyStore) => store.is_primary)
        const firstActive = fetchedStores.find((store: ShopifyStore) => store.is_active)
        setSelectedStore(primary || firstActive || fetchedStores[0])
      }
      
      // Update selected store if it's no longer in the list
      if (selectedStore && !fetchedStores.find((store: ShopifyStore) => store.id === selectedStore.id)) {
        const primary = fetchedStores.find((store: ShopifyStore) => store.is_primary)
        const firstActive = fetchedStores.find((store: ShopifyStore) => store.is_active)
        setSelectedStore(primary || firstActive || fetchedStores[0] || null)
      }
      
    } catch (err) {
      console.error('Error fetching stores:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshStores()
  }, [])

  // Auto-select primary store when stores change
  useEffect(() => {
    if (stores.length > 0 && !selectedStore) {
      const primary = stores.find(store => store.is_primary)
      const firstActive = stores.find(store => store.is_active)
      setSelectedStore(primary || firstActive || stores[0])
    }
  }, [stores, selectedStore])

  const value: ShopifyStoreContextType = {
    stores,
    selectedStore,
    primaryStore,
    loading,
    error,
    setSelectedStore,
    refreshStores,
    hasStores,
    hasActiveStores
  }

  return (
    <ShopifyStoreContext.Provider value={value}>
      {children}
    </ShopifyStoreContext.Provider>
  )
}

export function useShopifyStore() {
  const context = useContext(ShopifyStoreContext)
  if (context === undefined) {
    throw new Error('useShopifyStore must be used within a ShopifyStoreProvider')
  }
  return context
}

// Hook for getting store-specific agent context
export function useStoreAgentContext(agentId: string) {
  const { selectedStore } = useShopifyStore()
  
  if (!selectedStore || !agentId) {
    return {
      hasAccess: false,
      permissions: [],
      storeInfo: null
    }
  }
  
  const agentAccess = selectedStore.agent_access[agentId]
  
  return {
    hasAccess: agentAccess?.enabled || false,
    permissions: agentAccess?.permissions || [],
    storeInfo: {
      id: selectedStore.id,
      name: selectedStore.store_name,
      domain: selectedStore.shop_domain,
      currency: selectedStore.currency,
      plan: selectedStore.plan_name,
      permissions: selectedStore.permissions,
      metadata: selectedStore.metadata
    }
  }
}

// Hook for checking if user has required permissions
export function useStorePermissions() {
  const { selectedStore } = useShopifyStore()
  
  const hasPermission = (permission: keyof ShopifyStore['permissions']) => {
    return selectedStore?.permissions[permission] || false
  }
  
  const canManageProducts = hasPermission('write_products')
  const canViewProducts = hasPermission('read_products')
  const canManageOrders = hasPermission('write_orders')
  const canViewOrders = hasPermission('read_orders')
  const canViewCustomers = hasPermission('read_customers')
  const canViewAnalytics = hasPermission('read_analytics')
  const canManageInventory = hasPermission('write_inventory')
  const canViewInventory = hasPermission('read_inventory')
  
  return {
    hasPermission,
    canManageProducts,
    canViewProducts,
    canManageOrders,
    canViewOrders,
    canViewCustomers,
    canViewAnalytics,
    canManageInventory,
    canViewInventory,
    permissions: selectedStore?.permissions || {}
  }
}
