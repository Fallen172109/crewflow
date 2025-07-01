// AI Framework Orchestrator
// Main entry point for all AI framework interactions

import { LangChainAgent, createLangChainAgent } from './langchain-working'
import { PerplexityAgent, createPerplexityAgent } from './perplexity'
import { AutoGenAgent, createAutoGenAgent } from './autogen'
import { getAIConfig, validateAIConfig } from './config'
import type { Agent } from '../agents'

export interface AIResponse {
  response: string
  tokensUsed: number
  latency: number
  model: string
  framework: string
  success: boolean
  error?: string
  metadata?: any
}

export interface AIAgentConfig {
  agent: Agent
  systemPrompt: string
  temperature?: number
  maxTokens?: number
  model?: string
}

// Main AI Agent Factory
export class AIAgentFactory {
  private static instance: AIAgentFactory
  private agentCache: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): AIAgentFactory {
    if (!AIAgentFactory.instance) {
      AIAgentFactory.instance = new AIAgentFactory()
    }
    return AIAgentFactory.instance
  }

  // Create or retrieve cached agent instance
  createAgent(config: AIAgentConfig): LangChainAgent | PerplexityAgent | AutoGenAgent {
    const cacheKey = `${config.agent.id}-${config.agent.framework}`
    
    if (this.agentCache.has(cacheKey)) {
      return this.agentCache.get(cacheKey)
    }

    let agent: any

    switch (config.agent.framework) {
      case 'langchain':
        agent = createLangChainAgent(config.agent, config.systemPrompt)
        break
      
      case 'perplexity':
        agent = createPerplexityAgent(config.agent, config.systemPrompt)
        break
      
      case 'autogen':
        agent = createAutoGenAgent(config.agent, config.systemPrompt)
        break
      
      case 'hybrid':
        agent = this.createHybridAgent(config)
        break
      
      default:
        throw new Error(`Unsupported framework: ${config.agent.framework}`)
    }

    this.agentCache.set(cacheKey, agent)
    return agent
  }

  // Create hybrid agent that combines multiple frameworks
  private createHybridAgent(config: AIAgentConfig): HybridAgent {
    return new HybridAgent(config)
  }

  // Clear agent cache
  clearCache(): void {
    this.agentCache.clear()
  }
}

// Hybrid Agent for agents that use multiple frameworks
export class HybridAgent {
  private config: AIAgentConfig
  private langchainAgent?: LangChainAgent
  private perplexityAgent?: PerplexityAgent
  private autoGenAgent?: AutoGenAgent

  constructor(config: AIAgentConfig) {
    this.config = config
    this.initializeAgents()
  }

  private initializeAgents(): void {
    const agent = this.config.agent
    
    // Initialize based on optimal AI modules
    if (agent.optimalAiModules.some(module => module.includes('LangChain'))) {
      this.langchainAgent = createLangChainAgent(agent, this.config.systemPrompt)
    }
    
    if (agent.optimalAiModules.some(module => module.includes('Perplexity'))) {
      this.perplexityAgent = createPerplexityAgent(agent, this.config.systemPrompt)
    }
    
    if (agent.optimalAiModules.some(module => module.includes('AutoGen'))) {
      this.autoGenAgent = createAutoGenAgent(agent, this.config.systemPrompt)
    }
  }

