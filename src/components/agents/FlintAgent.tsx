'use client'

import { useState } from 'react'
import { Workflow, Zap, Clock, Activity, Send, Loader2, Users, BarChart3 } from 'lucide-react'

interface AgentStep {
  agent: string
  action: string
  result: string
  timestamp: number
}

interface FlintResponse {
  response: string
  framework?: string
  agentSteps?: AgentStep[]
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface FlintAgentProps {
  userId?: string
}

export default function FlintAgent({ userId }: FlintAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<FlintResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [showAgentSteps, setShowAgentSteps] = useState(false)

  const presetActions = [
    {
      id: 'create_workflow',
      label: 'Create Automation Workflow',
      description: 'Design multi-step business process automation',
      icon: Workflow,
      category: 'creation',
      params: ['process', 'departments', 'painPoints', 'outcomes', 'integrations', 'complexity']
    },
    {
      id: 'optimize_process',
      label: 'Optimize Business Process',
      description: 'Analyze and improve existing workflows',
      icon: Zap,
      category: 'optimization',
      params: ['currentProcess', 'issues', 'tools', 'teamSize', 'budget']
    },
    {
      id: 'schedule_tasks',
      label: 'Schedule Automated Tasks',
      description: 'Set up recurring business processes',
      icon: Clock,
      category: 'scheduling',
      params: ['taskTypes', 'frequency', 'dependencies', 'teamMembers', 'businessHours', 'priorities']
    },
    {
      id: 'monitor_workflows',
      label: 'Monitor Workflow Performance',
      description: 'Track automation success and failures',
      icon: Activity,
      category: 'monitoring',
      params: ['workflows', 'metrics', 'reportingFrequency', 'thresholds', 'stakeholders']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/flint', {
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
      const response = await fetch('/api/agents/flint', {
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
      case 'creation': return 'bg-green-50 text-green-700 border-green-200'
      case 'optimization': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'scheduling': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'monitoring': return 'bg-orange-50 text-orange-700 border-orange-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Workflow className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Flint - Workflow Automation</h1>
            <p className="text-amber-100">Your AutoGen-powered automation specialist</p>
          </div>
        </div>
      </div>

      {/* AutoGen Multi-Agent Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AutoGen Multi-Agent Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 text-sm">Planner Agent</h3>
            <p className="text-xs text-blue-700 mt-1">Analyzes requirements and creates automation strategy</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900 text-sm">Designer Agent</h3>
            <p className="text-xs text-green-700 mt-1">Creates detailed workflow specifications</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900 text-sm">Implementer Agent</h3>
            <p className="text-xs text-purple-700 mt-1">Develops automation solutions</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <h3 className="font-medium text-orange-900 text-sm">Monitor Agent</h3>
            <p className="text-xs text-orange-700 mt-1">Tracks performance and identifies improvements</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <h3 className="font-medium text-red-900 text-sm">Coordinator Agent</h3>
            <p className="text-xs text-red-700 mt-1">Orchestrates multi-agent collaboration</p>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Automation Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  activeAction === action.id ? 'ring-2 ring-amber-500' : ''
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
                        <span className="text-xs">Multi-agent processing...</span>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Flint</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about workflow automation, process optimization, or task scheduling..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Flint's Response</h2>
            <div className="flex items-center space-x-2">
              {response.framework && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  AutoGen Multi-Agent
                </span>
              )}
              {response.agentSteps && response.agentSteps.length > 0 && (
                <button
                  onClick={() => setShowAgentSteps(!showAgentSteps)}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200 flex items-center space-x-1"
                >
                  <Users className="w-3 h-3" />
                  <span>{response.agentSteps.length} Agent Steps</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {response.response}
            </div>
          </div>

          {/* Agent Steps */}
          {showAgentSteps && response.agentSteps && response.agentSteps.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Multi-Agent Process Steps:</h3>
              <div className="space-y-3">
                {response.agentSteps.map((step, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">{step.agent}</span>
                      <span className="text-xs text-gray-500">{formatTimestamp(step.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{step.action}</p>
                    <p className="text-xs text-gray-600">{step.result}</p>
                  </div>
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
                {response.agentSteps && (
                  <span>Agent Steps: {response.agentSteps.length}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
