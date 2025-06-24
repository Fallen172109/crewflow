'use client'

import { useState } from 'react'
import { FileText, PenTool, TrendingUp, Key, BarChart, Send, Loader2, ExternalLink, Search } from 'lucide-react'

interface PearlResponse {
  response: string
  framework?: string
  sources?: string[]
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface PearlAgentProps {
  userId?: string
}

export default function PearlAgent({ userId }: PearlAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<PearlResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const presetActions = [
    {
      id: 'optimize_content',
      label: 'Optimize Website Content',
      description: 'Improve SEO and readability of existing content',
      icon: FileText,
      category: 'optimization',
      params: ['content', 'keywords', 'audience']
    },
    {
      id: 'generate_blog_post',
      label: 'Generate Blog Posts',
      description: 'Create engaging, SEO-optimized blog content',
      icon: PenTool,
      category: 'creation',
      params: ['topic', 'keywords', 'wordCount', 'tone', 'audience']
    },
    {
      id: 'research_trends',
      label: 'Research Trending Topics',
      description: 'Find current trends and content opportunities',
      icon: TrendingUp,
      category: 'research',
      params: ['industry', 'location', 'timeframe', 'contentType']
    },
    {
      id: 'keyword_analysis',
      label: 'Keyword Analysis',
      description: 'Research and analyze keyword opportunities',
      icon: Key,
      category: 'seo',
      params: ['keyword', 'industry', 'location', 'competition']
    },
    {
      id: 'content_audit',
      label: 'Content Performance Audit',
      description: 'Analyze content performance and suggest improvements',
      icon: BarChart,
      category: 'analysis',
      params: ['content', 'metrics', 'period', 'goals']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/pearl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId
        }),
      })

      const data = await response.json()
      setResponse(data)
      setMessage('')
    } catch (error) {
      console.error('Error:', error)
      setResponse({
        response: 'Sorry, I encountered an error. Please try again.',
        framework: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePresetAction = async (actionId: string, params: Record<string, string>) => {
    setLoading(true)
    setActiveAction(actionId)
    
    try {
      const response = await fetch('/api/agents/pearl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionId,
          params,
          userId
        }),
      })

      const data = await response.json()
      setResponse(data)
    } catch (error) {
      console.error('Error:', error)
      setResponse({
        response: 'Sorry, I encountered an error executing that action. Please try again.',
        framework: 'error'
      })
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'optimization': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'creation': return 'bg-green-50 text-green-700 border-green-200'
      case 'research': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'seo': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'analysis': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pearl - Content & SEO</h1>
            <p className="text-teal-100">Your Perplexity AI-powered content specialist</p>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Content & SEO Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presetActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => {
                  const params: Record<string, string> = {}
                  action.params.forEach(param => {
                    const value = prompt(`Enter ${param}:`)
                    if (value) params[param] = value
                  })
                  handlePresetAction(action.id, params)
                }}
                disabled={loading}
                className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all duration-200 disabled:opacity-50 ${getCategoryColor(action.category)} ${
                  activeAction === action.id ? 'ring-2 ring-teal-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{action.label}</h3>
                    <p className="text-xs opacity-75 mt-1">{action.description}</p>
                    {activeAction === action.id && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Pearl</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about content optimization, SEO strategies, or trending topics..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Response Display */}
      {response && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pearl's Response</h2>
            {response.framework && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                Perplexity AI
              </span>
            )}
          </div>
          
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {response.response}
            </div>
          </div>

          {/* Sources */}
          {response.sources && response.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Sources:</h3>
              <div className="space-y-1">
                {response.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{source}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Usage Stats */}
          {response.usage && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Tokens: {response.usage.tokensUsed}</span>
                <span>Latency: {response.usage.latency}ms</span>
                <span>Cost: ${response.usage.cost}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
