'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Image as ImageIcon, 
  Package, 
  Sparkles, 
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  ShoppingCart,
  DollarSign,
  Tag,
  FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore, useStorePermissions } from '@/contexts/ShopifyStoreContext'
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  attachments?: UploadedFile[]
  productPreview?: ProductPreview
}

interface ProductPreview {
  title: string
  description: string
  price?: number
  images?: string[]
  category?: string
  tags?: string[]
  variants?: Array<{
    title: string
    price: number
    inventory_quantity?: number
  }>
}

interface ProductCreationChatProps {
  className?: string
  onProductCreated?: (product: any) => void
}

export default function ProductCreationChat({ 
  className = '',
  onProductCreated 
}: ProductCreationChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [currentPreview, setCurrentPreview] = useState<ProductPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const { selectedStore } = useShopifyStore()
  const { canManageProducts } = useStorePermissions()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'system',
        content: `🚢 **Welcome to Product Creation with Splash!**

I'm your creative AI assistant for Shopify product management. I can help you:

• **Create products** from images or descriptions
• **Generate compelling titles** and descriptions
• **Suggest pricing** based on your market
• **Create product variants** and categories
• **Generate product images** if you don't have any

${selectedStore ? `Currently working with: **${selectedStore.store_name}**` : '⚠️ Please select a store first'}

${canManageProducts ? '✅ You have product management permissions' : '❌ You need product write permissions for this store'}

**To get started:** Upload a product image or describe what you want to sell!`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [selectedStore, canManageProducts])

  const handleFileUpload = (file: UploadedFile) => {
    setAttachments(prev => [...prev, file])
  }

  const handleFileRemove = (fileId: string) => {
    setAttachments(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return
    if (!selectedStore) {
      alert('Please select a store first')
      return
    }
    if (!canManageProducts) {
      alert('You need product management permissions for this store')
      return
    }

    const messageId = `msg-${Date.now()}`
    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      attachments: attachments.filter(att => att.uploadStatus === 'completed')
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setAttachments([])
    setShowFileUpload(false)
    setIsLoading(true)

    try {
      // Send to Splash agent for product creation
      const response = await fetch('/api/agents/splash/product-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          attachments: userMessage.attachments,
          storeId: selectedStore.id,
          storeCurrency: selectedStore.currency,
          storePlan: selectedStore.plan_name
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process request')
      }

      const data = await response.json()
      
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: data.response,
        timestamp: new Date(),
        productPreview: data.productPreview
      }

      setMessages(prev => [...prev, agentMessage])
      
      if (data.productPreview) {
        setCurrentPreview(data.productPreview)
        setShowPreview(true)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
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

  const handlePublishProduct = async () => {
    if (!currentPreview || !selectedStore) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeId: selectedStore.id,
          product: currentPreview
        })
      })

      if (!response.ok) {
        throw new Error('Failed to publish product')
      }

      const data = await response.json()
      
      const successMessage: Message = {
        id: `success-${Date.now()}`,
        type: 'system',
        content: `✅ **Product Published Successfully!**

**${data.product.title}** has been added to your ${selectedStore.store_name} store.

🔗 [View in Shopify Admin](https://admin.shopify.com/store/${selectedStore.shop_domain.replace('.myshopify.com', '')}/products/${data.product.id})`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, successMessage])
      setCurrentPreview(null)
      setShowPreview(false)
      
      onProductCreated?.(data.product)

    } catch (error) {
      console.error('Error publishing product:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '❌ Failed to publish product. Please try again or check your store permissions.',
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

  return (
    <div className={`bg-white rounded-lg border border-gray-200 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Product Creation with Splash</h3>
              <p className="text-sm text-gray-600">
                {selectedStore ? `Creating for ${selectedStore.store_name}` : 'Select a store to begin'}
              </p>
            </div>
          </div>
          
          {currentPreview && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 overflow-hidden break-words ${
                message.type === 'user'
                  ? 'bg-green-600 text-white'
                  : message.type === 'system'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <MarkdownRenderer content={message.content} />
              
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                      <ImageIcon className="w-4 h-4" />
                      <span>{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Product Preview in Message */}
              {message.productPreview && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Product Preview</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900">{message.productPreview.title}</h4>
                    {message.productPreview.price && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: selectedStore?.currency || 'USD'
                          }).format(message.productPreview.price)}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {message.productPreview.description}
                    </p>
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
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">Splash is creating your product...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      {showFileUpload && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <FileUpload
            onFileUpload={handleFileUpload}
            onFileRemove={handleFileRemove}
            existingFiles={attachments}
            maxFiles={5}
            maxFileSize={25 * 1024 * 1024}
            acceptedTypes={['image/*']}
            className="border-0"
            showPreview={true}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your product or upload an image..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading || !selectedStore || !canManageProducts}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && attachments.length === 0) || isLoading || !selectedStore || !canManageProducts}
              className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Preview Modal */}
      <AnimatePresence>
        {showPreview && currentPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Product Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{currentPreview.title}</h4>
                    {currentPreview.price && (
                      <div className="text-2xl font-bold text-green-600 mb-4">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: selectedStore?.currency || 'USD'
                        }).format(currentPreview.price)}
                      </div>
                    )}
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                    <p className="text-gray-600">{currentPreview.description}</p>
                  </div>

                  {currentPreview.category && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Category</h5>
                      <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                        {currentPreview.category}
                      </span>
                    </div>
                  )}

                  {currentPreview.tags && currentPreview.tags.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Tags</h5>
                      <div className="flex flex-wrap gap-2">
                        {currentPreview.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Close
                    </button>
                    <button
                      onClick={handlePublishProduct}
                      disabled={isLoading}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                      <span>Publish to Store</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
