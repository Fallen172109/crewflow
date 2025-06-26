'use client'

import { useState } from 'react'
import { Package, AlertTriangle, Truck, ShoppingCart, Send, Loader2, ChefHat, Calculator, Home, Anchor, Waves } from 'lucide-react'
import { getAgentTools, canUserAccessTool, type AgentTool } from '@/lib/agent-tools'

interface AnchorResponse {
  response: string
  framework?: string
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface AnchorAgentProps {
  userId?: string
  userTier?: string
}

export default function AnchorAgent({ userId, userTier = 'starter' }: AnchorAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<AnchorResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<AgentTool | null>(null)
  const [toolInputs, setToolInputs] = useState<Record<string, any>>({})

  // Get available agent tools for Anchor
  const availableTools = getAgentTools('anchor').filter(tool =>
    canUserAccessTool(userTier, tool.tier)
  )

  const presetActions = [
    {
      id: 'track_inventory',
      label: 'Track Inventory Levels',
      description: 'Monitor stock levels across all locations',
      icon: Package,
      category: 'tracking',
      framework: 'langchain',
      params: ['products', 'locations', 'period', 'thresholds']
    },
    {
      id: 'predict_shortages',
      label: 'Predict Stock Shortages',
      description: 'Forecast inventory needs and shortages',
      icon: AlertTriangle,
      category: 'forecasting',
      framework: 'autogen',
      params: ['categories', 'horizon', 'factors', 'constraints']
    },
    {
      id: 'monitor_suppliers',
      label: 'Monitor Supplier Performance',
      description: 'Track supplier reliability and performance',
      icon: Truck,
      category: 'monitoring',
      framework: 'perplexity',
      params: ['suppliers', 'metrics', 'timeframe', 'risks']
    },
    {
      id: 'optimize_orders',
      label: 'Optimize Purchase Orders',
      description: 'Optimize ordering quantities and timing',
      icon: ShoppingCart,
      category: 'optimization',
      framework: 'autogen',
      params: ['products', 'budget', 'serviceLevel', 'leadTimes']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/anchor', {
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
      const response = await fetch('/api/agents/anchor', {
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
      case 'business_tools': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'daily_tools': return 'bg-green-50 text-green-700 border-green-200'
      case 'creative_tools': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'productivity_tools': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'analysis_tools': return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'communication_tools': return 'bg-pink-50 text-pink-700 border-pink-200'
      // Legacy categories
      case 'tracking': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'forecasting': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'monitoring': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'optimization': return 'bg-green-50 text-green-700 border-green-200'
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Waves className="w-full h-full" />
        </div>
        <div className="relative flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Anchor className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Anchor - Supply Chain Admiral</h1>
            <p className="text-emerald-100 text-lg">The steadfast quartermaster who ensures the ship never runs out of supplies</p>
            <p className="text-emerald-200 text-sm mt-1">⚓ "I'll keep us anchored and supplied through any storm..."</p>
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
              <h3 className="font-medium text-blue-900">Analysis & Planning</h3>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Inventory analysis and tracking</li>
              <li>• Operational planning</li>
              <li>• Cost optimization</li>
              <li>• Performance reporting</li>
            </ul>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Perplexity AI</span>
              <h3 className="font-medium text-purple-900">Market Intelligence</h3>
            </div>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Real-time supplier monitoring</li>
              <li>• Market pricing intelligence</li>
              <li>• Supply chain risk assessment</li>
              <li>• Industry trend analysis</li>
            </ul>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">AutoGen</span>
              <h3 className="font-medium text-orange-900">Complex Optimization</h3>
            </div>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Multi-location coordination</li>
              <li>• Demand forecasting</li>
              <li>• Order optimization</li>
              <li>• Process automation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Agent Tools */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Anchor's Maritime Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableTools.map((tool) => {
            const iconMap: Record<string, any> = {
              Package, AlertTriangle, Truck, ShoppingCart, ChefHat, Calculator, Home
            }
            const Icon = iconMap[tool.icon] || Package

            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool)}
                disabled={loading}
                className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all duration-200 disabled:opacity-50 ${getCategoryColor(tool.category)} ${
                  selectedTool?.id === tool.id ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-sm">{tool.name}</h3>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${getFrameworkBadge(tool.framework)}`}>
                        {tool.framework}
                      </span>
                    </div>
                    <p className="text-xs opacity-75 mb-2">{tool.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        tool.category === 'business_tools' ? 'bg-blue-100 text-blue-700' :
                        tool.category === 'daily_tools' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {tool.category.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500">{tool.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Agent Tool Execution Interface */}
      {selectedTool && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Execute: {selectedTool.name}</h2>
            <button
              onClick={() => setSelectedTool(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
            <p className="text-emerald-800 text-sm">
              <strong>⚓ Anchor:</strong> "{selectedTool.description}"
            </p>
          </div>

          {selectedTool.requiresInput && selectedTool.inputSchema && (
            <div className="space-y-4 mb-4">
              {selectedTool.inputSchema.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={toolInputs[field.name] || ''}
                      onChange={(e) => setToolInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={toolInputs[field.name] || ''}
                      onChange={(e) => setToolInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      value={toolInputs[field.name] || ''}
                      onChange={(e) => setToolInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={toolInputs[field.name] || ''}
                      onChange={(e) => setToolInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => handlePresetAction(selectedTool.id, toolInputs)}
            disabled={loading}
            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Execute Maritime Skill</span>
          </button>
        </div>
      )}

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Anchor</h2>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
          <p className="text-emerald-800 text-sm">
            <strong>⚓ Anchor:</strong> "Ahoy! I'm here to help you navigate supply chain challenges, manage your inventory,
            or assist with daily planning tasks. What can this old quartermaster help you secure today?"
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about supply chains, meal planning, budgeting, or home organization..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Anchor's Response</h2>
            <div className="flex items-center space-x-2">
              {response.framework && (
                <span className={`px-2 py-1 text-xs rounded-full ${getFrameworkBadge(response.framework)}`}>
                  {response.framework}
                </span>
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
