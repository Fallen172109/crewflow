'use client'

import { useState } from 'react'
import { FileBarChart, TrendingUp, BarChart3, Brain, Filter, Send, Loader2, Clock, Users, CheckCircle } from 'lucide-react'

interface AgentStep {
  agent: string
  action: string
  result: string
  timestamp: number
}

interface TideResponse {
  response: string
  framework?: string
  agentSteps?: AgentStep[]
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface TideAgentProps {
  userId?: string
}

export default function TideAgent({ userId }: TideAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<TideResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [showWorkflow, setShowWorkflow] = useState(false)

  const presetActions = [
    {
      id: 'generate_report',
      label: 'Generate Performance Reports',
      icon: FileBarChart,
      description: 'Create comprehensive business reports',
      estimatedTime: '3 minutes',
      params: ['dataSource', 'reportType', 'timePeriod', 'metrics', 'audience']
    },
    {
      id: 'identify_trends',
      label: 'Identify Trends and Patterns',
      icon: TrendingUp,
      description: 'Analyze data for insights and patterns',
      estimatedTime: '2 minutes',
      params: ['dataset', 'period', 'focusAreas', 'baseline']
    },
    {
      id: 'create_dashboard',
      label: 'Create Analytics Dashboard',
      icon: BarChart3,
      description: 'Build interactive data visualizations',
      estimatedTime: '4 minutes',
      params: ['purpose', 'users', 'metrics', 'frequency', 'platform']
    },
    {
      id: 'predictive_model',
      label: 'Create Predictive Models',
      icon: Brain,
      description: 'Build forecasting and prediction models',
      estimatedTime: '5 minutes',
      params: ['target', 'historicalData', 'modelType', 'accuracy', 'timeline']
    },
    {
      id: 'data_cleanup',
      label: 'Clean and Prepare Data',
      icon: Filter,
      description: 'Process and clean raw data for analysis',
      estimatedTime: '2 minutes',
      params: ['dataSource', 'issues', 'targetFormat', 'validation']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    setShowWorkflow(true)
    try {
      const response = await fetch('/api/agents/tide', {
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
        console.error('Tide API error:', data.error)
      }
    } catch (error) {
      console.error('Error communicating with Tide:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetAction = async (actionId: string, params: Record<string, string>) => {
    setLoading(true)
    setActiveAction(actionId)
    setShowWorkflow(true)
    
    try {
      const response = await fetch('/api/agents/tide', {
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
        console.error('Tide preset action error:', data.error)
      }
    } catch (error) {
      console.error('Error executing preset action:', error)
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getAgentIcon = (agentName: string) => {
    switch (agentName) {
      case 'planner': return '🎯'
      case 'executor': return '⚡'
      case 'reviewer': return '🔍'
      case 'coordinator': return '🎭'
      default: return '🤖'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tide - Data Analysis</h1>
            <p className="text-cyan-100">Your AutoGen-powered data analytics specialist</p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Chat with Tide</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your data analysis needs..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Analyze</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Data Analysis Actions</h2>
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
                className="p-4 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 text-cyan-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{action.label}</h3>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{action.estimatedTime}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    {activeAction === action.id && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs text-gray-500">Multi-agent processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Multi-Agent Workflow Visualization */}
      {showWorkflow && response?.agentSteps && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">AutoGen Multi-Agent Workflow</h2>
          <div className="space-y-3">
            {response.agentSteps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl">{getAgentIcon(step.agent)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 capitalize">
                      {step.agent} Agent
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(step.timestamp)}</span>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {step.action.replace(/_/g, ' ')}
                  </p>
                  <div className="mt-2 text-xs text-gray-500 bg-white p-2 rounded border">
                    {step.result.substring(0, 150)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tide's Analysis</h2>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 text-sm rounded-full bg-cyan-100 text-cyan-700">
                AutoGen Framework
              </span>
              {response.agentSteps && (
                <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700">
                  {response.agentSteps.length} Agents
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="prose max-w-none">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{response.response}</p>
              </div>
            </div>

            {/* Usage Stats */}
            {response.usage && (
              <div className="text-xs text-gray-500 pt-2 border-t flex items-center justify-between">
                <div>
                  Tokens: {response.usage.tokensUsed} | Latency: {response.usage.latency}ms | Cost: ${response.usage.cost}
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>Multi-agent coordination</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
