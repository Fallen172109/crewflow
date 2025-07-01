'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Download, Share2, Copy, Sparkles } from 'lucide-react'

interface ImageGenerationRequest {
  prompt: string
  style: string
  aspectRatio: string
  quality: 'standard' | 'hd'
}

interface ImageGenerationResponse {
  success: boolean
  imageUrl?: string
  revisedPrompt?: string
  tokensUsed: number
  latency: number
  model: string
  error?: string
  metadata?: {
    originalPrompt: string
    enhancedPrompt: string
    style: string
    aspectRatio: string
  }
}

export default function ImageGenerationPage() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ImageGenerationRequest>({
    prompt: '',
    style: 'Digital Art',
    aspectRatio: 'Square (1:1)',
    quality: 'standard'
  })
  const [result, setResult] = useState<ImageGenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof ImageGenerationRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      setError('Please enter an image description')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/crew-abilities/image-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: userProfile?.id
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Image generation failed')
      }
    } catch (err) {
      setError('Network error occurred. Please try again.')
      console.error('Image generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyImageUrl = () => {
    if (result?.imageUrl) {
      navigator.clipboard.writeText(result.imageUrl)
      // You could add a toast notification here
    }
  }

  const downloadImage = async () => {
    if (result?.imageUrl) {
      try {
        const response = await fetch(result.imageUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `crewflow-generated-image-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } catch (err) {
        console.error('Download failed:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-8 rounded-lg mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Image Generator</h1>
              <p className="text-purple-100 mt-2">Create any image you can imagine with AI-powered generation</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Image Settings</h2>
            
            <div className="space-y-6">
              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Description *
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => handleInputChange('prompt', e.target.value)}
                  placeholder="Describe the image you want to create in detail..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific about style, colors, composition, and subject matter
                </p>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Art Style
                </label>
                <select
                  value={formData.style}
                  onChange={(e) => handleInputChange('style', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Photorealistic">Photorealistic</option>
                  <option value="Digital Art">Digital Art</option>
                  <option value="Oil Painting">Oil Painting</option>
                  <option value="Watercolor">Watercolor</option>
                  <option value="Sketch">Sketch</option>
                  <option value="Cartoon">Cartoon</option>
                  <option value="Abstract">Abstract</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={formData.aspectRatio}
                  onChange={(e) => handleInputChange('aspectRatio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Square (1:1)">Square (1:1)</option>
                  <option value="Portrait (3:4)">Portrait (3:4)</option>
                  <option value="Landscape (4:3)">Landscape (4:3)</option>
                  <option value="Wide (16:9)">Wide (16:9)</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality
                </label>
                <select
                  value={formData.quality}
                  onChange={(e) => handleInputChange('quality', e.target.value as 'standard' | 'hd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD (Higher Cost)</option>
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !formData.prompt.trim()}
                className="w-full bg-purple-500 text-white py-3 px-4 rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Image</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Display */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Generated Image</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-500" />
                  <p className="text-gray-600">Creating your image...</p>
                </div>
              </div>
            )}

            {result && result.imageUrl && (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={result.imageUrl}
                    alt={result.metadata?.originalPrompt || 'Generated image'}
                    className="w-full rounded-lg shadow-sm"
                  />
                </div>

                {/* Image Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={downloadImage}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={copyImageUrl}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy URL</span>
                  </button>
                </div>

                {/* Image Details */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <h3 className="font-medium text-gray-900 mb-2">Image Details</h3>
                  <div className="space-y-1 text-gray-600">
                    <p><strong>Style:</strong> {result.metadata?.style}</p>
                    <p><strong>Aspect Ratio:</strong> {result.metadata?.aspectRatio}</p>
                    <p><strong>Model:</strong> {result.model}</p>
                    <p><strong>Generation Time:</strong> {(result.latency / 1000).toFixed(1)}s</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !result && !error && (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Your generated image will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Tips for Better Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Be Descriptive</h4>
              <p>Include details about colors, lighting, composition, and mood</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Specify Style</h4>
              <p>Choose the art style that best fits your vision</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Consider Usage</h4>
              <p>Select aspect ratio based on where you'll use the image</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Iterate</h4>
              <p>Try different prompts and settings to get the perfect result</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
