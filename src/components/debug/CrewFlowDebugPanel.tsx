'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

interface DebugInfo {
  timestamp: string
  authentication: {
    isAuthenticated: boolean
    userId?: string
    email?: string
    role?: string
    subscriptionTier?: string
  }
  database: {
    canConnect: boolean
    chatHistoryCount?: number
    lastMessage?: any
    error?: string
  }
  network: {
    canReachAPI: boolean
    apiResponse?: any
    error?: string
  }
  environment: {
    nodeEnv: string
    userAgent: string
    url: string
  }
}

export default function CrewFlowDebugPanel({ agentId }: { agentId: string }) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, userProfile } = useAuth()

  const runDiagnostics = async () => {
    setIsLoading(true)
    const info: DebugInfo = {
      timestamp: new Date().toISOString(),
      authentication: {
        isAuthenticated: !!user,
        userId: user?.id,
        email: user?.email,
        role: userProfile?.role,
        subscriptionTier: userProfile?.subscription_tier
      },
      database: {
        canConnect: false
      },
      network: {
        canReachAPI: false
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    }

    // Test database connection
    try {
      const historyResponse = await fetch(`/api/chat/history?agent=${agentId}&limit=5`)
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        info.database = {
          canConnect: true,
          chatHistoryCount: historyData.messages?.length || 0,
          lastMessage: historyData.messages?.[historyData.messages.length - 1]
        }
      } else {
        info.database = {
          canConnect: false,
          error: `HTTP ${historyResponse.status}: ${historyResponse.statusText}`
        }
      }
    } catch (error) {
      info.database = {
        canConnect: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Test API connection
    try {
      const testMessage = "Debug test message"
      const apiResponse = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          taskType: 'general',
          userId: user?.id,
          threadId: null
        }),
      })

      if (apiResponse.ok) {
        const apiData = await apiResponse.json()
        info.network = {
          canReachAPI: true,
          apiResponse: {
            status: apiResponse.status,
            hasResponse: !!apiData.response,
            responseLength: apiData.response?.length || 0,
            agent: apiData.agent
          }
        }
      } else {
        info.network = {
          canReachAPI: false,
          error: `HTTP ${apiResponse.status}: ${apiResponse.statusText}`
        }
      }
    } catch (error) {
      info.network = {
        canReachAPI: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    setDebugInfo(info)
    setIsLoading(false)
  }

  const testChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat/history?agent=${agentId}&limit=10`)
      const data = await response.json()
      console.log('🔍 Chat History Test:', data)
      alert(`Chat History Test:\nStatus: ${response.status}\nMessages: ${data.messages?.length || 0}\nCheck console for details`)
    } catch (error) {
      console.error('🔍 Chat History Test Error:', error)
      alert(`Chat History Test Failed: ${error}`)
    }
  }

  const testMessageSend = async () => {
    try {
      const testMessage = `Debug test at ${new Date().toISOString()}`
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          taskType: 'general',
          userId: user?.id,
          threadId: null
        }),
      })
      const data = await response.json()
      console.log('🔍 Message Send Test:', data)
      alert(`Message Send Test:\nStatus: ${response.status}\nResponse: ${data.response ? 'Received' : 'None'}\nCheck console for details`)
    } catch (error) {
      console.error('🔍 Message Send Test Error:', error)
      alert(`Message Send Test Failed: ${error}`)
    }
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-red-700"
        >
          🐛 Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">🐛 CrewFlow Debug Panel</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={runDiagnostics}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
          </button>

          <div className="flex space-x-2">
            <button
              onClick={testChatHistory}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700"
            >
              Test History
            </button>
            <button
              onClick={testMessageSend}
              className="flex-1 bg-orange-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-orange-700"
            >
              Test Send
            </button>
          </div>

          {debugInfo && (
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <h4 className="font-semibold text-gray-700">Authentication</h4>
                <div className={`p-2 rounded ${debugInfo.authentication.isAuthenticated ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div>Status: {debugInfo.authentication.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</div>
                  {debugInfo.authentication.userId && <div>User ID: {debugInfo.authentication.userId}</div>}
                  {debugInfo.authentication.email && <div>Email: {debugInfo.authentication.email}</div>}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700">Database</h4>
                <div className={`p-2 rounded ${debugInfo.database.canConnect ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div>Status: {debugInfo.database.canConnect ? '✅ Connected' : '❌ Connection Failed'}</div>
                  {debugInfo.database.chatHistoryCount !== undefined && (
                    <div>History Count: {debugInfo.database.chatHistoryCount}</div>
                  )}
                  {debugInfo.database.error && <div>Error: {debugInfo.database.error}</div>}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700">Network</h4>
                <div className={`p-2 rounded ${debugInfo.network.canReachAPI ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div>Status: {debugInfo.network.canReachAPI ? '✅ API Reachable' : '❌ API Failed'}</div>
                  {debugInfo.network.apiResponse && (
                    <div>Response: {debugInfo.network.apiResponse.hasResponse ? 'Received' : 'None'}</div>
                  )}
                  {debugInfo.network.error && <div>Error: {debugInfo.network.error}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
