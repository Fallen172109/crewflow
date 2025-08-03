// Perplexity AI Framework Implementation
// Handles all Perplexity AI-based agents with real-time web research capabilities

import axios from 'axios'
import { getAIConfig, AI_ERROR_CONFIG } from './config'
import { createImageGenerationService, type ImageGenerationRequest } from './image-generation'
import { withAICache } from './response-cache'
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
  userId?: string
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

      // Use AI caching for Perplexity responses
      const cachedResponse = await withAICache(
        {
          message: message,
          agent: this.config.agent,
          systemPrompt: systemPrompt,
          modelConfig: {
            model: this.config.model,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens
          },
          userContext: {
            userId: this.config.userId,
            context: context
          }
        },
        async () => {
          console.log('🔄 PERPLEXITY: Cache miss, calling API')
          const response = await this.callPerplexityAPI(message, systemPrompt, context)

          return {
            response: response.choices[0].message.content,
            tokensUsed: response.usage?.total_tokens || 0,
            latency: Date.now() - startTime,
            model: response.model,
            success: true,
            sources: this.extractSources(response),
            framework: 'perplexity'
          }
        },
        {
          // Perplexity responses are often time-sensitive due to real-time web data
          queryType: 'time_sensitive'
        }
      )

      console.log('✅ PERPLEXITY: Response ready', {
        cached: cachedResponse.cachedAt ? true : false,
        tokensUsed: cachedResponse.tokensUsed,
        sources: cachedResponse.sources?.length || 0
      })

      return cachedResponse
    } catch (error) {
      console.error('Perplexity AI error:', error)

      // Provide more specific error messages based on error type
      let errorMessage = 'I encountered an issue while processing your request.'

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'The request timed out. Please try again with a shorter message.'
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage = 'There was an authentication issue. Please contact support.'
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'I\'m receiving too many requests right now. Please wait a moment and try again.'
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
          errorMessage = 'I\'m having trouble connecting to my knowledge base. Please check your internet connection and try again.'
        }
      }

      return {
        response: errorMessage,
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

Communication Style:
- Communicate in a direct, professional manner without emojis, excessive formatting, or conversational flourishes
- Provide concise, well-reasoned responses that demonstrate clear understanding of the user's request
- Get straight to the point without unnecessary introductions or conclusions
- Focus solely on what the user asked for without suggesting additional work
- Use clear, technical language appropriate for a development context
- Ask specific clarifying questions only when essential information is missing
- Avoid redundant explanations or overly detailed background information

Key Guidelines:
- Always provide accurate, up-to-date information using real-time web search
- Cite sources when providing factual information
- Focus on ${agent.category}-specific expertise
- Maintain a professional, helpful tone with maritime theming
- If you need to search for current information, do so automatically
- Use maritime terminology naturally (navigate, chart course, anchor, set sail, etc.)

Response Formatting Instructions:
- Structure responses with clear sections, bullet points, and numbered lists
- Use proper spacing between paragraphs and sections
- Break up long text blocks for better readability
- Use markdown formatting for emphasis and structure
- Always reference attached files when relevant to the conversation

Maritime Communication Protocol:
- ONLY use full maritime greetings (e.g., "⚓ Ahoy! I'm ${agent.name}...") for the very first interaction in a new conversation thread
- For all subsequent messages: Skip introductions entirely and go straight to addressing the user's request
- Use maritime terminology naturally throughout responses (navigate, chart course, anchor, set sail, etc.)
- Maintain professional maritime personality without repetitive greetings
- Focus on being helpful and direct rather than ceremonial`
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
    if (actionId === 'visual_content_creator' || actionId === 'seo_visual_content') {
      return this.handleImageGeneration(params, actionId)
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

  private async handleImageGeneration(params: any, actionId?: string): Promise<PerplexityResponse> {
    const startTime = Date.now()

    try {
      const imageService = createImageGenerationService()

      // Extract parameters from the request
      let enhancedPrompt = params.prompt || params.description || 'A professional SEO-optimized image'

      // Enhance prompt with comprehensive SEO and business context
      if (actionId === 'seo_visual_content') {
        const keywordContext = params.target_keywords ?
          `Target keywords: ${params.target_keywords}` : ''
        const topicContext = params.content_topic ?
          `Content topic: ${params.content_topic}` : ''
        const audienceContext = params.target_audience ?
          `Target audience: ${params.target_audience}` : ''

        // Add SEO-specific visual optimization
        const seoOptimization = getSEOVisualOptimization(params.content_topic, params.target_keywords)

        enhancedPrompt = `${enhancedPrompt}. ${topicContext} ${keywordContext} ${audienceContext}. ${seoOptimization} Professional, SEO-friendly, content marketing optimized, high search visibility potential.`
      }

      const imageRequest: ImageGenerationRequest = {
        prompt: enhancedPrompt,
        style: params.style,
        aspectRatio: params.aspect_ratio || params.aspectRatio,
        quality: params.quality === 'high' ? 'hd' : 'standard',
        userId: this.config.userId
      }

      console.log('Pearl generating image with request:', imageRequest)
      const imageResult = await imageService.generateImage(imageRequest)

      if (imageResult.success && imageResult.imageUrl) {
        const isSeoPurpose = actionId === 'seo_visual_content'
        const titlePrefix = isSeoPurpose ? 'SEO-Optimized' : 'Content'

        let response = `🎨 **${titlePrefix} Image Generated Successfully!**

![${imageResult.metadata?.originalPrompt || 'Generated Image'}](${imageResult.imageUrl})

**Image Details:**
- **Original Prompt:** ${imageResult.metadata?.originalPrompt}
- **Enhanced Prompt:** ${imageResult.metadata?.enhancedPrompt}
- **Style:** ${imageResult.metadata?.style}
- **Aspect Ratio:** ${imageResult.metadata?.aspectRatio}
${imageResult.revisedPrompt ? `- **DALL-E Revised Prompt:** ${imageResult.revisedPrompt}` : ''}

**Maritime Mission Complete!** Your ${isSeoPurpose ? 'SEO-optimized' : 'content'} image has been generated and is ready for use.`

        if (isSeoPurpose) {
          const suggestedAltText = `${params.content_topic || 'Professional'} ${params.target_keywords || 'content'} image`
          const suggestedFilename = params.target_keywords ?
            params.target_keywords.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-image.jpg' :
            'seo-optimized-image.jpg'

          response += `

**SEO Optimization Package:**
- **Suggested Alt Text:** "${suggestedAltText}"
- **Suggested Filename:** "${suggestedFilename}"
- **Target Keywords:** ${params.target_keywords || 'Not specified'}
- **Content Topic:** ${params.content_topic || 'General'}
- **Target Audience:** ${params.target_audience || 'General audience'}

**SEO Best Practices:**
- Use the suggested alt text for accessibility and SEO
- Rename the file with the suggested filename before uploading
- Compress the image for web performance (aim for <100KB)
- Use in relevant content context for maximum SEO value
- Consider adding structured data markup if appropriate`
        }

        response += `

The image has been generated using OpenAI's DALL-E 3 model and is optimized for ${isSeoPurpose ? 'SEO and content marketing' : 'general content'} purposes.`

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
export function createPerplexityAgent(agent: Agent, systemPrompt: string, userId?: string): PerplexityAgent {
  return new PerplexityAgent({
    agent,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 4000,
    userId
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

// Helper function for SEO visual optimization
function getSEOVisualOptimization(topic?: string, keywords?: string): string {
  const baseOptimization = 'Use clear, descriptive visual elements that support content comprehension.'

  if (!topic && !keywords) return baseOptimization

  const topicOptimizations: Record<string, string> = {
    'technology': 'Include modern, clean tech elements. Use blue and white color schemes.',
    'business': 'Professional corporate aesthetic. Use charts, graphs, or business imagery.',
    'health': 'Clean, medical-inspired visuals. Use green and blue tones for trust.',
    'education': 'Academic, learning-focused elements. Use warm, approachable colors.',
    'finance': 'Professional, trustworthy design. Use blue, green, and gold accents.',
    'lifestyle': 'Aspirational, relatable imagery. Use warm, inviting color palettes.',
    'travel': 'Destination-focused, adventure elements. Use vibrant, inspiring colors.',
    'food': 'Appetizing, fresh imagery. Use natural, warm color tones.'
  }

  // Find matching topic optimization
  const topicKey = Object.keys(topicOptimizations).find(key =>
    topic?.toLowerCase().includes(key) || keywords?.toLowerCase().includes(key)
  )

  const specificOptimization = topicKey ? topicOptimizations[topicKey] : baseOptimization

  return `${specificOptimization} Ensure visual elements support the content narrative and improve user engagement.`
}
