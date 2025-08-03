'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
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
  FileText,
  MessageSquare,
  Plus,
  History,
  Settings,
  Anchor,
  Ship
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore, useStorePermissions } from '@/contexts/ShopifyStoreContext'
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'
import ThreadManager, { ThreadManagerRef } from '@/components/agents/ThreadManager'
import FeedbackCollector from '@/components/ai/FeedbackCollector'
import { getChatClient, ChatError } from '@/lib/chat/client'
import { actionDetector } from '@/lib/ai/action-detection'
import { ShopifyAction, ActionResult } from '@/lib/ai/shopify-action-executor'
import ActionExecutionPanel from './ActionExecutionPanel'
import { createSupabaseClient } from '@/lib/supabase/client'

import { Agent } from '@/lib/agents'

interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  attachments?: UploadedFile[]
  productPreview?: ProductPreview
  threadId?: string
  messageId?: string // For feedback tracking
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

interface ChatThread {
  id: string
  user_id: string
  agent_name: string
  task_type: string
  title: string
  context: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  message_count?: number
  last_message?: string
}

interface ShopifyAIChatProps {
  className?: string
  onProductCreated?: (product: any) => void
}

// Create a virtual agent for AI Store Management (not tied to specific agents)
const storeManagerAgent: Agent = {
  id: 'ai-store-manager',
  name: 'AI Store Manager',
  title: 'Complete Store Management Assistant',
  description: 'Comprehensive AI-powered store management with intelligent routing to specialized capabilities',
  framework: 'hybrid',
  optimalAiModules: ['LangChain', 'OpenAI GPT-4', 'Perplexity AI', 'AutoGen'],
  capabilities: ['product_creation', 'inventory_management', 'order_processing', 'customer_service', 'analytics', 'marketing'],
  personality: 'Professional maritime-themed assistant focused on comprehensive e-commerce management',
  systemPrompt: 'You are the AI Store Manager - a comprehensive assistant that can handle all aspects of store management with intelligent routing to specialized capabilities when needed.',
  tools: [],
  integrations: ['shopify', 'analytics', 'marketing'],
  isActive: true
}

export interface ShopifyAIChatRef {
  addAgentResponse: (response: string, taskType: string) => void
}

const ShopifyAIChat = forwardRef<ShopifyAIChatRef, ShopifyAIChatProps>(({ 
  className = '',
  onProductCreated 
}, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [currentPreview, setCurrentPreview] = useState<ProductPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [showThreadManager, setShowThreadManager] = useState(false)
  const [showNewThreadModal, setShowNewThreadModal] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadContext, setNewThreadContext] = useState('')
  const [currentThreadContext, setCurrentThreadContext] = useState<string | null>(null)
  const [detectedActions, setDetectedActions] = useState<ShopifyAction[]>([])
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [user, setUser] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const threadManagerRef = useRef<ThreadManagerRef>(null)

  const { selectedStore } = useShopifyStore()
  const { canManageProducts } = useStorePermissions()

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, threadMessages])

  useEffect(() => {
    // Add welcome message for non-threaded chat
    if (messages.length === 0 && !activeThreadId) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'system',
        content: `🚢 **Welcome to AI Store Manager!**

I'm your comprehensive AI assistant for complete store management. I can help you with all aspects of your e-commerce operations:

**🎨 Product Creation & Management**
• Create products from images or descriptions
• Generate compelling titles and descriptions
• Suggest pricing and variants
• Optimize SEO and categories

**📦 Inventory & Orders**
• Monitor inventory levels
• Process and track orders
• Manage fulfillments
• Handle returns and exchanges

**👥 Customer Service**
• Respond to customer inquiries
• Manage customer accounts
• Handle support tickets
• Analyze customer feedback

**📊 Store Analytics & Optimization**
• Review performance metrics
• Optimize product listings
• Analyze sales trends
• Suggest improvements

${selectedStore ? `🎯 Currently managing: **${selectedStore.store_name}**` : '⚠️ Please select a store first'}

${canManageProducts ? '✅ Full management permissions active' : '❌ Limited permissions - some features may be restricted'}

**To get started:** Ask me anything about your store, upload product images, or describe what you need help with!`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [selectedStore, canManageProducts, activeThreadId])

  // Load thread messages when thread is selected
  useEffect(() => {
    if (activeThreadId) {
      console.log('Loading messages for thread:', activeThreadId)
      loadThreadMessages(activeThreadId)
    } else {
      console.log('No active thread, clearing thread messages')
      setThreadMessages([])
    }
  }, [activeThreadId])

  // Handle thread selection with proper state management
  const handleThreadSelect = (threadId: string | null) => {
    console.log('Thread selected:', threadId)
    setActiveThreadId(threadId)
    // Clear current messages when switching threads
    if (threadId) {
      setMessages([]) // Clear non-thread messages
      // Load messages for the selected thread
      loadThreadMessages(threadId)
    } else {
      setThreadMessages([]) // Clear thread messages
    }
  }

  const loadThreadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat/history?threadId=${threadId}&agent=${storeManagerAgent.id}`)
      if (response.ok) {
        const data = await response.json()
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.message_type || msg.type,
          content: msg.content,
          timestamp: new Date(msg.timestamp || msg.created_at),
          threadId: msg.thread_id,
          attachments: msg.attachments || []
        }))
        setThreadMessages(formattedMessages)
      } else {
        console.error('Failed to load thread messages:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading thread messages:', error)
    }
  }

  const handleFileUpload = (file: UploadedFile) => {
    setAttachments(prev => [...prev, file])
  }

  const handleFileRemove = (fileId: string) => {
    setAttachments(prev => prev.filter(f => f.id !== fileId))
  }

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) return

    try {
      console.log('Creating new thread:', {
        agentName: storeManagerAgent.id,
        taskType: 'business_automation',
        title: newThreadTitle.trim()
      })

      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentName: storeManagerAgent.id,
          taskType: 'business_automation',
          title: newThreadTitle.trim(),
          context: newThreadContext.trim() || null,
          attachments: attachments.filter(att => att.uploadStatus === 'completed')
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Thread created successfully:', data.thread.id)
        setActiveThreadId(data.thread.id)
        setCurrentThreadContext(newThreadContext.trim() || null)
        setShowNewThreadModal(false)
        setNewThreadTitle('')
        setNewThreadContext('')
        setAttachments([])
        threadManagerRef.current?.refreshThreads()
      } else {
        const errorData = await response.json()
        console.error('Failed to create thread:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error creating thread:', error)
    }
  }

  const determineRequestType = (message: string, attachments: UploadedFile[]): string => {
    const lowerMessage = message.toLowerCase()

    // Product creation indicators (enhanced detection)
    const hasImages = attachments.some(att => att.fileType && att.fileType.startsWith('image/'))
    const productKeywords = [
      'create product', 'new product', 'add product', 'turn this into a product',
      'turn into a product', 'make this a product', 'upload to store', 'add to store',
      'publish to store', 'create listing'
    ]
    const hasProductKeywords = productKeywords.some(keyword => lowerMessage.includes(keyword))
    const hasUploadWithAttachments = attachments.length > 0 && (lowerMessage.includes('upload') || lowerMessage.includes('publish'))

    if (hasImages || hasProductKeywords || hasUploadWithAttachments) {
      console.log('Routing to product_creation:', {
        hasImages,
        hasProductKeywords,
        hasUploadWithAttachments,
        message: lowerMessage.substring(0, 100),
        attachmentCount: attachments.length
      })
      return 'product_creation'
    }
    
    // Inventory management
    if (lowerMessage.includes('inventory') || 
        lowerMessage.includes('stock') ||
        lowerMessage.includes('quantity')) {
      return 'inventory_management'
    }
    
    // Order management
    if (lowerMessage.includes('order') || 
        lowerMessage.includes('fulfillment') ||
        lowerMessage.includes('shipping')) {
      return 'order_management'
    }
    
    // Customer service
    if (lowerMessage.includes('customer') || 
        lowerMessage.includes('support') ||
        lowerMessage.includes('inquiry')) {
      return 'customer_service'
    }
    
    // Analytics and optimization
    if (lowerMessage.includes('analytics') || 
        lowerMessage.includes('performance') ||
        lowerMessage.includes('optimize') ||
        lowerMessage.includes('sales')) {
      return 'analytics'
    }
    
    // Default to general management
    return 'general_management'
  }

  const handleSendMessage = async () => {
    console.log('🛍️ SHOPIFY DEBUG: handleSendMessage called', {
      inputValue: inputValue.substring(0, 100) + '...',
      attachmentsCount: attachments.length,
      selectedStore: selectedStore?.name,
      activeThreadId,
      timestamp: new Date().toISOString()
    })

    if (!inputValue.trim() && attachments.length === 0) return
    if (!selectedStore) {
      alert('Please select a store first')
      return
    }

    const messageId = `msg-${Date.now()}`
    const requestType = determineRequestType(inputValue, attachments)

    console.log('🛍️ SHOPIFY DEBUG: Request type determined', {
      requestType,
      inputValue: inputValue.substring(0, 50) + '...',
      hasAttachments: attachments.length > 0
    })
    
    // Auto-create thread if none exists
    let threadIdToUse = activeThreadId
    if (!activeThreadId) {
      console.log('🛍️ SHOPIFY DEBUG: Auto-creating thread for first message')
      try {
        const response = await fetch('/api/chat/threads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agentName: storeManagerAgent.id,
            taskType: 'business_automation',
            title: inputValue.trim().substring(0, 50) + (inputValue.trim().length > 50 ? '...' : ''),
            context: null,
            attachments: attachments.filter(att => att.uploadStatus === 'completed')
          })
        })

        if (response.ok) {
          const data = await response.json()
          threadIdToUse = data.thread.id
          setActiveThreadId(threadIdToUse)
          console.log('🛍️ SHOPIFY DEBUG: Auto-created thread:', threadIdToUse)
          // Refresh thread list to show the new thread
          threadManagerRef.current?.refreshThreads()
        } else {
          const errorText = await response.text()
          console.error('🛍️ SHOPIFY DEBUG: Failed to create thread:', response.status, errorText)
          // Use temporary thread as fallback
          threadIdToUse = `temp-${Date.now()}`
        }
      } catch (error) {
        console.error('🛍️ SHOPIFY DEBUG: Error auto-creating thread:', error)
        // Use temporary thread as fallback
        threadIdToUse = `temp-${Date.now()}`
      }
    }

    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      attachments: attachments.filter(att => att.uploadStatus === 'completed'),
      threadId: threadIdToUse || undefined
    }

    // Add message to appropriate container
    if (threadIdToUse && !threadIdToUse.startsWith('temp-')) {
      // Real thread - add to thread messages
      setThreadMessages(prev => [...prev, userMessage])
      console.log('🛍️ SHOPIFY DEBUG: Added message to thread messages:', threadIdToUse)
    } else {
      // No thread or temporary thread - add to general messages
      setMessages(prev => [...prev, userMessage])
      console.log('🛍️ SHOPIFY DEBUG: Added message to general messages')
    }

    setInputValue('')
    setAttachments([])
    setShowFileUpload(false)
    setIsLoading(true)

    try {
      let apiEndpoint = ''
      let requestBody: any = {
        message: userMessage.content,
        attachments: userMessage.attachments,
        storeId: selectedStore.id,
        storeCurrency: selectedStore.currency,
        storePlan: selectedStore.plan_name,
        requestType
      }

      // Use unified chat API
      const chatClient = getChatClient()
      let response: any

      console.log('🛍️ SHOPIFY DEBUG: Using unified chat API', {
        requestType,
        threadId: threadIdToUse,
        messageLength: userMessage.content.length,
        attachmentsCount: userMessage.attachments?.length || 0
      })

      // Route to appropriate handler based on request type
      switch (requestType) {
        case 'product_creation':
          // Still use direct agent endpoint for product creation
          response = await fetch('/api/agents/splash/product-creation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              message: userMessage.content,
              attachments: userMessage.attachments,
              storeId: selectedStore?.id,
              storeCurrency: selectedStore?.currency,
              storePlan: selectedStore?.plan_name
            })
          })
          break

        case 'inventory_management':
        case 'order_management':
        case 'customer_service':
        case 'analytics':
        case 'general_management':
        default:
          // Use unified chat API for AI Store Manager
          const threadId = threadIdToUse || `temp-${Date.now()}`

          try {
            const chatResponse = await chatClient.sendStoreManagerMessage(
              userMessage.content,
              {
                threadId,
                attachments: userMessage.attachments || []
              }
            )

            // Convert to fetch response format for compatibility
            response = {
              ok: chatResponse.success,
              status: chatResponse.success ? 200 : 500,
              json: async () => ({
                response: chatResponse.response,
                threadId: chatResponse.threadId,
                messageId: chatResponse.messageId,
                usage: chatResponse.usage
              })
            }
          } catch (error) {
            console.error('🛍️ SHOPIFY DEBUG: Unified chat API error:', error)

            if (error instanceof ChatError) {
              response = {
                ok: false,
                status: error.statusCode,
                json: async () => ({
                  error: error.message,
                  details: error.details
                })
              }
            } else {
              throw error
            }
          }
          break
      }

      console.log('🛍️ SHOPIFY DEBUG: API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        throw new Error('Failed to process request')
      }

      const data = await response.json()

      console.log('🛍️ SHOPIFY DEBUG: Response data', {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        hasProductPreview: !!data.productPreview,
        success: data.success
      })
      
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: data.response,
        timestamp: new Date(),
        productPreview: data.productPreview,
        threadId: activeThreadId || undefined,
        messageId: data.messageId // Include message ID for feedback
      }

      // Add agent response to appropriate container
      if (activeThreadId) {
        setThreadMessages(prev => [...prev, agentMessage])
      } else {
        setMessages(prev => [...prev, agentMessage])
      }

      // Detect actions in the AI response
      const actionDetectionResult = actionDetector.detectActions(data.response, {
        storeId: selectedStore?.id,
        userId: user?.id,
        context: { requestType, threadId: threadIdToUse }
      })

      if (actionDetectionResult.hasActions) {
        console.log('⚡ SHOPIFY AI CHAT: Actions detected in response', {
          actionsCount: actionDetectionResult.detectedActions.length,
          actions: actionDetectionResult.detectedActions.map(a => ({
            id: a.action.id,
            type: a.action.type,
            confidence: a.confidence
          }))
        })

        setDetectedActions(actionDetectionResult.detectedActions.map(a => a.action))
        setShowActionPanel(true)
      }

      // Handle product preview
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
        timestamp: new Date(),
        threadId: activeThreadId || undefined
      }

      if (activeThreadId) {
        setThreadMessages(prev => [...prev, errorMessage])
      } else {
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Expose addAgentResponse function to parent via ref
  useImperativeHandle(ref, () => ({
    addAgentResponse: (response: string, taskType: string) => {
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: response,
        timestamp: new Date(),
        threadId: activeThreadId || undefined
      }

      if (activeThreadId) {
        setThreadMessages(prev => [...prev, agentMessage])
      } else {
        setMessages(prev => [...prev, agentMessage])
      }
    }
  }), [activeThreadId])

  // Action execution handlers
  const handleExecuteAction = async (action: ShopifyAction, confirmed: boolean): Promise<ActionResult> => {
    try {
      console.log('⚡ SHOPIFY AI CHAT: Executing action', {
        actionId: action.id,
        actionType: action.type,
        confirmed
      })

      const response = await fetch('/api/shopify/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          storeId: selectedStore?.id,
          confirmed
        })
      })

      if (!response.ok) {
        throw new Error(`Action execution failed: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Action execution failed')
      }

      console.log('⚡ SHOPIFY AI CHAT: Action executed successfully', {
        actionId: action.id,
        result: data.result
      })

      return data.result

    } catch (error) {
      console.error('⚡ SHOPIFY AI CHAT: Action execution error:', error)
      return {
        success: false,
        actionId: action.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        maritimeMessage: '⚠️ **Action Failed** - Unable to execute the requested action.'
      }
    }
  }

  const handlePreviewAction = async (action: ShopifyAction): Promise<any> => {
    try {
      console.log('🔍 SHOPIFY AI CHAT: Previewing action', {
        actionId: action.id,
        actionType: action.type
      })

      const response = await fetch('/api/shopify/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          storeId: selectedStore?.id,
          preview: true
        })
      })

      if (!response.ok) {
        throw new Error(`Action preview failed: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Action preview failed')
      }

      console.log('🔍 SHOPIFY AI CHAT: Action preview generated', {
        actionId: action.id,
        preview: data.preview
      })

      return data.preview

    } catch (error) {
      console.error('🔍 SHOPIFY AI CHAT: Action preview error:', error)
      throw error
    }
  }

  const currentMessages = activeThreadId ? threadMessages : messages

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {activeThreadId ? 'Thread Conversation' : 'Shopify AI Assistant'}
            </h3>
            <p className="text-sm text-gray-600">
              {activeThreadId ? 'Contextual conversation' : 'Comprehensive store management'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowThreadManager(!showThreadManager)}
            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            title="Thread Management"
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowNewThreadModal(true)}
            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            title="New Thread"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Thread Manager */}
      {showThreadManager && (
        <div className="border-b border-gray-200 bg-gray-50">
          <ThreadManager
            ref={threadManagerRef}
            agent={storeManagerAgent}
            taskType="business_automation"
            activeThreadId={activeThreadId}
            onThreadSelect={handleThreadSelect}
            onNewThread={() => setShowNewThreadModal(true)}
          />
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {currentMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 overflow-hidden break-words ${
                message.type === 'user'
                  ? 'bg-orange-600 text-white'
                  : message.type === 'system'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.type === 'agent' || message.type === 'system' ? (
                <MarkdownRenderer content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}

              {/* File Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment) => {
                    // Debug logging for attachment structure
                    console.log('🖼️ Attachment Debug:', {
                      id: attachment.id,
                      name: attachment.name,
                      fileName: attachment.fileName,
                      type: attachment.type,
                      fileType: attachment.fileType,
                      url: attachment.url,
                      publicUrl: attachment.publicUrl,
                      uploadStatus: attachment.uploadStatus
                    })

                    // Check if it's an image
                    const isImage = attachment.type && attachment.type.startsWith('image/')
                    const imageUrl = attachment.url || attachment.publicUrl

                    console.log('🖼️ Image Check:', {
                      isImage,
                      imageUrl,
                      storagePath: attachment.storagePath,
                      attachment
                    })

                    if (isImage && imageUrl) {
                      return (
                        <div key={attachment.id} className="mt-2">
                          <img
                            src={imageUrl}
                            alt={attachment.name || attachment.fileName || 'Uploaded image'}
                            className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                            style={{ maxHeight: '300px' }}
                            loading="lazy"
                            onLoad={() => {
                              console.log('✅ Image loaded successfully:', imageUrl)
                            }}
                            onError={(e) => {
                              console.error('❌ Image failed to load:', {
                                url: imageUrl,
                                fileName: attachment.name || attachment.fileName,
                                storagePath: attachment.storagePath,
                                attachment
                              })
                              const target = e.target as HTMLImageElement
                              const container = target.parentElement
                              if (container) {
                                container.innerHTML = `
                                  <div class="flex items-center space-x-2 p-2 bg-red-50 rounded border border-red-200">
                                    <div class="text-red-400">🖼️</div>
                                    <div class="text-sm">
                                      <div class="text-red-600 font-medium">Image could not be loaded</div>
                                      <div class="text-red-500 text-xs">${attachment.name || attachment.fileName || 'Unknown'}</div>
                                      <div class="text-red-400 text-xs mt-1">URL: ${imageUrl.substring(0, 50)}...</div>
                                    </div>
                                  </div>
                                `
                              }
                            }}
                          />
                          <p className="text-xs text-gray-300 mt-1">{attachment.name || attachment.fileName}</p>
                        </div>
                      )
                    } else {
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center space-x-2 p-2 bg-white/10 rounded border"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{attachment.name || attachment.fileName}</span>
                        </div>
                      )
                    }
                  })}
                </div>
              )}

              {/* Product Preview */}
              {message.productPreview && (
                <div className="mt-3 p-3 bg-white/10 rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">Product Preview</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>Title:</strong> {message.productPreview.title}</p>
                    {message.productPreview.price && (
                      <p><strong>Price:</strong> ${message.productPreview.price}</p>
                    )}
                    {message.productPreview.category && (
                      <p><strong>Category:</strong> {message.productPreview.category}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCurrentPreview(message.productPreview!)
                      setShowPreview(true)
                    }}
                    className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                  >
                    View Full Preview
                  </button>
                </div>
              )}

              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>

              {/* Feedback Collector for Agent Messages */}
              {message.type === 'agent' && message.messageId && (
                <div className="mt-3">
                  <FeedbackCollector
                    messageId={message.messageId}
                    agentId="shopify-ai"
                    threadId={message.threadId}
                    compact={true}
                    onFeedbackSubmitted={(feedback) => {
                      console.log('✅ Feedback submitted:', feedback)
                      // Could show a toast notification here
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">Processing your request...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action Execution Panel */}
      {showActionPanel && detectedActions.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <ActionExecutionPanel
            actions={detectedActions}
            onExecuteAction={handleExecuteAction}
            onPreviewAction={handlePreviewAction}
            className="mb-4"
          />
          <div className="flex justify-end">
            <button
              onClick={() => setShowActionPanel(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Hide Actions
            </button>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      {showFileUpload && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <FileUpload
            onFileUpload={handleFileUpload}
            maxFiles={5}
            acceptedTypes={['image/*', 'application/pdf', 'text/*', '.csv', '.xlsx']}
            maxSizePerFile={25 * 1024 * 1024} // 25MB
          />
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border text-sm"
              >
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="truncate max-w-[150px]">{attachment.fileName}</span>
                <button
                  onClick={() => handleFileRemove(attachment.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder={
                activeThreadId
                  ? "Continue the conversation..."
                  : "Ask about products, inventory, orders, customers, or store optimization..."
              }
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Attach Files"
            >
              <Upload className="w-5 h-5" />
            </button>

            {/* Action Panel Toggle */}
            {detectedActions.length > 0 && (
              <button
                onClick={() => setShowActionPanel(!showActionPanel)}
                className={`p-2 rounded-lg transition-colors relative ${
                  showActionPanel
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                }`}
                title={`${showActionPanel ? 'Hide' : 'Show'} Detected Actions`}
              >
                <Sparkles className="w-5 h-5" />
                {detectedActions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 text-white text-xs rounded-full flex items-center justify-center">
                    {detectedActions.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
              className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Start New Conversation Thread
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thread Title
                </label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="e.g., Product Creation for Summer Collection"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Context (Optional)
                </label>
                <textarea
                  value={newThreadContext}
                  onChange={(e) => setNewThreadContext(e.target.value)}
                  placeholder="Provide context for this conversation..."
                  className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewThreadModal(false)
                  setNewThreadTitle('')
                  setNewThreadContext('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateThread}
                disabled={!newThreadTitle.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Thread
              </button>
            </div>
          </div>
        </div>
      )}

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
                          timestamp: new Date(),
                          threadId: activeThreadId || undefined
                        }

                        if (activeThreadId) {
                          setThreadMessages(prev => [...prev, successMessage])
                        } else {
                          setMessages(prev => [...prev, successMessage])
                        }
                      }
                    } catch (error) {
                      console.error('Error creating product:', error)
                    }
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Create Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

ShopifyAIChat.displayName = 'ShopifyAIChat'

export default ShopifyAIChat
