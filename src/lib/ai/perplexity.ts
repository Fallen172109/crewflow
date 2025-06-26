// Perplexity AI Framework Implementation
// Handles all Perplexity AI-based agents with real-time web research capabilities

import axios from 'axios'
import { getAIConfig, AI_ERROR_CONFIG } from './config'
import { createImageGenerationService, type ImageGenerationRequest } from './image-generation'
import type { Agent } from '../agents'

export interface PerplexityResponse {
  response: string
  tokensUsed: number
  latency: number
  model: string
  success: boolean
  error?: string
  sources?: string[]
}

export interface PerplexityAgentConfig {
  agent: Agent
  systemPrompt: string
  temperature?: number
  maxTokens?: number
  model?: string
  searchDomainFilter?: string[]
}

// Perplexity AI Agent Manager
export class PerplexityAgent {
  private config: PerplexityAgentConfig
  private apiKey: string
  private baseURL: string = 'https://api.perplexity.ai'

  constructor(config: PerplexityAgentConfig) {
    this.config = config
    const aiConfig = getAIConfig()
    this.apiKey = aiConfig.perplexity.apiKey
  }

  async processMessage(message: string, context?: string): Promise<PerplexityResponse> {
    const startTime = Date.now()
    
    try {
      const systemPrompt = this.buildSystemPrompt()
      const response = await this.callPerplexityAPI(message, systemPrompt, context)
      
      return {
        response: response.choices[0].message.content,
        tokensUsed: response.usage?.total_tokens || 0,
        latency: Date.now() - startTime,
        model: response.model,
        success: true,
        sources: this.extractSources(response),
        apiResponse: response // Include the full API response for real usage tracking
      }
    } catch (error) {
      console.error('Perplexity AI error:', error)
      return {
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.config.model || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private buildSystemPrompt(): string {
    const agent = this.config.agent
    return `You are ${agent.name}, a ${agent.title} specialist in the CrewFlow maritime AI automation platform.

${agent.description}

Your role and capabilities:
- Framework: Perplexity AI with ${agent.optimalAiModules.join(', ')}
- Specialization: ${agent.category}
- Available integrations: ${agent.integrations.join(', ')}
- Real-time web access for current information and research

System Instructions:
${this.config.systemPrompt}

Key Guidelines:
- Always provide accurate, up-to-date information using real-time web search
- Cite sources when providing factual information
- Focus on ${agent.category}-specific expertise
- Maintain a professional, helpful tone
- If you need to search for current information, do so automatically`
  }

  private async callPerplexityAPI(message: string, systemPrompt: string, context?: string) {
    const aiConfig = getAIConfig()
    
    const payload = {
      model: this.config.model || aiConfig.perplexity.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...(context ? [{
          role: 'assistant',
          content: `Previous context: ${context}`
        }] : []),
        {
          role: 'user',
          content: message
        }
      ],
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || aiConfig.perplexity.maxTokens,
      stream: false
    }

    const response = await axios.post(`${this.baseURL}/chat/completions`, payload, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: AI_ERROR_CONFIG.timeoutMs
    })

    return response.data
  }

  private extractSources(response: any): string[] {
    // Extract sources from Perplexity response if available
    if (response.choices?.[0]?.message?.sources) {
      return response.choices[0].message.sources
    }
    return []
  }

  // Preset action handlers for Perplexity agents
  async handlePresetAction(actionId: string, params: any = {}): Promise<PerplexityResponse> {
    const agent = this.config.agent

    // Handle image generation separately
    if (actionId === 'visual_content_creator') {
      return this.handleImageGeneration(params)
    }

    switch (actionId) {
      case 'research_trends':
        return this.researchTrends(params.topic || agent.category)

      case 'fact_check':
        return this.factCheck(params.claim)

      case 'competitive_analysis':
        return this.competitiveAnalysis(params.company, params.industry)

      case 'market_research':
        return this.marketResearch(params.market, params.timeframe)

      default:
        return this.processMessage(`Execute preset action: ${actionId}`, JSON.stringify(params))
    }
  }

  private async researchTrends(topic: string): Promise<PerplexityResponse> {
    const message = `Research the latest trends in ${topic}. Provide current insights, emerging patterns, and recent developments. Include specific examples and data where available.`
    return this.processMessage(message)
  }

  private async factCheck(claim: string): Promise<PerplexityResponse> {
    const message = `Fact-check this claim: "${claim}". Provide accurate information with reliable sources to verify or refute the claim.`
    return this.processMessage(message)
  }

  private async competitiveAnalysis(company: string, industry: string): Promise<PerplexityResponse> {
    const message = `Analyze the competitive landscape for ${company} in the ${industry} industry. Include key competitors, market positioning, recent developments, and strategic insights.`
    return this.processMessage(message)
  }

  private async marketResearch(market: string, timeframe: string = 'current'): Promise<PerplexityResponse> {
    const message = `Conduct market research on ${market} for the ${timeframe} period. Include market size, growth trends, key players, opportunities, and challenges.`
    return this.processMessage(message)
  }

  private async handleImageGeneration(params: any): Promise<PerplexityResponse> {
    const startTime = Date.now()

    try {
      const imageService = createImageGenerationService()

      // Extract parameters from the request
      const imageRequest: ImageGenerationRequest = {
        prompt: params.prompt || params.description || 'A professional SEO-optimized image',
        style: params.style,
        aspectRatio: params.aspect_ratio || params.aspectRatio,
        quality: params.quality === 'high' ? 'hd' : 'standard'
      }

      console.log('Pearl generating image with request:', imageRequest)
      const imageResult = await imageService.generateImage(imageRequest)

      if (imageResult.success && imageResult.imageUrl) {
        const response = `🎨 **SEO-Optimized Image Generated Successfully!**

**Original Prompt:** ${imageResult.metadata?.originalPrompt}
**Enhanced Prompt:** ${imageResult.metadata?.enhancedPrompt}
**Style:** ${imageResult.metadata?.style}
**Aspect Ratio:** ${imageResult.metadata?.aspectRatio}

**Image URL:** ${imageResult.imageUrl}

${imageResult.revisedPrompt ? `**DALL-E Revised Prompt:** ${imageResult.revisedPrompt}` : ''}

**SEO Recommendations for this image:**
- Use descriptive alt text based on the image content
- Optimize file name with relevant keywords
- Consider image compression for web performance
- Add structured data markup if appropriate
- Use in relevant content context for better SEO value

The image has been generated using OpenAI's DALL-E 3 model and is optimized for content marketing and SEO purposes.`

        return {
          response,
          tokensUsed: imageResult.tokensUsed,
          latency: Date.now() - startTime,
          model: imageResult.model,
          success: true,
          sources: [`Generated using OpenAI DALL-E 3`],
          metadata: {
            imageGeneration: true,
            imageUrl: imageResult.imageUrl,
            originalPrompt: imageResult.metadata?.originalPrompt,
            enhancedPrompt: imageResult.metadata?.enhancedPrompt,
            revisedPrompt: imageResult.revisedPrompt
          }
        }
      } else {
        return {
          response: `I apologize, but I encountered an error while generating the SEO-optimized image: ${imageResult.error || 'Unknown error'}. Please try again with a different prompt or contact support if the issue persists.`,
          tokensUsed: 0,
          latency: Date.now() - startTime,
          model: 'dall-e-3',
          success: false,
          error: imageResult.error,
          sources: []
        }
      }
    } catch (error) {
      console.error('Pearl image generation error:', error)
      return {
        response: 'I apologize, but I encountered an error while generating the image. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: 'dall-e-3',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sources: []
      }
    }
  }
}

// Factory function to create Perplexity agents
export function createPerplexityAgent(agent: Agent, systemPrompt: string): PerplexityAgent {
  return new PerplexityAgent({
    agent,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 4000
  })
}

// Utility function to validate Perplexity configuration
export function validatePerplexityConfig(): { isValid: boolean; error?: string } {
  const aiConfig = getAIConfig()
  
  if (!aiConfig.perplexity.apiKey) {
    return { isValid: false, error: 'Perplexity API key is required' }
  }
  
  return { isValid: true }
}
