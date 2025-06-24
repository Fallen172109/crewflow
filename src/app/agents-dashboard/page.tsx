'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { MessageSquare, Target, BarChart3, Store, ExternalLink, CheckCircle, Clock } from 'lucide-react'

interface AgentStatus {
  id: string
  name: string
  status: 'active' | 'inactive' | 'testing'
  framework: string
  capabilities: string[]
  integrations: string[]
  lastTested?: string
}

export default function AgentsDashboard() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  const [loadingStatuses, setLoadingStatuses] = useState(true)

  const implementedAgents = [
    {
      id: 'coral',
      name: 'Coral',
      title: 'Customer Support',
      description: 'Advanced customer service with sentiment analysis and escalation management',
      icon: MessageSquare,
      color: 'from-orange-500 to-orange-600',
      framework: 'LangChain',
      testPath: '/test-coral',
      features: ['Sentiment Analysis', 'Escalation Detection', 'Policy Compliance', 'Multi-channel Support']
    },
    {
      id: 'mariner',
      name: 'Mariner',
      title: 'Marketing Automation',
      description: 'Hybrid AI for campaign management and market research',
      icon: Target,
      color: 'from-blue-500 to-blue-600',
      framework: 'Hybrid (LangChain + Perplexity)',
      testPath: '/test-mariner',
      features: ['Campaign Management', 'Market Research', 'Competitive Analysis', 'Content Strategy']
    },
    {
      id: 'tide',
      name: 'Tide',
      title: 'Data Analysis',
      description: 'Multi-agent workflow for comprehensive data analysis',
      icon: BarChart3,
      color: 'from-cyan-500 to-cyan-600',
      framework: 'AutoGen',
      testPath: '/test-tide',
      features: ['Multi-Agent Workflow', 'Statistical Analysis', 'Predictive Modeling', 'Business Intelligence']
    },
    {
      id: 'morgan',
      name: 'Morgan',
      title: 'E-commerce Management',
      description: 'Complete e-commerce optimization and automation',
      icon: Store,
      color: 'from-purple-500 to-purple-600',
      framework: 'LangChain',
      testPath: '/test-morgan',
      features: ['Product Optimization', 'Inventory Management', 'Pricing Strategy', 'Sales Analysis']
    }
  ]

  useEffect(() => {
    setMounted(true)
    checkAgentStatuses()
  }, [])

  const checkAgentStatuses = async () => {
    setLoadingStatuses(true)
    const statuses: AgentStatus[] = []

    for (const agent of implementedAgents) {
      try {
        const response = await fetch(`/api/agents/${agent.id}`, { method: 'GET' })
        const data = await response.json()
        
        statuses.push({
          id: agent.id,
          name: agent.name,
          status: data.status === 'active' ? 'active' : 'inactive',
          framework: data.framework || agent.framework,
          capabilities: data.capabilities || [],
          integrations: data.integrations || [],
          lastTested: new Date().toISOString()
        })
      } catch (error) {
        statuses.push({
          id: agent.id,
          name: agent.name,
          status: 'inactive',
          framework: agent.framework,
          capabilities: [],
          integrations: [],
          lastTested: undefined
        })
      }
    }

    setAgentStatuses(statuses)
    setLoadingStatuses(false)
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Agents Dashboard...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100'
      case 'testing': return 'text-yellow-700 bg-yellow-100'
      default: return 'text-red-700 bg-red-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'testing': return <Clock className="w-4 h-4" />
      default: return <ExternalLink className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚢 CrewFlow AI Agent Suite
          </h1>
          <p className="text-gray-600">
            Maritime-themed multi-agent AI automation platform
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-2">
              Welcome back, {user.email}
            </p>
          )}
        </div>

        {/* Implementation Status */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Implementation Status</h2>
              <button
                onClick={checkAgentStatuses}
                disabled={loadingStatuses}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
              >
                {loadingStatuses ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Refresh Status</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agentStatuses.map((status) => (
                <div key={status.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{status.name}</h3>
                    <div className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(status.status)}`}>
                      {getStatusIcon(status.status)}
                      <span className="capitalize">{status.status}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{status.framework}</p>
                  <div className="text-xs text-gray-500">
                    {status.capabilities.length} capabilities
                    {status.integrations.length > 0 && ` • ${status.integrations.length} integrations`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Cards */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {implementedAgents.map((agent) => {
              const Icon = agent.icon
              const status = agentStatuses.find(s => s.id === agent.id)
              
              return (
                <div key={agent.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${agent.color} text-white p-6`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{agent.name}</h3>
                        <p className="text-sm opacity-90">{agent.title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-gray-600 mb-4">{agent.description}</p>
                    
                    {/* Framework */}
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">Framework: </span>
                      <span className="text-sm text-gray-600">{agent.framework}</span>
                    </div>

                    {/* Features */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features:</h4>
                      <div className="flex flex-wrap gap-1">
                        {agent.features.map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        {status && (
                          <div className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${getStatusColor(status.status)}`}>
                            {getStatusIcon(status.status)}
                            <span className="capitalize">{status.status}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <a
                          href={agent.testPath}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Test</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-6xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/test-all-agents"
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
              >
                <div className="text-2xl mb-2">🧪</div>
                <h3 className="font-medium text-gray-900">Run All Tests</h3>
                <p className="text-sm text-gray-600">Test all agents simultaneously</p>
              </a>
              
              <a
                href="/api-documentation"
                className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-center"
              >
                <div className="text-2xl mb-2">📚</div>
                <h3 className="font-medium text-gray-900">API Documentation</h3>
                <p className="text-sm text-gray-600">View API endpoints and usage</p>
              </a>
              
              <a
                href="/integrations"
                className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
              >
                <div className="text-2xl mb-2">🔗</div>
                <h3 className="font-medium text-gray-900">Integrations</h3>
                <p className="text-sm text-gray-600">Configure third-party services</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
