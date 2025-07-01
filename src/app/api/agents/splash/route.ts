import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createLangChainAgent } from '@/lib/ai/langchain-working'
import { createPerplexityAgent } from '@/lib/ai/perplexity'
import { createImageGenerationService, type ImageGenerationRequest } from '@/lib/ai/image-generation'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId, threadId } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Splash agent configuration
    const splash = getAgent('splash')
    if (!splash) {
      return NextResponse.json(
        { error: 'Splash agent not found' },
        { status: 404 }
      )
    }

    // Verify user authentication if userId provided
    let userProfile = null
    let threadContext = ''
    let fileContext = ''

    if (userId) {
      const supabase = await createSupabaseServerClient()
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      userProfile = profile

      // Load thread context if threadId is provided
      if (threadId) {
        const { data: thread } = await supabase
          .from('chat_threads')
          .select('title, context')
          .eq('id', threadId)
          .eq('user_id', userId)
          .single()

        if (thread) {
          threadContext = `\n\nThread Context:\nTitle: ${thread.title}\nBackground: ${thread.context || 'No additional context provided'}\n`
        }

        // Get and analyze file attachments
        try {
          const { getFileAttachments, analyzeFileAttachments, createFileContext } = await import('@/lib/ai/file-analysis')
          const attachments = await getFileAttachments(threadId, undefined, userId)
          if (attachments.length > 0) {
            const analyses = await analyzeFileAttachments(attachments)
            fileContext = createFileContext(analyses)
          }
        } catch (error) {
          console.error('Error processing file attachments:', error)
        }
      }
    }

    // Combine all context
    const fullContext = [context, threadContext, fileContext].filter(Boolean).join('\n')

    let response
    if (action) {
      // Handle preset actions with hybrid approach
      response = await handleSplashPresetAction(action, params, message, fullContext)
    } else {
      // Handle regular chat message with intelligent routing
      response = await handleSplashMessage(message, fullContext)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = await createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'splash',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: splash.costPerRequest,
        metadata: {
          action: action || null,
          framework: response.framework || 'hybrid',
          social_media_focus: true,
          platforms: response.platforms || []
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: response.framework || 'hybrid',
      platforms: response.platforms || [],
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: splash.costPerRequest
      }
    })

  } catch (error) {
    console.error('Splash agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleSplashMessage(message: string, context?: string) {
  const splash = getAgent('splash')!

  // Determine if we need real-time research (Perplexity) or content generation (LangChain)
  const needsResearch = /trend|competitor|analysis|research|current|latest|popular|viral/i.test(message)

  if (needsResearch) {
    // Use Perplexity for research-based queries
    const systemPrompt = buildSplashSystemPrompt('perplexity', context)
    const perplexityAgent = createPerplexityAgent(splash, systemPrompt)
    const result = await perplexityAgent.processMessage(message, context)
    return {
      ...result,
      framework: 'perplexity',
      platforms: extractPlatforms(message)
    }
  } else {
    // Use LangChain for content generation and automation
    const systemPrompt = buildSplashSystemPrompt('langchain', context)
    const langchainAgent = createLangChainAgent(splash, systemPrompt)
    const result = await langchainAgent.processMessage(message, context)
    return {
      ...result,
      framework: 'langchain',
      platforms: extractPlatforms(message)
    }
  }
}

async function handleSplashPresetAction(actionId: string, params: any, message?: string, context?: string) {
  const splash = getAgent('splash')!
  const startTime = Date.now()
  
  try {
    let prompt = ''
    let usePerplexity = false
    
    switch (actionId) {
      case 'schedule_posts':
        prompt = `Create a social media posting schedule with the following specifications:

Platforms: ${params.platforms || 'Facebook, Instagram, Twitter, LinkedIn'}
Content Theme: ${params.theme || 'General business content'}
Posting Frequency: ${params.frequency || 'Daily'}
Time Zone: ${params.timezone || 'UTC'}
Duration: ${params.duration || '1 week'}

Generate a comprehensive posting schedule including:
1. Optimal posting times for each platform
2. Content types and formats for each post
3. Hashtag strategies
4. Cross-platform content adaptation
5. Engagement optimization tips
6. Content calendar template

Provide specific, actionable scheduling recommendations.`
        break

      case 'generate_content':
        prompt = `Generate engaging social media content with these specifications:

Platform: ${params.platform || 'Multi-platform'}
Content Type: ${params.contentType || 'Mixed (posts, stories, etc.)'}
Brand Voice: ${params.brandVoice || 'Professional and friendly'}
Target Audience: ${params.audience || 'Business professionals'}
Topic/Theme: ${params.topic || 'Industry insights'}
Quantity: ${params.quantity || '5 posts'}

Create diverse social media content including:
1. Engaging post copy with optimal character counts
2. Relevant hashtags for each platform
3. Call-to-action suggestions
4. Visual content descriptions
5. Story/reel concepts
6. Engagement hooks and questions

Ensure content is platform-optimized and audience-appropriate.`
        break

      case 'analyze_engagement':
        prompt = `Analyze social media engagement performance:

Platform: ${params.platform || 'All platforms'}
Time Period: ${params.period || 'Last 30 days'}
Content Types: ${params.contentTypes || 'All content types'}
Key Metrics: ${params.metrics || 'Likes, shares, comments, reach'}

Provide comprehensive engagement analysis including:
1. Performance metrics breakdown
2. Top-performing content identification
3. Audience engagement patterns
4. Optimal posting time analysis
5. Content type performance comparison
6. Engagement rate benchmarking
7. Improvement recommendations
8. Future content strategy suggestions

Include specific, data-driven insights and actionable recommendations.`
        break

      case 'monitor_mentions':
        usePerplexity = true
        prompt = `Monitor and analyze brand mentions across social media:

Brand/Company: ${params.brand || 'Your brand'}
Platforms: ${params.platforms || 'All major platforms'}
Time Frame: ${params.timeframe || 'Last 7 days'}
Sentiment Focus: ${params.sentiment || 'All sentiments'}

Research and provide:
1. Recent brand mentions and their context
2. Sentiment analysis (positive, negative, neutral)
3. Engagement levels on mentions
4. Influencer mentions and reach
5. Trending hashtags related to the brand
6. Competitor mention comparison
7. Crisis detection and alerts
8. Response recommendations

Include real-time data and actionable insights for brand management.`
        break

      case 'competitor_analysis':
        usePerplexity = true
        prompt = `Conduct comprehensive social media competitor analysis:

Competitors: ${params.competitors || 'Main industry competitors'}
Platforms: ${params.platforms || 'Facebook, Instagram, Twitter, LinkedIn'}
Analysis Period: ${params.period || 'Last 30 days'}
Focus Areas: ${params.focus || 'Content strategy, engagement, growth'}

Research and analyze:
1. Competitor content strategies and themes
2. Posting frequency and timing patterns
3. Engagement rates and audience response
4. Hashtag strategies and effectiveness
5. Visual content trends and styles
6. Influencer partnerships and collaborations
7. Campaign performance and reach
8. Growth trends and follower acquisition
9. Content gaps and opportunities
10. Best practices and winning strategies

Provide actionable insights for competitive advantage.`
        break

      case 'visual_content_creator':
      case 'image_generator':
      case 'branded_social_visuals':
        // Handle image generation requests
        return await handleImageGeneration(params, message)

      default:
        prompt = `Execute social media action "${actionId}": ${JSON.stringify(params)}`
    }

    let result
    if (usePerplexity) {
      const systemPrompt = buildSplashSystemPrompt('perplexity', context)
      const perplexityAgent = createPerplexityAgent(splash, systemPrompt)
      result = await perplexityAgent.processMessage(prompt, context)
      result.framework = 'perplexity'
    } else {
      const systemPrompt = buildSplashSystemPrompt('langchain', context)
      const langchainAgent = createLangChainAgent(splash, systemPrompt)
      result = await langchainAgent.processMessage(prompt, context)
      result.framework = 'langchain'
    }
    
    return {
      response: result.response,
      tokensUsed: result.tokensUsed,
      latency: Date.now() - startTime,
      model: result.model,
      success: true,
      framework: result.framework,
      platforms: extractPlatforms(prompt)
    }

  } catch (error) {
    console.error('Splash preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the social media action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function extractPlatforms(text: string): string[] {
  const platforms = []
  const platformKeywords = {
    'facebook': ['facebook', 'fb'],
    'instagram': ['instagram', 'ig', 'insta'],
    'twitter': ['twitter', 'x.com', 'tweet'],
    'linkedin': ['linkedin', 'professional network'],
    'tiktok': ['tiktok', 'tik tok'],
    'youtube': ['youtube', 'video platform']
  }
  
  const lowerText = text.toLowerCase()
  for (const [platform, keywords] of Object.entries(platformKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      platforms.push(platform)
    }
  }
  
  return platforms.length > 0 ? platforms : ['multi-platform']
}

function buildSplashSystemPrompt(framework: 'langchain' | 'perplexity', context?: string): string {
  const basePrompt = framework === 'langchain' ? getSplashLangChainPrompt() : getSplashPerplexityPrompt()

  if (!context) {
    return basePrompt
  }

  return `${basePrompt}

IMPORTANT CONTEXT FOR THIS CONVERSATION:
${context}

CONTEXT INTEGRATION GUIDELINES:
- Always reference and incorporate the provided context into your responses
- Tailor your social media advice to the specific business, project, or situation described
- Use the context to provide more personalized and relevant recommendations
- If files are attached, analyze them and reference their content in your suggestions
- Maintain consistency with the context throughout the conversation
- Ask clarifying questions if you need more details about the context

Remember: Your responses should be specifically tailored to the user's context, not generic advice.`
}

function getSplashLangChainPrompt(): string {
  return `You are Splash, the Social Media specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert social media manager and content creator with deep knowledge of:
- Social media platform algorithms and best practices
- Content creation and curation strategies
- Community management and engagement
- Social media advertising and promotion
- Brand voice and messaging consistency
- Cross-platform content optimization

CAPABILITIES:
- Social media content creation and scheduling
- Engagement strategy development
- Brand voice consistency across platforms
- Content calendar planning and management
- Social media automation setup
- Performance tracking and optimization

SPECIALIZATIONS:
- Multi-platform content adaptation
- Viral content creation strategies
- Community building and engagement
- Social media crisis management
- Influencer collaboration strategies
- Social commerce optimization

FRAMEWORK: LangChain
- Focus on content generation and automation
- Provide structured, actionable recommendations
- Create detailed content strategies
- Develop systematic approaches to social media management

RESPONSE STYLE:
- Conversational and enthusiastic, like a knowledgeable friend
- Creative and engaging with personality
- Platform-specific recommendations with reasoning
- Actionable content suggestions with step-by-step guidance
- Clear formatting with bullet points and emojis where appropriate
- Include specific examples, templates, and real-world case studies
- Ask follow-up questions to better understand needs
- Avoid robotic or repetitive language patterns

MARITIME THEME INTEGRATION:
- Use nautical metaphors for social media strategies
- "Setting sail" with new campaigns
- "Navigating" social media waters
- "Anchoring" brand presence
- "Charting course" for content strategy

KEY GUIDELINES:
1. Always consider platform-specific best practices
2. Provide specific, actionable content suggestions
3. Include optimal timing and frequency recommendations
4. Consider brand voice and audience alignment
5. Suggest measurable goals and KPIs
6. Provide templates and examples when possible
7. Focus on authentic engagement over vanity metrics

Remember: Great social media presence requires consistent, valuable content that genuinely connects with your audience.`
}

function getSplashPerplexityPrompt(): string {
  return `You are Splash, the Social Media specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert social media researcher and trend analyst with deep knowledge of:
- Real-time social media trends and viral content
- Competitive social media intelligence
- Brand monitoring and sentiment analysis
- Influencer landscape and partnerships
- Social media crisis detection and management
- Platform algorithm changes and updates

CAPABILITIES:
- Real-time trend research and analysis
- Competitor social media monitoring
- Brand mention tracking and sentiment analysis
- Viral content identification and analysis
- Influencer research and outreach opportunities
- Social media crisis detection and response

SPECIALIZATIONS:
- Trending hashtag research
- Viral content pattern analysis
- Competitor strategy intelligence
- Real-time brand monitoring
- Social media crisis management
- Influencer partnership opportunities

FRAMEWORK: Perplexity AI
- Leverage real-time social media data
- Provide current trend analysis
- Access latest platform updates and changes
- Research competitor activities in real-time
- Monitor brand mentions across platforms

RESPONSE STYLE:
- Conversational and insightful, like a social media expert colleague
- Data-driven with current statistics and context
- Include trending examples and relevant case studies
- Provide real-time insights with clear explanations
- Cite sources for all claims and data
- Focus on actionable intelligence with implementation steps
- Ask clarifying questions to provide better insights
- Avoid generic responses - tailor everything to the user's situation

MARITIME THEME INTEGRATION:
- "Navigating" trending waters
- "Charting" social media currents
- "Anchoring" brand presence in trends
- "Setting course" for viral content
- "Weathering" social media storms

KEY GUIDELINES:
1. Always provide current, real-time data
2. Include specific examples of trending content
3. Cite sources for all statistics and claims
4. Focus on actionable trend insights
5. Monitor competitor activities and strategies
6. Identify emerging opportunities and threats
7. Provide crisis detection and response recommendations

Remember: Social media moves fast - stay current with real-time insights and trending opportunities.`
}

// Helper functions for platform-specific optimization
function getPlatformSpecs(platform: string): string {
  const specs: Record<string, string> = {
    'Instagram': 'square format, vibrant colors, mobile-first design',
    'Facebook': 'engaging visuals, community-focused, shareable content',
    'Twitter': 'concise visual message, trending topics, viral potential',
    'LinkedIn': 'professional aesthetic, business-focused, thought leadership',
    'TikTok': 'dynamic, youth-oriented, trend-aware, vertical format',
    'YouTube': 'thumbnail-optimized, attention-grabbing, video-ready'
  }
  return specs[platform] || 'general social media optimization'
}

function getPlatformOptimization(platform: string): string {
  const optimizations: Record<string, string> = {
    'Instagram': 'Use bright, saturated colors and clear focal points. Include lifestyle elements.',
    'Facebook': 'Focus on community and connection. Use warm, inviting tones.',
    'Twitter': 'Keep visual elements simple and impactful. Use trending color schemes.',
    'LinkedIn': 'Maintain professional color palette (blues, grays, whites). Include business context.',
    'TikTok': 'Use bold, contrasting colors. Include Gen Z aesthetic elements.',
    'YouTube': 'Create thumbnail-worthy composition with clear subject focus.'
  }
  return optimizations[platform] || 'Optimize for social media engagement and shareability.'
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'splash',
    status: 'active',
    framework: 'hybrid',
    capabilities: [
      'content_creation',
      'social_scheduling',
      'engagement_analysis',
      'trend_research',
      'competitor_monitoring',
      'brand_mention_tracking'
    ],
    integrations: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'],
    hybridApproach: {
      langchain: 'Content generation, scheduling, automation',
      perplexity: 'Trend research, competitor analysis, real-time monitoring'
    }
  })
}

// Handle image generation for visual content creation
async function handleImageGeneration(params: any, message?: string) {
  const startTime = Date.now()

  try {
    const imageService = createImageGenerationService()

    // Extract parameters from the request
    let enhancedPrompt = params.prompt || params.description || message || 'A professional social media image'

    // Enhance prompt with comprehensive business context for branded visuals
    if (params.brand_name || params.platform || params.campaign_context) {
      const brandContext = params.brand_name ? `for ${params.brand_name} brand` : ''
      const platformContext = params.platform && params.platform !== 'General' ?
        `optimized for ${params.platform} (${getPlatformSpecs(params.platform)})` : ''
      const campaignContext = params.campaign_context ?
        `Campaign: ${params.campaign_context}` : ''

      // Add platform-specific optimization
      const platformOptimization = getPlatformOptimization(params.platform)

      enhancedPrompt = `${enhancedPrompt} ${brandContext} ${platformContext}. ${campaignContext}. ${platformOptimization} Professional, branded, social media ready, high engagement potential.`
    }

    const imageRequest: ImageGenerationRequest = {
      prompt: enhancedPrompt,
      style: params.style || 'Digital Art',
      aspectRatio: params.aspect_ratio || params.aspectRatio || 'Square (1:1)',
      quality: params.quality === 'high' ? 'hd' : 'standard',
      isModification: params.isModification || false,
      previousImageContext: params.previousImageContext || undefined,
      modificationInstructions: params.modificationInstructions || undefined
    }

    console.log('Splash generating image with request:', imageRequest)
    const imageResult = await imageService.generateImage(imageRequest)

    if (imageResult.success && imageResult.imageUrl) {
      const isModification = imageRequest.isModification
      const actionType = isModification ? 'Modified' : 'Created'
      const actionEmoji = isModification ? '✨' : '🎨'

      const response = `${actionEmoji} **Visual Content ${actionType} Successfully!**

![${imageResult.metadata?.originalPrompt || 'Generated Visual Content'}](${imageResult.imageUrl})

**Image Details:**
- **${isModification ? 'Modification' : 'Original'} Prompt:** ${imageResult.metadata?.originalPrompt}
- **Enhanced Prompt:** ${imageResult.metadata?.enhancedPrompt}
- **Style:** ${imageResult.metadata?.style}
- **Aspect Ratio:** ${imageResult.metadata?.aspectRatio}
${isModification && imageRequest.previousImageContext ? `- **Based On:** ${imageRequest.previousImageContext}` : ''}

**Maritime Mission Complete!** Your visual content has been ${isModification ? 'modified' : 'generated'} and is ready for use in your fitness content, social media posts, or any other creative projects. The image has been optimized for digital use and follows current design trends.

*This image was ${isModification ? 'modified' : 'created'} using advanced AI technology and is ready for immediate use in your content strategy.*`

      return {
        response,
        tokensUsed: imageResult.tokensUsed,
        latency: Date.now() - startTime,
        model: imageResult.model,
        success: true,
        framework: 'hybrid',
        imageUrl: imageResult.imageUrl,
        metadata: {
          imageGeneration: true,
          originalPrompt: imageRequest.prompt,
          style: imageRequest.style,
          aspectRatio: imageRequest.aspectRatio,
          imageUrl: imageResult.imageUrl
        }
      }
    } else {
      return {
        response: `I apologize, but I encountered an issue while generating your visual content. ${imageResult.error || 'Please try again with a different prompt or contact support if the issue persists.'}`,
        tokensUsed: imageResult.tokensUsed || 0,
        latency: Date.now() - startTime,
        model: imageResult.model || 'dall-e-3',
        success: false,
        framework: 'hybrid',
        error: imageResult.error
      }
    }
  } catch (error) {
    console.error('Image generation error in Splash agent:', error)
    return {
      response: 'I apologize, but I encountered an error while generating your visual content. Please try again or contact support if the issue persists.',
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'dall-e-3',
      success: false,
      framework: 'hybrid',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
