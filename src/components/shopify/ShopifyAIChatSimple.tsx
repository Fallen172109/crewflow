'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Send, Ship } from 'lucide-react'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'

interface ShopifyAIChatProps {
  className?: string
  onProductCreated?: (product: any) => void
}

export interface ShopifyAIChatRef {
  addAgentResponse: (response: string, taskType: string) => void
}

const ShopifyAIChatSimple = forwardRef<ShopifyAIChatRef, ShopifyAIChatProps>(({ 
  className = '',
  onProductCreated 
}, ref) => {
  const [messages, setMessages] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { selectedStore } = useShopifyStore()

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: 'welcome',
        type: 'system',
        content: `🚢 **Welcome to AI Store Manager!**

I'm your comprehensive AI assistant for complete store management.

${selectedStore ? `🎯 Currently managing: **${selectedStore.storeName}**` : '⚠️ Please select a store first'}

**To get started:** Ask me anything about your store, upload product images, or describe what you need help with!`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [selectedStore, messages.length])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    if (!selectedStore) {
      alert('Please select a store first')
      return
    }

    const userMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      console.log('🛍️ SHOPIFY SIMPLE: Sending message:', inputValue.substring(0, 100))
      
      // Test the direct Shopify integration
      const response = await fetch('/api/shopify-direct-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const result = await response.json()
      console.log('🛍️ SHOPIFY SIMPLE: Response:', result)

      let agentResponse = ''
      if (result.success) {
        agentResponse = `🎉 **Success!** I created a test product for you:

**Product:** ${result.product.title}
**ID:** ${result.product.id}
**Admin URL:** [View in Shopify](${result.product.shopifyAdminUrl})

Your Shopify integration is working perfectly! You can now create products through this chat interface.`

        if (onProductCreated) {
          onProductCreated(result.product)
        }
      } else {
        agentResponse = `❌ **Integration Issue:** ${result.error}

${result.error.includes('Invalid API key') ? 
  '🔑 **Solution:** Your Shopify access token needs to be refreshed. Please reconnect your store.' : 
  '🔧 **Solution:** Please check your Shopify connection settings.'}`
      }

      const agentMessage = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: agentResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, agentMessage])

    } catch (error) {
      console.error('🛍️ SHOPIFY SIMPLE: Error:', error)
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    addAgentResponse: (response: string, taskType: string) => {
      const agentMessage = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, agentMessage])
    }
  }), [])

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Shopify AI Assistant (Simple)</h3>
            <p className="text-sm text-gray-600">Testing Shopify integration</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-orange-600 text-white'
                  : message.type === 'system'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Processing your request...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Ask me to create products, manage inventory, or help with your store..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
})

ShopifyAIChatSimple.displayName = 'ShopifyAIChatSimple'

export default ShopifyAIChatSimple
