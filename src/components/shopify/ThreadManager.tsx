'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Plus, MessageSquare, Trash2, Edit3 } from 'lucide-react'

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
  agentName?: string
  taskType: string
  activeThreadId: string | null
  onThreadSelect: (threadId: string | null) => void
  onNewThread: () => void
  onThreadCreated?: () => void
}

export interface ThreadManagerRef {
  refreshThreads: () => void
}

const ThreadManager = forwardRef<ThreadManagerRef, ThreadManagerProps>(({
  agentName = 'ai_store_manager',
  taskType,
  activeThreadId,
  onThreadSelect,
  onNewThread,
  onThreadCreated
}, ref) => {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)
  const [editingThread, setEditingThread] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const loadThreads = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chat/threads?agent=${agentName}&taskType=${taskType}`)
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

  useEffect(() => {
    loadThreads()
  }, [agentName, taskType])

  useImperativeHandle(ref, () => ({
    refreshThreads: loadThreads
  }), [])

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
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
        headers: { 'Content-Type': 'application/json' },
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

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewThread}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-green-500 rounded-full mx-auto mb-2" />
            Loading...
          </div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs text-gray-400">Start a new conversation above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`group relative ${
                  activeThreadId === thread.id
                    ? 'bg-green-50 border-l-2 border-green-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                {editingThread === thread.id ? (
                  <div className="p-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditThread(thread.id, editTitle)
                        if (e.key === 'Escape') {
                          setEditingThread(null)
                          setEditTitle('')
                        }
                      }}
                      onBlur={() => {
                        setEditingThread(null)
                        setEditTitle('')
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onThreadSelect(thread.id)}
                    className="w-full text-left p-3 pr-16"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {thread.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(thread.updated_at)}
                    </p>
                  </button>
                )}

                {/* Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingThread(thread.id)
                      setEditTitle(thread.title || '')
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                    title="Rename"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteThread(thread.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
