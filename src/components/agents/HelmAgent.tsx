'use client'

import { useState } from 'react'
import { UserCheck, Calendar, Users, Award, Send, Loader2, Briefcase } from 'lucide-react'

interface HelmResponse {
  response: string
  framework?: string
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface HelmAgentProps {
  userId?: string
}

export default function HelmAgent({ userId }: HelmAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<HelmResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const presetActions = [
    {
      id: 'screen_candidates',
      label: 'Screen Job Candidates',
      description: 'Evaluate candidates for open positions',
      icon: UserCheck,
      category: 'recruitment',
      params: ['position', 'skills', 'experience', 'culture', 'candidates']
    },
    {
      id: 'schedule_interviews',
      label: 'Schedule Interviews',
      description: 'Coordinate interview process and logistics',
      icon: Calendar,
      category: 'recruitment',
      params: ['position', 'candidates', 'panel', 'timeline', 'format']
    },
    {
      id: 'onboard_employees',
      label: 'Onboard New Employees',
      description: 'Design comprehensive onboarding programs',
      icon: Users,
      category: 'onboarding',
      params: ['roleType', 'department', 'startDate', 'workMode', 'companySize']
    },
    {
      id: 'manage_benefits',
      label: 'Manage Employee Benefits',
      description: 'Administer benefits enrollment and programs',
      icon: Award,
      category: 'benefits',
      params: ['employeeGroup', 'benefits', 'period', 'communication', 'compliance']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/helm', {
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
      const response = await fetch('/api/agents/helm', {
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
      case 'recruitment': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'onboarding': return 'bg-green-50 text-green-700 border-green-200'
      case 'benefits': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'performance': return 'bg-orange-50 text-orange-700 border-orange-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Helm - HR & Hiring</h1>
            <p className="text-cyan-100">Your LangChain-powered human resources specialist</p>
          </div>
        </div>
      </div>

      {/* Framework Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">LangChain HR Framework</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Core HR Capabilities:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Talent Acquisition:</strong> Candidate screening and recruitment</li>
              <li>• <strong>Interview Management:</strong> Scheduling and coordination</li>
              <li>• <strong>Employee Onboarding:</strong> Comprehensive integration programs</li>
              <li>• <strong>Benefits Administration:</strong> Enrollment and management</li>
              <li>• <strong>Performance Management:</strong> Reviews and development</li>
              <li>• <strong>HR Compliance:</strong> Policy and regulatory adherence</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">HR Process Automation:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Structured candidate evaluation frameworks</li>
              <li>• Automated interview scheduling workflows</li>
              <li>• Standardized onboarding checklists</li>
              <li>• Benefits enrollment guidance systems</li>
              <li>• Performance review templates and processes</li>
              <li>• Compliance monitoring and reporting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">HR & Hiring Actions</h2>
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
                  activeAction === action.id ? 'ring-2 ring-cyan-500' : ''
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Helm</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about recruitment, onboarding, benefits, or HR policies..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Helm's Response</h2>
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
