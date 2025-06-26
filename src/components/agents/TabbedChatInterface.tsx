'use client'

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Agent } from '@/lib/agents'
import { MessageSquare, Briefcase, Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
  taskType?: string
}

interface ChatTab {
  id: string
  label: string
  icon: React.ReactNode
  type: 'crew_ability' | 'business_automation' | 'general'
  description: string
}

interface TabbedChatInterfaceProps {
  agent: Agent
  onSendMessage: (content: string, taskType: string) => void
  isLoading: boolean
  userProfile?: any
}

export interface TabbedChatInterfaceRef {
  addAgentResponse: (response: string, taskType: string) => void
}

const TabbedChatInterface = forwardRef<TabbedChatInterfaceRef, TabbedChatInterfaceProps>(({
  agent,
  onSendMessage,
  isLoading,
  userProfile
}, ref) => {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>('general')
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasProcessedUrlParams = useRef<boolean>(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Define chat tabs
  const chatTabs: ChatTab[] = [
    {
      id: 'general',
      label: 'General Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      type: 'general',
      description: `General conversation with ${agent.name}`
    },
    {
      id: 'crew_abilities',
      label: 'Crew Abilities',
      icon: <span className="text-sm">⚓</span>,
      type: 'crew_ability',
      description: 'Daily-use tools and personal productivity tasks'
    },
    {
      id: 'business_automation',
      label: 'Business Tasks',
      icon: <Briefcase className="w-4 h-4" />,
      type: 'business_automation',
      description: `Professional ${agent.title.toLowerCase()} automation and workflows`
    }
  ]

  // Load chat history for each tab
  useEffect(() => {
    const loadChatHistory = async () => {
      const initialMessages: Record<string, Message[]> = {}

      // Load chat history for each tab type
      for (const tab of chatTabs) {
        try {
          const response = await fetch(`/api/chat/history?agent=${agent.id}&taskType=${tab.type}&limit=50`)
          if (response.ok) {
            const data = await response.json()
            const historyMessages = data.messages || []

            // If no history exists, add welcome message
            if (historyMessages.length === 0) {
              initialMessages[tab.id] = [
                {
                  id: `${tab.id}-welcome`,
                  type: 'agent',
                  content: getWelcomeMessage(tab.type),
                  timestamp: new Date(),
                  taskType: tab.type
                }
              ]
            } else {
              // Use existing chat history
              initialMessages[tab.id] = historyMessages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }))
            }
          } else {
            // Fallback to welcome message if API fails
            initialMessages[tab.id] = [
              {
                id: `${tab.id}-welcome`,
                type: 'agent',
                content: getWelcomeMessage(tab.type),
                timestamp: new Date(),
                taskType: tab.type
              }
            ]
          }
        } catch (error) {
          console.error(`Error loading chat history for ${tab.type}:`, error)
          // Fallback to welcome message
          initialMessages[tab.id] = [
            {
              id: `${tab.id}-welcome`,
              type: 'agent',
              content: getWelcomeMessage(tab.type),
              timestamp: new Date(),
              taskType: tab.type
            }
          ]
        }
      }

      setMessages(initialMessages)
    }

    if (userProfile?.id) {
      loadChatHistory()
    }
  }, [agent, userProfile?.id])

  // Reset URL parameter processing flag when agent changes
  useEffect(() => {
    hasProcessedUrlParams.current = false
  }, [agent.id])

  // Handle URL parameters for pre-populated messages
  useEffect(() => {
    const taskType = searchParams.get('taskType')
    const message = searchParams.get('message')
    const task = searchParams.get('task')

    if (taskType && message && !hasProcessedUrlParams.current) {
      // Mark that we've processed the URL parameters to prevent duplicates
      hasProcessedUrlParams.current = true

      // Switch to appropriate tab
      if (taskType === 'crew_ability') {
        setActiveTab('crew_abilities')
      } else if (taskType === 'business_automation') {
        setActiveTab('business_automation')
      }

      // Add the pre-populated message
      setTimeout(() => {
        handleSendMessage(message, taskType)

        // Clear URL parameters after processing to prevent re-processing
        const url = new URL(window.location.href)
        url.searchParams.delete('taskType')
        url.searchParams.delete('message')
        url.searchParams.delete('task')
        window.history.replaceState({}, '', url.toString())
      }, 500)
    }
  }, [searchParams, agent.id])

  const getWelcomeMessage = (tabType: string): string => {
    switch (tabType) {
      case 'crew_ability':
        return `Ahoy! I'm ${agent.name}, ready to help with your daily crew abilities and personal productivity tasks. Whether you need meal planning, fitness routines, image creation, or productivity organization, I'm here to assist with your maritime lifestyle needs!`
      case 'business_automation':
        return `Welcome aboard! I'm ${agent.name}, your ${agent.title} specialist. I'm here to help automate your professional workflows, handle complex ${agent.category} tasks, and streamline your business operations. What can I help you accomplish today?`
      default:
        return `Ahoy! I'm ${agent.name}, your ${agent.title} specialist. I'm here to help you with ${agent.description.toLowerCase()}. How can I assist you today?`
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, activeTab])

  const handleSendMessage = async (content: string, taskType?: string) => {
    if (!content.trim()) return

    // Map task types to tab IDs
    const getTabIdFromTaskType = (type: string) => {
      switch (type) {
        case 'crew_ability': return 'crew_abilities'
        case 'business_automation': return 'business_automation'
        case 'general': return 'general'
        default: return activeTab
      }
    }

    const currentTaskType = taskType || activeTab
    const targetTabId = taskType ? getTabIdFromTaskType(taskType) : activeTab
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-user`

    // Add user message to the correct tab
    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      taskType: currentTaskType
    }

    setMessages(prev => ({
      ...prev,
      [targetTabId]: [...(prev[targetTabId] || []), userMessage]
    }))

    // Call the parent's send message handler
    onSendMessage(content.trim(), currentTaskType)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      handleSendMessage(inputValue)
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Add agent response to messages (called from parent)
  const addAgentResponse = (response: string, taskType: string) => {
    // Map task types to tab IDs consistently
    const getTabIdFromTaskType = (type: string) => {
      switch (type) {
        case 'crew_ability': return 'crew_abilities'
        case 'business_automation': return 'business_automation'
        case 'general': return 'general'
        default: return 'general'
      }
    }

    const tabId = getTabIdFromTaskType(taskType)

    const agentMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-agent`,
      type: 'agent',
      content: response,
      timestamp: new Date(),
      taskType
    }

    setMessages(prev => ({
      ...prev,
      [tabId]: [...(prev[tabId] || []), agentMessage]
    }))
  }

  // Expose addAgentResponse function to parent via ref
  useImperativeHandle(ref, () => ({
    addAgentResponse
  }), [addAgentResponse])

  // Function to render message content with image support
  const renderMessageContent = (content: string) => {
    // Check if the content contains markdown image syntax
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = imageRegex.exec(content)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }

      // Add the image with improved error handling
      const altText = match[1] || 'Generated Image'
      const imageUrl = match[2]
      parts.push(
        <div key={match.index} className="my-3">
          <div className="relative">
            <img
              src={imageUrl}
              alt={altText}
              className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm transition-opacity duration-300"
              style={{ maxHeight: '400px' }}
              loading="lazy"
              onLoad={(e) => {
                const target = e.target as HTMLImageElement
                target.style.opacity = '1'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const container = target.parentElement
                if (container) {
                  container.innerHTML = `
                    <div class="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div class="text-center">
                        <div class="text-gray-400 mb-2">🖼️</div>
                        <p class="text-sm text-gray-600">Image could not be loaded</p>
                        <p class="text-xs text-gray-400 mt-1">The image URL may have expired</p>
                        <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-orange-600 hover:text-orange-700 underline mt-1 inline-block">
                          Try opening in new tab
                        </a>
                      </div>
                    </div>
                  `
                }
              }}
              style={{ opacity: '0.7' }}
            />
          </div>
          {altText && altText !== 'Generated Image' && (
            <p className="text-xs text-gray-500 mt-1 italic">{altText}</p>
          )}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>AI Generated Image</span>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 underline"
            >
              Open full size
            </a>
          </div>
        </div>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after the last image
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    // If no images were found, return the original content
    if (parts.length === 0) {
      return content
    }

    return parts.map((part, index) =>
      typeof part === 'string' ? <span key={index}>{part}</span> : part
    )
  }

  const currentMessages = messages[activeTab] || []
  const currentTab = chatTabs.find(tab => tab.id === activeTab)

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col shadow-sm">
      {/* Chat Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-0">
          {chatTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name[0]}
            </div>
            <div>
              <h3 className="text-gray-900 font-medium">{agent.name}</h3>
              <p className="text-xs text-gray-500">
                {currentTab?.description}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {isLoading ? 'Typing...' : 'Online'}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                message.type === 'user' ? 'bg-orange-500' : ''
              }`} style={message.type === 'agent' ? { backgroundColor: agent.color } : {}}>
                {message.type === 'user' ? 'U' : agent.name[0]}
              </div>
              
              {/* Message Bubble */}
              <div className={`rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="text-sm whitespace-pre-wrap">
                  {renderMessageContent(message.content)}
                </div>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-[80%]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.name[0]}
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${agent.name} about ${currentTab?.label.toLowerCase()}...`}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
})

TabbedChatInterface.displayName = 'TabbedChatInterface'

export default TabbedChatInterface
