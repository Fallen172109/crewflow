'use client'

import { useState } from 'react'
import { Send, Loader2, Waves } from 'lucide-react'
import { type Agent } from '@/lib/agents'
import { getAgentTools, canUserAccessTool, type AgentTool, type AgentToolResult } from '@/lib/agent-tools'
import AgentToolsInterface from './AgentToolsInterface'

interface BaseAgentInterfaceProps {
  agent: Agent
  userId?: string
  userTier?: string
  children?: React.ReactNode
}

interface AgentResponse {
  response: string
  framework?: string
  usage?: {
    tokensUsed: number
    latency: number
    cost: number
  }
}

export default function BaseAgentInterface({ 
  agent, 
  userId, 
  userTier = 'starter',
  children 
}: BaseAgentInterfaceProps) {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<AgentResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Get available agent tools
  const availableTools = getAgentTools(agent.id).filter(tool => 
    canUserAccessTool(userTier, tool.tier)
  )

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success !== false) {
        setResponse(data)
        setMessage('') // Only clear message on successful response
      } else {
        setResponse({
          response: data.error || 'An error occurred while processing your request.',
          framework: 'error'
        })
      }
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

  const handleToolExecute = async (toolId: string, inputs: Record<string, any>): Promise<AgentToolResult> => {
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: toolId,
          params: inputs,
          userId
        }),
      })

      const data = await response.json()
      
      return {
        success: data.success || false,
        result: data.response || 'No response received',
        tokensUsed: data.usage?.tokensUsed || 0,
        latency: data.usage?.latency || 0,
        framework: data.framework || 'unknown',
        error: data.error
      }
    } catch (error) {
      return {
        success: false,
        result: 'Failed to execute tool',
        tokensUsed: 0,
        latency: 0,
        framework: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const getFrameworkBadge = (framework: string) => {
    switch (framework) {
      case 'langchain': return 'bg-blue-100 text-blue-800'
      case 'perplexity': return 'bg-purple-100 text-purple-800'
      case 'autogen': return 'bg-orange-100 text-orange-800'
      case 'hybrid': return 'bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Agent Header */}
      <div className={`bg-gradient-to-r from-${agent.color.replace('#', '')}-600 to-${agent.color.replace('#', '')}-700 text-white p-6 rounded-lg relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <Waves className="w-full h-full" />
        </div>
        <div className="relative flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <img 
              src={agent.avatar} 
              alt={agent.name}
              className="w-12 h-12 rounded-full"
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling!.style.display = 'flex'
              }}
            />
            <div className="w-12 h-12 bg-white/30 rounded-full items-center justify-center text-xl font-bold hidden">
              {agent.name.charAt(0)}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold">{agent.name} - {agent.title}</h1>
            <p className="text-lg opacity-90">{agent.description}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getFrameworkBadge(agent.framework)}`}>
                {agent.framework}
              </span>
              <span className="text-sm opacity-75">
                {agent.tier} tier • ${agent.costPerRequest} per request
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Framework Information */}
      {agent.framework === 'hybrid' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hybrid AI Approach</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">LangChain</span>
                <h3 className="font-medium text-blue-900">Analysis & Planning</h3>
              </div>
              <p className="text-sm text-blue-700">Systematic analysis and structured decision-making</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Perplexity AI</span>
                <h3 className="font-medium text-purple-900">Real-time Intelligence</h3>
              </div>
              <p className="text-sm text-purple-700">Current market data and trend analysis</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">AutoGen</span>
                <h3 className="font-medium text-orange-900">Complex Orchestration</h3>
              </div>
              <p className="text-sm text-orange-700">Multi-agent workflow coordination</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Agent Content */}
      {children}

      {/* Agent Tools Interface */}
      {availableTools.length > 0 && (
        <AgentToolsInterface
          tools={availableTools}
          agentId={agent.id}
          agentName={agent.name}
          agentColor={agent.color.replace('#', '')}
          onToolExecute={handleToolExecute}
          loading={loading}
        />
      )}

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat with {agent.name}</h2>
        <div className={`bg-${agent.color.replace('#', '')}-50 border border-${agent.color.replace('#', '')}-200 rounded-lg p-3 mb-4`}>
          <p className={`text-${agent.color.replace('#', '')}-800 text-sm`}>
            <strong>⚓ {agent.name}:</strong> "Ahoy! I'm here to help you with {agent.category} tasks and daily planning. 
            What can this maritime specialist help you navigate today?"
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Ask ${agent.name} about ${agent.category} or daily tasks...`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className={`px-4 py-2 bg-${agent.color.replace('#', '')}-600 text-white rounded-md hover:bg-${agent.color.replace('#', '')}-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
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
            <h2 className="text-lg font-semibold text-gray-900">{agent.name}'s Response</h2>
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
