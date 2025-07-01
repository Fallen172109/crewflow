'use client'

import { useState } from 'react'

export default function TestImageRenderingPage() {
  const [testContent, setTestContent] = useState('')
  
  // Function to render message content with image support (same as in TabbedChatInterface)
  const renderMessageContent = (content: string) => {
    console.log('TestPage: Processing content for images:', content.substring(0, 200) + '...')
    
    // Check if the content contains markdown image syntax
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = imageRegex.exec(content)) !== null) {
      console.log('TestPage: Found image match:', match)
      
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }

      // Add the image with improved error handling
      const altText = match[1] || 'Generated Image'
      const imageUrl = match[2]
      
      console.log('TestPage: Rendering image:', { altText, imageUrl })
      
      parts.push(
        <div key={match.index} className="my-3">
          <div className="relative">
            <img
              src={imageUrl}
              alt={altText}
              className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm transition-opacity duration-300"
              style={{ maxHeight: '400px', opacity: '1' }}
              loading="lazy"
              onLoad={(e) => {
                console.log('TestPage: Image loaded successfully:', imageUrl)
                const target = e.target as HTMLImageElement
                target.style.opacity = '1'
              }}
              onError={(e) => {
                console.error('TestPage: Image failed to load:', imageUrl)
                const target = e.target as HTMLImageElement
                const container = target.parentElement
                if (container) {
                  container.innerHTML = `
                    <div class="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div class="text-center">
                        <div class="text-gray-400 mb-2">🖼️</div>
                        <p class="text-sm text-gray-600">Image could not be loaded</p>
                        <p class="text-xs text-gray-400 mt-1">URL: ${imageUrl}</p>
                        <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-orange-600 hover:text-orange-700 underline mt-1 inline-block">
                          Try opening in new tab
                        </a>
                      </div>
                    </div>
                  `
                }
              }}
            />
          </div>
          {altText && altText !== 'Generated Image' && (
            <p className="text-xs text-gray-500 mt-1 italic">{altText}</p>
          )}
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
      console.log('TestPage: No images found in content')
      return content
    }

    console.log('TestPage: Rendering', parts.length, 'parts including images')
    return parts.map((part, index) =>
      typeof part === 'string' ? <span key={index}>{part}</span> : part
    )
  }

  const testCases = [
    {
      name: 'Simple Image',
      content: 'Here is an image: ![Test Image](https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Test+Image)'
    },
    {
      name: 'Image with Text Before and After',
      content: 'This is some text before the image.\n\n![Generated Image](https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Generated+Image)\n\nThis is some text after the image.'
    },
    {
      name: 'Multiple Images',
      content: 'First image: ![Image 1](https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=Image+1)\n\nSecond image: ![Image 2](https://via.placeholder.com/300x200/000000/FFFFFF?text=Image+2)'
    },
    {
      name: 'Splash Agent Response Format',
      content: `🎨 **Visual Content Created Successfully!**

![Generated Image](https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=AI+Generated+Image)

**Image Details:**
- **Original Prompt:** A cat working out at the gym
- **Enhanced Prompt:** A professional fitness cat lifting weights in a modern gym
- **Style:** Digital Art
- **Aspect Ratio:** Square (1:1)

**Maritime Mission Complete!** Your visual content has been generated and is ready for use.`
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🖼️ Image Rendering Test Page
          </h1>
          <p className="text-gray-600">
            Test the markdown image rendering functionality
          </p>
        </div>

        {/* Test Cases */}
        <div className="space-y-8">
          {testCases.map((testCase, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Test Case {index + 1}: {testCase.name}
              </h2>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Raw Content:</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {testCase.content}
                </pre>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Rendered Output:</h3>
                <div className="border border-gray-200 rounded p-4 bg-gray-50">
                  <div className="whitespace-pre-wrap text-sm">
                    {renderMessageContent(testCase.content)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Test */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Custom Test
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter content with markdown images:
            </label>
            <textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={4}
              placeholder="Enter content like: Here's an image: ![Alt Text](https://example.com/image.jpg)"
            />
          </div>
          
          {testContent && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Rendered Output:</h3>
              <div className="border border-gray-200 rounded p-4 bg-gray-50">
                <div className="whitespace-pre-wrap text-sm">
                  {renderMessageContent(testContent)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
