'use client'

import { useState } from 'react'
import { Target, Calendar, Search, TrendingUp, Users, Send, Loader2, ExternalLink } from 'lucide-react'

interface MarinerResponse {
  response: string
  framework?: string
  sources?: string[]
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface MarinerAgentProps {
  userId?: string
}

export default function MarinerAgent({ userId }: MarinerAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<MarinerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [selectedFramework, setSelectedFramework] = useState<'auto' | 'langchain' | 'perplexity'>('auto')

  const presetActions = [
    {
      id: 'create_campaign',
      label: 'Create Campaign Strategy',
      icon: Target,
      description: 'Develop comprehensive marketing campaigns',
      framework: 'langchain',
      params: ['campaignType', 'audience', 'budget', 'duration', 'goals']
    },
    {
      id: 'generate_content_calendar',
      label: 'Generate Content Calendar',
      icon: Calendar,
      description: 'Plan content across multiple channels',
      framework: 'langchain',
      params: ['industry', 'duration', 'channels', 'brandVoice']
    },
    {
      id: 'analyze_competitors',
      label: 'Analyze Competitor Activity',
      icon: Search,
      description: 'Research and analyze competitor strategies',
      framework: 'perplexity',
      params: ['company', 'industry']
    },
    {
      id: 'optimize_ads',
      label: 'Optimize Ad Performance',
      icon: TrendingUp,
      description: 'Improve ad targeting and performance',
      framework: 'langchain',
      params: ['performance', 'platform', 'budget', 'metrics']
    },
    {
      id: 'segment_audience',
      label: 'Segment Audience',
      icon: Users,
      description: 'Create targeted customer segments',
      framework: 'langchain',
      params: ['businessType', 'customerData', 'goals', 'channels']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/mariner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          framework: selectedFramework === 'auto' ? undefined : selectedFramework,
          userId
        })
      })

      const data = await response.json()
      if (data.success) {
        setResponse(data)
        setMessage('')
      } else {
        console.error('Mariner API error:', data.error)
      }
    } catch (error) {
      console.error('Error communicating with Mariner:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetAction = async (actionId: string, params: Record<string, string>) => {
    setLoading(true)
    setActiveAction(actionId)
    
    try {
      const response = await fetch('/api/agents/mariner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionId,
          params,
          userId
        })
      })

      const data = await response.json()
      if (data.success) {
        setResponse(data)
      } else {
        console.error('Mariner preset action error:', data.error)
      }
    } catch (error) {
      console.error('Error executing preset action:', error)
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  const getFrameworkColor = (framework?: string) => {
    switch (framework) {
      case 'perplexity': return 'text-purple-600 bg-purple-50'
      case 'langchain': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mariner - Marketing Automation</h1>
            <p className="text-blue-100">Your hybrid AI marketing specialist</p>
          </div>
        </div>
      </div>

      {/* Framework Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">AI Framework Selection</h3>
        <div className="flex space-x-2">
          {[
            { value: 'auto', label: 'Auto-Select', desc: 'Intelligent routing' },
            { value: 'langchain', label: 'LangChain', desc: 'Campaign & strategy' },
            { value: 'perplexity', label: 'Perplexity AI', desc: 'Research & trends' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedFramework(option.value as any)}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                selectedFramework === option.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs opacity-75">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Chat with Mariner</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about marketing campaigns, trends, or competitor analysis..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Marketing Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presetActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => {
                  // For demo purposes, using default params
                  const defaultParams: Record<string, string> = {}
                  action.params.forEach(param => {
                    defaultParams[param] = `Sample ${param}`
                  })
                  handlePresetAction(action.id, defaultParams)
                }}
                disabled={loading}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{action.label}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        action.framework === 'perplexity' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {action.framework}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    {activeAction === action.id && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs text-gray-500">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Response Display */}
      {response && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mariner's Response</h2>
            {response.framework && (
              <span className={`px-3 py-1 text-sm rounded-full ${getFrameworkColor(response.framework)}`}>
                {response.framework}
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="prose max-w-none">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{response.response}</p>
              </div>
            </div>

            {/* Sources */}
            {response.sources && response.sources.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Sources:</h3>
                <div className="space-y-1">
                  {response.sources.map((source, index) => (
                    <a
                      key={index}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{source}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Stats */}
            {response.usage && (
              <div className="text-xs text-gray-500 pt-2 border-t">
                Tokens: {response.usage.tokensUsed} | Latency: {response.usage.latency}ms | Cost: ${response.usage.cost}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
