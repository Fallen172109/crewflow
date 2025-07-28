'use client'

import { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import ImageRenderer from './ImageRenderer'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Handle images separately from markdown content
  const renderContent = (text: string): ReactNode => {
    // Check if content contains images
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const hasImages = imageRegex.test(text)

    if (hasImages) {
      const parts: ReactNode[] = []
      let currentIndex = 0
      imageRegex.lastIndex = 0 // Reset regex

      let match
      while ((match = imageRegex.exec(text)) !== null) {
        const [fullMatch, altText, imageUrl] = match
        const matchStart = match.index!
        const matchEnd = matchStart + fullMatch.length

        // Add text before the image
        if (matchStart > currentIndex) {
          const textBefore = text.slice(currentIndex, matchStart)
          if (textBefore.trim()) {
            parts.push(
              <ReactMarkdown key={`text-${currentIndex}`} components={components}>
                {textBefore}
              </ReactMarkdown>
            )
          }
        }

        // Add the image
        // Extract image path from URL if it's a Supabase URL
        let imagePath: string | undefined
        try {
          const url = new URL(imageUrl)
          if (url.hostname.includes('supabase')) {
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/sign\/generated-images\/(.+)\?/)
            if (pathMatch) {
              imagePath = pathMatch[1]
            }
          }
        } catch (e) {
          // Not a valid URL or not a Supabase URL
        }

        parts.push(
          <ImageRenderer
            key={`image-${matchStart}`}
            imageUrl={imageUrl}
            altText={altText || 'Generated image'}
            imagePath={imagePath}
          />
        )

        currentIndex = matchEnd
      }

      // Add remaining text after the last image
      if (currentIndex < text.length) {
        const remainingText = text.slice(currentIndex)
        if (remainingText.trim()) {
          parts.push(
            <ReactMarkdown key={`text-${currentIndex}`} components={components}>
              {remainingText}
            </ReactMarkdown>
          )
        }
      }

      return <>{parts}</>
    }

    // No images, just render markdown
    return <ReactMarkdown components={components}>{text}</ReactMarkdown>
  }

  // Custom components for ReactMarkdown to add maritime theming
  const components = {
    // Add maritime styling to specific elements
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-gray-900 font-chat" {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic text-gray-700" {...props}>{children}</em>
    ),
    code: ({ children, ...props }: any) => (
      <code className="bg-orange-50 text-orange-600 px-1 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4" {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: any) => (
      <p className="text-gray-700 leading-extra-loose mb-3 font-chat text-base break-words" {...props}>{children}</p>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1 font-chat text-base leading-extra-loose break-words" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1 font-chat text-base leading-extra-loose break-words" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="text-gray-700 font-chat text-base leading-extra-loose" {...props}>{children}</li>
    )
  }

  return (
    <div className={`prose prose-base max-w-none font-chat leading-extra-loose prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:font-chat prose-p:text-gray-700 prose-p:leading-extra-loose prose-p:font-chat prose-strong:text-gray-900 prose-strong:font-semibold prose-strong:font-chat prose-ul:text-gray-700 prose-ul:font-chat prose-ol:text-gray-700 prose-ol:font-chat prose-li:text-gray-700 prose-li:font-chat prose-code:text-orange-600 prose-code:bg-orange-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-blockquote:border-orange-500 prose-blockquote:text-gray-700 prose-blockquote:font-chat break-words overflow-wrap-anywhere ${className}`}>
      {renderContent(content)}
    </div>
  )
}
