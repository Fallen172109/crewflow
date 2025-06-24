'use client'

import { useState } from 'react'
import { MessageSquare, ArrowUp, UserCheck, Heart, BookOpen, Send, Loader2 } from 'lucide-react'

interface CoralResponse {
  response: string
  metadata?: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    urgency?: 'low' | 'medium' | 'high' | 'critical'
    escalationRequired?: boolean
    suggestedActions?: string[]
  }
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface CoralAgentProps {
  userId?: string
}

export default function CoralAgent({ userId }: CoralAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<CoralResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const presetActions = [
    {
      id: 'generate_response',
      label: 'Generate Response Template',
      icon: MessageSquare,
      description: 'Create professional customer support responses',
      params: ['issue', 'tone', 'priority', 'category']
    },
    {
      id: 'escalate_ticket',
      label: 'Escalate to Human Agent',
      icon: ArrowUp,
      description: 'Prepare escalation summary for complex issues',
      params: ['issue', 'customer', 'actions', 'reason']
    },
    {
      id: 'update_customer',
      label: 'Update Customer Record',
      icon: UserCheck,
      description: 'Sync customer information across systems',
      params: ['customerId', 'updateType', 'changes', 'integration']
    },
    {
      id: 'analyze_sentiment',
      label: 'Analyze Customer Sentiment',
      icon: Heart,
      description: 'Evaluate customer satisfaction and mood',
      params: ['message', 'context']
    },
    {
      id: 'create_knowledge',
      label: 'Create Knowledge Base Entry',
      icon: BookOpen,
      description: 'Document solutions for future reference',
      params: ['issueType', 'problem', 'solution', 'category']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/coral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          userId
        })
      })

      const data = await response.json()
      if (data.success) {
        setResponse(data)
        setMessage('')
      } else {
        console.error('Coral API error:', data.error)
      }
    } catch (error) {
      console.error('Error communicating with Coral:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetAction = async (actionId: string, params: Record<string, string>) => {
    setLoading(true)
    setActiveAction(actionId)
    
    try {
      const response = await fetch('/api/agents/coral', {
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
        console.error('Coral preset action error:', data.error)
      }
    } catch (error) {
      console.error('Error executing preset action:', error)
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-700 bg-red-100'
      case 'high': return 'text-orange-700 bg-orange-100'
      case 'medium': return 'text-yellow-700 bg-yellow-100'
      default: return 'text-green-700 bg-green-100'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Coral - Customer Support</h1>
            <p className="text-orange-100">Your maritime customer service specialist</p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Chat with Coral</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your customer support scenario..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
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
                className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 text-orange-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">{action.label}</h3>
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
          <h2 className="text-lg font-semibold mb-4">Coral's Response</h2>
          
          <div className="space-y-4">
            <div className="prose max-w-none">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{response.response}</p>
              </div>
            </div>

            {/* Metadata */}
            {response.metadata && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                {response.metadata.sentiment && (
                  <div className={`px-3 py-2 rounded-lg ${getSentimentColor(response.metadata.sentiment)}`}>
                    <span className="text-sm font-medium">Sentiment: {response.metadata.sentiment}</span>
                  </div>
                )}
                {response.metadata.urgency && (
                  <div className={`px-3 py-2 rounded-lg ${getUrgencyColor(response.metadata.urgency)}`}>
                    <span className="text-sm font-medium">Urgency: {response.metadata.urgency}</span>
                  </div>
                )}
                {response.metadata.escalationRequired && (
                  <div className="px-3 py-2 rounded-lg text-red-700 bg-red-100">
                    <span className="text-sm font-medium">⚠️ Escalation Required</span>
                  </div>
                )}
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
