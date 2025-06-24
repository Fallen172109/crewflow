'use client'

import { useState } from 'react'
import { Receipt, CreditCard, TrendingUp, FileText, PieChart, Send, Loader2, DollarSign } from 'lucide-react'

interface LedgerResponse {
  response: string
  framework?: string
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

interface LedgerAgentProps {
  userId?: string
}

export default function LedgerAgent({ userId }: LedgerAgentProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<LedgerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const presetActions = [
    {
      id: 'process_invoices',
      label: 'Process Invoices',
      description: 'Automate invoice processing and approval',
      icon: Receipt,
      category: 'payables',
      params: ['invoiceData', 'period', 'vendors', 'workflow', 'paymentTerms', 'categories']
    },
    {
      id: 'match_expenses',
      label: 'Match Expenses',
      description: 'Reconcile expenses across systems',
      icon: CreditCard,
      category: 'expenses',
      params: ['sources', 'period', 'categories', 'criteria', 'tolerance', 'review']
    },
    {
      id: 'analyze_cash_flow',
      label: 'Analyze Cash Flow',
      description: 'Forecast and optimize cash flow',
      icon: TrendingUp,
      category: 'analysis',
      params: ['period', 'businessType', 'revenue', 'expenses', 'seasonality', 'growth']
    },
    {
      id: 'generate_reports',
      label: 'Generate Financial Reports',
      description: 'Create comprehensive financial statements',
      icon: FileText,
      category: 'reporting',
      params: ['reportTypes', 'period', 'audience', 'detail', 'compliance', 'comparative']
    },
    {
      id: 'budget_planning',
      label: 'Budget Planning',
      description: 'Develop budgets and forecasts',
      icon: PieChart,
      category: 'planning',
      params: ['period', 'units', 'revenue', 'costs', 'capex', 'scenarios']
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/agents/ledger', {
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
      const response = await fetch('/api/agents/ledger', {
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
      case 'payables': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'expenses': return 'bg-green-50 text-green-700 border-green-200'
      case 'analysis': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'reporting': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'planning': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ledger - Finance & Accounting</h1>
            <p className="text-green-100">Your LangChain-powered financial specialist</p>
          </div>
        </div>
      </div>

      {/* Framework Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">LangChain Financial Framework</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Core Financial Capabilities:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Invoice Processing:</strong> Automated AP workflows</li>
              <li>• <strong>Expense Management:</strong> Multi-source reconciliation</li>
              <li>• <strong>Cash Flow Analysis:</strong> Forecasting and optimization</li>
              <li>• <strong>Financial Reporting:</strong> Comprehensive statements</li>
              <li>• <strong>Budget Planning:</strong> Strategic financial planning</li>
              <li>• <strong>Compliance Monitoring:</strong> Regulatory adherence</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Financial Process Automation:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Structured invoice approval workflows</li>
              <li>• Automated expense matching algorithms</li>
              <li>• Real-time cash flow monitoring</li>
              <li>• Standardized financial reporting</li>
              <li>• Budget variance analysis and alerts</li>
              <li>• Compliance and audit trail maintenance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preset Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Finance & Accounting Actions</h2>
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
                  activeAction === action.id ? 'ring-2 ring-green-500' : ''
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with Ledger</h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about invoice processing, expense management, or financial reporting..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <h2 className="text-lg font-semibold text-gray-900">Ledger's Response</h2>
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
