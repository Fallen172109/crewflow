'use client'

import { useState } from 'react'
import { Target, Mail, Search, FileText, Send, Loader2, Users, TrendingUp, ExternalLink } from 'lucide-react'

interface AgentStep {
  agent: string
  action: string
  result: string
  timestamp: number
}

interface DrakeResponse {
  response: string
  framework?: string
  agentSteps?: AgentStep[]
  sources?: string[]
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface DrakeAgentProps {
  userId?: string
}

export default function DrakeAgent({ userId }: DrakeAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<DrakeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [showAgentSteps, setShowAgentSteps] = useState(false)

  const presetActions = [
    {
      id: 'generate_leads',
      label: 'Generate Sales Leads',
      description: 'Find and qualify potential customers',
      icon: Target,
      category: 'prospecting',
      framework: 'perplexity',
      params: ['industry', 'companySize', 'location', 'budget', 'roles', 'painPoints']
    },
    {
      id: 'automate_outreach',
      label: 'Automate Sales Outreach',
      description: 'Create personalized outreach campaigns',
      icon: Mail,
      category: 'outreach',
      framework: 'autogen',
      params: ['audience', 'goal', 'channels', 'duration', 'followups', 'personalization']
    },
    {
      id: 'competitive_analysis',
      label: 'Competitive Intelligence',
      description: 'Research competitors and market positioning',
      icon: Search,
      category: 'research',
      framework: 'perplexity',
      params: ['competitors', 'focus', 'segment', 'geography', 'timeframe']
    },
    {
      id: 'proposal_generation',
      label: 'Generate Sales Proposals',
      description: 'Create customized business proposals',
      icon: FileText,
      category: 'proposals',
      framework: 'langchain',
      params: ['client', 'industry', 'scope', 'budget', 'timeline', 'stakeholders', 'painPoints']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/drake', {
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
      const response = await fetch('/api/agents/drake', {
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
      case 'prospecting': return 'bg-green-50 text-green-700 border-green-200'
      case 'outreach': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'research': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'proposals': return 'bg-orange-50 text-orange-700 border-orange-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getFrameworkBadge = (framework: string) => {
    switch (framework) {
      case 'langchain': return 'bg-blue-100 text-blue-800'
      case 'perplexity': return 'bg-purple-100 text-purple-800'
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
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Drake - Business Development</h1>
            <p className="text-red-100">Your triple-hybrid AI business development specialist</p>
          </div>
        </div>
      </div>

      {/* Hybrid Framework Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Triple-Hybrid AI Approach</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">LangChain</span>
              <h3 className="font-medium text-blue-900">Content & CRM</h3>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Proposal generation</li>
              <li>• Sales content creation</li>
              <li>• CRM data management</li>
              <li>• Template development</li>
            </ul>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Perplexity AI</span>
              <h3 className="font-medium text-purple-900">Research & Intelligence</h3>
            </div>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Lead research & qualification</li>
              <li>• Competitive intelligence</li>
              <li>• Market analysis</li>
              <li>• Company research</li>
            </ul>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">AutoGen</span>
              <h3 className="font-medium text-orange-900">Campaign Automation</h3>
            </div>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Multi-step campaigns</li>
              <li>• Process automation</li>
              <li>• Workflow orchestration</li>
              <li>• Team coordination</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Development Actions</h2>
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
                  activeAction === action.id ? 'ring-2 ring-red-500' : ''
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Drake</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about lead generation, competitive analysis, or sales automation..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Drake's Response</h2>
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
