'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, File, Image, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import AuthRequiredMessage from './AuthRequiredMessage'

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void
  onFileRemove?: (fileId: string) => void
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptedTypes?: string[]
  disabled?: boolean
  className?: string
  showPreview?: boolean
  existingFiles?: UploadedFile[]
}

export interface UploadedFile {
  id: string
  name: string
  fileName: string // For compatibility with image analysis
  type: string
  fileType: string // For compatibility with image analysis
  size: number
  fileSize: number // For compatibility with image analysis
  url?: string
  publicUrl?: string // For compatibility with image analysis
  storagePath?: string // Storage path for URL refresh
  uploadStatus: 'uploading' | 'completed' | 'failed'
  error?: string
  preview?: string // For image previews
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  onFileRemove,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
  disabled = false,
  className = '',
  showPreview = true,
  existingFiles = []
}) => {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles)
  const [isDragOver, setIsDragOver] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use auth context to get authentication state
  const { user, loading } = useAuth()
  const isAuthenticated = !!user && !loading

  const getFileIcon = (type: string) => {
    if (!type) return <File className="w-5 h-5" />
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />
    if (type === 'application/pdf') return <FileText className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    if (!file) {
      return 'Invalid file'
    }

    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`
    }

    const isValidType = acceptedTypes.some(type => {
      if (!file.type || !type) return false
      try {
        if (type.includes('*')) {
          return file.type.startsWith(type.replace('*', ''))
        }
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type === type
      } catch (error) {
        console.error('Error validating file type:', error)
        return false
      }
    })

    if (!isValidType) {
      return 'File type not supported'
    }

    return null
  }

  const uploadFileToStorage = async (file: File): Promise<{ url: string; path: string; storagePath: string } | null> => {
    try {
      console.log('Starting file upload:', file.name)

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload via API endpoint that handles authentication
      const response = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Handle maintenance mode authentication error specifically
        if (errorData.code === 'AUTH_REQUIRED_MAINTENANCE') {
          setAuthError('Please log in to upload files. You may need to sign in to your CrewFlow account.')
          throw new Error('Please log in to upload files. You may need to sign in to your CrewFlow account.')
        }

        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log('Upload successful:', data)

      return {
        url: data.publicUrl,
        path: data.path,
        storagePath: data.storagePath || data.path
      }
    } catch (error) {
      console.error('Upload error:', error)

      // Handle network errors (Failed to fetch)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setAuthError('Network error: Unable to connect to server. Please check your connection and try again.')
        throw new Error('Network error: Unable to connect to server. Please check your connection and try again.')
      }

      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication required')) {
        setAuthError('Please log in to upload files.')
      }

      throw error
    }
  }

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      const errorFile: UploadedFile = {
        id: `error-${Date.now()}`,
        name: file.name,
        fileName: file.name,
        type: file.type,
        fileType: file.type,
        size: file.size,
        fileSize: file.size,
        uploadStatus: 'failed',
        error: validationError
      }
      setFiles(prev => [...prev, errorFile])
      return
    }

    const uploadingFile: UploadedFile = {
      id: `uploading-${Date.now()}`,
      name: file.name,
      fileName: file.name, // For compatibility
      type: file.type,
      fileType: file.type, // For compatibility
      size: file.size,
      fileSize: file.size, // For compatibility
      uploadStatus: 'uploading'
    }

    // Add preview for images
    if (file.type && file.type.startsWith('image/') && showPreview) {
      const reader = new FileReader()
      reader.onload = (e) => {
        uploadingFile.preview = e.target?.result as string
        setFiles(prev => prev.map(f => f.id === uploadingFile.id ? uploadingFile : f))
      }
      reader.readAsDataURL(file)
    }

    setFiles(prev => [...prev, uploadingFile])

    try {
      console.log('Starting upload for file:', file.name)
      const uploadResult = await uploadFileToStorage(file)

      console.log('Upload result:', uploadResult)

      const completedFile: UploadedFile = {
        ...uploadingFile,
        url: uploadResult.url,
        publicUrl: uploadResult.url, // For compatibility with image analysis
        storagePath: uploadResult.storagePath,
        uploadStatus: 'completed'
      }

      setFiles(prev => prev.map(f => f.id === uploadingFile.id ? completedFile : f))
      onFileUpload(completedFile)

    } catch (error) {
      console.error('File upload failed:', error)
      const failedFile: UploadedFile = {
        ...uploadingFile,
        uploadStatus: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed'
      }
      setFiles(prev => prev.map(f => f.id === uploadingFile.id ? failedFile : f))
    }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList)
    
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    newFiles.forEach(handleFileUpload)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled || !isAuthenticated) return

    const droppedFiles = e.dataTransfer.files
    handleFiles(droppedFiles)
  }, [disabled, isAuthenticated, files.length])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && isAuthenticated) setIsDragOver(true)
  }, [disabled, isAuthenticated])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    if (onFileRemove) {
      onFileRemove(fileId)
    }
  }

  const openFileDialog = () => {
    if (!disabled && isAuthenticated && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Authentication Check */}
      {!loading && !isAuthenticated && (
        <AuthRequiredMessage
          message="You need to be signed in to upload files."
          className="mb-4"
        />
      )}

      {/* Auth Error Message */}
      {authError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{authError}</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-500">
          Max {maxFiles} files, {formatFileSize(maxFileSize)} each
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || !isAuthenticated}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Attached Files</h4>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* File Icon/Preview */}
              <div className="flex-shrink-0">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name || 'Unknown file'}
                </p>
                <p className="text-xs text-gray-500">
                  {file.size && !isNaN(file.size) ? formatFileSize(file.size) : 'Unknown size'}
                </p>
                {file.error && (
                  <p className="text-xs text-red-600">{file.error}</p>
                )}
                {(!file.name || file.name.includes('NaN') || file.name.includes('undefined') || !file.size || isNaN(file.size)) && (
                  <p className="text-xs text-orange-600">⚠️ Corrupted file data</p>
                )}
              </div>

              {/* Status */}
              <div className="flex-shrink-0 flex items-center space-x-2">
                {file.uploadStatus === 'uploading' && (
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                )}
                {file.uploadStatus === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {file.uploadStatus === 'failed' && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  disabled={disabled}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUpload
