'use client'

import { useState } from 'react'

export default function TestChatDebug() {
  const [authResult, setAuthResult] = useState<any>(null)
  const [chatResult, setChatResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'auth check' }),
      })
      
      const data = await response.json()
      setAuthResult({ status: response.status, data })
    } catch (error) {
      setAuthResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const testChat = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/agents/anchor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'which is best to automate',
          taskType: 'general',
          userId: 'test-user',
          threadId: null
        }),
      })
      
      const contentType = response.headers.get('content-type')
      console.log('Response content type:', contentType)
      console.log('Response status:', response.status)
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        setChatResult({ status: response.status, data, contentType })
      } else {
        const text = await response.text()
        setChatResult({ 
          status: response.status, 
          error: 'Non-JSON response', 
          contentType,
          responseText: text.substring(0, 500) + (text.length > 500 ? '...' : '')
        })
      }
    } catch (error) {
      setChatResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Chat Debug Test</h1>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testAuth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Authentication'}
          </button>
          
          {authResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Authentication Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(authResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={testChat}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Chat API'}
          </button>
          
          {chatResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Chat API Result:</h3>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(chatResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Debug Information:</h3>
        <p className="text-sm text-yellow-700">
          This page helps debug the chat interface issues. Use the buttons above to test:
        </p>
        <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
          <li><strong>Test Authentication:</strong> Checks if user authentication is working</li>
          <li><strong>Test Chat API:</strong> Tests the agent chat endpoint directly</li>
        </ul>
      </div>
    </div>
  )
}
