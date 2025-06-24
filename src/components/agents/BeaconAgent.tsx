'use client'

import { useState } from 'react'
import { FolderPlus, UserCheck, BarChart, FileText, Send, Loader2, Users, Target } from 'lucide-react'

interface AgentStep {
  agent: string
  action: string
  result: string
  timestamp: number
}

interface BeaconResponse {
  response: string
  framework?: string
  agentSteps?: AgentStep[]
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface BeaconAgentProps {
  userId?: string
}

export default function BeaconAgent({ userId }: BeaconAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<BeaconResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [showAgentSteps, setShowAgentSteps] = useState(false)

  const presetActions = [
    {
      id: 'create_project',
      label: 'Create Project Plan',
      description: 'Design comprehensive project structure',
      icon: FolderPlus,
      category: 'planning',
      framework: 'autogen',
      params: ['projectName', 'projectType', 'duration', 'teamSize', 'budget', 'complexity', 'stakeholders']
    },
    {
      id: 'assign_tasks',
      label: 'Assign Team Tasks',
      description: 'Distribute work across team members',
      icon: UserCheck,
      category: 'coordination',
      framework: 'langchain',
      params: ['project', 'teamMembers', 'taskTypes', 'skills', 'timeline', 'workload']
    },
    {
      id: 'track_progress',
      label: 'Track Project Progress',
      description: 'Monitor milestones and performance',
      icon: BarChart,
      category: 'monitoring',
      framework: 'langchain',
      params: ['project', 'period', 'metrics', 'reporting', 'teamSize']
    },
    {
      id: 'generate_reports',
      label: 'Generate Status Reports',
      description: 'Create stakeholder communications',
      icon: FileText,
      category: 'reporting',
      framework: 'langchain',
      params: ['project', 'reportType', 'audience', 'frequency', 'detail']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/beacon', {
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
      const response = await fetch('/api/agents/beacon', {
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
      case 'planning': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'coordination': return 'bg-green-50 text-green-700 border-green-200'
      case 'monitoring': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'reporting': return 'bg-orange-50 text-orange-700 border-orange-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getFrameworkBadge = (framework: string) => {
    switch (framework) {
      case 'langchain': return 'bg-blue-100 text-blue-800'
      case 'autogen': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Beacon - Project Management</h1>
            <p className="text-indigo-100">Your hybrid AI project coordination specialist</p>
          </div>
        </div>
      </div>

      {/* Hybrid Framework Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hybrid AI Approach</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">LangChain</span>
              <h3 className="font-medium text-blue-900">Planning & Reporting</h3>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Project planning and documentation</li>
              <li>• Task assignment and coordination</li>
              <li>• Progress tracking and monitoring</li>
              <li>• Status reporting and communication</li>
            </ul>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">AutoGen</span>
              <h3 className="font-medium text-orange-900">Complex Orchestration</h3>
            </div>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Multi-team workflow coordination</li>
              <li>• Complex project planning</li>
              <li>• Resource optimization</li>
              <li>• Process automation design</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Management Actions</h2>
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
                  activeAction === action.id ? 'ring-2 ring-indigo-500' : ''
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
                        <span className="text-xs">Processing with {action.framework}...</span>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Beacon</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about project planning, team coordination, or progress tracking..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Beacon's Response</h2>
            <div className="flex items-center space-x-2">
              {response.framework && (
                <span className={`px-2 py-1 text-xs rounded-full ${getFrameworkBadge(response.framework)}`}>
                  {response.framework}
                </span>
              )}
              {response.agentSteps && response.agentSteps.length > 0 && (
                <button
                  onClick={() => setShowAgentSteps(!showAgentSteps)}
                  className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full hover:bg-orange-200 flex items-center space-x-1"
                >
                  <Users className="w-3 h-3" />
                  <span>{response.agentSteps.length} Steps</span>
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
