'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  MessageSquare, 
  Sparkles, 
  Edit3,
  Save,
  Undo,
  Redo,
  History,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

interface ProductData {
  id?: string
  title: string
  description: string
  price?: number
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory_quantity?: number
  }>
  images?: string[]
}

interface EditMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  changes?: ProductChange[]
  productSnapshot?: ProductData
}

interface ProductChange {
  field: string
  oldValue: any
  newValue: any
  description: string
}

interface ChatBasedProductEditorProps {
  product: ProductData
  onProductUpdate: (product: ProductData) => void
  onSave: (product: ProductData) => void
  className?: string
}

export default function ChatBasedProductEditor({ 
  product, 
  onProductUpdate, 
  onSave,
  className = '' 
}: ChatBasedProductEditorProps) {
  const [messages, setMessages] = useState<EditMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<ProductData>(product)
  const [history, setHistory] = useState<ProductData[]>([product])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const { selectedStore } = useShopifyStore()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage: EditMessage = {
        id: 'welcome',
        type: 'system',
        content: `🎨 **Product Editor Chat**

I can help you modify your product using natural language! Here are some things you can ask me:

• **"Change the title to..."** - Update product title
• **"Make the price $29.99"** - Adjust pricing
• **"Add a variant for Large size at $35"** - Create variants
• **"Update the description to include..."** - Modify description
• **"Add tags: premium, bestseller"** - Add product tags
• **"Remove the second variant"** - Delete variants
• **"Make it sound more professional"** - Improve copy

**Current Product:** ${currentProduct.title}

Just tell me what you'd like to change!`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [])

  useEffect(() => {
    const hasChanged = JSON.stringify(currentProduct) !== JSON.stringify(product)
    setHasUnsavedChanges(hasChanged)
    onProductUpdate(currentProduct)
  }, [currentProduct, product, onProductUpdate])

  const addToHistory = (newProduct: ProductData) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newProduct)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      const previousProduct = history[historyIndex - 1]
      setCurrentProduct(previousProduct)
      setHistoryIndex(historyIndex - 1)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextProduct = history[historyIndex + 1]
      setCurrentProduct(nextProduct)
      setHistoryIndex(historyIndex + 1)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const messageId = `msg-${Date.now()}`
    const userMessage: EditMessage = {
      id: messageId,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Send to AI for product editing
      const response = await fetch('/api/agents/splash/product-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          currentProduct: currentProduct,
          storeId: selectedStore?.id,
          storeCurrency: selectedStore?.currency
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process edit request')
      }

      const data = await response.json()
      
      const agentMessage: EditMessage = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: data.response,
        timestamp: new Date(),
        changes: data.changes,
        productSnapshot: data.updatedProduct
      }

      setMessages(prev => [...prev, agentMessage])
      
      if (data.updatedProduct) {
        addToHistory(data.updatedProduct)
        setCurrentProduct(data.updatedProduct)
      }

    } catch (error) {
      console.error('Error processing edit:', error)
      const errorMessage: EditMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '❌ Sorry, I encountered an error processing your edit request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedStore?.currency || 'USD'
    }).format(amount)
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Chat Editor</h3>
              <p className="text-sm text-gray-600">
                {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
            
            <div className="w-px h-6 bg-gray-300"></div>
            
            <button
              onClick={() => onSave(currentProduct)}
              disabled={!hasUnsavedChanges}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
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
              className={`max-w-3xl rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-orange-600 text-white'
                  : message.type === 'system'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <MarkdownRenderer content={message.content} />
              
              {/* Show changes made */}
              {message.changes && message.changes.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Edit3 className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">Changes Made</span>
                  </div>
                  
                  <div className="space-y-2">
                    {message.changes.map((change, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-gray-900">{change.description}</div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <span className="line-through">{String(change.oldValue)}</span>
                          <span>→</span>
                          <span className="text-green-600 font-medium">{String(change.newValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs mt-2 opacity-75">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              <span className="text-gray-600">Processing your edit...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Current Product Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 truncate max-w-xs">
                {currentProduct.title}
              </h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {currentProduct.price && (
                  <span>{formatCurrency(currentProduct.price)}</span>
                )}
                {currentProduct.variants && (
                  <span>{currentProduct.variants.length} variants</span>
                )}
                {currentProduct.tags && (
                  <span>{currentProduct.tags.length} tags</span>
                )}
              </div>
            </div>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-orange-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Unsaved</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what you'd like to change about this product..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{history.length - 1} changes made</span>
        </div>
      </div>
    </div>
  )
}
