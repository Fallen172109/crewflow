'use client'

import { useState, useRef, useEffect } from 'react'
import { Agent } from '@/lib/agents'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  agent: Agent
  messages: Message[]
  onSendMessage: (content: string) => void
  isLoading: boolean
}

export default function ChatInterface({ agent, messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

      // Add the image with improved error handling
      const altText = match[1] || 'Generated Image'
      const imageUrl = match[2]

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
                const target = e.target as HTMLImageElement
                target.style.opacity = '1'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const container = target.parentElement
                if (container) {
                  container.innerHTML = `
                    <div class="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div class="text-center">
                        <div class="text-gray-400 mb-2">🖼️</div>
                        <p class="text-sm text-gray-600">Image could not be loaded</p>
                        <p class="text-xs text-gray-400 mt-1">The image URL may have expired</p>
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
      return content
    }

    return parts.map((part, index) =>
      typeof part === 'string' ? <span key={index}>{part}</span> : part
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col shadow-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name[0]}
            </div>
            <div>
              <h3 className="text-gray-900 font-medium">{agent.name}</h3>
              <p className="text-xs text-gray-500">
                {isLoading ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-3 max-w-[80%] overflow-hidden ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                message.type === 'user' ? 'bg-primary-500' : ''
              }`} style={message.type === 'agent' ? { backgroundColor: agent.color } : {}}>
                {message.type === 'user' ? 'U' : agent.name[0]}
              </div>

              {/* Message Content */}
              <div className={`rounded-lg p-3 break-words ${
                message.type === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-50 text-gray-900 border border-gray-200'
              }`}>
                <div className="text-base font-chat leading-extra-loose">
                  {message.type === 'agent' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap font-chat text-base leading-extra-loose">{message.content}</div>
                  )}
                </div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-primary-100' : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-[80%]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.name[0]}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${agent.name} anything...`}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>

        {/* Quick Suggestions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {agent.presetActions.slice(0, 3).map((action) => (
            <button
              key={action.id}
              onClick={() => onSendMessage(`Help me with: ${action.label}`)}
              disabled={isLoading}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
