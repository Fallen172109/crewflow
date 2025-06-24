'use client'

import { useState } from 'react'
import { Calendar, PenTool, Heart, Search, Users, Send, Loader2, Hash, TrendingUp } from 'lucide-react'

interface SplashResponse {
  response: string
  framework?: string
  platforms?: string[]
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface SplashAgentProps {
  userId?: string
}

export default function SplashAgent({ userId }: SplashAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<SplashResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const presetActions = [
    {
      id: 'schedule_posts',
      label: 'Schedule Social Posts',
      description: 'Plan and schedule content across platforms',
      icon: Calendar,
      category: 'scheduling',
      framework: 'langchain',
      params: ['platforms', 'theme', 'frequency', 'timezone', 'duration']
    },
    {
      id: 'generate_content',
      label: 'Generate Social Content',
      description: 'Create engaging social media posts',
      icon: PenTool,
      category: 'content',
      framework: 'langchain',
      params: ['platform', 'contentType', 'brandVoice', 'audience', 'topic', 'quantity']
    },
    {
      id: 'analyze_engagement',
      label: 'Analyze Engagement',
      description: 'Track and analyze social media performance',
      icon: Heart,
      category: 'analytics',
      framework: 'langchain',
      params: ['platform', 'period', 'contentTypes', 'metrics']
    },
    {
      id: 'monitor_mentions',
      label: 'Monitor Brand Mentions',
      description: 'Track brand mentions and sentiment',
      icon: Search,
      category: 'monitoring',
      framework: 'perplexity',
      params: ['brand', 'platforms', 'timeframe', 'sentiment']
    },
    {
      id: 'competitor_analysis',
      label: 'Social Competitor Analysis',
      description: 'Analyze competitor social media strategies',
      icon: Users,
      category: 'research',
      framework: 'perplexity',
      params: ['competitors', 'platforms', 'period', 'focus']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/splash', {
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
      const response = await fetch('/api/agents/splash', {
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
      case 'scheduling': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'content': return 'bg-green-50 text-green-700 border-green-200'
      case 'analytics': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'monitoring': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'research': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getFrameworkBadge = (framework: string) => {
    switch (framework) {
      case 'langchain': return 'bg-blue-100 text-blue-800'
      case 'perplexity': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Splash - Social Media</h1>
            <p className="text-pink-100">Your hybrid AI social media specialist</p>
          </div>
        </div>
      </div>

      {/* Framework Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hybrid AI Approach</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">LangChain</span>
              <h3 className="font-medium text-blue-900">Content & Automation</h3>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Content creation and scheduling</li>
              <li>• Engagement strategy development</li>
              <li>• Performance analysis</li>
              <li>• Automation workflows</li>
            </ul>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Perplexity AI</span>
              <h3 className="font-medium text-purple-900">Research & Monitoring</h3>
            </div>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Real-time trend analysis</li>
              <li>• Competitor monitoring</li>
              <li>• Brand mention tracking</li>
              <li>• Viral content research</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Media Actions</h2>
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
                  activeAction === action.id ? 'ring-2 ring-pink-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-sm">{action.label}</h3>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${getFrameworkBadge(action.framework)}`}>
                        {action.framework}
                      </span>
                    </div>
                    <p className="text-xs opacity-75">{action.description}</p>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Splash</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about social media trends, content ideas, or competitor analysis..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Splash's Response</h2>
            <div className="flex items-center space-x-2">
              {response.framework && (
                <span className={`px-2 py-1 text-xs rounded-full ${getFrameworkBadge(response.framework)}`}>
                  {response.framework}
                </span>
              )}
              {response.platforms && response.platforms.length > 0 && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    {response.platforms.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {response.response}
            </div>
          </div>

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
