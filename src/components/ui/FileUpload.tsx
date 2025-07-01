'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Image, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  type: string
  size: number
  url?: string
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const uploadFileToStorage = async (file: File): Promise<{ url: string; path: string } | null> => {
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
        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log('Upload successful:', data)

      return {
        url: data.publicUrl,
        path: data.path
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      const errorFile: UploadedFile = {
        id: `error-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadStatus: 'failed',
        error: validationError
      }
      setFiles(prev => [...prev, errorFile])
      return
    }

    const uploadingFile: UploadedFile = {
      id: `uploading-${Date.now()}`,
      name: file.name,
      type: file.type,
      size: file.size,
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
    
    if (disabled) return
    
    const droppedFiles = e.dataTransfer.files
    handleFiles(droppedFiles)
  }, [disabled, files.length])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }, [disabled])

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
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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
          disabled={disabled}
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
