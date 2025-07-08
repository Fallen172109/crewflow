'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { handleAuthError } from '@/lib/auth-error-handler'
import ShopifyConnectionStatus from '@/components/shopify/ShopifyConnectionStatus'
import ProductManagement from '@/components/shopify/ProductManagement'
import OrderManagement from '@/components/shopify/OrderManagement'
import AnalyticsDashboard from '@/components/shopify/AnalyticsDashboard'
import {
  Store,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Zap,
  Ship,
  Anchor
} from 'lucide-react'

interface ShopifyStore {
  id: string
  shop_domain: string
  store_name: string
  currency: string
  status: 'active' | 'inactive' | 'suspended'
  total_products: number
  total_orders: number
  total_customers: number
  monthly_revenue: number
  last_sync: string
}

interface StoreMetrics {
  totalRevenue: number
  ordersToday: number
  productsCount: number
  customersCount: number
  conversionRate: number
  averageOrderValue: number
}

export default function ShopifyDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null)
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')

  useEffect(() => {
    loadShopifyData()

    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const store = urlParams.get('store')

    if (success === 'store_connected' && store) {
      // Show success message
      console.log(`Successfully connected store: ${store}`)
      // You could show a toast notification here
    } else if (error) {
      // Show error message
      console.error(`OAuth error: ${error}`)
      // You could show an error toast here
    }
  }, [])

  const loadShopifyData = async () => {
    try {
      setLoading(true)

      // Load real Shopify stores from API
      const response = await fetch('/api/shopify/stores')
      if (response.ok) {
        const data = await response.json()
        const stores = data.stores || []

        // Transform API data to component format
        const transformedStores: ShopifyStore[] = stores.map((store: any) => ({
          id: store.id,
          shop_domain: store.shop_domain,
          store_name: store.store_name,
          currency: store.currency,
          status: store.is_active ? 'active' : 'inactive',
          total_products: store.sync_data?.products || 0,
          total_orders: store.sync_data?.orders || 0,
          total_customers: store.sync_data?.customers || 0,
          monthly_revenue: store.sync_data?.revenue || 0,
          last_sync: store.last_sync_at || store.connected_at
        }))

        setStores(transformedStores)
        setSelectedStore(transformedStores.find(s => s.status === 'active') || transformedStores[0] || null)

        // Calculate metrics from stores
        if (transformedStores.length > 0) {
          const totalRevenue = transformedStores.reduce((sum, store) => sum + store.monthly_revenue, 0)
          const totalProducts = transformedStores.reduce((sum, store) => sum + store.total_products, 0)
          const totalOrders = transformedStores.reduce((sum, store) => sum + store.total_orders, 0)
          const totalCustomers = transformedStores.reduce((sum, store) => sum + store.total_customers, 0)

          const metrics: StoreMetrics = {
            totalRevenue,
            ordersToday: Math.floor(totalOrders * 0.05), // Estimate 5% of orders are today
            productsCount: totalProducts,
            customersCount: totalCustomers,
            conversionRate: totalOrders > 0 ? (totalOrders / totalCustomers) * 100 : 0,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
          }

          setMetrics(metrics)
          setConnectionStatus('connected')
        } else {
          setMetrics(null)
          setConnectionStatus('disconnected')
        }
      } else {
        console.error('Failed to load stores:', response.statusText)
        setStores([])
        setMetrics(null)
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Failed to load Shopify data:', error)

      // Handle auth errors gracefully
      await handleAuthError(error)

      setStores([])
      setMetrics(null)
      setConnectionStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Command Center', icon: Anchor },
    { id: 'products', label: 'Cargo Manifest', icon: Package },
    { id: 'orders', label: 'Ship Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Crew Registry', icon: Users },
    { id: 'analytics', label: 'Navigation Charts', icon: BarChart3 },
    { id: 'automation', label: 'Auto-Pilot', icon: Zap },
    { id: 'settings', label: 'Ship Settings', icon: Settings }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100'
      case 'disconnected': return 'text-gray-600 bg-gray-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle
      case 'disconnected': return Clock
      case 'error': return AlertCircle
      default: return Clock
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Ship className="w-12 h-12 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading your maritime commerce command center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-8 rounded-lg mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Store className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Shopify Command Center</h1>
                <p className="text-orange-100 mt-2">
                  Navigate your e-commerce fleet with AI-powered automation
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-orange-100 text-sm">Captain on Deck</div>
              <div className="text-white font-medium">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Connection Status and Store Management */}
        <ShopifyConnectionStatus
          stores={stores}
          selectedStore={selectedStore}
          onStoreSelect={setSelectedStore}
          onConnect={() => {
            // Redirect to Shopify OAuth flow
            const shopDomain = prompt('Enter your Shopify store domain (e.g., mystore.myshopify.com):')
            if (shopDomain) {
              const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
              window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(cleanDomain)}`
            }
          }}
          onRefresh={loadShopifyData}
          loading={loading}
        />

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Fleet Overview</h2>

                {/* Metrics Grid */}
                {metrics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100">Monthly Revenue</p>
                          <p className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-200" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100">Orders Today</p>
                          <p className="text-2xl font-bold">{metrics.ordersToday}</p>
                        </div>
                        <ShoppingCart className="w-8 h-8 text-blue-200" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100">Total Products</p>
                          <p className="text-2xl font-bold">{metrics.productsCount}</p>
                        </div>
                        <Package className="w-8 h-8 text-purple-200" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100">Customers</p>
                          <p className="text-2xl font-bold">{metrics.customersCount}</p>
                        </div>
                        <Users className="w-8 h-8 text-orange-200" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center py-12">
                  <Ship className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Your Maritime Commerce Fleet Awaits
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Navigate through the tabs above to manage your Shopify operations with AI-powered automation.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'orders' && <OrderManagement />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}

            {['customers', 'automation', 'settings'].includes(activeTab) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {(() => {
                    const TabIcon = tabs.find(t => t.id === activeTab)?.icon || Package
                    return <TabIcon className="w-8 h-8 text-orange-600" />
                  })()}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tabs.find(t => t.id === activeTab)?.label} - Coming Soon
                </h3>
                <p className="text-gray-600">
                  This section is under construction. Our crew is working hard to bring you comprehensive Shopify management tools.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
