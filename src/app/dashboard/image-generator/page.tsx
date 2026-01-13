'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Sparkles,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Wand2,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Monitor,
  Zap,
  Crown,
  Clock,
  AlertCircle,
  Check,
  Loader2,
  Palette,
  Layers
} from 'lucide-react'
import Image from 'next/image'

// Types
interface GeneratedImage {
  id: string
  prompt: string
  style: string
  aspectRatio: string
  quality: 'standard' | 'hd'
  imageUrl: string
  createdAt: string
  status: 'completed' | 'failed' | 'processing'
}

interface GenerationSettings {
  prompt: string
  style: string
  aspectRatio: string
  quality: 'standard' | 'hd'
}

// Style options with descriptions - values match backend ImageGenerationService expectations
const STYLE_OPTIONS = [
  { value: 'Photorealistic', label: 'Photorealistic', description: 'Hyper-realistic photography' },
  { value: 'Digital Art', label: 'Digital Art', description: 'Modern digital illustration' },
  { value: 'Oil Painting', label: 'Oil Painting', description: 'Classical painterly style' },
  { value: 'Watercolor', label: 'Watercolor', description: 'Soft, flowing washes' },
  { value: 'Sketch', label: 'Sketch', description: 'Hand-drawn pencil art' },
  { value: 'Cartoon', label: 'Cartoon', description: 'Bold, animated style' },
  { value: 'Abstract', label: 'Abstract', description: 'Non-representational forms' },
]

// Aspect ratio options with icons - values match backend getOptimalSize() expectations
const ASPECT_RATIOS = [
  { value: 'Square (1:1)', label: 'Square', icon: Square, description: '1024 x 1024' },
  { value: 'Portrait (3:4)', label: 'Portrait', icon: RectangleVertical, description: '1024 x 1792' },
  { value: 'Landscape (4:3)', label: 'Landscape', icon: RectangleHorizontal, description: '1792 x 1024' },
  { value: 'Wide (16:9)', label: 'Wide', icon: Monitor, description: '1792 x 1024' },
]

