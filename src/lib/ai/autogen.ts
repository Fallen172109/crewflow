// AutoGen Framework Implementation
// Handles multi-agent workflows and complex task orchestration

import OpenAI from 'openai'
import { getAIConfig, AI_ERROR_CONFIG } from './config'
import type { Agent } from '../agents'

export interface AutoGenResponse {
  response: string
  tokensUsed: number
  latency: number
  model: string
  success: boolean
  error?: string
  agentSteps?: AgentStep[]
}

export interface AgentStep {
  agent: string
  action: string
  result: string
  timestamp: number
}

export interface AutoGenAgentConfig {
  agent: Agent
  systemPrompt: string
  maxRounds?: number
  temperature?: number
  maxTokens?: number
  model?: string
}

// AutoGen Agent Manager
export class AutoGenAgent {
  private config: AutoGenAgentConfig
  private openai: OpenAI
  private agentSteps: AgentStep[] = []

  constructor(config: AutoGenAgentConfig) {
    this.config = config
    this.openai = this.initializeOpenAI()
  }

  private initializeOpenAI(): OpenAI {
    const aiConfig = getAIConfig()

    return new OpenAI({
      apiKey: aiConfig.openai.apiKey
    })
  }

  async processMessage(message: string, context?: string): Promise<AutoGenResponse> {
    const startTime = Date.now()
    this.agentSteps = []
    
    try {
      const response = await this.executeMultiAgentWorkflow(message, context)
      
      return {
        response,
        tokensUsed: this.calculateTokenUsage(),
        latency: Date.now() - startTime,
        model: this.config.model || 'gpt-4-turbo-preview',
        success: true,
        agentSteps: this.agentSteps
      }
    } catch (error) {
      console.error('AutoGen error:', error)
      return {
        response: 'I apologize, but I encountered an error while coordinating the multi-agent workflow. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.config.model || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agentSteps: this.agentSteps
      }
    }
  }

  private async executeMultiAgentWorkflow(message: string, context?: string): Promise<string> {
    const agent = this.config.agent
    const maxRounds = this.config.maxRounds || 3
    
    // Step 1: Planning Agent - Analyze the task and create a plan
    const planningStep = await this.executePlanningAgent(message, context)
    this.addAgentStep('planner', 'analyze_task', planningStep)
    
    // Step 2: Execution Agent - Execute the planned tasks
    const executionStep = await this.executeTaskAgent(message, planningStep, context)
    this.addAgentStep('executor', 'execute_tasks', executionStep)
    
    // Step 3: Review Agent - Review and refine the results
    const reviewStep = await this.executeReviewAgent(message, executionStep, planningStep)
    this.addAgentStep('reviewer', 'review_results', reviewStep)
    
    // Step 4: Coordinator Agent - Synthesize final response
    const finalResponse = await this.executeCoordinatorAgent(message, {
      plan: planningStep,
      execution: executionStep,
      review: reviewStep
    })
    this.addAgentStep('coordinator', 'synthesize_response', finalResponse)
    
    return finalResponse
  }

