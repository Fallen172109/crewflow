'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Agent } from '@/lib/agents'
import { Plus, MessageSquare, Calendar, Settings, Trash2, Edit3 } from 'lucide-react'

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

interface ThreadManagerProps {
  agent: Agent
  taskType: string
  activeThreadId: string | null
  onThreadSelect: (threadId: string | null) => void
  onNewThread: () => void
  onThreadCreated?: () => void
  userProfile?: any
}

export interface ThreadManagerRef {
  refreshThreads: () => void
}

const ThreadManager = forwardRef<ThreadManagerRef, ThreadManagerProps>(({
  agent,
  taskType,
  activeThreadId,
  onThreadSelect,
  onNewThread,
  onThreadCreated,
  userProfile
}, ref) => {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)
  const [editingThread, setEditingThread] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const loadThreads = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chat/threads?agent=${agent.id}&taskType=${taskType}`)
      if (response.ok) {
        const data = await response.json()
        setThreads(data.threads || [])
      }
    } catch (error) {
      console.error('Error loading threads:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load threads for this agent and task type
  useEffect(() => {
    loadThreads()
  }, [agent.id, taskType])

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refreshThreads: loadThreads
  }), [loadThreads])

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Are you sure you want to delete this conversation thread? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/chat/threads/${threadId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadId))
        if (activeThreadId === threadId) {
          onThreadSelect(null)
        }
      }
    } catch (error) {
      console.error('Error deleting thread:', error)
    }
  }

  const handleEditThread = async (threadId: string, newTitle: string) => {
    if (!newTitle.trim()) return

    try {
      const response = await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle.trim() })
      })

      if (response.ok) {
        setThreads(prev => prev.map(t => 
          t.id === threadId ? { ...t, title: newTitle.trim() } : t
        ))
        setEditingThread(null)
        setEditTitle('')
      }
    } catch (error) {
      console.error('Error updating thread:', error)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `${weeks}w ago`
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-4 border-b border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Conversation Threads</h3>
          <button
            onClick={onNewThread}
            className="flex items-center space-x-1 px-3 py-1.5 bg-orange-600 text-white text-xs rounded-md hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>New Thread</span>
          </button>
        </div>
      </div>

      {/* Thread List */}
      <div className="max-h-64 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No conversation threads yet.</p>
            <p className="text-xs mt-1">Start a new thread to begin chatting with {agent.name}.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`p-3 cursor-pointer hover:bg-gray-100 transition-colors ${
                  activeThreadId === thread.id ? 'bg-orange-50 border-r-2 border-orange-500' : ''
                }`}
                onClick={() => onThreadSelect(thread.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingThread === thread.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleEditThread(thread.id, editTitle)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditThread(thread.id, editTitle)
                            } else if (e.key === 'Escape') {
                              setEditingThread(null)
                              setEditTitle('')
                            }
                          }}
                          className="flex-1 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {thread.title}
                      </h4>
                    )}
                    
                    {thread.context && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {thread.context}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                        <span
                          className="flex items-center space-x-1"
                          title={formatFullDate(thread.updated_at)}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{formatRelativeTime(thread.updated_at)}</span>
                        </span>
                        {thread.message_count && (
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{thread.message_count}</span>
                          </span>
                        )}
                      </div>

                      {/* Thread status indicator */}
                      <div className="flex items-center space-x-1">
                        {activeThreadId === thread.id && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        )}
                        {thread.task_type === 'business_automation' && (
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Business Automation"></div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingThread(thread.id)
                        setEditTitle(thread.title)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Edit thread title"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteThread(thread.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

ThreadManager.displayName = 'ThreadManager'

export default ThreadManager
