'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle, 
  Eye,
  Sparkles,
  ShoppingCart,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { UploadedFile, ImageAnalysisResult } from '@/components/ui/FileUpload'
import AuthRequiredMessage from '@/components/ui/AuthRequiredMessage'
import { handleImageUploadError, handleImageAnalysisError, ImageUploadError } from '@/lib/errors/image-upload-errors'

interface ImageUploadProps {
  onImageUpload: (file: UploadedFile) => void
  onImageRemove?: (fileId: string) => void
  maxImages?: number
  maxFileSize?: number // in bytes
  disabled?: boolean
  className?: string
  existingImages?: UploadedFile[]
  enableAnalysis?: boolean
  showProductSelection?: boolean
  compact?: boolean // New prop for compact mode
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  onImageRemove,
  maxImages = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className = '',
  existingImages = [],
  enableAnalysis = true,
  showProductSelection = true,
  compact = false
}) => {
  const [images, setImages] = useState<UploadedFile[]>(existingImages)
  const [isDragOver, setIsDragOver] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [analyzingImages, setAnalyzingImages] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use auth context to get authentication state
  const { user, loading } = useAuth()
  const isAuthenticated = !!user && !loading

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateImageFile = (file: File): string | null => {
    if (!file) {
      return 'Invalid file'
    }

    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed'
    }

    if (file.size > maxFileSize) {
      return `Image size exceeds ${formatFileSize(maxFileSize)} limit`
    }

    // Check for supported image formats
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!supportedFormats.includes(file.type.toLowerCase())) {
      return 'Supported formats: JPG, PNG, WebP, GIF'
    }

    return null
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      
      img.src = url
    })
  }

  const uploadImageToStorage = async (file: File): Promise<{ url: string; path: string; storagePath: string } | null> => {
    try {
      console.log('Starting image upload:', file.name)

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
          setAuthError('Please log in to upload images. You may need to sign in to your CrewFlow account.')
          throw new Error('Please log in to upload images. You may need to sign in to your CrewFlow account.')
        }

        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log('Image upload successful:', data)

      return {
        url: data.publicUrl,
        path: data.path,
        storagePath: data.storagePath || data.path
      }
    } catch (error) {
      console.error('Image upload error:', error)

      // Handle network errors (Failed to fetch)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setAuthError('Network error: Unable to connect to server. Please check your connection and try again.')
        throw new Error('Network error: Unable to connect to server. Please check your connection and try again.')
      }

      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Authentication required')) {
        setAuthError('Please log in to upload images.')
      }

      throw error
    }
  }

  const saveImageToDatabase = async (imageFile: UploadedFile): Promise<void> => {
    try {
      const response = await fetch('/api/chat/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: imageFile.fileName,
          originalName: imageFile.fileName,
          fileSize: imageFile.fileSize,
          mimeType: imageFile.fileType,
          storagePath: imageFile.storagePath,
          publicUrl: imageFile.publicUrl,
          width: imageFile.dimensions?.width,
          height: imageFile.dimensions?.height,
          analysisResult: imageFile.analysisResult,
          useForProduct: imageFile.useForProduct || false
        })
      })

      if (!response.ok) {
        console.error('Failed to save image to database:', response.statusText)
      } else {
        const data = await response.json()
        console.log('✅ Image saved to database:', data.image?.id)
      }
    } catch (error) {
      console.error('Error saving image to database:', error)
    }
  }

  const analyzeImage = async (imageFile: UploadedFile): Promise<ImageAnalysisResult | null> => {
    if (!enableAnalysis || !imageFile.publicUrl) return null

    try {
      setAnalyzingImages(prev => new Set(prev).add(imageFile.id))

      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageFile.publicUrl,
          fileName: imageFile.fileName,
          context: 'shopify-product-image'
        })
      })

      if (!response.ok) {
        console.error('Image analysis failed:', response.statusText)
        return null
      }

      const analysisResult = await response.json()
      return analysisResult
    } catch (error) {
      console.error('Error analyzing image:', error)
      const analysisError = handleImageAnalysisError(error)

      // Show non-blocking error message for analysis failures
      console.warn('Image analysis failed:', analysisError.userMessage)

      return null
    } finally {
      setAnalyzingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(imageFile.id)
        return newSet
      })
    }
  }

  const handleImageUpload = async (file: File) => {
    const validationError = validateImageFile(file)
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
        error: validationError,
        isImage: true
      }
      setImages(prev => [...prev, errorFile])
      return
    }

    // Get image dimensions
    let dimensions: { width: number; height: number } | undefined
    try {
      dimensions = await getImageDimensions(file)
    } catch (error) {
      console.warn('Could not get image dimensions:', error)
    }

    const uploadingFile: UploadedFile = {
      id: `uploading-${Date.now()}`,
      name: file.name,
      fileName: file.name,
      type: file.type,
      fileType: file.type,
      size: file.size,
      fileSize: file.size,
      uploadStatus: 'uploading',
      isImage: true,
      dimensions,
      useForProduct: false
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadingFile.preview = e.target?.result as string
      setImages(prev => prev.map(f => f.id === uploadingFile.id ? uploadingFile : f))
    }
    reader.readAsDataURL(file)

    setImages(prev => [...prev, uploadingFile])

    try {
      console.log('Starting upload for image:', file.name)
      const uploadResult = await uploadImageToStorage(file)

      const completedFile: UploadedFile = {
        ...uploadingFile,
        url: uploadResult.url,
        publicUrl: uploadResult.url,
        storagePath: uploadResult.storagePath,
        uploadStatus: 'completed'
      }

      setImages(prev => prev.map(f => f.id === uploadingFile.id ? completedFile : f))

      // Analyze image if enabled
      if (enableAnalysis) {
        const analysisResult = await analyzeImage(completedFile)
        if (analysisResult) {
          const analyzedFile = {
            ...completedFile,
            analysisResult
          }
          setImages(prev => prev.map(f => f.id === completedFile.id ? analyzedFile : f))

          // Save to database with analysis
          await saveImageToDatabase(analyzedFile)
          onImageUpload(analyzedFile)
        } else {
          // Save to database without analysis
          await saveImageToDatabase(completedFile)
          onImageUpload(completedFile)
        }
      } else {
        // Save to database without analysis
        await saveImageToDatabase(completedFile)
        onImageUpload(completedFile)
      }

    } catch (error) {
      console.error('Image upload failed:', error)
      const uploadError = handleImageUploadError(error)
      const failedFile: UploadedFile = {
        ...uploadingFile,
        uploadStatus: 'failed',
        error: uploadError.userMessage
      }
      setImages(prev => prev.map(f => f.id === uploadingFile.id ? failedFile : f))

      // Show user-friendly error message
      setAuthError(uploadError.userMessage)

      // Clear error after 5 seconds
      setTimeout(() => setAuthError(null), 5000)
    }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList)
    
    if (images.length + newFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    newFiles.forEach(handleImageUpload)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled || !isAuthenticated) return

    const droppedFiles = e.dataTransfer.files
    handleFiles(droppedFiles)
  }, [disabled, isAuthenticated, images.length])

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

  const removeImage = (imageId: string) => {
    setImages(prev => prev.filter(f => f.id !== imageId))
    if (onImageRemove) {
      onImageRemove(imageId)
    }
  }

  const toggleProductUse = (imageId: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId 
        ? { ...img, useForProduct: !img.useForProduct }
        : img
    ))
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
          message="You need to be signed in to upload images."
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
          border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer
          ${compact ? 'p-3' : 'p-6'}
          ${isDragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <ImageIcon className={`text-gray-400 mx-auto mb-2 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
        <p className={`text-gray-600 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          Drop images here or click to browse
        </p>
        <p className="text-xs text-gray-500">
          Max {maxImages} images, {formatFileSize(maxFileSize)} each
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supported: JPG, PNG, WebP, GIF
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || !isAuthenticated}
        />
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Uploaded Images</h4>
            {showProductSelection && (
              <p className="text-xs text-gray-500">
                Click <ShoppingCart className="w-3 h-3 inline mx-1" /> to use for product
              </p>
            )}
          </div>

          <div className={`grid gap-3 ${compact ? 'grid-cols-3 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image Preview */}
                <div className="aspect-square relative">
                  {image.preview ? (
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  {/* Upload Status Overlay */}
                  {image.uploadStatus === 'uploading' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}

                  {image.uploadStatus === 'failed' && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                  )}

                  {/* Analysis Status */}
                  {analyzingImages.has(image.id) && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        <span>Analyzing</span>
                      </div>
                    </div>
                  )}

                  {/* Product Selection Badge */}
                  {image.useForProduct && (
                    <div className="absolute top-2 left-2">
                      <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                        <ShoppingCart className="w-3 h-3" />
                        <span>Product</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      {/* View Full Size */}
                      {image.preview && (
                        <button
                          onClick={() => window.open(image.preview, '_blank')}
                          className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-1 rounded"
                          title="View full size"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}

                      {/* Toggle Product Use */}
                      {showProductSelection && image.uploadStatus === 'completed' && (
                        <button
                          onClick={() => toggleProductUse(image.id)}
                          className={`p-1 rounded transition-colors ${
                            image.useForProduct
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-black bg-opacity-50 hover:bg-opacity-75 text-white'
                          }`}
                          title={image.useForProduct ? 'Remove from product' : 'Use for product'}
                        >
                          <ShoppingCart className="w-3 h-3" />
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => removeImage(image.id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Image Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 truncate" title={image.name}>
                    {image.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {formatFileSize(image.size)}
                    </p>
                    {image.dimensions && (
                      <p className="text-xs text-gray-500">
                        {image.dimensions.width}×{image.dimensions.height}
                      </p>
                    )}
                  </div>

                  {/* Analysis Results */}
                  {image.analysisResult && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          image.analysisResult.suitableForEcommerce ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        <p className="text-xs text-gray-600">
                          Quality: {Math.round(image.analysisResult.qualityScore * 100)}%
                        </p>
                      </div>
                      {image.analysisResult.suggestedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {image.analysisResult.suggestedTags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block bg-gray-100 text-gray-600 text-xs px-1 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {image.analysisResult.suggestedTags.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{image.analysisResult.suggestedTags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {image.error && (
                    <p className="text-xs text-red-600 mt-1">{image.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUpload
