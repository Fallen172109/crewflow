'use client'

import React, { useState } from 'react'
import { getChatClient } from '@/lib/chat/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function StreamingTest() {
  const [message, setMessage] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<any>(null)

  const testStreaming = async () => {
    if (!message.trim()) return

    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    setResponse(null)

    try {
      const chatClient = getChatClient()

      await chatClient.sendStreamingStoreManagerMessage(
        message,
        {
          threadId: `temp-${Date.now()}`,
          onChunk: (chunk) => {
            console.log('Received chunk:', chunk)
            setStreamingContent(prev => prev + chunk.content)
          },
          onComplete: (response) => {
            console.log('Streaming completed:', response)
            setResponse(response)
            setIsStreaming(false)
          },
          onError: (error) => {
            console.error('Streaming error:', error)
            setError(error.message || 'Unknown error')
            setIsStreaming(false)
          }
        }
      )
    } catch (error) {
      console.error('Test error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setIsStreaming(false)
    }
  }

  const testSimpleStreaming = async () => {
    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    setResponse(null)

    try {
      console.log('🧪 Starting simple streaming test')

      const response = await fetch('/api/test-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log('🧪 Simple streaming completed')
            setIsStreaming(false)
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                console.log('🧪 Received SSE data:', data)

                if (data.type === 'chunk') {
                  setStreamingContent(prev => prev + data.content)
                } else if (data.type === 'complete') {
                  setResponse({ response: data.response, success: true })
                  setIsStreaming(false)
                } else if (data.type === 'connected') {
                  console.log('🧪 Connected:', data.message)
                }
              } catch (parseError) {
                console.error('🧪 Error parsing SSE data:', parseError, line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (error) {
      console.error('🧪 Simple streaming error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setIsStreaming(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold">Streaming Test</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">Test Message:</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a test message for the AI Store Manager..."
          className="min-h-[100px]"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={testStreaming}
          disabled={!message.trim() || isStreaming}
          className="flex-1"
        >
          {isStreaming ? 'Streaming...' : 'Test AI Streaming'}
        </Button>

        <Button
          onClick={testSimpleStreaming}
          disabled={isStreaming}
          variant="outline"
          className="flex-1"
        >
          {isStreaming ? 'Streaming...' : 'Test Simple Streaming'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-red-800">Error:</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {streamingContent && (
        <div className="space-y-2">
          <h3 className="font-medium">Streaming Content:</h3>
          <div className="p-4 bg-gray-50 border rounded-lg min-h-[100px] whitespace-pre-wrap">
            {streamingContent}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-orange-500 animate-pulse ml-1"></span>
            )}
          </div>
        </div>
      )}

      {response && (
        <div className="space-y-2">
          <h3 className="font-medium">Final Response:</h3>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p><strong>Instructions:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Enter a message above (e.g., "Help me create a product for my store")</li>
          <li>Click "Test Streaming" to start the streaming test</li>
          <li>Watch as the response streams in real-time</li>
          <li>Check the browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  )
}
