'use client'

import { useState } from 'react'
import { Loader2, TestTube, Eye, Image as ImageIcon, Zap } from 'lucide-react'

interface PromptTestResult {
  style: string
  originalPrompt: string
  enhancedPrompt: string
  promptLength: number
  addedKeywords?: string[]
  keywordCount?: number
  hasStyleSpecificTerms?: boolean
}

interface ImageTestResult {
  style: string
  success: boolean
  imageUrl?: string
  originalPrompt: string
  enhancedPrompt?: string
  revisedPrompt?: string
  tokensUsed?: number
  latency?: number
  model?: string
  error?: string
}

interface TestResponse {
  success: boolean
  testPrompt: string
  results: PromptTestResult[]
  summary: {
    totalStyles: number
    averagePromptLength: number
    uniqueEnhancements: number
    stylesWithSpecificTerms?: number
    averageKeywordsAdded?: number
  }
  error?: string
}

interface ImageTestResponse {
  success: boolean
  testPrompt: string
  results: ImageTestResult[]
  summary: {
    totalStyles: number
    successfulGenerations: number
    failedGenerations: number
    averageLatency: number
    totalTokensUsed: number
    uniqueEnhancedPrompts: number
  }
  error?: string
}

export default function PromptEnhancementTestPage() {
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [testPrompt, setTestPrompt] = useState('A person working at a computer desk')
  const [result, setResult] = useState<TestResponse | null>(null)
  const [imageResult, setImageResult] = useState<ImageTestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'prompts' | 'images'>('prompts')
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Sketch', 'Cartoon', 'Abstract'])

  const availableStyles = ['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Sketch', 'Cartoon', 'Abstract']

  const handleTest = async () => {
    if (!testPrompt.trim()) {
      setError('Please enter a test prompt')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-prompt-enhancement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: testPrompt,
          aspectRatio: 'Square (1:1)',
          quality: 'standard'
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Test failed')
      }
    } catch (err) {
      setError('Network error occurred. Please try again.')
      console.error('Prompt enhancement test error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageTest = async () => {
    if (!testPrompt.trim()) {
      setError('Please enter a test prompt')
      return
    }

    setImageLoading(true)
    setError(null)
    setImageResult(null)

    try {
      const response = await fetch('/api/test-style-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: testPrompt,
          styles: selectedStyles
        })
      })

      const data = await response.json()

      if (data.success) {
        setImageResult(data)
        setActiveTab('images')
      } else {
        setError(data.error || 'Image test failed')
      }
    } catch (err) {
      setError('Network error occurred. Please try again.')
      console.error('Image test error:', err)
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-8 rounded-lg mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <TestTube className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Prompt Enhancement Test</h1>
              <p className="text-orange-100 mt-2">Test how different art styles enhance image generation prompts</p>
            </div>
          </div>
        </div>

        {/* Test Input */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Prompt
              </label>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter a prompt to test with different styles..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 h-24 resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                This prompt will be enhanced with all 7 available art styles: Photorealistic, Digital Art, Oil Painting, Watercolor, Sketch, Cartoon, and Abstract
              </p>
            </div>

            {/* Style Selection for Image Testing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Styles for Image Testing
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableStyles.map((style) => (
                  <label key={style} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedStyles.includes(style)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStyles([...selectedStyles, style])
                        } else {
                          setSelectedStyles(selectedStyles.filter(s => s !== style))
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{style}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {selectedStyles.length} style{selectedStyles.length !== 1 ? 's' : ''} selected
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => setSelectedStyles(availableStyles)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedStyles([])}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleTest}
                disabled={loading || !testPrompt.trim()}
                className="bg-orange-500 text-white py-3 px-6 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Testing Prompts...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    <span>Test Prompt Enhancement</span>
                  </>
                )}
              </button>

              <button
                onClick={handleImageTest}
                disabled={imageLoading || !testPrompt.trim() || selectedStyles.length === 0}
                className="bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {imageLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating {selectedStyles.length} Images... (Est. {Math.ceil(selectedStyles.length * 0.5)} minutes)</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    <span>Generate {selectedStyles.length} Images</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        {(result || imageResult) && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('prompts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'prompts'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Prompt Analysis</span>
                    {result && <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">{result.results.length}</span>}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'images'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>Image Results</span>
                    {imageResult && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{imageResult.summary.successfulGenerations}</span>}
                  </div>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Results */}
        {(result || imageResult) && activeTab === 'prompts' && result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">{result.summary.totalStyles}</div>
                  <div className="text-sm text-gray-600">Styles Tested</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">{result.summary.averagePromptLength}</div>
                  <div className="text-sm text-gray-600">Avg. Prompt Length</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">{result.summary.uniqueEnhancements}</div>
                  <div className="text-sm text-gray-600">Unique Enhancements</div>
                </div>
              </div>
            </div>

            {/* Style Results */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Style Enhancement Results</h2>
              <div className="space-y-4">
                {result.results.map((styleResult, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{styleResult.style}</h3>
                      <span className="text-sm text-gray-500">{styleResult.promptLength} characters</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Original:</span>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">{styleResult.originalPrompt}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700">Enhanced:</span>
                        <p className="text-sm text-gray-900 bg-blue-50 p-2 rounded mt-1">{styleResult.enhancedPrompt}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Image Results */}
        {(result || imageResult) && activeTab === 'images' && imageResult && (
          <div className="space-y-6">
            {/* Image Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Image Generation Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{imageResult.summary.successfulGenerations}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{imageResult.summary.failedGenerations}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{(imageResult.summary.averageLatency / 1000).toFixed(1)}s</div>
                  <div className="text-sm text-gray-600">Avg. Time</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{imageResult.summary.totalTokensUsed}</div>
                  <div className="text-sm text-gray-600">Total Tokens</div>
                </div>
              </div>
            </div>

            {/* Image Grid */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Images by Style</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {imageResult.results.map((imageResult, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{imageResult.style}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          imageResult.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {imageResult.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      {imageResult.success && imageResult.imageUrl ? (
                        <div className="space-y-3">
                          <img
                            src={imageResult.imageUrl}
                            alt={`${imageResult.style} style`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            loading="lazy"
                          />
                          <div className="text-xs text-gray-500 space-y-1">
                            <p><strong>Time:</strong> {((imageResult.latency || 0) / 1000).toFixed(1)}s</p>
                            <p><strong>Tokens:</strong> {imageResult.tokensUsed || 0}</p>
                            <p><strong>Model:</strong> {imageResult.model || 'N/A'}</p>
                          </div>
                          {imageResult.enhancedPrompt && (
                            <div className="text-xs">
                              <p className="font-medium text-gray-700 mb-1">Enhanced Prompt:</p>
                              <p className="text-gray-600 bg-gray-50 p-2 rounded">{imageResult.enhancedPrompt}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-red-500 mb-2">❌</div>
                          <p className="text-sm text-gray-600">Generation failed</p>
                          {imageResult.error && (
                            <p className="text-xs text-red-600 mt-1">{imageResult.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
