// Agent Endpoint Bridge
// Connects the enhanced orchestrator with existing agent API endpoints

import { Agent } from '@/lib/agents'
import { RoutingDecision } from './maritime-agent-router'
import { CrossAgentContext } from './cross-agent-context'

export interface AgentEndpointRequest {
  message: string
  context?: any
  action?: string
  params?: any
  userId: string
  threadId?: string
  framework?: string
  routingDecision?: RoutingDecision
  crossAgentContext?: CrossAgentContext
}

export interface AgentEndpointResponse {
  success: boolean
  response: string
  framework?: string
  sources?: any[]
  usage?: {
    tokensUsed: number
    latency: number
    model: string
    cost: number
  }
  maritimePersonality?: {
    introduced: boolean
    personalityMessage?: string
  }
}

export class AgentEndpointBridge {
  private endpointMap: Map<string, string>

  constructor() {
    this.endpointMap = new Map([
      ['anchor', '/api/agents/anchor'],
      ['sage', '/api/agents/sage'],
      ['helm', '/api/agents/helm'],
      ['ledger', '/api/agents/ledger'],
      ['patch', '/api/agents/patch'],
      ['pearl', '/api/agents/pearl'],
      ['flint', '/api/agents/flint'],
      ['beacon', '/api/agents/beacon'],
      ['splash', '/api/agents/splash'],
      ['drake', '/api/agents/drake'],
      ['coral', '/api/agents/coral'],
      ['mariner', '/api/agents/mariner'],
      ['tide', '/api/agents/tide'],
      ['morgan', '/api/agents/morgan']
    ])
  }

  /**
   * Route a request to the appropriate agent endpoint
   */
  async routeToAgentEndpoint(
    agent: Agent,
    request: AgentEndpointRequest
  ): Promise<AgentEndpointResponse> {
    const endpoint = this.endpointMap.get(agent.id)
    
    if (!endpoint) {
      throw new Error(`No endpoint found for agent: ${agent.id}`)
    }

    try {
      // Enhance the request with routing context
      const enhancedRequest = this.enhanceRequestWithContext(request, agent)
      
      // Make the API call to the agent endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enhancedRequest)
      })

