'use client'

import { useState, useEffect } from 'react'
import { 
  Eye, 
  Download, 
  ExternalLink, 
  AlertCircle, 
  Loader2,
  ShoppingCart,
  Sparkles,
  Tag,
  Palette,
  Image as ImageIcon
} from 'lucide-react'
import { UploadedFile, ImageAnalysisResult } from '@/components/ui/FileUpload'

interface ImageMessageDisplayProps {
  images: UploadedFile[]
  className?: string
  showAnalysis?: boolean
  showProductBadges?: boolean
  onImageClick?: (image: UploadedFile) => void
  onToggleProductUse?: (imageId: string) => void
}

const ImageMessageDisplay: React.FC<ImageMessageDisplayProps> = ({
  images,
  className = '',
  showAnalysis = true,
  showProductBadges = true,
  onImageClick,
  onToggleProductUse
}) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [imageLoaded, setImageLoaded] = useState<Set<string>>(new Set())

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set(prev).add(imageId))
  }

  const handleImageLoad = (imageId: string) => {
    setImageLoaded(prev => new Set(prev).add(imageId))
  }

  const handleDownload = async (image: UploadedFile) => {
    if (!image.publicUrl) return

    try {
      const response = await fetch('/api/images/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imagePath: image.storagePath,
          fileName: image.fileName 
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.downloadUrl) {
          const link = document.createElement('a')
          link.href = data.downloadUrl
          link.download = image.fileName || `image-${Date.now()}.jpg`
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const handleViewFullSize = (image: UploadedFile) => {
    if (image.publicUrl) {
      window.open(image.publicUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (!images || images.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Image Grid */}
      <div className={`grid gap-3 ${
        images.length === 1 ? 'grid-cols-1' :
        images.length === 2 ? 'grid-cols-2' :
        images.length === 3 ? 'grid-cols-3' :
        'grid-cols-2 md:grid-cols-3'
      }`}>
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
          >
            {/* Image Container */}
            <div className="relative aspect-square">
              {imageErrors.has(image.id) ? (
                // Error State
                <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4">
                  <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-600 text-center">
                    Image could not be loaded
                  </p>
                  <button
                    onClick={() => handleViewFullSize(image)}
                    className="text-xs text-green-600 hover:text-green-700 underline mt-1"
                  >
                    Try opening in new tab
                  </button>
                </div>
              ) : (
                <>
                  {/* Main Image */}
                  <img
                    src={image.publicUrl || image.preview}
                    alt={image.fileName}
                    className={`w-full h-full object-cover cursor-pointer transition-all duration-300 ${
                      imageLoaded.has(image.id) ? 'opacity-100' : 'opacity-0'
                    }`}
                    loading="lazy"
                    onLoad={() => handleImageLoad(image.id)}
                    onError={() => handleImageError(image.id)}
                    onClick={() => onImageClick ? onImageClick(image) : handleViewFullSize(image)}
                  />

                  {/* Loading State */}
                  {!imageLoaded.has(image.id) && (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-2 left-2 flex flex-col space-y-1">
                    {/* Product Badge */}
                    {showProductBadges && image.useForProduct && (
                      <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                        <ShoppingCart className="w-3 h-3" />
                        <span>Product</span>
                      </div>
                    )}

                    {/* Analysis Badge */}
                    {image.analysisResult && (
                      <div className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 ${
                        image.analysisResult.suitableForEcommerce 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-yellow-500 text-white'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        <span>{Math.round(image.analysisResult.qualityScore * 100)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      {/* View Full Size */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewFullSize(image)
                        }}
                        className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-1.5 rounded"
                        title="View full size"
                      >
                        <Eye className="w-3 h-3" />
                      </button>

                      {/* Download */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(image)
                        }}
                        className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-1.5 rounded"
                        title="Download image"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {/* Toggle Product Use */}
                      {showProductBadges && onToggleProductUse && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleProductUse(image.id)
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            image.useForProduct
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-black bg-opacity-50 hover:bg-opacity-75 text-white'
                          }`}
                          title={image.useForProduct ? 'Remove from product' : 'Use for product'}
                        >
                          <ShoppingCart className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Image Info */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900 truncate" title={image.fileName}>
                  {image.fileName}
                </p>
                {image.dimensions && (
                  <p className="text-xs text-gray-500">
                    {image.dimensions.width}×{image.dimensions.height}
                  </p>
                )}
              </div>

              {/* Analysis Results */}
              {showAnalysis && image.analysisResult && (
                <div className="space-y-2">
                  {/* Description */}
                  {image.analysisResult.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {image.analysisResult.description}
                    </p>
                  )}

                  {/* Tags */}
                  {image.analysisResult.suggestedTags && image.analysisResult.suggestedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {image.analysisResult.suggestedTags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center space-x-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                        >
                          <Tag className="w-2 h-2" />
                          <span>{tag}</span>
                        </span>
                      ))}
                      {image.analysisResult.suggestedTags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{image.analysisResult.suggestedTags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Colors */}
                  {image.analysisResult.colors && image.analysisResult.colors.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Palette className="w-3 h-3 text-gray-400" />
                      <div className="flex space-x-1">
                        {image.analysisResult.colors.slice(0, 4).map((color, index) => (
                          <div
                            key={index}
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: color.toLowerCase() }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Style and Mood */}
                  {(image.analysisResult.style || image.analysisResult.mood) && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {image.analysisResult.style && (
                        <span className="bg-gray-50 px-2 py-0.5 rounded">
                          {image.analysisResult.style}
                        </span>
                      )}
                      {image.analysisResult.mood && (
                        <span className="bg-gray-50 px-2 py-0.5 rounded">
                          {image.analysisResult.mood}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary for Multiple Images */}
      {images.length > 1 && showAnalysis && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <ImageIcon className="w-4 h-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-900">
              {images.length} Images Uploaded
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Product Ready:</span>{' '}
              {images.filter(img => img.analysisResult?.suitableForEcommerce).length}/{images.length}
            </div>
            <div>
              <span className="font-medium">Selected for Product:</span>{' '}
              {images.filter(img => img.useForProduct).length}/{images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageMessageDisplay
