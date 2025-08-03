'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Send,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  ArrowUpIcon,
  Paperclip,
  Store,
  ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  History,
  MessageSquare,
  RefreshCw,
  Clock,
  Trash2,
  Edit3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'
import { SmoothStreamingText } from '../ui/SmoothStreamingText'
import { getChatClient, ChatError } from '@/lib/chat/client'
import ThreadManager from '@/components/agents/ThreadManager'
import { useAuth } from '@/lib/auth-context'

interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  attachments?: UploadedFile[]
  threadId?: string
  contextUsed?: any
  importance?: number
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

interface SessionState {
  sessionId: string
  isActive: boolean
  storeContext?: any
}

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      // Use requestAnimationFrame to throttle height adjustments
      requestAnimationFrame(() => {
        textarea.style.height = `${minHeight}px`;
        const newHeight = Math.max(
          minHeight,
          Math.min(
            textarea.scrollHeight,
            maxHeight ?? Number.POSITIVE_INFINITY
          )
        );
        textarea.style.height = `${newHeight}px`;
      });
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

// Helper function to extract product information from AI response
function extractProductFromResponse(response: string): any | null {
  try {
    // Look for common product creation patterns in the response
    const productPatterns = [
      /product.*title[:\s]*["']([^"']+)["']/i,
      /title[:\s]*["']([^"']+)["']/i,
      /creating.*product.*["']([^"']+)["']/i
    ];

    const pricePatterns = [
      /price[:\s]*\$?(\d+\.?\d*)/i,
      /cost[:\s]*\$?(\d+\.?\d*)/i
    ];

    const descriptionPatterns = [
      /description[:\s]*["']([^"']{20,})["']/i,
      /details[:\s]*["']([^"']{20,})["']/i
    ];

    let title = null;
    let price = null;
    let description = null;

    // Extract title
    for (const pattern of productPatterns) {
      const match = response.match(pattern);
      if (match) {
        title = match[1];
        break;
      }
    }

    // Extract price
    for (const pattern of pricePatterns) {
      const match = response.match(pattern);
      if (match) {
        price = parseFloat(match[1]);
        break;
      }
    }

    // Extract description
    for (const pattern of descriptionPatterns) {
      const match = response.match(pattern);
      if (match) {
        description = match[1];
        break;
      }
    }

    // If we found at least a title, create a product preview
    if (title) {
      return {
        title,
        description: description || `AI-generated product: ${title}`,
        price: price || 29.99,
        category: 'General',
        tags: ['AI-generated', 'CrewFlow'],
        images: [] // Will be populated by API if images are present
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting product from response:', error);
    return null;
  }
}

interface ShopifyAIChatProps {
  className?: string;
  onProductCreated?: (product: any) => void;
}

export interface ShopifyAIChatRef {
  addAgentResponse: (response: string, taskType: string) => void;
  sendMessage: (message: string) => void;
  refreshThreads: () => void;
}

const SimplifiedShopifyAIChat = forwardRef<ShopifyAIChatRef, ShopifyAIChatProps>(({
  className = '',
  onProductCreated
}, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [isRestoringContext, setIsRestoringContext] = useState(false)
  const [contextStatus, setContextStatus] = useState<'loading' | 'ready' | 'error'>('ready')
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [showThreadManager, setShowThreadManager] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState<{
    id: string
    content: string
    messageId?: string
    isComplete: boolean
  } | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingBuffer, setStreamingBuffer] = useState('')
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { selectedStore } = useShopifyStore()
  const { user } = useAuth()
  const threadManagerRef = useRef<any>(null)

  // Smooth streaming function with debouncing
  const updateStreamingContent = useCallback((newContent: string) => {
    setStreamingBuffer(newContent)

    // Clear existing timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current)
    }

    // Debounce updates for smoother streaming
    streamingTimeoutRef.current = setTimeout(() => {
      setStreamingMessage(prev => {
        if (!prev) return null
        return {
          ...prev,
          content: newContent
        }
      })
    }, 20) // 20ms debounce for very smooth updates
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current)
      }
    }
  }, [])
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    })
  }, [])

  useEffect(() => {
    if (messages.length > 0 || streamingMessage) {
      scrollToBottom()
    }
  }, [messages.length, streamingMessage?.content, scrollToBottom])

  // Initialize session and show welcome message
  useEffect(() => {
    if (!user?.id) return

    // Initialize simple session state
    const initializeSession = () => {
      const sessionId = `session-${user.id}-${Date.now()}`
      setSessionState({
        sessionId,
        isActive: true,
        storeContext: selectedStore ? {
          storeId: selectedStore.id,
          storeName: selectedStore.store_name,
          currency: selectedStore.currency
        } : null
      })
      setContextStatus('ready')
      setIsRestoringContext(false)

      // Show welcome message if no messages exist and no active thread
      if (messages.length === 0 && !activeThreadId) {
        showWelcomeMessage()
      }
    }

    initializeSession()
  }, [user?.id, selectedStore])

  // Load conversation history when thread changes
  useEffect(() => {
    if (activeThreadId && contextStatus === 'ready') {
      loadConversationHistory()
    }
  }, [activeThreadId, contextStatus])

  const loadConversationHistory = async () => {
    if (!activeThreadId || !user?.id) return

    try {
      setIsLoadingHistory(true)
      console.log('🧵 SIMPLIFIED CHAT: Loading conversation history for thread:', activeThreadId)

      const response = await fetch(`/api/chat/threads/${activeThreadId}/messages`)
      if (response.ok) {
        const data = await response.json()
        const historyMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.message_type,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          threadId: activeThreadId,
          attachments: msg.attachments || []
        }))

        setThreadMessages(historyMessages)
        console.log('🧵 SIMPLIFIED CHAT: Loaded', historyMessages.length, 'messages from history')
      } else if (response.status === 404) {
        // Thread doesn't exist yet (new thread) - this is normal
        console.log('🧵 SIMPLIFIED CHAT: Thread not found (new thread):', activeThreadId)
        setThreadMessages([])
      } else {
        console.error('🧵 SIMPLIFIED CHAT: Failed to load conversation history:', response.statusText)
        setThreadMessages([])
      }
    } catch (error) {
      console.error('🧵 SIMPLIFIED CHAT: Error loading conversation history:', error)
      setThreadMessages([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const showWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'system',
      content: `⚓ **Welcome to your AI Store Manager!**

I'm your dedicated maritime assistant for comprehensive store management. I can help you with:

🏪 **Store Operations**: Product management, inventory tracking, order processing
📊 **Analytics & Insights**: Sales analysis, performance metrics, growth opportunities
🎯 **Marketing & Growth**: Customer engagement, promotional strategies, SEO optimization
🔧 **Technical Support**: Store configuration, app integrations, troubleshooting
📁 **File Analysis**: Upload images, documents, or spreadsheets for AI-powered insights

${selectedStore ? `🎯 Currently managing: **${selectedStore.store_name}**` : '⚠️ Please connect a Shopify store to get started'}

**Ready to navigate your store to success?** Ask me anything, upload files for analysis, or use the quick actions below!`,
      timestamp: new Date()
    }

    if (activeThreadId) {
      setThreadMessages([welcomeMessage])
    } else {
      setMessages([welcomeMessage])
    }
  }

  const createOrGetThread = async (): Promise<string> => {
    if (!user?.id || !sessionState) {
      throw new Error('User not authenticated or session not ready')
    }

    try {
      console.log('🧵 SIMPLIFIED CHAT: Creating new thread for store management')

      // Create a new thread for this conversation
      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentName: 'ai-store-manager',
          taskType: 'business_automation',
          title: `Store Management - ${new Date().toLocaleDateString()}`,
          context: `Store: ${selectedStore?.store_name || 'Unknown'}\nSession: ${sessionState.sessionId}`,
          sessionId: sessionState.sessionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create thread')
      }

      const threadData = await response.json()
      const newThreadId = threadData.thread.id

      setActiveThreadId(newThreadId)
      console.log('🧵 SIMPLIFIED CHAT: Created new thread:', newThreadId)
      return newThreadId

    } catch (error) {
      console.error('🧵 SIMPLIFIED CHAT: Failed to create thread:', error)
      // Fallback to temporary thread
      return `temp-${Date.now()}`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user?.id || !sessionState) return;

    const messageId = `msg-${Date.now()}`;

    // Ensure we have a persistent thread
    let threadIdToUse = activeThreadId
    if (!threadIdToUse) {
      threadIdToUse = await createOrGetThread()
      // Delay to ensure thread is fully committed to database
      await new Promise(resolve => setTimeout(resolve, 300))
      console.log('🧵 SIMPLIFIED CHAT: Thread created and delay completed:', threadIdToUse)
    }

    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      attachments: attachments.filter(att => att.uploadStatus === 'completed'),
      threadId: threadIdToUse
    };

    // Add to appropriate message array
    if (activeThreadId) {
      setThreadMessages(prev => [...prev, userMessage]);
    } else {
      setMessages(prev => [...prev, userMessage]);
    }

    setInputValue('');
    setAttachments([]);
    setShowFileUpload(false);
    setIsLoading(true);
    setIsStreaming(true);
    adjustHeight(true);

    // Initialize streaming message
    const streamingId = `streaming-${Date.now()}`;
    setStreamingMessage({
      id: streamingId,
      content: '',
      isComplete: false
    });

    try {
      // Use streaming chat API for AI Store Manager
      const chatClient = getChatClient()

      console.log('🏪 SIMPLIFIED CHAT: Using streaming chat API', {
        messageLength: userMessage.content.length,
        threadId: threadIdToUse,
        sessionId: sessionState.sessionId,
        attachmentsCount: userMessage.attachments?.length || 0,
        hasContext: !!activeThreadId
      })

      await chatClient.sendStreamingStoreManagerMessage(
        userMessage.content,
        {
          threadId: threadIdToUse,
          attachments: userMessage.attachments || [],
          onChunk: (chunk) => {
            // Update streaming message with new content using smooth streaming
            setStreamingMessage(prev => {
              if (!prev) return null;
              const newContent = prev.content + chunk.content;
              updateStreamingContent(newContent);
              return {
                ...prev,
                content: newContent,
                messageId: chunk.messageId || prev.messageId
              };
            });
          },
          onComplete: (response) => {
            console.log('🏪 SIMPLIFIED CHAT: Streaming completed', {
              success: response.success,
              responseLength: response.response?.length || 0
            });

            // Create final agent message
            const agentMessage: Message = {
              id: `agent-${Date.now()}`,
              type: 'agent',
              content: response.response || 'I apologize, but I encountered an issue processing your request.',
              timestamp: new Date(),
              threadId: threadIdToUse
            };

            // Add to appropriate message array
            if (activeThreadId) {
              setThreadMessages(prev => [...prev, agentMessage]);
            } else {
              setMessages(prev => [...prev, agentMessage]);
            }

            // Clear streaming state
            setStreamingMessage(null);
            setIsStreaming(false);
            setIsLoading(false);

            // Handle product creation if detected
            if (onProductCreated) {
              // Try to extract product information from the response text
              const productInfo = extractProductFromResponse(response.response || '');
              if (productInfo) {
                onProductCreated(productInfo);
              }
            }

            // Refresh thread manager if thread was created
            if (threadManagerRef.current && threadIdToUse !== activeThreadId) {
              threadManagerRef.current.refreshThreads();
            }
          },
          onError: (error) => {
            console.error('🏪 SIMPLIFIED CHAT: Streaming error:', error);

            let errorContent = 'Sorry, I encountered an error. Please try again.'

            if (error instanceof ChatError) {
              errorContent = `Error: ${error.message}`
            } else if (error instanceof Error) {
              errorContent = `Error: ${error.message}`
            }

            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              type: 'system',
              content: errorContent,
              timestamp: new Date()
            };

            // Add to appropriate message array
            if (activeThreadId) {
              setThreadMessages(prev => [...prev, errorMessage]);
            } else {
              setMessages(prev => [...prev, errorMessage]);
            }

            // Clear streaming state
            setStreamingMessage(null);
            setIsStreaming(false);
            setIsLoading(false);
          }
        }
      )

    } catch (error) {
      console.error('🏪 SIMPLIFIED CHAT: Error starting streaming:', error);

      let errorContent = 'Sorry, I encountered an error. Please try again.'

      if (error instanceof ChatError) {
        errorContent = `Error: ${error.message}`
      } else if (error instanceof Error) {
        errorContent = `Error: ${error.message}`
      }

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: errorContent,
        timestamp: new Date()
      };

      // Add to appropriate message array
      if (activeThreadId) {
        setThreadMessages(prev => [...prev, errorMessage]);
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }

      // Clear streaming state
      setStreamingMessage(null);
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  // Temporarily disabled to fix client-side errors
  // const storeInteractionContext = async (
  //   userMessage: Message,
  //   agentMessage: Message,
  //   responseData: any
  // ) => {
  //   // ... context storage code commented out
  // }

  // Thread management functions
  const handleThreadSelect = (threadId: string | null) => {
    setActiveThreadId(threadId);
    if (threadId) {
      setMessages([]); // Clear main messages when switching to thread
    } else {
      setThreadMessages([]); // Clear thread messages when switching to main
      showWelcomeMessage();
    }
  };

  const handleNewThread = () => {
    setActiveThreadId(null);
    setThreadMessages([]);
    showWelcomeMessage();
  };

  const refreshThreads = () => {
    if (threadManagerRef.current) {
      threadManagerRef.current.refreshThreads();
    }
  };

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    addAgentResponse: (response: string, taskType: string) => {
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: response,
        timestamp: new Date(),
        threadId: activeThreadId || undefined
      };

      if (activeThreadId) {
        setThreadMessages(prev => [...prev, agentMessage]);
      } else {
        setMessages(prev => [...prev, agentMessage]);
      }
    },
    refreshThreads,
    sendMessage: async (message: string) => {
      if (!message.trim() || !sessionState) return;

      setInputValue(message);
      await handleSendMessage();
    }
  }), [attachments, adjustHeight, onProductCreated, activeThreadId, sessionState]);

  const quickActions = useMemo(() => [
    {
      icon: <Package className="w-4 h-4" />,
      label: "Create Product",
      action: () => {
        setInputValue("Help me create a new product for my store");
        handleSendMessage();
      }
    },
    {
      icon: <ShoppingCart className="w-4 h-4" />,
      label: "Manage Orders",
      action: () => {
        setInputValue("Show me recent orders and their status");
        handleSendMessage();
      }
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: "View Analytics",
      action: () => {
        setInputValue("Show me store analytics and performance metrics");
        handleSendMessage();
      }
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: "Customer Insights",
      action: () => {
        setInputValue("Tell me about my customers and their behavior");
        handleSendMessage();
      }
    },
    {
      icon: <ImageIcon className="w-4 h-4" />,
      label: "Upload Images",
      action: () => setShowFileUpload(true)
    },
  ], []);

  // Get current messages based on active thread
  const currentMessages = activeThreadId ? threadMessages : messages;

  return (
    <div className={cn("flex flex-col h-full bg-gray-50 overflow-hidden", className)}>
      {/* Header with Thread Management */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">AI Store Manager</span>
            </div>
            {activeThreadId && (
              <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                <MessageSquare className="w-3 h-3" />
                <span>Thread: {activeThreadId.substring(0, 8)}...</span>
              </div>
            )}
            {isLoadingHistory && (
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Loading history...</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowThreadManager(!showThreadManager)}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center space-x-1",
                showThreadManager
                  ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  : "text-gray-600 hover:bg-gray-100"
              )}
              title="Thread Management"
            >
              <History className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">Threads</span>
            </button>
            <button
              onClick={handleNewThread}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Thread Manager */}
      {showThreadManager && (
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <ThreadManager
            ref={threadManagerRef}
            agent={{
              id: 'ai-store-manager',
              name: 'AI Store Manager',
              title: 'Complete Store Management Assistant',
              description: 'Comprehensive AI-powered store management',
              framework: 'hybrid',
              optimalAiModules: ['LangChain', 'OpenAI GPT-4'],
              capabilities: ['product_creation', 'inventory_management', 'analytics'],
              personality: 'Professional maritime-themed assistant',
              systemPrompt: 'You are the AI Store Manager',
              tools: [],
              integrations: ['shopify'],
              isActive: true
            }}
            taskType="business_automation"
            activeThreadId={activeThreadId}
            onThreadSelect={handleThreadSelect}
            onNewThread={handleNewThread}
          />
        </div>
      )}

      {/* Session Info Bar */}
      {contextStatus === 'ready' && selectedStore && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4 text-orange-800">
              <div className="flex items-center space-x-1">
                <Store className="w-3 h-3" />
                <span className="font-medium">{selectedStore.store_name}</span>
              </div>
              <span>•</span>
              <span>{selectedStore.currency}</span>
              {selectedStore.plan_name && (
                <>
                  <span>•</span>
                  <span className="capitalize">{selectedStore.plan_name} Plan</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2 text-orange-600">
              <CheckCircle className="w-3 h-3" />
              <span className="font-medium">Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 min-h-0">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                How can I help manage your store?
              </h2>
              <p className="text-gray-600 text-lg">
                AI-powered Shopify management at your fingertips
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap max-w-4xl">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={action.action}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-full border border-gray-200 text-gray-700 hover:text-gray-900 transition-colors shadow-sm"
                >
                  {action.icon}
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div className={cn(
                  "max-w-[80%] rounded-lg p-4 shadow-sm overflow-hidden break-words",
                  message.type === 'user'
                    ? 'bg-orange-500 text-white'
                    : message.type === 'system'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-white text-gray-900 border border-gray-200'
                )}>
                  <MarkdownRenderer content={message.content} />
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment, index) => (
                        <div key={index}>
                          {attachment.fileType?.startsWith('image/') ? (
                            <div className="space-y-2">
                              <div className="relative inline-block group">
                                <img
                                  src={attachment.preview || attachment.url || attachment.publicUrl}
                                  alt={attachment.fileName || attachment.name}
                                  className="max-w-xs max-h-64 rounded-lg border border-gray-200 shadow-sm object-cover cursor-pointer hover:shadow-md transition-shadow"
                                  onError={(e) => {
                                    // Fallback to filename if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                  onClick={() => {
                                    // Open image in new tab for full view
                                    window.open(attachment.preview || attachment.url || attachment.publicUrl, '_blank');
                                  }}
                                />
                                <div className="hidden text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  🖼️ {attachment.fileName || attachment.name}
                                </div>
                                {/* Image overlay with filename */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  {attachment.fileName || attachment.name}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-lg inline-flex">
                              <Paperclip className="w-3 h-3" />
                              <span className="font-medium">{attachment.fileName || attachment.name}</span>
                              {attachment.fileSize && (
                                <span className="text-gray-500">
                                  ({(attachment.fileSize / 1024).toFixed(1)} KB)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-white text-gray-900 border border-gray-200 rounded-lg p-4 shadow-sm overflow-hidden break-words">
                  <SmoothStreamingText
                    content={streamingMessage.content}
                    isStreaming={isStreaming}
                    animationSpeed={25}
                  />
                </div>
              </div>
            )}

            {/* Loading indicator for non-streaming */}
            {isLoading && !isStreaming && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}



            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* File Upload */}
      <AnimatePresence>
        {showFileUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 p-4 bg-white"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Upload Files</h4>
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <FileUpload
                onFileUpload={(file) => {
                  setAttachments(prev => [...prev, file]);
                }}
                onFileRemove={(fileId) => {
                  setAttachments(prev => prev.filter(f => f.id !== fileId));
                }}
                existingFiles={attachments}
                maxFiles={5}
                maxFileSize={10 * 1024 * 1024}
                acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.txt']}
                showPreview={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicator */}
      {(isStreaming && !streamingMessage?.content) && (
        <div className="flex items-center justify-center py-3 px-4 border-t border-gray-200 bg-orange-50">
          <div className="flex items-center space-x-2 px-3 py-2 bg-white border border-orange-200 rounded-lg shadow-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-orange-700 font-medium">AI is thinking...</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <div className="relative bg-white rounded-xl border border-gray-300 shadow-sm focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 max-w-full">
          <div className="overflow-hidden">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to create products, manage inventory, analyze sales, or help with any store task..."
              className={cn(
                "w-full px-4 py-3",
                "resize-none",
                "bg-transparent",
                "border-none",
                "text-gray-900 text-sm",
                "focus:outline-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-gray-500 placeholder:text-sm",
                "min-h-[60px] max-h-[200px]"
              )}
              style={{ overflow: "hidden" }}
            />
          </div>

          <div className="flex items-center justify-between p-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className={cn(
                  "group p-2 rounded-lg transition-colors flex items-center gap-1",
                  showFileUpload
                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    : "hover:bg-gray-100 text-gray-600"
                )}
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
                {attachments.length > 0 && (
                  <span className="text-xs font-medium bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    {attachments.length}
                  </span>
                )}
              </button>
              {activeThreadId && (
                <button
                  type="button"
                  onClick={() => setShowThreadManager(!showThreadManager)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showThreadManager
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                  title="Thread history"
                >
                  <History className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedStore && (
                <div className="px-3 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 bg-gray-50 flex items-center gap-2 max-w-[150px]">
                  <Store className="w-4 h-4 flex-shrink-0 text-green-600" />
                  <span className="font-medium truncate">{selectedStore.store_name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || isStreaming || !sessionState}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm transition-colors border flex items-center justify-center gap-2 flex-shrink-0 min-w-[80px]",
                  inputValue.trim() && !isLoading && !isStreaming && sessionState
                    ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600 shadow-sm"
                    : "text-gray-400 border-gray-300 cursor-not-allowed bg-gray-50"
                )}
              >
                {isLoading || isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpIcon className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {isStreaming ? 'Streaming...' : isLoading ? 'Sending...' : 'Send'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

SimplifiedShopifyAIChat.displayName = 'SimplifiedShopifyAIChat';

export default SimplifiedShopifyAIChat;
