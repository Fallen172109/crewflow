'use client'

import { useState, useEffect } from 'react'
import { Agent } from '@/lib/agents'
import { X, Save, Edit3, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload'

interface ThreadContextEditorProps {
  agent: Agent
  threadId: string
  currentContext: string | null
  isOpen: boolean
  onClose: () => void
  onSave: (context: string, attachments?: UploadedFile[]) => void
}

export default function ThreadContextEditor({
  agent,
  threadId,
  currentContext,
  isOpen,
  onClose,
  onSave
}: ThreadContextEditorProps) {
  const [context, setContext] = useState(currentContext || '')
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setContext(currentContext || '')
    setHasChanges(false)
    loadExistingAttachments()
  }, [currentContext, threadId, isOpen])

  const loadExistingAttachments = async () => {
    if (!threadId) return

    try {
      const response = await fetch(`/api/chat/attachments?threadId=${threadId}`)
      if (response.ok) {
        const data = await response.json()

        // Transform database format to UploadedFile format and refresh URLs
        const transformedAttachments = await Promise.all(
          (data.attachments || []).map(async (attachment: any) => {
            let refreshedUrl = attachment.public_url

            // If the attachment has a storage path, try to get a fresh signed URL
            if (attachment.storage_path) {
              try {
                const refreshResponse = await fetch('/api/images/refresh-url', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    storagePath: attachment.storage_path
                  })
                })

                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json()
                  if (refreshData.url) {
                    refreshedUrl = refreshData.url
                  }
                }
              } catch (refreshError) {
                console.warn('Failed to refresh URL for attachment:', attachment.id, refreshError)
              }
            }

            return {
              id: attachment.id,
              name: attachment.file_name || 'Unknown file',
              type: attachment.file_type || 'application/octet-stream',
              size: attachment.file_size || 0,
              url: refreshedUrl,
              uploadStatus: 'completed' as const
            }
          })
        )

        setAttachments(transformedAttachments)
      }
    } catch (error) {
      console.error('Error loading attachments:', error)
    }
  }

  const handleContextChange = (value: string) => {
    setContext(value)
    setHasChanges(value !== (currentContext || ''))
  }

  const handleFileUpload = (file: UploadedFile) => {
    if (!file || !file.id) {
      console.error('Invalid file upload:', file)
      return
    }
    setAttachments(prev => [...prev, file])
    setHasChanges(true)
  }

  const handleFileRemove = async (fileId: string) => {
    if (!fileId) {
      console.error('Invalid file ID for removal:', fileId)
      return
    }

    // Remove from local state immediately
    setAttachments(prev => prev.filter(f => f.id !== fileId))
    setHasChanges(true)

    // Also try to delete from database if it's a database attachment
    try {
      await fetch(`/api/chat/attachments?id=${fileId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.warn('Failed to delete attachment from database:', error)
    }
  }

  const handleCleanupCorruptedFiles = () => {
    // Remove files that show as "NaN undefined" or have invalid data
    setAttachments(prev => prev.filter(file =>
      file.name &&
      file.name !== 'Unknown file' &&
      !file.name.includes('NaN') &&
      !file.name.includes('undefined') &&
      file.size > 0
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(context, attachments)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving context:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                Edit Thread Context
              </h2>
              <p className="text-sm text-gray-500">
                Update the context and instructions for this conversation with {agent.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Context Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thread Context & Instructions
            </label>
            <textarea
              value={context}
              onChange={(e) => handleContextChange(e.target.value)}
              placeholder={`Provide context and instructions for ${agent.name}. This will help the agent understand your specific needs and maintain consistency throughout the conversation.

Example:
- I'm working on a marketing campaign for a tech startup
- Focus on B2B SaaS messaging
- Keep responses professional but approachable
- Include specific metrics when possible`}
              className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This context will be included with every message in this thread to help {agent.name} provide more relevant responses.
            </p>
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Context Files & Attachments
            </label>
            <FileUpload
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              existingFiles={attachments}
              maxFiles={10}
              maxFileSize={25 * 1024 * 1024} // 25MB
              acceptedTypes={[
                'image/*',
                'application/pdf',
                'text/*',
                '.doc', '.docx',
                '.xls', '.xlsx',
                '.ppt', '.pptx',
                '.csv',
                '.json'
              ]}
              className="border border-gray-200 rounded-lg p-4"
              showPreview={true}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Upload files that provide additional context for this conversation. {agent.name} can analyze and reference these files.
              </p>
              {attachments.some(file =>
                !file.name ||
                file.name === 'Unknown file' ||
                file.name.includes('NaN') ||
                file.name.includes('undefined') ||
                file.size <= 0
              ) && (
                <button
                  onClick={handleCleanupCorruptedFiles}
                  className="text-xs text-red-600 hover:text-red-700 underline"
                >
                  🧹 Clean up corrupted files
                </button>
              )}
            </div>
          </div>

          {/* Maritime Theme Note */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Context Persistence
                </h4>
                <p className="text-xs text-blue-700">
                  The context and attachments you provide will be maintained throughout this conversation thread. 
                  {agent.name} will adapt responses based on any changes you make to the context.
                </p>
              </div>
            </div>
          </div>

          {/* Change Indicator */}
          {hasChanges && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  You have unsaved changes to the thread context.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Edit3 className="w-4 h-4" />
            <span>Changes will apply to future messages in this thread</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Context</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
