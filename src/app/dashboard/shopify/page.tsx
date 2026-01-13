"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from '@/lib/auth-context'
import { ShopifyStoreProvider, useShopifyStore } from '@/contexts/ShopifyStoreContext'
import StoreSelector from "@/components/assistant/StoreSelector";
import QuickActionsBar from "@/components/assistant/QuickActionsBar";
import ProductPreviewDock, { ProductDraft, ProductPreviewDockRef } from "@/components/assistant/ProductPreviewDock";
import SimplifiedShopifyAIChat from "@/components/shopify/SimplifiedShopifyAIChat";
import ConnectStoreModal from '@/components/shopify/ConnectStoreModal'
import {
  Anchor,
  Plus
} from 'lucide-react'

// The ShopifyAIChat component handles all chat functionality internally

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
  const { stores, selectedStore, setSelectedStore, hasStores, refreshStores } = useShopifyStore()
  const [showShopifyModal, setShowShopifyModal] = useState(false)
  const [removingStoreId, setRemovingStoreId] = useState<string | null>(null)
  const productPreviewRef = useRef<ProductPreviewDockRef>(null)

  // Handle OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const store = urlParams.get('store')

    if (success === 'store_connected' && store) {
      console.log(`✅ Successfully connected store: ${store}`)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (error) {
      console.error(`❌ OAuth error: ${error}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // ShopifyAIChat handles prompts internally

  const handleNewDraft = (draft: ProductDraft) => {
    productPreviewRef.current?.addDraft(draft)
  }

  const handleDisconnectStore = async () => {
    if (!selectedStore) return

    const confirmed = window.confirm(
      `Disconnect ${selectedStore.storeName} (${selectedStore.shopDomain}) from CrewFlow? This will revoke access and remove it from your dashboard.`
    )
    if (!confirmed) return

    try {
      setRemovingStoreId(selectedStore.id)
      const response = await fetch('/api/shopify/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', storeId: selectedStore.id })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.error('Failed to disconnect store', data)
        alert(data?.error || 'Failed to disconnect store. Please try again.')
        return
      }

      await refreshStores()
    } catch (err) {
      console.error('Error disconnecting store', err)
      alert('Unexpected error while disconnecting store. Please try again.')
    } finally {
      setRemovingStoreId(null)
    }
  }

  // Get current store ID for components
  const currentStoreId = selectedStore?.id || stores[0]?.id || 'no-store'

  return (
    <div className="min-h-screen bg-gray-50">
      {hasStores ? (
        <>
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600/90 to-green-700/90 backdrop-blur-sm text-white p-6 border-b border-green-500/20">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Anchor className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Store Manager</h1>
                  <p className="text-green-100 text-sm">
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
                {selectedStore && (
                  <button
                    onClick={handleDisconnectStore}
                    disabled={removingStoreId === selectedStore.id}
                    className="bg-white/5 backdrop-blur-sm border border-red-400/40 rounded-lg px-4 py-2 text-red-50 hover:bg-red-500/20 hover:border-red-400 transition-colors text-sm"
                  >
                    {removingStoreId === selectedStore.id ? 'Disconnecting…' : `Disconnect ${selectedStore.storeName}`}
                  </button>
                )}
                <div className="text-right">
                  <div className="text-green-100 text-xs">Captain</div>
                  <div className="text-white text-sm font-medium">{user?.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Store Management Hub */}
          <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-4">
            {/* Top bar: store selector + quick actions */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg md:text-xl font-semibold text-slate-800">Store Management</h2>
                <StoreSelector
                  currentStoreId={currentStoreId}
                  initialStores={stores.map(s => ({ id: s.id, name: s.storeName, domain: s.shopDomain }))}
                  navigateTo={(id) => {
                    const store = stores.find(s => s.id === id)
                    if (store) setSelectedStore(store)
                    return `/dashboard/shopify`
                  }}
                />
              </div>
              <div className="hidden md:block">
                <QuickActionsBar onAction={(prompt) => {
                  console.log('Quick action triggered:', prompt)
                  // The ShopifyAIChat component will handle this internally
                }} />
              </div>
            </div>

            {/* Mobile quick actions */}
            <div className="md:hidden mb-3">
              <QuickActionsBar onAction={(prompt) => {
                console.log('Quick action triggered:', prompt)
                // The ShopifyAIChat component will handle this internally
              }} />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
              {/* Advanced Shopify AI Chat - Full Featured */}
              <section className="cf-card flex flex-col h-[calc(100vh-160px)] overflow-hidden">
                <SimplifiedShopifyAIChat
                  className="flex-1 h-full"
                  // For now, we only care about conversational guidance; product preview
                  // will be driven by structured metadata from the AI handler, not by
                  // guessing from the plain text response here.
                />
              </section>

              {/* Product Preview Dock */}
              <section className="cf-card p-3 h-[calc(100vh-160px)] overflow-auto cf-scroll">
                <header className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">Product Preview</h3>
                  <span className="text-xs text-slate-500">Store: {selectedStore?.storeName || 'N/A'}</span>
                </header>
                <div className="cf-sep mb-2" />
                <ProductPreviewDock
                  ref={productPreviewRef}
                  storeId={currentStoreId}
                  onPublished={() => { /* optional toast/refresh */ }}
                />
              </section>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Anchor className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CrewFlow Store Manager</h2>
            <p className="text-gray-600 mb-6">
              Connect your Shopify store to start managing your e-commerce operations with AI-powered assistance.
            </p>
            <button
              onClick={() => setShowShopifyModal(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Connect Your First Store</span>
            </button>
          </div>
        </div>
      )}

      {/* Shopify Connect Modal */}
      <ConnectStoreModal
        isOpen={showShopifyModal}
        onClose={() => setShowShopifyModal(false)}
        onSuccess={(storeDomain) => {
          console.log('✅ Store connection initiated for:', storeDomain)
          setShowShopifyModal(false)
        }}
      />
    </div>
  )
}

