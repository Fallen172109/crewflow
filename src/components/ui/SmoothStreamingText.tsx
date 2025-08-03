'use client'

import React, { useState, useEffect, useRef } from 'react'
import MarkdownRenderer from '../chat/MarkdownRenderer'

interface SmoothStreamingTextProps {
  content: string
  isStreaming: boolean
  className?: string
  animationSpeed?: number // milliseconds per character
}

export function SmoothStreamingText({ 
  content, 
  isStreaming, 
  className = '',
  animationSpeed = 30 
}: SmoothStreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const targetContentRef = useRef('')

  // Update target content when content changes
  useEffect(() => {
    targetContentRef.current = content
    
    // If we're not currently animating and there's new content, start animation
    if (!isAnimating && content.length > displayedContent.length) {
      setIsAnimating(true)
      animateToTarget()
    }
  }, [content, displayedContent.length, isAnimating])

  const animateToTarget = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current)
    }

    const animate = () => {
      setDisplayedContent(current => {
        const target = targetContentRef.current
        
        // If we've reached the target, stop animating
        if (current.length >= target.length) {
          setIsAnimating(false)
          return target
        }

        // Add next character(s) - add multiple characters for faster streaming
        const charsToAdd = Math.min(3, target.length - current.length)
        const newContent = target.slice(0, current.length + charsToAdd)
        
        // Continue animation
        animationRef.current = setTimeout(animate, animationSpeed)
        
        return newContent
      })
    }

    animate()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [])

  // If streaming stopped and we haven't caught up, immediately show all content
  useEffect(() => {
    if (!isStreaming && displayedContent !== content) {
      setDisplayedContent(content)
      setIsAnimating(false)
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [isStreaming, content, displayedContent])

  return (
    <div className={`relative ${className}`}>
      <div className="prose prose-sm max-w-none">
        <span
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: displayedContent +
              ((isStreaming || isAnimating)
                ? '<span class="inline-block w-0.5 h-4 bg-orange-500 animate-pulse ml-0.5" style="vertical-align: text-bottom;"></span>'
                : ''
              )
          }}
        />
      </div>
    </div>
  )
}