  async processMessage(message: string, context?: string): Promise<AIResponse> {
    const agent = this.config.agent
    
    try {
      // Determine which framework to use based on the request type
      const framework = this.selectFramework(message)
      
      let response: any
      
      switch (framework) {
        case 'langchain':
          if (!this.langchainAgent) throw new Error('LangChain agent not initialized')
          response = await this.langchainAgent.processMessage(message, context)
          break
        
        case 'perplexity':
          if (!this.perplexityAgent) throw new Error('Perplexity agent not initialized')
          response = await this.perplexityAgent.processMessage(message, context)
          break
        
        case 'autogen':
          if (!this.autoGenAgent) throw new Error('AutoGen agent not initialized')
          response = await this.autoGenAgent.processMessage(message, context)
          break
        
        default:
          // Fallback to LangChain
          if (!this.langchainAgent) {
            this.langchainAgent = createLangChainAgent(this.config.agent, this.config.systemPrompt)
          }
          response = await this.langchainAgent.processMessage(message, context)
      }

      return {
        ...response,
        framework: `hybrid-${framework}`
      }
    } catch (error) {
      console.error('Hybrid agent error:', error)

      // Provide more helpful error messages and fallback responses
      let errorMessage = `I encountered an issue while processing your request. Let me try to help you in a different way.`

      if (error instanceof Error) {
        console.error('Detailed error:', error.message, error.stack)

        // Try to provide a helpful response even when there's an error
        if (message.toLowerCase().includes('which') && message.toLowerCase().includes('best')) {
          errorMessage = `I understand you're asking about which option is best. While I'm having some technical difficulties with my analysis systems, I can still provide some general guidance. Could you please rephrase your question or provide more specific details about what you're trying to choose between?`
        } else if (message.toLowerCase().includes('automate')) {
          errorMessage = `I see you're interested in automation. Even though I'm experiencing some technical issues, I can suggest that the best automation approach typically depends on your specific needs, budget, and technical requirements. Would you like to discuss your particular automation goals?`
        }
      }

      return {
        response: errorMessage,
        tokensUsed: 0,
        latency: 0,
        model: 'hybrid-fallback',
        framework: 'hybrid',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private selectFramework(message: string): string {
    const lowerMessage = message.toLowerCase()
    
    // Use Perplexity for research, trends, current events
    if (lowerMessage.includes('research') || 
        lowerMessage.includes('trend') || 
        lowerMessage.includes('current') || 
        lowerMessage.includes('latest') ||
        lowerMessage.includes('news')) {
      return 'perplexity'
    }
    
    // Use AutoGen for complex workflows, automation, multi-step tasks
    if (lowerMessage.includes('workflow') || 
        lowerMessage.includes('automate') || 
        lowerMessage.includes('process') || 
        lowerMessage.includes('coordinate') ||
        lowerMessage.includes('optimize')) {
      return 'autogen'
    }
    
    // Default to LangChain for general tasks
    return 'langchain'
  }

  async handlePresetAction(actionId: string, params: any = {}): Promise<AIResponse> {
    // Route preset actions to appropriate framework
    const framework = this.selectFrameworkForAction(actionId)
    
    switch (framework) {
      case 'perplexity':
        if (!this.perplexityAgent) throw new Error('Perplexity agent not initialized')
        return this.perplexityAgent.handlePresetAction(actionId, params)
      
      case 'autogen':
        if (!this.autoGenAgent) throw new Error('AutoGen agent not initialized')
        return this.autoGenAgent.handlePresetAction(actionId, params)
      
      default:
        if (!this.langchainAgent) {
          this.langchainAgent = createLangChainAgent(this.config.agent, this.config.systemPrompt)
        }
        return this.langchainAgent.handlePresetAction(actionId, params)
    }
  }

  private selectFrameworkForAction(actionId: string): string {
    // Research-related actions use Perplexity
    if (actionId.includes('research') || actionId.includes('trend') || actionId.includes('competitive')) {
      return 'perplexity'
    }
    
    // Workflow-related actions use AutoGen
    if (actionId.includes('workflow') || actionId.includes('automate') || actionId.includes('coordinate')) {
      return 'autogen'
    }
    
    return 'langchain'
  }
}

// Main function to process agent messages
export async function processAgentMessage(
  agent: Agent,
  message: string,
  context?: string,
  systemPrompt?: string
): Promise<AIResponse> {
  // Validate AI configuration
  const configValidation = validateAIConfig(getAIConfig())
  if (!configValidation.isValid) {
    return {
      response: 'AI services are not properly configured. Please check your API keys.',
      tokensUsed: 0,
      latency: 0,
      model: 'none',
      framework: agent.framework,
      success: false,
      error: configValidation.errors.join(', ')
    }
  }

  const factory = AIAgentFactory.getInstance()
  const agentInstance = factory.createAgent({
    agent,
    systemPrompt: systemPrompt || `You are ${agent.name}, a ${agent.title} specialist.`,
    temperature: 0.7,
    maxTokens: 4000
  })

  return agentInstance.processMessage(message, context)
}

// Function to handle preset actions
export async function handleAgentPresetAction(
  agent: Agent,
  actionId: string,
  params: any = {},
  systemPrompt?: string
): Promise<AIResponse> {
  const factory = AIAgentFactory.getInstance()
  const agentInstance = factory.createAgent({
    agent,
    systemPrompt: systemPrompt || `You are ${agent.name}, a ${agent.title} specialist.`,
    temperature: 0.7,
    maxTokens: 4000
  })

  return agentInstance.handlePresetAction(actionId, params)
}

// Export all framework classes and functions
export {
  LangChainAgent,
  PerplexityAgent,
  AutoGenAgent,
  createPerplexityAgent,
  createAutoGenAgent
}
