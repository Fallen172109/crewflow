'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

interface ShopifyDebugInfo {
  timestamp: string
  authentication: {
    isAuthenticated: boolean
    userId?: string
    email?: string
  }
  shopifyStores: {
    hasStores: boolean
    storeCount: number
    selectedStore?: any
    error?: string
  }
  shopifyAPI: {
    canReachAPI: boolean
    threadSupport: boolean
    apiResponse?: any
    error?: string
  }
  chatHistory: {
    canLoadHistory: boolean
    messageCount: number
    error?: string
  }
}

export default function ShopifyAIDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<ShopifyDebugInfo | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, userProfile } = useAuth()

  const runShopifyDiagnostics = async () => {
    setIsLoading(true)
    const info: ShopifyDebugInfo = {
      timestamp: new Date().toISOString(),
      authentication: {
        isAuthenticated: !!user,
        userId: user?.id,
        email: user?.email
      },
      shopifyStores: {
        hasStores: false,
        storeCount: 0
      },
      shopifyAPI: {
        canReachAPI: false,
        threadSupport: false
      },
      chatHistory: {
        canLoadHistory: false,
        messageCount: 0
      }
    }

    // Test Shopify stores
    try {
      const storesResponse = await fetch('/api/shopify/stores')
      if (storesResponse.ok) {
        const storesData = await storesResponse.json()
        info.shopifyStores = {
          hasStores: storesData.stores?.length > 0,
          storeCount: storesData.stores?.length || 0,
          selectedStore: storesData.stores?.[0]
        }
      } else {
        info.shopifyStores = {
          hasStores: false,
          storeCount: 0,
          error: `HTTP ${storesResponse.status}: ${storesResponse.statusText}`
        }
      }
    } catch (error) {
      info.shopifyStores = {
        hasStores: false,
        storeCount: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Test Shopify AI API (now prioritizing thread-based endpoint)
    try {
      // Test the thread-based shopify-ai endpoint (primary)
      const testThreadId = `temp-debug-${Date.now()}`
      const aiResponse = await fetch('/api/agents/shopify-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Debug test - what can you help me with?",
          taskType: 'shopify_management',
          threadId: testThreadId,
          attachments: []
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        info.shopifyAPI = {
          canReachAPI: true,
          threadSupport: true,
          apiResponse: {
            status: aiResponse.status,
            hasResponse: !!aiData.response,
            responseLength: aiData.response?.length || 0,
            endpoint: 'shopify-ai/chat (thread-based)'
          }
        }
      } else {
        // Fallback to shopify-management endpoint
        const managementResponse = await fetch('/api/agents/shopify-management', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: "Debug test - what can you help me with?",
            taskType: 'shopify_management',
            conversationHistory: []
          }),
        })

        if (managementResponse.ok) {
          const managementData = await managementResponse.json()
          info.shopifyAPI = {
            canReachAPI: true,
            threadSupport: false,
            apiResponse: {
              status: managementResponse.status,
              hasResponse: !!managementData.response,
              responseLength: managementData.response?.length || 0,
              endpoint: 'shopify-management (fallback)'
            }
          }
        } else {
          info.shopifyAPI = {
            canReachAPI: false,
            threadSupport: false,
            error: `Both endpoints failed. AI: ${aiResponse.status}, Management: ${managementResponse.status}`
          }
        }
      }
    } catch (error) {
      info.shopifyAPI = {
        canReachAPI: false,
        threadSupport: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Test chat history for Shopify AI
    try {
      const historyResponse = await fetch('/api/chat/history?agent=shopify-ai&limit=5')
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        info.chatHistory = {
          canLoadHistory: true,
          messageCount: historyData.messages?.length || 0
        }
      } else {
        info.chatHistory = {
          canLoadHistory: false,
          messageCount: 0,
          error: `HTTP ${historyResponse.status}: ${historyResponse.statusText}`
        }
      }
    } catch (error) {
      info.chatHistory = {
        canLoadHistory: false,
        messageCount: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    setDebugInfo(info)
    setIsLoading(false)
  }

  const testShopifyMessage = async () => {
    try {
      const testMessage = `Debug test: Help me create a product for a blue t-shirt - ${new Date().toISOString()}`
      const testThreadId = `temp-debug-${Date.now()}`

      console.log('🛍️ DEBUG: Testing shopify-ai/chat endpoint...')

      // Use the thread-based shopify-ai/chat endpoint (matches the actual chat)
      const response = await fetch('/api/agents/shopify-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          taskType: 'business_automation',
          threadId: testThreadId,
          attachments: []
        }),
      })

      console.log('🛍️ DEBUG: Response status:', response.status)
      console.log('🛍️ DEBUG: Response headers:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log('🛍️ Shopify Message Test (Thread-based):', data)

      if (response.ok) {
        alert(`✅ Shopify Message Test SUCCESS:\nStatus: ${response.status}\nResponse: ${data.response ? 'Received' : 'None'}\nEndpoint: shopify-ai/chat\nCheck console for details`)
      } else {
        alert(`❌ Shopify Message Test FAILED:\nStatus: ${response.status}\nError: ${data.error || 'Unknown'}\nCheck console for details`)
      }
    } catch (error) {
      console.error('🛍️ Shopify Message Test Error:', error)
      alert(`❌ Shopify Message Test FAILED: ${error}`)
    }
  }

  const testStoreConnection = async () => {
    try {
      const response = await fetch('/api/shopify/stores')
      const data = await response.json()
      console.log('🏪 Store Connection Test:', data)
      alert(`Store Connection Test:\nStatus: ${response.status}\nStores: ${data.stores?.length || 0}\nCheck console for details`)
    } catch (error) {
      console.error('🏪 Store Connection Test Error:', error)
      alert(`Store Connection Test Failed: ${error}`)
    }
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-orange-700"
        >
          🛍️ Shopify Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">🛍️ Shopify AI Debug</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={runShopifyDiagnostics}
            disabled={isLoading}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {isLoading ? 'Running Diagnostics...' : 'Run Shopify Diagnostics'}
          </button>

          <div className="flex space-x-2">
            <button
              onClick={testStoreConnection}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700"
            >
              Test Stores
            </button>
            <button
              onClick={testShopifyMessage}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700"
            >
              Test Message
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  console.log('🛍️ DEBUG: Testing API endpoint existence...')
                  const response = await fetch('/api/agents/shopify-ai/chat', {
                    method: 'OPTIONS'
                  })
                  console.log('🛍️ DEBUG: OPTIONS response:', response.status)
                  alert(`API Endpoint Check:\nStatus: ${response.status}\n${response.status === 200 || response.status === 405 ? '✅ Endpoint exists' : '❌ Endpoint not found'}`)
                } catch (error) {
                  console.error('🛍️ DEBUG: API check error:', error)
                  alert(`❌ API Check Failed: ${error}`)
                }
              }}
              className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-purple-700"
            >
              Check API
            </button>
          </div>

          {debugInfo && (
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <h4 className="font-semibold text-gray-700">Authentication</h4>
                <div className={`p-2 rounded ${debugInfo.authentication.isAuthenticated ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div>Status: {debugInfo.authentication.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</div>
                  {debugInfo.authentication.email && <div>Email: {debugInfo.authentication.email}</div>}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700">Shopify Stores</h4>
                <div className={`p-2 rounded ${debugInfo.shopifyStores.hasStores ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <div>Stores: {debugInfo.shopifyStores.storeCount}</div>
                  {debugInfo.shopifyStores.selectedStore && (
                    <div>Selected: {debugInfo.shopifyStores.selectedStore.name}</div>
                  )}
                  {debugInfo.shopifyStores.error && <div>Error: {debugInfo.shopifyStores.error}</div>}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700">Shopify AI API</h4>
                <div className={`p-2 rounded ${debugInfo.shopifyAPI.canReachAPI ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div>Status: {debugInfo.shopifyAPI.canReachAPI ? '✅ API Working' : '❌ API Failed'}</div>
                  <div>Threads: {debugInfo.shopifyAPI.threadSupport ? '✅ Supported' : '❌ Not Used'}</div>
                  {debugInfo.shopifyAPI.apiResponse && (
                    <div>Endpoint: {debugInfo.shopifyAPI.apiResponse.endpoint}</div>
                  )}
                  {debugInfo.shopifyAPI.error && <div>Error: {debugInfo.shopifyAPI.error}</div>}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700">Chat History</h4>
                <div className={`p-2 rounded ${debugInfo.chatHistory.canLoadHistory ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div>Status: {debugInfo.chatHistory.canLoadHistory ? '✅ Working' : '❌ Failed'}</div>
                  <div>Messages: {debugInfo.chatHistory.messageCount}</div>
                  {debugInfo.chatHistory.error && <div>Error: {debugInfo.chatHistory.error}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
