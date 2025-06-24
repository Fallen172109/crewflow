// Complete LangChain Framework Implementation
import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ConversationChain } from 'langchain/chains'
import { BufferMemory } from 'langchain/memory'
import { PromptTemplate } from '@langchain/core/prompts'
import { getAIConfig, AI_ERROR_CONFIG } from './config'
import type { Agent } from '../agents'

export interface LangChainResponse {
  response: string
  tokensUsed: number
  latency: number
  model: string
  success: boolean
  error?: string
}

export interface LangChainAgentConfig {
  agent: Agent
  systemPrompt: string
  memory?: BufferMemory
  temperature?: number
  maxTokens?: number
  model?: string
}

// LangChain Agent Manager
export class LangChainAgent {
  private config: LangChainAgentConfig
  private llm: ChatOpenAI | ChatAnthropic
  private memory: BufferMemory
  private chain: ConversationChain

  constructor(config: LangChainAgentConfig) {
    this.config = config
    this.memory = config.memory || new BufferMemory()
    this.llm = this.initializeLLM()
    this.chain = this.initializeChain()
  }

  private initializeLLM(): ChatOpenAI | ChatAnthropic {
    const aiConfig = getAIConfig()

    // Use Anthropic for agents that benefit from Claude's capabilities
    if (this.config.agent.optimalAiModules.some(module =>
      module.includes('Claude') || module.includes('Anthropic')
    )) {
      return new ChatAnthropic({
        apiKey: aiConfig.anthropic.apiKey,
        model: this.config.model || aiConfig.anthropic.model,
        maxTokens: this.config.maxTokens || aiConfig.anthropic.maxTokens,
        temperature: this.config.temperature || aiConfig.langchain.temperature
      })
    }

    // Default to OpenAI
    return new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: this.config.model || aiConfig.openai.model,
      maxTokens: this.config.maxTokens || aiConfig.openai.maxTokens,
      temperature: this.config.temperature || aiConfig.openai.temperature
    })
  }

  private initializeChain(): ConversationChain {
    const prompt = PromptTemplate.fromTemplate(`
You are {agent_name}, a {agent_title} specialist in the CrewFlow maritime AI automation platform.

{agent_description}

Your role and capabilities:
- Framework: LangChain with {optimal_modules}
- Specialization: {agent_category}
- Available integrations: {integrations}

System Instructions:
{system_prompt}

Current conversation:
{history}
Human: {input}
Assistant:`)

    return new ConversationChain({
      llm: this.llm,
      memory: this.memory,
      prompt: prompt,
      verbose: false
    })
  }

  // Process user input and generate response
  async processInput(input: string, context?: Record<string, any>): Promise<LangChainResponse> {
    const startTime = Date.now()

    try {
      const templateVars = {
        agent_name: this.config.agent.name,
        agent_title: this.config.agent.title,
        agent_description: this.config.agent.description,
        agent_category: this.config.agent.category,
        optimal_modules: this.config.agent.optimalAiModules.join(', '),
        integrations: this.config.agent.integrations.join(', '),
        system_prompt: this.config.systemPrompt,
        input: input,
        ...context
      }

      const response = await this.chain.invoke(templateVars)
      const latency = Date.now() - startTime

      return {
        response: response.response,
        tokensUsed: this.estimateTokens(input + response.response),
        latency,
        model: this.llm.modelName || 'unknown',
        success: true
      }
    } catch (error) {
      console.error('LangChain processing error:', error)

      return {
        response: AI_ERROR_CONFIG.fallbackResponse,
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.modelName || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Estimate token usage (rough approximation)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  // Clear conversation memory
  clearMemory(): void {
    this.memory.clear()
  }

  // Get conversation history
  async getHistory(): Promise<string> {
    const history = await this.memory.chatHistory.getMessages()
    return history.map(msg => `${msg._getType()}: ${msg.content}`).join('\n')
  }
}

// Factory function to create LangChain agents
export function createLangChainAgent(config: LangChainAgentConfig): LangChainAgent {
  return new LangChainAgent(config)
}