  private async executePlanningAgent(message: string, context?: string): Promise<string> {
    const agent = this.config.agent
    const prompt = `You are the Planning Agent for ${agent.name}, a ${agent.title} specialist.

Your role: Analyze the user's request and create a detailed execution plan.

Agent capabilities:
- Framework: AutoGen with ${agent.optimalAiModules.join(', ')}
- Specialization: ${agent.category}
- Available integrations: ${agent.integrations.join(', ')}

User request: "${message}"
${context ? `Context: ${context}` : ''}

Create a step-by-step plan to address this request. Consider:
1. What specific tasks need to be completed
2. What data or information is required
3. Which integrations might be needed
4. The optimal sequence of operations

Provide a clear, actionable plan:`

    const response = await this.openai.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 4000
    })
    return response.choices[0]?.message?.content || ''
  }

  private async executeTaskAgent(message: string, plan: string, context?: string): Promise<string> {
    const agent = this.config.agent
    const prompt = `You are the Task Execution Agent for ${agent.name}, a ${agent.title} specialist.

Your role: Execute the planned tasks and provide detailed results.

Original request: "${message}"
Execution plan: ${plan}
${context ? `Context: ${context}` : ''}

System instructions: ${this.config.systemPrompt}

Execute the planned tasks step by step. For each task:
1. Clearly state what you're doing
2. Provide specific, actionable results
3. Note any limitations or assumptions
4. Suggest next steps if applicable

Focus on ${agent.category}-specific expertise and provide practical, implementable solutions:`

    const response = await this.openai.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 4000
    })
    return response.choices[0]?.message?.content || ''
  }

  private async executeReviewAgent(message: string, execution: string, plan: string): Promise<string> {
    const agent = this.config.agent
    const prompt = `You are the Review Agent for ${agent.name}, a ${agent.title} specialist.

Your role: Review the execution results and provide quality assurance.

Original request: "${message}"
Original plan: ${plan}
Execution results: ${execution}

Review the execution against the plan and original request:
1. Are all requirements addressed?
2. Is the quality of work appropriate for a ${agent.title} specialist?
3. Are there any gaps or improvements needed?
4. Is the response practical and actionable?

Provide a quality review with specific feedback and recommendations:`

    const response = await this.openai.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 4000
    })
    return response.choices[0]?.message?.content || ''
  }

  private async executeCoordinatorAgent(message: string, results: any): Promise<string> {
    const agent = this.config.agent
    const prompt = `You are the Coordinator Agent for ${agent.name}, a ${agent.title} specialist.

Your role: Synthesize all agent outputs into a cohesive, professional response.

Original request: "${message}"
Planning results: ${results.plan}
Execution results: ${results.execution}
Review feedback: ${results.review}

Create a final response that:
1. Directly addresses the user's request
2. Incorporates the best insights from all agents
3. Maintains the professional tone of a ${agent.title} specialist
4. Provides clear, actionable recommendations
5. Is concise but comprehensive

Deliver the final response as ${agent.name}:`

    const response = await this.openai.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 4000
    })
    return response.choices[0]?.message?.content || ''
  }

  private addAgentStep(agent: string, action: string, result: string): void {
    this.agentSteps.push({
      agent,
      action,
      result,
      timestamp: Date.now()
    })
  }

  private calculateTokenUsage(): number {
    // Estimate token usage based on agent steps
    return this.agentSteps.reduce((total, step) => {
      return total + Math.ceil(step.result.length / 4) // Rough token estimation
    }, 0)
  }

  // Preset action handlers for AutoGen agents
  async handlePresetAction(actionId: string, params: any = {}): Promise<AutoGenResponse> {
    const agent = this.config.agent
    
    switch (actionId) {
      case 'create_workflow':
        return this.createWorkflow(params.description, params.requirements)
      
      case 'optimize_process':
        return this.optimizeProcess(params.process, params.goals)
      
      case 'coordinate_tasks':
        return this.coordinateTasks(params.tasks, params.dependencies)
      
      default:
        return this.processMessage(`Execute preset action: ${actionId}`, JSON.stringify(params))
    }
  }

  private async createWorkflow(description: string, requirements: any[]): Promise<AutoGenResponse> {
    const message = `Create an automated workflow for: ${description}. Requirements: ${JSON.stringify(requirements)}`
    return this.processMessage(message)
  }

  private async optimizeProcess(process: string, goals: string[]): Promise<AutoGenResponse> {
    const message = `Optimize this business process: ${process}. Goals: ${goals.join(', ')}`
    return this.processMessage(message)
  }

  private async coordinateTasks(tasks: any[], dependencies: any[]): Promise<AutoGenResponse> {
    const message = `Coordinate these tasks: ${JSON.stringify(tasks)}. Dependencies: ${JSON.stringify(dependencies)}`
    return this.processMessage(message)
  }
}

// Factory function to create AutoGen agents
export function createAutoGenAgent(agent: Agent, systemPrompt: string): AutoGenAgent {
  return new AutoGenAgent({
    agent,
    systemPrompt,
    maxRounds: 3,
    temperature: 0.7,
    maxTokens: 4000
  })
}

// Utility function to validate AutoGen configuration
export function validateAutoGenConfig(): { isValid: boolean; error?: string } {
  const aiConfig = getAIConfig()
  
  if (!aiConfig.openai.apiKey) {
    return { isValid: false, error: 'OpenAI API key is required for AutoGen' }
  }
  
  return { isValid: true }
}