      if (!response.ok) {
        throw new Error(`Agent endpoint error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Process and enhance the response
      return this.processAgentResponse(data, agent, request)
    } catch (error) {
      console.error(`Error calling agent endpoint for ${agent.id}:`, error)
      
      // Return fallback response with maritime personality
      return {
        success: false,
        response: this.generateFallbackResponse(agent, request.message),
        usage: {
          tokensUsed: 0,
          latency: 0,
          model: 'fallback',
          cost: 0
        },
        maritimePersonality: {
          introduced: false,
          personalityMessage: `⚠️ ${agent.name} encountered rough seas but is ready to assist once the weather clears.`
        }
      }
    }
  }

  /**
   * Enhance the request with maritime agent context
   */
  private enhanceRequestWithContext(
    request: AgentEndpointRequest,
    agent: Agent
  ): AgentEndpointRequest {
    const enhancedContext = {
      ...request.context,
      // Add maritime agent routing context
      maritimeRouting: {
        selectedAgent: agent.id,
        routingConfidence: request.routingDecision?.confidence || 0.5,
        routingReason: request.routingDecision?.reasoning || 'Direct routing',
        estimatedComplexity: request.routingDecision?.estimatedComplexity || 'medium'
      },
      // Add cross-agent context if available
      crossAgentContext: request.crossAgentContext ? {
        conversationPhase: request.crossAgentContext.conversationPhase,
        previousAgents: request.crossAgentContext.previousAgents.map(a => a.id),
        shouldIntroduce: request.crossAgentContext.sharedContext.maritimePersonalityState?.hasIntroduced === false
      } : undefined
    }

    return {
      ...request,
      context: enhancedContext,
      // Ensure framework is set based on agent configuration
      framework: request.framework || this.getPreferredFramework(agent)
    }
  }

  /**
   * Process and enhance the agent response
   */
  private processAgentResponse(
    data: any,
    agent: Agent,
    request: AgentEndpointRequest
  ): AgentEndpointResponse {
    // Extract maritime personality elements from the response
    const maritimePersonality = this.extractMaritimePersonality(data.response, agent)
    
    return {
      success: data.success !== false,
      response: data.response || data.message || 'No response received',
      framework: data.framework || agent.framework,
      sources: data.sources || [],
      usage: data.usage || {
        tokensUsed: data.tokensUsed || 0,
        latency: data.latency || 0,
        model: data.model || 'unknown',
        cost: data.cost || agent.costPerRequest
      },
      maritimePersonality
    }
  }

  /**
   * Extract maritime personality elements from response
   */
  private extractMaritimePersonality(
    response: string,
    agent: Agent
  ): { introduced: boolean; personalityMessage?: string } {
    const maritimeKeywords = [
      'anchor', 'navigate', 'chart', 'sail', 'helm', 'captain', 'crew', 'vessel', 'port', 'maritime'
    ]
    
    const hasMaritimeElements = maritimeKeywords.some(keyword => 
      response.toLowerCase().includes(keyword)
    )
    
    const introduced = response.toLowerCase().includes(`i'm ${agent.name.toLowerCase()}`) ||
                      response.toLowerCase().includes(`i am ${agent.name.toLowerCase()}`)
    
    return {
      introduced,
      personalityMessage: hasMaritimeElements ? 
        `${agent.name} is maintaining maritime personality consistency` : 
        undefined
    }
  }

  /**
   * Get preferred framework for agent
   */
  private getPreferredFramework(agent: Agent): string {
    // Map agent frameworks to specific implementations
    const frameworkMap: Record<string, string> = {
      'langchain': 'langchain',
      'perplexity': 'perplexity',
      'autogen': 'autogen',
      'hybrid': 'langchain' // Default to langchain for hybrid
    }
    
    return frameworkMap[agent.framework] || 'langchain'
  }

  /**
   * Generate fallback response with maritime personality
   */
  private generateFallbackResponse(agent: Agent, message: string): string {
    const maritimePersonalities: Record<string, string> = {
      anchor: "⚓ Anchor here, your Supply Chain Admiral. I'm currently navigating through some technical waters, but I'm ready to help you manage your inventory and supply chain once we're back on course.",
      sage: "📚 Sage reporting, your Knowledge Navigator. I'm charting a course through some system challenges, but I'll be ready to help you research and organize information shortly.",
      helm: "⚙️ Helm at your service, your Operations Helmsman. We're experiencing some technical turbulence, but I'll be steering your workflows back to smooth sailing soon.",
      ledger: "💰 Ledger here, your Financial Treasurer. I'm balancing the books during a brief system maintenance, but I'll be ready to help with your financial analysis momentarily.",
      patch: "🔧 Patch reporting, your Technical Engineer. I'm working on some system repairs, but I'll have everything running shipshape for you shortly.",
      pearl: "🔍 Pearl here, your Market Explorer. I'm diving deep into some technical depths, but I'll surface with market insights for you soon.",
      flint: "⚡ Flint at the ready, your Sales Strategist. I'm strategizing through some system challenges, but I'll be back to boost your sales performance shortly.",
      beacon: "🗼 Beacon signaling, your Project Coordinator. I'm coordinating through some technical fog, but I'll guide your projects back on track soon.",
      splash: "🎨 Splash here, your Creative Artist. I'm painting through some technical canvas issues, but I'll be creating beautiful content for you shortly.",
      drake: "🤝 Drake reporting, your Customer Captain. I'm navigating some customer service waters, but I'll be back to ensure smooth customer relations soon."
    }
    
    return maritimePersonalities[agent.id] || 
           `⚓ ${agent.name} here. I'm currently navigating through some technical challenges, but I'm ready to assist you once we're back on course.`
  }

  /**
   * Check if agent endpoint is available
   */
  async checkAgentHealth(agentId: string): Promise<boolean> {
    const endpoint = this.endpointMap.get(agentId)
    
    if (!endpoint) {
      return false
    }

    try {
      const response = await fetch(endpoint, {
        method: 'GET'
      })
      
      return response.ok
    } catch (error) {
      console.error(`Health check failed for agent ${agentId}:`, error)
      return false
    }
  }

  /**
   * Get all available agent endpoints
   */
  getAvailableEndpoints(): Map<string, string> {
    return new Map(this.endpointMap)
  }

  /**
   * Register a new agent endpoint
   */
  registerAgentEndpoint(agentId: string, endpoint: string): void {
    this.endpointMap.set(agentId, endpoint)
  }

  /**
   * Batch health check for all agents
   */
  async batchHealthCheck(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>()
    
    const healthChecks = Array.from(this.endpointMap.keys()).map(async (agentId) => {
      const isHealthy = await this.checkAgentHealth(agentId)
      healthStatus.set(agentId, isHealthy)
    })
    
    await Promise.all(healthChecks)
    
    return healthStatus
  }

  /**
   * Get agent endpoint URL
   */
  getAgentEndpoint(agentId: string): string | undefined {
    return this.endpointMap.get(agentId)
  }

  /**
   * Route message with automatic fallback handling
   */
  async routeWithFallback(
    primaryAgent: Agent,
    fallbackAgents: Agent[],
    request: AgentEndpointRequest
  ): Promise<AgentEndpointResponse> {
    // Try primary agent first
    try {
      const response = await this.routeToAgentEndpoint(primaryAgent, request)
      if (response.success) {
        return response
      }
    } catch (error) {
      console.warn(`Primary agent ${primaryAgent.id} failed, trying fallbacks`)
    }

    // Try fallback agents
    for (const fallbackAgent of fallbackAgents) {
      try {
        const response = await this.routeToAgentEndpoint(fallbackAgent, {
          ...request,
          context: {
            ...request.context,
            fallbackReason: `Primary agent ${primaryAgent.id} unavailable`
          }
        })
        
        if (response.success) {
          return {
            ...response,
            maritimePersonality: {
              ...response.maritimePersonality,
              personalityMessage: `⚓ ${fallbackAgent.name} stepping in to assist while ${primaryAgent.name} handles other duties.`
            }
          }
        }
      } catch (error) {
        console.warn(`Fallback agent ${fallbackAgent.id} also failed`)
      }
    }

    // All agents failed, return final fallback
    return {
      success: false,
      response: "⚠️ All crew members are currently handling other duties. Please try again in a moment, and we'll have someone assist you right away.",
      usage: {
        tokensUsed: 0,
        latency: 0,
        model: 'system_fallback',
        cost: 0
      },
      maritimePersonality: {
        introduced: false,
        personalityMessage: "System fallback - all agents temporarily unavailable"
      }
    }
  }
}
