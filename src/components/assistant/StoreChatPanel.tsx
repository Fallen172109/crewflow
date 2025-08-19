'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Loader2, User, Bot, X, Package } from 'lucide-react'
import { getChatClient } from '@/lib/chat/client'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface ProductDraft {
  id: string
  title: string
  description: string
  price: string
  imageUrl?: string
  status: 'draft' | 'publishing' | 'published' | 'error'
  errorMessage?: string
}

interface ProductPreview {
  title: string
  description: string
  price: number
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory_quantity?: number
  }>
}

interface StoreChatPanelProps {
  storeId: string
  sendStoreManagerMessage: (message: string, opts?: any) => Promise<any>
  onNewDraft: (draft: ProductDraft) => void
  onProductCreated?: (product: any) => void
  selectedStore?: { id: string; name: string }
  renderToolbar?: (props: {
    text: string
    setText: (text: string) => void
    busy: boolean
    submit: () => void
  }) => React.ReactNode
}

export default function StoreChatPanel({
  storeId,
  sendStoreManagerMessage,
  onNewDraft,
  onProductCreated,
  selectedStore,
  renderToolbar
}: StoreChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [currentPreview, setCurrentPreview] = useState<ProductPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await sendStoreManagerMessage(inputMessage, {
        context: { storeId }
      })

      // Debug: Log the response structure
      console.log('🔍 Chat API Response:', response)

      // Handle different response formats - check nested data structure first
      const responseContent = response.data?.response || response.response || response.content || response.message || ''
      const responseId = response.data?.messageId || response.messageId || response.id || Date.now().toString()

      // Debug: Log parsed content
      console.log('🔍 Parsed content:', { responseContent, responseId })

      // Create assistant message
      const assistantMessage: Message = {
        id: responseId,
        type: 'assistant',
        content: responseContent,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Check for product creation actions in response (multiple formats)
      const actionsToCheck = response.actions || response.detectedActions || []
      if (Array.isArray(actionsToCheck)) {
        actionsToCheck.forEach((action: any) => {
          if ((action.type === 'product_create' || action.action === 'product_create') && (action.payload || action.parameters)) {
            const actionData = action.payload || action.parameters || action
            const draft: ProductDraft = {
              id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              title: actionData.title || actionData.name || 'Untitled Product',
              description: actionData.description || actionData.body_html || '',
              price: (actionData.price || actionData.variants?.[0]?.price || '0.00').toString(),
              imageUrl: actionData.imageUrl || actionData.image,
              status: 'draft'
            }
            console.log('🎯 Creating product draft:', draft)
            onNewDraft(draft)
          }
        })
      }

      // Handle product preview modal
      if (response.productPreview) {
        console.log('🎯 PRODUCT PREVIEW RECEIVED:', response.productPreview)
        setCurrentPreview(response.productPreview)
        setShowPreview(true)

        // Also create a draft for the management panel
        const draft: ProductDraft = {
          id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          title: response.productPreview.title || 'Untitled Product',
          description: response.productPreview.description || '',
          price: response.productPreview.price?.toString() || '0.00',
          imageUrl: response.productPreview.imageUrl,
          status: 'draft'
        }
        console.log('🎯 Creating product preview draft:', draft)
        onNewDraft(draft)
      }

      // Parse response content for product creation intents (only if we have content)
      if (responseContent && typeof responseContent === 'string') {
        // Enhanced pattern to catch more product creation scenarios
        const patterns = [
          // "Create a product named 'Black Anchor Tee' price 25 USD"
          /(?:create|add|make).*?product.*?(?:named|called|titled)?\s*["']([^"']+)["'].*?(?:price|cost).*?\$?(\d+(?:\.\d{2})?)/i,
          // "Product: Black Anchor Tee - $25.00"
          /product:\s*([^-\n]+)\s*-\s*\$?(\d+(?:\.\d{2})?)/i,
          // "Black Anchor Tee ($25.00)"
          /([^(\n]+)\s*\(\$?(\d+(?:\.\d{2})?)\)/i
        ]

        for (const pattern of patterns) {
          const match = responseContent.match(pattern)
          if (match) {
            const [, title, price] = match
            const draft: ProductDraft = {
              id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              title: title.trim(),
              description: `Product created via AI assistant for store ${storeId}`,
              price: price,
              status: 'draft'
            }
            console.log('🎯 Creating product from text parsing:', draft)
            onNewDraft(draft)
            break // Only create one product per response
          }
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">AI Store Assistant</h2>
            <p className="text-xs text-slate-500">Shopify store management and automation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 cf-scroll p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Welcome to your AI Store Assistant</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              I can help you create products, manage inventory, analyze performance, and automate your Shopify store operations. 
              Try asking me to "Create a navy tee for 25 USD" to get started!
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type !== 'user' && (
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-orange-500 text-white'
                  : message.type === 'system'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {message.type === 'user' && (
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                <span className="text-sm text-slate-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-white rounded px-2 py-1 text-xs">
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 p-4 bg-white">
        {renderToolbar ? (
          renderToolbar({
            text: inputMessage,
            setText: setInputMessage,
            busy: isLoading,
            submit: handleSendMessage
          })
        ) : (
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              disabled={isLoading}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me to create products, manage inventory, or analyze your store..."
                className="w-full resize-none border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={1}
                disabled={isLoading}
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Product Preview Modal */}
      {showPreview && currentPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Product Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{currentPreview.title}</h4>
                {currentPreview.price && (
                  <p className="text-2xl font-bold text-orange-600">${currentPreview.price}</p>
                )}
              </div>

              {currentPreview.description && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Description</h5>
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={currentPreview.description} />
                  </div>
                </div>
              )}

              {currentPreview.category && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-1">Category</h5>
                  <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm">
                    {currentPreview.category}
                  </span>
                </div>
              )}

              {currentPreview.tags && currentPreview.tags.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Tags</h5>
                  <div className="flex flex-wrap gap-2">
                    {currentPreview.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentPreview.variants && currentPreview.variants.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Variants</h5>
                  <div className="space-y-2">
                    {currentPreview.variants.map((variant, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{variant.title}</span>
                        <span className="font-medium">${variant.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  if (currentPreview && onProductCreated) {
                    try {
                      // Create the product in Shopify
                      const response = await fetch('/api/shopify/products', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          storeId: selectedStore?.id,
                          product: currentPreview
                        })
                      })

                      if (response.ok) {
                        const data = await response.json()
                        onProductCreated(data.product)
                        setShowPreview(false)
                        setCurrentPreview(null)

                        // Add success message
                        const successMessage: Message = {
                          id: `success-${Date.now()}`,
                          type: 'system',
                          content: `✅ **Product Created Successfully!**\n\nYour product "${currentPreview.title}" has been created in your Shopify store.\n\n[View in Admin](${data.product.admin_url}) | [View Live](${data.product.public_url})`,
                          timestamp: new Date()
                        }

                        setMessages(prev => [...prev, successMessage])
                      } else {
                        throw new Error('Failed to create product')
                      }
                    } catch (error) {
                      console.error('Error creating product:', error)
                      const errorMessage: Message = {
                        id: `error-${Date.now()}`,
                        type: 'system',
                        content: '❌ Failed to create product. Please try again.',
                        timestamp: new Date()
                      }
                      setMessages(prev => [...prev, errorMessage])
                    }
                  }
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
              >
                Create Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
