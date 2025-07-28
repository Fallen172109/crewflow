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
  Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  attachments?: UploadedFile[]
  threadId?: string
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
}

const SimplifiedShopifyAIChat = forwardRef<ShopifyAIChatRef, ShopifyAIChatProps>(({ 
  className = '',
  onProductCreated 
}, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)
  const { selectedStore } = useShopifyStore()
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageId = `msg-${Date.now()}`;
    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      attachments: attachments.filter(att => att.uploadStatus === 'completed')
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachments([]);
    setShowFileUpload(false);
    setIsLoading(true);
    adjustHeight(true);

    try {
      // Call the AI Store Manager API
      const response = await fetch('/api/agents/ai-store-manager/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          taskType: 'business_automation',
          threadId: `temp-${Date.now()}`,
          attachments: userMessage.attachments || []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: data.response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMessage]);

      // Handle product creation if detected
      if (data.productPreview && onProductCreated) {
        onProductCreated(data.productPreview);
      } else if (onProductCreated) {
        // Try to extract product information from the response text
        const productInfo = extractProductFromResponse(data.response);
        if (productInfo) {
          onProductCreated(productInfo);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    addAgentResponse: (response: string, taskType: string) => {
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
    },
    sendMessage: async (message: string) => {
      if (!message.trim()) return;

      const messageId = `msg-${Date.now()}`;
      const userMessage: Message = {
        id: messageId,
        type: 'user',
        content: message.trim(),
        timestamp: new Date(),
        attachments: attachments.filter(att => att.uploadStatus === 'completed')
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setAttachments([]);
      setShowFileUpload(false);
      setIsLoading(true);
      adjustHeight(true);

      try {
        const response = await fetch('/api/agents/ai-store-manager/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            message: userMessage.content,
            taskType: 'business_automation',
            threadId: `temp-${Date.now()}`,
            attachments: userMessage.attachments || []
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const agentMessage: Message = {
          id: `agent-${Date.now()}`,
          type: 'agent',
          content: data.response || 'I apologize, but I encountered an issue processing your request.',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, agentMessage]);

        // Handle product creation if detected
        if (data.productPreview && onProductCreated) {
          onProductCreated(data.productPreview);
        } else if (onProductCreated) {
          // Try to extract product information from the response text
          const productInfo = extractProductFromResponse(data.response);
          if (productInfo) {
            onProductCreated(productInfo);
          }
        }

      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: 'system',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  }), [attachments, adjustHeight, onProductCreated]);

  const quickActions = useMemo(() => [
    {
      icon: <Package className="w-4 h-4" />,
      label: "Create Product",
      action: () => handleSendMessage("Help me create a new product for my store")
    },
    {
      icon: <ShoppingCart className="w-4 h-4" />,
      label: "Manage Orders",
      action: () => handleSendMessage("Show me recent orders and their status")
    },
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: "View Analytics",
      action: () => handleSendMessage("Show me store analytics and performance metrics")
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: "Customer Insights",
      action: () => handleSendMessage("Tell me about my customers and their behavior")
    },
    {
      icon: <ImageIcon className="w-4 h-4" />,
      label: "Upload Images",
      action: () => setShowFileUpload(true)
    },
  ], [handleSendMessage]);

  return (
    <div className={cn("flex flex-col h-full bg-gray-50 overflow-hidden", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
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
            {messages.map((message) => (
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
                            <div className="space-y-1">
                              <div className="relative inline-block">
                                <img
                                  src={attachment.preview || attachment.url || attachment.publicUrl}
                                  alt={attachment.fileName || attachment.name}
                                  className="max-w-xs max-h-48 rounded-lg border border-gray-200 shadow-sm object-cover"
                                  onError={(e) => {
                                    // Fallback to filename if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                                <div className="hidden text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  🖼️ {attachment.fileName || attachment.name}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
                              📎 {attachment.fileName || attachment.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
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
                className="group p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <Paperclip className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-500 hidden group-hover:inline transition-opacity">
                  Attach
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-sm text-gray-600 transition-colors border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-between gap-2 max-w-[150px] truncate"
              >
                <Store className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium truncate">
                  {selectedStore ? selectedStore.store_name : 'No Store'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-colors border flex items-center justify-center gap-1 flex-shrink-0",
                  inputValue.trim() && !isLoading
                    ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600 shadow-sm"
                    : "text-gray-400 border-gray-300 cursor-not-allowed bg-gray-50"
                )}
              >
                <ArrowUpIcon
                  className={cn(
                    "w-4 h-4",
                    inputValue.trim() && !isLoading
                      ? "text-white"
                      : "text-gray-400"
                  )}
                />
                <span className="sr-only">Send</span>
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
