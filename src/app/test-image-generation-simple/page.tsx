'use client'

import { useState } from 'react'

export default function TestImageGenerationSimplePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testImageGeneration = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🧪 Testing image generation...')
      
      const response = await fetch('/api/test-image-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A cute cat working out at the gym, lifting weights',
          style: 'Digital Art',
          aspectRatio: 'Square (1:1)',
          quality: 'standard'
        })
      })

      const data = await response.json()
      console.log('🎨 Image generation result:', data)
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Image generation failed')
      }
    } catch (err) {
      console.error('❌ Error testing image generation:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testSplashAgent = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🧪 Testing Splash agent image generation...')
      
      const response = await fetch('/api/agents/splash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'visual_content_creator',
          params: {
            prompt: 'A cute cat working out at the gym, lifting weights',
            style: 'Digital Art',
            aspect_ratio: 'Square (1:1)',
            quality: 'standard'
          },
          message: 'Create an image of a cat working out'
        })
      })

      const data = await response.json()
      console.log('🎨 Splash agent result:', data)
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Splash agent failed')
      }
    } catch (err) {
      console.error('❌ Error testing Splash agent:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Function to render message content with image support
  const renderMessageContent = (content: string) => {
    // Check if the content contains markdown image syntax
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = imageRegex.exec(content)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }

      // Add the image
      const altText = match[1] || 'Generated Image'
      const imageUrl = match[2]
      
      parts.push(
        <div key={match.index} className="my-3">
          <div className="relative">
            <img
              src={imageUrl}
              alt={altText}
              className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              style={{ maxHeight: '400px' }}
              loading="lazy"
              onLoad={() => console.log('✅ Image loaded:', imageUrl)}
              onError={() => console.error('❌ Image failed to load:', imageUrl)}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>AI Generated Image</span>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 underline"
            >
              Open full size
            </a>
          </div>
        </div>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after the last image
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    // If no images were found, return the original content
    if (parts.length === 0) {
      return content
    }

    return parts.map((part, index) =>
      typeof part === 'string' ? <span key={index}>{part}</span> : part
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Simple Image Generation Test
          </h1>
          <p className="text-gray-600">
            Test image generation and rendering functionality
          </p>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex space-x-4">
            <button
              onClick={testImageGeneration}
              disabled={loading}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Direct Image Generation'}
            </button>
            
            <button
              onClick={testSplashAgent}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Splash Agent'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <h3 className="text-red-800 font-medium mb-2">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Test Result
            </h2>
            
            {/* Raw JSON */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Raw Response:</h3>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
            
            {/* Rendered Response */}
            {result.response && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Rendered Response:</h3>
                <div className="border border-gray-200 rounded p-4 bg-gray-50">
                  <div className="whitespace-pre-wrap text-sm">
                    {renderMessageContent(result.response)}
                  </div>
                </div>
              </div>
            )}
            
            {/* Direct Image URL */}
            {result.imageUrl && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Direct Image URL:</h3>
                <div className="border border-gray-200 rounded p-4 bg-gray-50">
                  <img
                    src={result.imageUrl}
                    alt="Generated Image"
                    className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                    style={{ maxHeight: '400px' }}
                    onLoad={() => console.log('✅ Direct image loaded:', result.imageUrl)}
                    onError={() => console.error('❌ Direct image failed to load:', result.imageUrl)}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    URL: <a href={result.imageUrl} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">{result.imageUrl}</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
