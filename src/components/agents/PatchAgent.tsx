'use client'

import { useState } from 'react'
import { Ticket, Zap, AlertTriangle, Monitor, HardDrive, Send, Loader2, Settings } from 'lucide-react'

interface PatchResponse {
  response: string
  framework?: string
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface PatchAgentProps {
  userId?: string
}

export default function PatchAgent({ userId }: PatchAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<PatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const presetActions = [
    {
      id: 'triage_tickets',
      label: 'Triage Support Tickets',
      description: 'Prioritize and route IT support requests',
      icon: Ticket,
      category: 'support',
      params: ['tickets', 'criteria', 'sla', 'resources', 'escalation', 'hours']
    },
    {
      id: 'automate_fixes',
      label: 'Automate Issue Resolution',
      description: 'Design self-healing IT systems',
      icon: Zap,
      category: 'automation',
      params: ['issues', 'automation', 'integration', 'safety', 'rollback', 'documentation']
    },
    {
      id: 'escalate_incidents',
      label: 'Escalate Critical Incidents',
      description: 'Manage major IT incidents and outages',
      icon: AlertTriangle,
      category: 'incidents',
      params: ['incidents', 'matrix', 'response', 'communication', 'recovery', 'postIncident']
    },
    {
      id: 'monitor_systems',
      label: 'Monitor IT Systems',
      description: 'Set up comprehensive system monitoring',
      icon: Monitor,
      category: 'monitoring',
      params: ['infrastructure', 'tools', 'thresholds', 'procedures', 'reporting', 'compliance']
    },
    {
      id: 'manage_assets',
      label: 'Manage IT Assets',
      description: 'Track hardware and software lifecycle',
      icon: HardDrive,
      category: 'assets',
      params: ['categories', 'tracking', 'lifecycle', 'compliance', 'integration', 'reporting']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/patch', {
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
      const response = await fetch('/api/agents/patch', {
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
      case 'support': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'automation': return 'bg-green-50 text-green-700 border-green-200'
      case 'incidents': return 'bg-red-50 text-red-700 border-red-200'
      case 'monitoring': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'assets': return 'bg-orange-50 text-orange-700 border-orange-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Patch - IT Service Desk</h1>
            <p className="text-slate-100">Your LangChain-powered IT support specialist</p>
          </div>
        </div>
      </div>

      {/* Framework Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">LangChain IT Service Framework</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Core IT Service Capabilities:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Ticket Triage:</strong> Intelligent prioritization and routing</li>
              <li>• <strong>Automated Fixes:</strong> Self-healing system design</li>
              <li>• <strong>Incident Management:</strong> Crisis response and escalation</li>
              <li>• <strong>System Monitoring:</strong> Proactive infrastructure oversight</li>
              <li>• <strong>Asset Management:</strong> Lifecycle tracking and compliance</li>
              <li>• <strong>Knowledge Base:</strong> Centralized solution repository</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">ITIL Service Management:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Structured incident and problem management</li>
              <li>• Change and configuration management</li>
              <li>• Service level agreement monitoring</li>
              <li>• Continuous service improvement</li>
              <li>• User experience optimization</li>
              <li>• Security and compliance integration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">IT Service Desk Actions</h2>
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
                  activeAction === action.id ? 'ring-2 ring-slate-500' : ''
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Patch</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about IT support, system monitoring, or incident management..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Patch's Response</h2>
            {response.framework && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                LangChain
              </span>
            )}
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
