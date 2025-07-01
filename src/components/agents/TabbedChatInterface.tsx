'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useSearchParams } from 'next/navigation'
import { Agent } from '@/lib/agents'
import { UserProfile } from '@/lib/auth'
import { MessageSquare, Briefcase, Send, Loader2, Settings, Paperclip, FileText, Eye, EyeOff } from 'lucide-react'
import ThreadManager, { ThreadManagerRef } from './ThreadManager'
import ThreadContextModal from './ThreadContextModal'
import ThreadContextEditor from './ThreadContextEditor'
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
  taskType?: string
  threadId?: string | null
}

interface TabbedChatInterfaceProps {
  agent: Agent
  onSendMessage: (message: string, taskType: string, responseTaskType: string, threadId?: string | null) => void
  isLoading: boolean
  userProfile: UserProfile
}

export interface TabbedChatInterfaceRef {
  addAgentResponse: (response: string, taskType: string) => void
}

const chatTabs = [
  {
    id: 'general',
    label: 'General Chat',
    icon: MessageSquare,
    description: 'General conversation and questions'
  },
  {
    id: 'business_automation',
    label: 'Specialized Tools',
    icon: Briefcase,
    description: 'Business automation and specialized tasks'
  }
]

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
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Thread management state
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [showNewThreadModal, setShowNewThreadModal] = useState(false)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [showContextEditor, setShowContextEditor] = useState(false)
  const [currentThreadContext, setCurrentThreadContext] = useState<string | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [messageAttachments, setMessageAttachments] = useState<UploadedFile[]>([])
  const [showContextPanel, setShowContextPanel] = useState(false)
  const [threadAttachments, setThreadAttachments] = useState<any[]>([])
  const threadManagerRef = useRef<ThreadManagerRef>(null)

  // Initialize active tab from URL params
  useEffect(() => {
    const taskType = searchParams.get('taskType')
    if (taskType && chatTabs.some(tab => tab.id === taskType)) {
      setActiveTab(taskType)
    }
  }, [searchParams])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  // Helper function to map task types to tab IDs
  const getTabIdFromTaskType = (type: string) => {
    switch (type) {
      case 'business_automation': return 'business_automation'
      case 'general': return 'general'
      default: return 'general'
    }
  }

  // Handle crew ability actions from the centralized crew page
  useEffect(() => {
    const handleCrewAbilityAction = (event: CustomEvent) => {
      const { action, agentId } = event.detail
      
      if (agentId === agent.id) {
        // Set the appropriate tab based on the action type
        const taskType = action.includes('business') || action.includes('automation') ? 'business_automation' : 'general'
        setActiveTab(taskType)
        
        // Pre-populate the input with the action
        setInputValue(action)
        
        // Focus the input
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }

    window.addEventListener('crewAbilityAction', handleCrewAbilityAction as EventListener)
    return () => {
      window.removeEventListener('crewAbilityAction', handleCrewAbilityAction as EventListener)
    }
  }, [agent.id])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, activeTab, threadMessages])

  // Load thread messages and context when a thread is selected
  useEffect(() => {
    const loadThreadData = async () => {
      if (!activeThreadId) {
        setThreadMessages([])
        setCurrentThreadContext(null)
        return
      }

      try {
        // Load messages
        const messagesResponse = await fetch(`/api/chat/history?agent=${agent.id}&threadId=${activeThreadId}&limit=100`)
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          const historyMessages = messagesData.messages || []
          setThreadMessages(historyMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })))
        }

        // Load thread context
        const threadResponse = await fetch(`/api/chat/threads/${activeThreadId}`)
        if (threadResponse.ok) {
          const threadData = await threadResponse.json()
          setCurrentThreadContext(threadData.thread?.context || null)
        }

        // Load thread attachments
        const attachmentsResponse = await fetch(`/api/chat/attachments?threadId=${activeThreadId}`)
        if (attachmentsResponse.ok) {
          const attachmentsData = await attachmentsResponse.json()
          setThreadAttachments(attachmentsData.attachments || [])
        }
      } catch (error) {
        console.error('Error loading thread data:', error)
        setThreadMessages([])
        setCurrentThreadContext(null)
        setThreadAttachments([])
      }
    }

    loadThreadData()
  }, [activeThreadId, agent.id])

  const handleCreateThread = async (title: string, context: string, attachments?: UploadedFile[]) => {
    try {
      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentName: agent.id,
          taskType: activeTab,
          title,
          context,
          attachments: attachments?.filter(att => att.uploadStatus === 'completed') || []
        })
      })

      if (response.ok) {
        const data = await response.json()
        setActiveThreadId(data.thread.id)
        setCurrentThreadContext(context)
        setShowNewThreadModal(false)
        // Refresh the thread list to show the new thread
        threadManagerRef.current?.refreshThreads()
      }
    } catch (error) {
      console.error('Error creating thread:', error)
    }
  }

  const handleSaveContext = async (context: string, attachments?: any[]) => {
    if (!activeThreadId) return

    try {
      const response = await fetch(`/api/chat/threads/${activeThreadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: context,
          attachments: attachments
        })
      })

      if (response.ok) {
        setCurrentThreadContext(context)
        setShowContextEditor(false)
      }
    } catch (error) {
      console.error('Error saving context:', error)
    }
  }

  const handleFileUpload = (file: UploadedFile) => {
    setMessageAttachments(prev => [...prev, file])
  }

  const handleFileRemove = (fileId: string) => {
    setMessageAttachments(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSendMessage = async (content: string, taskType?: string) => {
    if (!content.trim() && messageAttachments.length === 0) return

    const currentTaskType = taskType || activeTab
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-user`

    // Prepare message content with attachments
    let messageContent = content.trim()
    if (messageAttachments.length > 0) {
      const attachmentList = messageAttachments
        .filter(att => att.uploadStatus === 'completed')
        .map(att => `📎 ${att.name}`)
        .join('\n')
      
      if (attachmentList) {
        messageContent = messageContent ? 
          `${messageContent}\n\nAttachments:\n${attachmentList}` : 
          `Attachments:\n${attachmentList}`
      }
    }

    // Create user message
    const userMessage: Message = {
      id: messageId,
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
      taskType: currentTaskType,
      threadId: activeThreadId
    }

    // Add message to appropriate container
    if (activeThreadId) {
      setThreadMessages(prev => [...prev, userMessage])
    } else {
      const targetTabId = taskType ? getTabIdFromTaskType(taskType) : activeTab
      setMessages(prev => ({
        ...prev,
        [targetTabId]: [...(prev[targetTabId] || []), userMessage]
      }))
    }

    // Save attachments to database if there are any
    if (messageAttachments.length > 0 && activeThreadId) {
      try {
        const completedAttachments = messageAttachments.filter(att => att.uploadStatus === 'completed')
        for (const attachment of completedAttachments) {
          await fetch('/api/chat/attachments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              threadId: activeThreadId,
              fileName: attachment.name,
              fileType: attachment.type,
              fileSize: attachment.size,
              storagePath: attachment.url,
              publicUrl: attachment.url,
              metadata: attachment.metadata || {}
            })
          })
        }
      } catch (error) {
        console.error('Error saving attachments:', error)
      }
    }

    // Clear attachments after sending
    setMessageAttachments([])
    setShowFileUpload(false)

    // Call the parent's send message handler with thread ID
    onSendMessage(content.trim(), currentTaskType, currentTaskType, activeThreadId)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((inputValue.trim() || messageAttachments.length > 0) && !isLoading) {
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
    const agentMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-agent`,
      type: 'agent',
      content: response,
      timestamp: new Date(),
      taskType,
      threadId: activeThreadId
    }

    // Add message to appropriate container
    if (activeThreadId) {
      setThreadMessages(prev => [...prev, agentMessage])
    } else {
      const tabId = getTabIdFromTaskType(taskType)
      setMessages(prev => ({
        ...prev,
        [tabId]: [...(prev[tabId] || []), agentMessage]
      }))
    }
  }

  // Expose addAgentResponse function to parent via ref
  useImperativeHandle(ref, () => ({
    addAgentResponse
  }), [addAgentResponse])

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col shadow-sm">
        {/* Chat Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-0">
            {chatTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-orange-500 text-orange-600 bg-orange-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Thread Manager */}
        <ThreadManager
          ref={threadManagerRef}
          agent={agent}
          taskType={activeTab}
          activeThreadId={activeThreadId}
          onThreadSelect={setActiveThreadId}
          onNewThread={() => setShowNewThreadModal(true)}
        />

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
                  {chatTabs.find(tab => tab.id === activeTab)?.description}
                  {activeThreadId && currentThreadContext && (
                    <span className="ml-2 text-blue-600">• Context set</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {activeThreadId && (
                <>
                  <button
                    onClick={() => setShowContextEditor(true)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                    title="Edit thread context"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Context</span>
                  </button>
                  {(currentThreadContext || threadAttachments.length > 0) && (
                    <button
                      onClick={() => setShowContextPanel(!showContextPanel)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title={showContextPanel ? "Hide context" : "Show context"}
                    >
                      {showContextPanel ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showContextPanel ? 'Hide' : 'View'}</span>
                    </button>
                  )}
                </>
              )}
              <div className="text-xs text-gray-400">
                {isLoading ? 'Typing...' : 'Online'}
              </div>
            </div>
          </div>
        </div>

        {/* Context Panel */}
        {activeThreadId && showContextPanel && (currentThreadContext || threadAttachments.length > 0) && (
          <div className="border-b border-gray-200 bg-blue-50 p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Thread Context</h4>

                {currentThreadContext && (
                  <div className="mb-3">
                    <p className="text-xs text-blue-700 mb-1">Background & Instructions:</p>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{currentThreadContext}</p>
                    </div>
                  </div>
                )}

                {threadAttachments.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Attached Files ({threadAttachments.length}):</p>
                    <div className="space-y-1">
                      {threadAttachments.map((attachment, index) => (
                        <div key={attachment.id || index} className="flex items-center space-x-2 text-xs">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-700">{attachment.file_name}</span>
                          <span className="text-gray-500">({(attachment.file_size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-blue-600 mt-2 italic">
                  {agent.name} is aware of this context and will reference it in responses.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(activeThreadId ? threadMessages : (messages[activeTab] || [])).map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-base font-chat leading-extra-loose">
                  {message.type === 'agent' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <div className="font-chat text-base leading-extra-loose">{message.content}</div>
                  )}
                </div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200">
          {/* File Upload Area */}
          {showFileUpload && (
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <FileUpload
                onFileUpload={handleFileUpload}
                onFileRemove={handleFileRemove}
                existingFiles={messageAttachments}
                maxFiles={5}
                maxFileSize={25 * 1024 * 1024}
                acceptedTypes={[
                  'image/*',
                  'application/pdf',
                  'text/*',
                  '.doc', '.docx',
                  '.xls', '.xlsx',
                  '.csv'
                ]}
                className="border-0"
                showPreview={true}
              />
            </div>
          )}

          <div className="p-4">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <div className="flex items-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className={`p-2 rounded-lg transition-colors ${
                    showFileUpload || messageAttachments.length > 0
                      ? 'bg-orange-100 text-orange-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Attach files"
                  disabled={isLoading}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask ${agent.name} about ${chatTabs.find(tab => tab.id === activeTab)?.label.toLowerCase()}...`}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  disabled={isLoading}
                />

                {messageAttachments.length > 0 && (
                  <div className="absolute bottom-2 right-2 flex items-center space-x-1 text-xs text-gray-500">
                    <Paperclip className="w-3 h-3" />
                    <span>{messageAttachments.length}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={(!inputValue.trim() && messageAttachments.length === 0) || isLoading}
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
      </div>

      {/* Thread Context Modal */}
      <ThreadContextModal
        agent={agent}
        taskType={activeTab}
        isOpen={showNewThreadModal}
        onClose={() => setShowNewThreadModal(false)}
        onCreateThread={handleCreateThread}
      />

      {/* Thread Context Editor Modal */}
      {activeThreadId && (
        <ThreadContextEditor
          agent={agent}
          threadId={activeThreadId}
          currentContext={currentThreadContext}
          isOpen={showContextEditor}
          onClose={() => setShowContextEditor(false)}
          onSave={handleSaveContext}
        />
      )}
    </>
  )
})

TabbedChatInterface.displayName = 'TabbedChatInterface'

export default TabbedChatInterface