// Helper to format relative time
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ImageGeneratorPage() {
  const { user } = useAuth()

  // State - default values match backend expectations
  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: '',
    style: 'Photorealistic',
    aspectRatio: 'Square (1:1)',
    quality: 'standard',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [history, setHistory] = useState<GeneratedImage[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch generation history - transforms snake_case database fields to camelCase
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const response = await fetch('/api/images/generate')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch history')
      }

      const result = await response.json()

      // API returns { success, data: { images, total, limit, offset } }
      const rawImages = result.data?.images || []

      // Transform snake_case database fields to camelCase for frontend
      const transformedImages: GeneratedImage[] = rawImages.map((img: {
        id: string
        prompt: string
        style: string
        aspect_ratio: string
        quality: 'standard' | 'hd'
        image_url: string
        created_at: string
      }) => ({
        id: img.id,
        prompt: img.prompt,
        style: img.style,
        aspectRatio: img.aspect_ratio,
        quality: img.quality,
        imageUrl: img.image_url,
        createdAt: img.created_at,
        status: img.image_url ? 'completed' : 'failed'
      }))

      setHistory(transformedImages)
    } catch (err) {
      console.error('Failed to fetch image history:', err)
      // Don't set error state for history fetch - just show empty
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchHistory()
    }
  }, [user, fetchHistory])

  // Handle image generation
  const handleGenerate = async () => {
    if (!settings.prompt.trim()) {
      setError('Please enter a prompt to generate an image')
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: settings.prompt.trim(),
          style: settings.style,
          aspectRatio: settings.aspectRatio,
          quality: settings.quality,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate image')
      }

      const result = await response.json()

      // API returns { success: true, data: { imageUrl, revisedPrompt, metadata } }
      if (result.success && result.data?.imageUrl) {
        const newImage: GeneratedImage = {
          id: `gen-${Date.now()}`, // Temporary ID until refresh
          prompt: settings.prompt,
          style: settings.style,
          aspectRatio: settings.aspectRatio,
          quality: settings.quality,
          imageUrl: result.data.imageUrl,
          createdAt: new Date().toISOString(),
          status: 'completed'
        }
        setGeneratedImage(newImage)
        setSuccessMessage('Image generated successfully!')
      } else {
        throw new Error(result.error || 'Failed to generate image')
      }

      // Refresh history to get the saved record with real ID
      fetchHistory()
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle download
  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crewflow-${prompt.slice(0, 30).replace(/\s+/g, '-')}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download image')
    }
  }

  // Clear messages after timeout
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  return (
    <div className="space-y-8 pb-12">
      {/* Header with gradient accent */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent rounded-2xl blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Image Generator</h1>
                <p className="text-gray-500 mt-0.5">Transform your ideas into stunning visuals</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4 text-green-500" />
            <span>Powered by advanced AI models</span>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {(error || successMessage) && (
        <div className={`
          flex items-center gap-3 px-4 py-3 rounded-xl border
          ${error
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
          }
          animate-in slide-in-from-top-2 duration-300
        `}>
          {error ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Check className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{error || successMessage}</span>
        </div>
      )}

      {/* Main Generation Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Controls Panel - Left Side */}
        <div className="xl:col-span-2 space-y-6">
          {/* Prompt Input Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold text-gray-900">Describe Your Vision</h2>
              </div>
            </div>
            <div className="p-5">
              <textarea
                value={settings.prompt}
                onChange={(e) => setSettings(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="A majestic lion standing on a cliff at sunset, dramatic lighting, cinematic composition..."
                className="w-full h-36 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                disabled={isGenerating}
              />
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <span>Be specific and descriptive for best results</span>
                <span>{settings.prompt.length} / 1000</span>
              </div>
            </div>
          </div>

          {/* Style Selection */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold text-gray-900">Art Style</h2>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setSettings(prev => ({ ...prev, style: style.value }))}
                    disabled={isGenerating}
                    className={`
                      relative px-4 py-3 rounded-xl text-left transition-all duration-200
                      ${settings.style === style.value
                        ? 'bg-green-50 border-2 border-green-500 shadow-sm'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-gray-100'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="font-medium text-sm text-gray-900">{style.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{style.description}</div>
                    {settings.style === style.value && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Aspect Ratio & Quality */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold text-gray-900">Output Settings</h2>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map((ratio) => {
                    const Icon = ratio.icon
                    return (
                      <button
                        key={ratio.value}
                        onClick={() => setSettings(prev => ({ ...prev, aspectRatio: ratio.value }))}
                        disabled={isGenerating}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                          ${settings.aspectRatio === ratio.value
                            ? 'bg-green-50 border-2 border-green-500 shadow-sm'
                            : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-gray-100'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${settings.aspectRatio === ratio.value ? 'text-green-600' : 'text-gray-500'}`} />
                        <span className="text-xs font-medium text-gray-700">{ratio.label}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{ratio.value}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quality Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Quality</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, quality: 'standard' }))}
                    disabled={isGenerating}
                    className={`
                      flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200
                      ${settings.quality === 'standard'
                        ? 'bg-green-50 border-2 border-green-500 shadow-sm'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-gray-100'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Zap className={`w-4 h-4 ${settings.quality === 'standard' ? 'text-green-600' : 'text-gray-500'}`} />
                    <div className="text-left">
                      <div className="font-medium text-sm text-gray-900">Standard</div>
                      <div className="text-xs text-gray-500">Fast generation</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, quality: 'hd' }))}
                    disabled={isGenerating}
                    className={`
                      flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200
                      ${settings.quality === 'hd'
                        ? 'bg-green-50 border-2 border-green-500 shadow-sm'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-gray-100'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Crown className={`w-4 h-4 ${settings.quality === 'hd' ? 'text-green-600' : 'text-gray-500'}`} />
                    <div className="text-left">
                      <div className="font-medium text-sm text-gray-900">HD</div>
                      <div className="text-xs text-gray-500">Higher detail</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !settings.prompt.trim()}
            className={`
              w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-white
              transition-all duration-300 transform
              ${isGenerating || !settings.prompt.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]'
              }
            `}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating your masterpiece...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </div>

        {/* Preview Panel - Right Side */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold text-gray-900">Generated Result</h2>
              </div>
              {generatedImage && (
                <button
                  onClick={() => handleDownload(generatedImage.imageUrl, generatedImage.prompt)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>

            <div className="p-6 min-h-[500px] flex items-center justify-center">
              {isGenerating ? (
                // Generating State - Animated
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                    {/* Animated ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 animate-spin" />
                    {/* Inner pulse */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 animate-pulse flex items-center justify-center">
                      <Wand2 className="w-10 h-10 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Your Image</h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    Our AI is crafting your vision. This typically takes 10-30 seconds.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              ) : generatedImage ? (
                // Generated Image Display
                <div className="w-full">
                  <div className="relative aspect-square max-w-lg mx-auto rounded-xl overflow-hidden shadow-2xl shadow-gray-200/50 group">
                    <Image
                      src={generatedImage.imageUrl}
                      alt={generatedImage.prompt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <div className="p-4 w-full">
                        <p className="text-white text-sm line-clamp-2">{generatedImage.prompt}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                          <span className="capitalize">{generatedImage.style.replace('-', ' ')}</span>
                          <span>{generatedImage.aspectRatio}</span>
                          <span className="uppercase">{generatedImage.quality}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Generation Info */}
                  <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {formatTimeAgo(generatedImage.createdAt)}
                    </span>
                    <span className="capitalize">{generatedImage.style.replace('-', ' ')}</span>
                    <span>{generatedImage.aspectRatio}</span>
                  </div>
                </div>
              ) : (
                // Empty State
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Create</h3>
                  <p className="text-gray-500 text-sm">
                    Enter a prompt and click Generate to bring your vision to life.
                    Be descriptive about style, lighting, composition, and mood for best results.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <Sparkles className="w-3 h-3" />
                      <span>7 unique styles</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <Layers className="w-3 h-3" />
                      <span>4 aspect ratios</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <Zap className="w-3 h-3" />
                      <span>Fast generation</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <Crown className="w-3 h-3" />
                      <span>HD quality option</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generation History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold text-gray-900">Generation History</h2>
            {!historyLoading && history.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                {history.length} images
              </span>
            )}
          </div>
          <button
            onClick={fetchHistory}
            disabled={historyLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="p-6">
          {historyLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No images yet</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Your generated images will appear here. Create your first masterpiece to get started!
              </p>
            </div>
          ) : (
            // History grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {history.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300"
                  onClick={() => setGeneratedImage(image)}
                >
                  {image.status === 'completed' && image.imageUrl ? (
                    <>
                      <Image
                        src={image.imageUrl}
                        alt={image.prompt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs line-clamp-2 mb-1">{image.prompt}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60 text-[10px]">{formatTimeAgo(image.createdAt)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(image.imageUrl, image.prompt)
                              }}
                              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                            >
                              <Download className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Style badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-white text-[10px] font-medium capitalize">{image.style.replace('-', ' ')}</span>
                      </div>
                    </>
                  ) : image.status === 'processing' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50">
                      <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                      <span className="text-xs text-red-500">Failed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pro Tips Section */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">Pro Tips for Better Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <span><strong>Be specific:</strong> Include details about lighting, colors, mood, and composition</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <span><strong>Use style keywords:</strong> &ldquo;cinematic&rdquo;, &ldquo;ethereal&rdquo;, &ldquo;vintage&rdquo;, &ldquo;minimalist&rdquo;</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <span><strong>Add context:</strong> Describe the environment, time of day, or atmosphere</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
