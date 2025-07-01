'use client'

import { useState } from 'react'
import { Agent } from '@/lib/agents'
import { X, Compass, Target, FileText, Lightbulb, Paperclip } from 'lucide-react'
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload'

interface ThreadContextModalProps {
  agent: Agent
  taskType: string
  isOpen: boolean
  onClose: () => void
  onCreateThread: (title: string, context: string, attachments?: UploadedFile[]) => void
}

export default function ThreadContextModal({
  agent,
  taskType,
  isOpen,
  onClose,
  onCreateThread
}: ThreadContextModalProps) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const completedAttachments = attachments.filter(att => att.uploadStatus === 'completed')
      await onCreateThread(title.trim(), context.trim(), completedAttachments)
      setTitle('')
      setContext('')
      setAttachments([])
      setShowFileUpload(false)
      onClose()
    } catch (error) {
      console.error('Error creating thread:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (file: UploadedFile) => {
    setAttachments(prev => [...prev, file])
  }

  const handleFileRemove = (fileId: string) => {
    setAttachments(prev => prev.filter(f => f.id !== fileId))
  }

  const getTaskTypeDescription = () => {
    switch (taskType) {
      case 'business_automation':
        return `Professional ${agent.title.toLowerCase()} automation and workflows`
      case 'general':
        return `General conversation with ${agent.name}`
      default:
        return `Specialized conversation with ${agent.name}`
    }
  }

  const getContextSuggestions = () => {
    const basePrompts = [
      "What project or goal are you working on?",
      "What's the scope of work you need help with?",
      "What background information should I know?",
      "What are your main objectives for this conversation?"
    ]

    switch (agent.category) {
      case 'support':
        return [
          "What customer issue or support process are you working on?",
          "What product or service needs support assistance?",
          "What's the customer's situation or background?",
          "What support goals do you want to achieve?"
        ]
      case 'marketing':
        return [
          "What marketing campaign or strategy are you developing?",
          "What's your target audience and market?",
          "What products/services are you promoting?",
          "What marketing goals do you want to achieve?"
        ]
      case 'content':
        return [
          "What content project or strategy are you working on?",
          "What's your target audience and content goals?",
          "What topics or themes should I focus on?",
          "What content formats do you need help with?"
        ]
      case 'social':
        return [
          "What social media campaign or strategy are you planning?",
          "What platforms and audience are you targeting?",
          "What brand voice or messaging should I maintain?",
          "What social media goals do you want to achieve?"
        ]
      case 'ecommerce':
        return [
          "What e-commerce project or store are you working on?",
          "What products or services are you selling?",
          "What's your target market and customer base?",
          "What e-commerce goals do you want to achieve?"
        ]
      default:
        return basePrompts
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Start New Conversation with {agent.name}
              </h2>
              <p className="text-sm text-gray-500">{getTaskTypeDescription()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Thread Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-2" />
              Conversation Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g., "Q4 Marketing Campaign Planning" or "Customer Support Workflow"`}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Give this conversation a descriptive title to help you find it later.
            </p>
          </div>

          {/* Context Setting */}
          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
              <Compass className="w-4 h-4 inline mr-2" />
              Project Context & Background
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide background information, project details, goals, or any context that will help me assist you better throughout this conversation..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              This context will be remembered throughout the entire conversation thread.
            </p>
          </div>

          {/* File Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                <Paperclip className="w-4 h-4 inline mr-2" />
                File Attachments (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  showFileUpload || attachments.length > 0
                    ? 'bg-orange-100 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {showFileUpload ? 'Hide Upload' : 'Add Files'}
              </button>
            </div>

            {showFileUpload && (
              <div className="mb-4">
                <FileUpload
                  onFileUpload={handleFileUpload}
                  onFileRemove={handleFileRemove}
                  existingFiles={attachments}
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

            {attachments.length > 0 && !showFileUpload && (
              <div className="text-xs text-gray-600 mb-2">
                {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
              </div>
            )}

            <p className="text-xs text-gray-500">
              Attach relevant files to provide additional context for this conversation thread.
            </p>
          </div>

          {/* Context Suggestions */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-orange-900 mb-2">
                  Context Suggestions
                </h4>
                <div className="space-y-1">
                  {getContextSuggestions().map((suggestion, index) => (
                    <p key={index} className="text-xs text-orange-700">
                      • {suggestion}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Maritime Theme Note */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Maritime AI Assistant
                </h4>
                <p className="text-xs text-blue-700">
                  {agent.name} will maintain awareness of your context throughout this conversation thread, 
                  providing consistent and contextual assistance with your {agent.title.toLowerCase()} needs.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Start Conversation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
