'use client'

import { useState, useRef, useEffect } from 'react'
import { Agent } from '@/lib/agents'
import { UserProfile } from '@/lib/auth'
import TabbedChatInterface, { TabbedChatInterfaceRef } from './TabbedChatInterface'
import PresetActions from './PresetActions'

// Helper function to get framework badge styling
const getFrameworkBadge = (framework: string) => {
  switch (framework) {
    case 'langchain':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'autogen':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'perplexity':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'hybrid':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

interface AgentInterfaceProps {
  agent: Agent
  userProfile: UserProfile | null
}

export default function AgentInterface({ agent, userProfile }: AgentInterfaceProps) {
  // Debug logging
  console.log('AgentInterface rendered:', {
    agentId: agent.id,
    userProfile: userProfile ? 'loaded' : 'null',
    userRole: userProfile?.role,
    userTier: userProfile?.subscription_tier
  })

  const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('chat')
  const [isLoading, setIsLoading] = useState(false)
  const chatInterfaceRef = useRef<TabbedChatInterfaceRef>(null)

  // Clear URL parameters when navigating to a different agent to prevent message re-sending
  useEffect(() => {
    const url = new URL(window.location.href)
    const hasParams = url.searchParams.has('taskType') || url.searchParams.has('message') || url.searchParams.has('task')

    if (hasParams) {
      // Only clear if we're navigating to a different agent (not the initial load)
      const currentPath = window.location.pathname
      const agentIdFromPath = currentPath.split('/').pop()

      if (agentIdFromPath === agent.id) {
        // This is the target agent, let the TabbedChatInterface handle the parameters
        return
      } else {
        // This is a different agent, clear the parameters
        url.searchParams.delete('taskType')
        url.searchParams.delete('message')
        url.searchParams.delete('task')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [agent.id])

  const handleSendMessage = async (content: string, taskType: string = 'general', responseTaskType?: string, threadId?: string | null) => {
    console.log('🚀 CREWFLOW DEBUG: handleSendMessage called', {
      content: content.substring(0, 100) + '...',
      taskType,
      responseTaskType,
      threadId,
      agentId: agent.id,
      userProfile: userProfile?.id,
      timestamp: new Date().toISOString()
    })

    setIsLoading(true)

    try {
      // Parse the message to detect if it's a Crew Ability action
      const isCrewAbilityAction = taskType === 'crew_ability' && content.includes('Action:')

      // Check if this is an image generation request in general chat
      const isImageGenerationRequest = !isCrewAbilityAction && (
        // Direct image creation commands
        /create.*image|generate.*image|make.*image|draw.*image|visual.*content|image.*of/i.test(content) ||
        /picture.*of|photo.*of|illustration.*of|artwork.*of|design.*image/i.test(content) ||
        /show.*me.*image|can.*you.*draw|can.*you.*create.*visual/i.test(content) ||

        // Specific image types
        /\b(icon|logo|avatar|banner|thumbnail|poster|wallpaper|background)\b/i.test(content) ||
        /\b(streamer|gamer|gaming|twitch|youtube)\s+(icon|logo|avatar|banner|image)/i.test(content) ||

        // Professional/business images
        /\b(profile|headshot|portrait|business|professional)\s+(image|photo|picture)/i.test(content) ||
        /\b(company|brand|business)\s+(logo|icon|image)/i.test(content) ||
        /\bdesign\s+(a|an)?\s*(professional|business|corporate)\s+(headshot|portrait|image)/i.test(content) ||

        // Social media content
        /\b(social|media|post|story|content)\s+(image|visual|graphic)/i.test(content) ||
        /\b(instagram|facebook|twitter|linkedin)\s+(post|image|graphic)/i.test(content) ||
        /\b(social\s+media|social)\s+(post|content)/i.test(content) ||

        // Creative requests
        /\b(design|create|make|generate)\s+(a|an|some)?\s*(logo|icon|banner|image|visual|graphic)/i.test(content) ||
        /\bi\s+need\s+(a|an)\s+(logo|icon|image|visual|graphic)/i.test(content) ||
        /\bcan\s+you\s+(make|create|design|generate)\s+(a|an|some)?\s*(image|visual|logo|icon)/i.test(content)
      )



      let apiUrl = `/api/agents/${agent.id}`
      let requestBody: any = {
        message: content,
        taskType: taskType,
        userId: userProfile?.id,
        threadId: threadId
      }

      // If it's a crew ability action, parse the action and params
      if (isCrewAbilityAction) {
        const actionMatch = content.match(/Action:\s*([^\n]+)/)
        const paramsMatch = content.match(/Parameters:\s*({[^}]+})/)

        if (actionMatch) {
          const actionId = actionMatch[1].trim()
          let params = {}

          if (paramsMatch) {
            try {
              params = JSON.parse(paramsMatch[1])
            } catch (e) {
              console.warn('Failed to parse parameters:', paramsMatch[1])
            }
          }

          // Use the specific agent route for actions
          apiUrl = `/api/agents/${agent.id}`
          requestBody = {
            action: actionId,
            params: params,
            message: content,
            userId: userProfile?.id,
            threadId: threadId
          }
        }
      } else if (isImageGenerationRequest && (agent.id === 'splash' || agent.id === 'pearl')) {
        // Route image generation requests from general chat to the action endpoint
        console.log(`Detected image generation request in general chat for ${agent.id}, routing to action endpoint`)
        apiUrl = `/api/agents/${agent.id}`
        requestBody = {
          action: 'visual_content_creator',
          params: {
            prompt: content,
            style: 'Digital Art',
            aspect_ratio: 'Square (1:1)',
            quality: 'standard'
          },
          message: content,
          userId: userProfile?.id,
          threadId: threadId
        }
      }

      // IMPORTANT: Always use the chat API for thread-based conversations to ensure context is loaded
      // Only use the direct agent API for specific actions or non-threaded requests
      if (threadId && !isCrewAbilityAction && !isImageGenerationRequest) {
        apiUrl = `/api/agents/${agent.id}/chat`
        requestBody = {
          message: content,
          taskType: taskType,
          userId: userProfile?.id,
          threadId: threadId
        }
      }

      console.log('🌐 CREWFLOW DEBUG: Making API call', {
        apiUrl,
        requestBody: {
          ...requestBody,
          message: requestBody.message?.substring(0, 100) + '...'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Call the appropriate API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('📡 CREWFLOW DEBUG: API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. This might be an authentication or server error.')
      }

      const data = await response.json()

      if (response.ok) {
        // Add agent response to the appropriate tab via the ref
        // Use responseTaskType if provided, otherwise use taskType
        const finalResponseTaskType = responseTaskType || taskType
        if (chatInterfaceRef.current) {
          chatInterfaceRef.current.addAgentResponse(data.response, finalResponseTaskType)
        }
      } else {
        console.error('Error from agent API:', data.error)

        // Handle specific error types
        let errorMessage = 'Sorry, I encountered an error processing your request. Please try again.'

        if (response.status === 401) {
          errorMessage = 'Authentication required. Please refresh the page and sign in again.'
        } else if (response.status === 403) {
          errorMessage = 'This agent is not available in your current plan. Please upgrade to access this feature.'
        } else if (response.status === 429) {
          errorMessage = 'You\'ve reached your monthly usage limit. Please upgrade your plan or wait until next month.'
        } else if (data.error) {
          errorMessage = `Error: ${data.error}`
        }

        // Add error message to chat
        const finalResponseTaskType = responseTaskType || taskType
        if (chatInterfaceRef.current) {
          chatInterfaceRef.current.addAgentResponse(errorMessage, finalResponseTaskType)
        }
      }
    } catch (error) {
      console.error('❌ CREWFLOW DEBUG: Error sending message:', error)
      console.error('❌ CREWFLOW DEBUG: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })

      // Provide more specific error messages
      let errorMessage = 'Sorry, I encountered a connection error. Please try again.'

      if (error instanceof Error) {
        if (error.message.includes('non-JSON response')) {
          errorMessage = 'There was a server error. Please refresh the page and try again. If the problem persists, you may need to sign in again.'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
        }
      }

      // Add error message to chat
      const finalResponseTaskType = responseTaskType || taskType
      if (chatInterfaceRef.current) {
        chatInterfaceRef.current.addAgentResponse(errorMessage, finalResponseTaskType)
      }
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
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6 shadow-sm">
        <div className="flex items-start space-x-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: agent.color }}
          >
            {agent.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <span className={`text-sm px-3 py-1 rounded-full border ${getFrameworkBadge(agent.framework)}`}>
                {agent.framework}
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Online</span>
              </div>
              {agent.requiresApiConnection && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">API Required</span>
                </div>
              )}
            </div>
            <p className="text-orange-600 font-medium mb-2">{agent.title}</p>
            <p className="text-gray-700 mb-3">{agent.description}</p>

            {/* Integration Status */}
            {agent.integrations.length > 0 && (
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs text-gray-600">Integrations:</span>
                <div className="flex items-center space-x-1">
                  {agent.integrations.slice(0, 3).map((integration, index) => (
                    <span key={integration} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {integration}
                    </span>
                  ))}
                  {agent.integrations.length > 3 && (
                    <span className="text-xs text-gray-600">+{agent.integrations.length - 3} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Capabilities */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">Actions:</span>
              <span className="text-xs text-orange-600 font-medium">{agent.presetActions.length} available</span>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-600">Cost: ${agent.costPerRequest}/request</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Usage Today</p>
            <p className="text-xl font-bold text-gray-900">23 / 500</p>
            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '4.6%' }}></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Tier: {agent.tier}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          💬 Chat Interface
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'actions'
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          ⚡ Preset Actions
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' ? (
          <TabbedChatInterface
            ref={chatInterfaceRef}
            agent={agent}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            userProfile={userProfile}
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
