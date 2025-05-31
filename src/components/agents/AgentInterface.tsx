'use client'

import { useState, useRef, useEffect } from 'react'
import { Agent } from '@/lib/agents'
import { UserProfile } from '@/lib/auth'
import ChatInterface from './ChatInterface'
import PresetActions from './PresetActions'

interface AgentInterfaceProps {
  agent: Agent
  userProfile: UserProfile | null
}

export default function AgentInterface({ agent, userProfile }: AgentInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('chat')
  const [messages, setMessages] = useState<Array<{
    id: string
    type: 'user' | 'agent'
    content: string
    timestamp: Date
  }>>([
    {
      id: '1',
      type: 'agent',
      content: `Ahoy! I'm ${agent.name}, your ${agent.title} specialist. I'm here to help you with ${agent.description.toLowerCase()}. How can I assist you today?`,
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // TODO: Implement actual AI agent API call
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const agentResponse = {
        id: (Date.now() + 1).toString(),
        type: 'agent' as const,
        content: `I understand you're asking about "${content}". As your ${agent.title} specialist, I'm processing this request using ${agent.framework} framework. This is a simulated response - the actual AI integration will be implemented next.`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, agentResponse])
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePresetAction = async (actionId: string) => {
    const action = agent.presetActions.find(a => a.id === actionId)
    if (!action) return

    setIsLoading(true)
    
    try {
      // TODO: Implement actual preset action execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const actionMessage = {
        id: Date.now().toString(),
        type: 'agent' as const,
        content: `✅ **${action.label}** completed successfully!\n\n${action.description}\n\nEstimated time: ${action.estimatedTime}\n\n*This is a simulated action - actual implementation will connect to real services.*`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, actionMessage])
    } catch (error) {
      console.error('Error executing preset action:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Agent Header */}
      <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700 mb-6">
        <div className="flex items-start space-x-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: agent.color }}
          >
            {agent.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <span className="text-sm bg-secondary-700 text-secondary-300 px-2 py-1 rounded">
                {agent.framework}
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-secondary-400">Online</span>
              </div>
            </div>
            <p className="text-primary-400 font-medium mb-2">{agent.title}</p>
            <p className="text-secondary-300">{agent.description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-400">Usage Today</p>
            <p className="text-xl font-bold text-white">23 / 500</p>
            <div className="w-24 bg-secondary-700 rounded-full h-2 mt-1">
              <div className="bg-primary-500 h-2 rounded-full" style={{ width: '4.6%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-primary-500 text-white'
              : 'bg-secondary-800 text-secondary-300 hover:text-white'
          }`}
        >
          💬 Chat Interface
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'actions'
              ? 'bg-primary-500 text-white'
              : 'bg-secondary-800 text-secondary-300 hover:text-white'
          }`}
        >
          ⚡ Preset Actions
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' ? (
          <ChatInterface
            agent={agent}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        ) : (
          <PresetActions
            agent={agent}
            onExecuteAction={handlePresetAction}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
