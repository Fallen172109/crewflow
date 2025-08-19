"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from '@/lib/auth-context'
import { ShopifyStoreProvider, useShopifyStore } from '@/contexts/ShopifyStoreContext'
import StoreSelector from "@/components/assistant/StoreSelector";
import ThreadsSidebar from "@/components/assistant/ThreadsSidebar";
import QuickActionsBar from "@/components/assistant/QuickActionsBar";
import ProductPreviewDock, { ProductDraft, ProductPreviewDockRef } from "@/components/assistant/ProductPreviewDock";
import StoreChatPanel from "@/components/assistant/StoreChatPanel";
import ConnectStoreModal from '@/components/shopify/ConnectStoreModal'
import {
  Anchor,
  Plus
} from 'lucide-react'

/** Unified chat API integration */
async function sendStoreManagerMessage(message: string, opts?: any) {
  try {
    const requestBody = {
      message,
      chatType: "ai-store-manager",
      taskType: "business_automation",
      attachments: opts?.attachments || [],
      threadId: opts?.threadId || `temp-${Date.now()}`,
      context: {
        storeId: opts?.context?.storeId,
        ...opts?.context
      },
    };

    console.log('🔍 Sending chat request:', requestBody);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('🚨 Chat API Error:', res.status, errorText);
      throw new Error(`Chat API failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    console.log('🔍 Chat API Response:', data);
    return data;
  } catch (error) {
    console.error('🚨 sendStoreManagerMessage Error:', error);
    throw error;
  }
}

/** Thread creation with store context */
async function createThread(storeId: string): Promise<string> {
  const res = await fetch("/api/chat/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentName: 'ai_store_manager',
      taskType: 'business_automation',
      title: `AI Store Manager - ${new Date().toLocaleDateString()}`,
      context: `Managing Shopify store: ${storeId}`
    }),
  });
  if (res.ok) {
    const json = await res.json();
    return json?.thread?.id || json?.threadId || json?.id || crypto.randomUUID();
  }
  return crypto.randomUUID();
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
  const { stores, selectedStore, setSelectedStore, hasStores } = useShopifyStore()
  const [threadId, setThreadId] = useState<string | undefined>(undefined)
  const [pendingPrompt, setPendingPrompt] = useState<string>("")
  const [showShopifyModal, setShowShopifyModal] = useState(false)
  const productPreviewRef = useRef<ProductPreviewDockRef>(null)

  // Auto-create thread when store is selected
  useEffect(() => {
    if (selectedStore && !threadId) {
      createThread(selectedStore.id).then(newThreadId => {
        console.log('🧵 Auto-created thread for store:', selectedStore.id, 'Thread ID:', newThreadId)
        setThreadId(newThreadId)
      }).catch(error => {
        console.error('Failed to auto-create thread:', error)
        // Fallback to temporary thread ID
        setThreadId(`temp-${Date.now()}`)
      })
    }
  }, [selectedStore, threadId])

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

  const sendPrompt = async (prompt: string) => {
    setPendingPrompt(prompt)
  }

  const handleNewDraft = (draft: ProductDraft) => {
    productPreviewRef.current?.addDraft(draft)
  }

  // Show no stores message if needed
  if (!hasStores) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Anchor className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CrewFlow Store Manager</h2>
          <p className="text-gray-600 mb-6">
            Connect your Shopify store to start managing your e-commerce operations with AI-powered assistance.
          </p>
          <button
            onClick={() => setShowShopifyModal(true)}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Connect Your First Store</span>
          </button>
        </div>
      </div>
    )
  }

  // Get current store ID for components
  const currentStoreId = selectedStore?.id || stores[0]?.id || 'no-store'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600/90 to-orange-700/90 backdrop-blur-sm text-white p-6 border-b border-orange-500/20">
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
            <QuickActionsBar onAction={sendPrompt} />
          </div>
        </div>

        {/* Mobile quick actions */}
        <div className="md:hidden mb-3">
          <QuickActionsBar onAction={sendPrompt} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.9fr)]">
          {/* Threads Sidebar */}
          <ThreadsSidebar
            storeId={currentStoreId}
            threadId={threadId}
            onSelect={(id) => setThreadId(id)}
            onNewThread={() => createThread(currentStoreId)}
          />

          {/* Chat */}
          <section className="cf-card p-3 flex flex-col h-[calc(100vh-160px)]">
            <header className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-70 text-slate-600">AI Store Assistant</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 border border-slate-200 text-slate-600">
                  Thread: {threadId ? threadId.slice(0,6) : "new"}
                </span>
              </div>
              <button
                className="text-xs px-2 py-1 rounded-md bg-[#ff6a3d] text-white hover:opacity-90"
                onClick={async () => setThreadId(await createThread(currentStoreId))}
              >
                New Thread
              </button>
            </header>

            <div className="flex-1 min-h-0">
              <StoreChatPanel
                storeId={currentStoreId}
                sendStoreManagerMessage={(msg, opts) =>
                  sendStoreManagerMessage(msg, { ...opts, threadId, context: { ...(opts?.context || {}), storeId: currentStoreId } })
                }
                onNewDraft={handleNewDraft}
                renderToolbar={({ text, setText, busy, submit }) => (
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ff6a3d] focus:ring-2 focus:ring-orange-100"
                      placeholder={pendingPrompt ? pendingPrompt : 'Ask me to create products, manage orders…'}
                      value={pendingPrompt ? pendingPrompt : text}
                      onChange={(e) => { setPendingPrompt(""); setText(e.target.value); }}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey ? submit() : null}
                      disabled={busy}
                    />
                    <button
                      onClick={() => { if (pendingPrompt) { setText(pendingPrompt); setPendingPrompt(""); } submit(); }}
                      disabled={busy}
                      className="rounded-lg px-4 py-2 bg-[#ff6a3d] text-white hover:opacity-90 disabled:opacity-50 cf-glow"
                    >
                      {busy ? "Sending…" : "Send"}
                    </button>
                  </div>
                )}
              />
            </div>
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

