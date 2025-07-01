'use client'

import { useState } from 'react'
import { Download, ExternalLink, AlertCircle } from 'lucide-react'

interface ImageRendererProps {
  imageUrl: string
  altText?: string
  imagePath?: string
  className?: string
}

export default function ImageRenderer({ 
  imageUrl, 
  altText = 'Generated Image', 
  imagePath,
  className = '' 
}: ImageRendererProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!imagePath) {
      // Fallback: try to download directly from URL
      try {
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `generated-image-${Date.now()}.png`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('Direct download failed:', error)
      }
      return
    }

    setDownloading(true)
    try {
      // Use secure download endpoint
      const response = await fetch('/api/images/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imagePath })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.downloadUrl) {
          // Create download link
          const link = document.createElement('a')
          link.href = data.downloadUrl
          link.download = `generated-image-${Date.now()}.png`
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        console.error('Download failed:', response.statusText)
      }
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setDownloading(false)
    }
  }

  const handleOpenFullSize = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer')
  }

  if (imageError) {
    return (
      <div className={`my-3 ${className}`}>
        <div className="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Image could not be loaded</p>
            <p className="text-xs text-gray-400 mt-1">The image URL may have expired</p>
            <button
              onClick={handleOpenFullSize}
              className="text-xs text-orange-600 hover:text-orange-700 underline mt-2 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Try opening in new tab
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`my-3 ${className}`}>
      <div className="relative group">
        <img
          src={imageUrl}
          alt={altText}
          className={`max-w-full h-auto rounded-lg border border-gray-200 shadow-sm transition-all duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ maxHeight: '400px' }}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
        
        {/* Loading placeholder */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
            <div className="animate-pulse text-gray-400">Loading image...</div>
          </div>
        )}

        {/* Image overlay with actions - positioned at top right */}
        {imageLoaded && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex space-x-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-white bg-opacity-95 hover:bg-opacity-100 text-gray-800 px-3 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center space-x-1 text-sm font-medium border border-gray-200"
                title="Save Image"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                onClick={handleOpenFullSize}
                className="bg-white bg-opacity-95 hover:bg-opacity-100 text-gray-800 px-3 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center space-x-1 text-sm font-medium border border-gray-200"
                title="Open Full Size"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Full Size</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Image caption */}
      {altText && altText !== 'Generated Image' && (
        <p className="text-xs text-gray-500 mt-2 italic">{altText}</p>
      )}
      
      {/* Image metadata */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span className="flex items-center space-x-1">
          <span>🎨</span>
          <span>AI Generated Image</span>
        </span>
        <span className="text-green-600">
          🔒 Secure
        </span>
      </div>
    </div>
  )
}
