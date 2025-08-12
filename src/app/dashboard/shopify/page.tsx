'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { handleAuthError } from '@/lib/auth-error-handler'
import { ShopifyStoreProvider } from '@/contexts/ShopifyStoreContext'
import EnhancedStoreManager from '@/components/shopify/EnhancedStoreManager'
import SimplifiedShopifyAIChat from '@/components/shopify/SimplifiedShopifyAIChat'
import ConnectStoreModal from '@/components/shopify/ConnectStoreModal'
import BottomManagementPanel from '@/components/shopify/BottomManagementPanel'
// import { BeamsBackground } from '@/components/ui/beams-background' // TEMPORARILY DISABLED
import {
  Anchor,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Ship
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

// Wrapper component with ShopifyStoreProvider
export default function ShopifyDashboard() {
  return (
    <ShopifyStoreProvider>
      <ShopifyDashboardContent />
    </ShopifyStoreProvider>
  )
}

function ShopifyDashboardContent() {
  const { user } = useAuth()
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null)
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [showShopifyModal, setShowShopifyModal] = useState(false)
  const [productPreview, setProductPreview] = useState<any>(null)
  const [isGeneratingProduct, setIsGeneratingProduct] = useState(false)
  const chatRef = useRef<any>(null)

  useEffect(() => {
    // Check for OAuth callback parameters first
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const store = urlParams.get('store')
    const details = urlParams.get('details')

    if (success === 'store_connected' && store) {
      // Show success message
      console.log(`✅ Successfully connected store: ${store}`)
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname)
      // Load data after successful connection
      setTimeout(() => loadShopifyData(), 1000) // Small delay to ensure backend processing is complete
    } else if (error) {
      // Show error message
      console.error(`❌ OAuth error: ${error}`, details ? `Details: ${details}` : '')
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname)
      // Load data anyway to show current state
      loadShopifyData()
    } else {
      // Normal page load
      loadShopifyData()
    }
  }, [])

  const loadShopifyData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading Shopify data...')

      // Load real Shopify stores from API
      const response = await fetch('/api/shopify/stores')
      if (response.ok) {
        const data = await response.json()
        const stores = data.stores || []
        console.log('✅ Shopify stores loaded:', { count: stores.length, stores: stores.map((s: any) => ({ id: s.id, name: s.store_name, domain: s.shop_domain })) })

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
        console.error('❌ Failed to load stores:', response.status, response.statusText)
        // Try to get error details
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Error details:', errorData)

        setStores([])
        setMetrics(null)
        setConnectionStatus(response.status === 401 ? 'disconnected' : 'error')
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

  // Handle quick actions from bottom panel
  const handleQuickAction = (action: string, message: string) => {
    // Set generating state for product creation actions
    if (action.toLowerCase().includes('product') || action.toLowerCase().includes('listing')) {
      setIsGeneratingProduct(true)
      setProductPreview(null)
    }

    if (chatRef.current && chatRef.current.sendMessage) {
      chatRef.current.sendMessage(message)
    }
  }

  // Refresh chat threads
  const refreshChatThreads = () => {
    if (chatRef.current && chatRef.current.refreshThreads) {
      chatRef.current.refreshThreads()
    }
  }

  // Handle product creation from AI chat
  const handleProductCreated = (product: any) => {
    console.log('Product created:', product)
    setProductPreview(product)
    setIsGeneratingProduct(false)
  }

  // Handle publishing to Shopify
  const handlePublishToShopify = async (product: any) => {
    try {
      console.log('Publishing product to Shopify:', product)

      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          product: {
            title: product.title,
            body_html: product.description,
            vendor: selectedStore?.store_name || 'CrewFlow Store',
            product_type: product.category || 'General',
            tags: product.tags?.join(', ') || '',
            variants: [{
              price: product.price || '0.00',
              inventory_quantity: 100,
              inventory_management: 'shopify'
            }]
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Product published successfully:', result)

        // Clear the preview after successful publish
        setProductPreview(null)

        // Show success message in chat
        if (chatRef.current && chatRef.current.addAgentResponse) {
          chatRef.current.addAgentResponse(
            `✅ Product "${product.title}" has been successfully published to your Shopify store!`,
            'product_creation'
          )
        }
      } else {
        throw new Error(`Failed to publish product: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Error publishing product:', error)

      // Show error message in chat
      if (chatRef.current && chatRef.current.addAgentResponse) {
        chatRef.current.addAgentResponse(
          `❌ Sorry, there was an error publishing the product to Shopify. Please try again.`,
          'product_creation'
        )
      }
    }
  }

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Optimized Animated Background - TEMPORARILY DISABLED */}
      {/* <BeamsBackground
        intensity="medium"
        className="absolute inset-0 z-10 pointer-events-none"
      /> */}

      <div className="relative z-20 min-h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600/90 to-orange-700/90 backdrop-blur-sm text-white p-6 border-b border-orange-500/20 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Anchor className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Store Manager</h1>
                <p className="text-orange-100 text-sm">
                  AI-powered Shopify management hub
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowShopifyModal(true)}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white hover:bg-white/20 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Connect Store</span>
              </button>
              <div className="text-right">
                <div className="text-orange-100 text-xs">Captain</div>
                <div className="text-white text-sm font-medium">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Management Section */}
        <div className="max-w-7xl mx-auto w-full px-6 pb-4">
          <EnhancedStoreManager
            onConnect={() => setShowShopifyModal(true)}
            className="bg-white/90 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg"
          />
        </div>

        {/* Main Content Area - Central AI Chat */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-6 overflow-hidden">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl h-[calc(100vh-360px)] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">AI Store Assistant</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Complete Shopify management through intelligent conversations
                  </p>
                </div>
                {connectionStatus === 'connected' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Store Connected</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-gray-50/80 backdrop-blur-sm overflow-hidden">
              <SimplifiedShopifyAIChat
                ref={chatRef}
                className="h-full"
                onProductCreated={handleProductCreated}
              />
            </div>
          </div>
        </div>

        {/* Bottom Management Panel with Spotlight Cards and Product Preview */}
        <div className="flex-shrink-0">
          <BottomManagementPanel
            className="border-t border-white/20"
            onQuickAction={handleQuickAction}
            productPreview={productPreview}
            isGeneratingProduct={isGeneratingProduct}
            onPublishToShopify={handlePublishToShopify}
          />
        </div>
      </div>

      {/* Shopify Connect Modal */}
      <ConnectStoreModal
        isOpen={showShopifyModal}
        onClose={() => setShowShopifyModal(false)}
        onSuccess={(storeDomain) => {
          console.log('✅ Store connection initiated for:', storeDomain)
          setShowShopifyModal(false)
          // Note: Data will be refreshed when OAuth callback completes
        }}
      />
    </div>
  )
}

