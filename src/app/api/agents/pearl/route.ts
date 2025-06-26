import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createPerplexityAgent } from '@/lib/ai/perplexity'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Pearl agent configuration
    const pearl = getAgent('pearl')
    if (!pearl) {
      return NextResponse.json(
        { error: 'Pearl agent not found' },
        { status: 404 }
      )
    }

    // Verify user authentication if userId provided
    let userProfile = null
    if (userId) {
      const supabase = createSupabaseServerClient()
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      userProfile = profile
    }

    // Create Perplexity agent instance
    const perplexityAgent = createPerplexityAgent(pearl, getPearlSystemPrompt())

    let response
    if (action) {
      // Handle preset actions
      response = await handlePearlPresetAction(perplexityAgent, action, params)
    } else {
      // Handle regular chat message
      response = await perplexityAgent.processMessage(message, context)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'pearl',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: pearl.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'perplexity',
          content_focus: true,
          sources: response.sources || []
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: 'perplexity',
      sources: response.sources || [],
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: pearl.costPerRequest
      }
    })

  } catch (error) {
    console.error('Pearl agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handlePearlPresetAction(perplexityAgent: any, actionId: string, params: any) {
  const startTime = Date.now()
  
  try {
    let prompt = ''
    
    switch (actionId) {
      case 'optimize_content':
        prompt = `Analyze and optimize the following content for SEO and readability:

Content: ${params.content || 'Please provide content to optimize'}
Target Keywords: ${params.keywords || 'Not specified'}
Target Audience: ${params.audience || 'General audience'}

Provide comprehensive optimization recommendations including:
1. SEO improvements (title tags, meta descriptions, headers)
2. Keyword optimization and density analysis
3. Readability enhancements
4. Content structure improvements
5. Internal linking suggestions
6. Current SEO trends and best practices

Include specific, actionable recommendations with examples.`
        break

      case 'generate_blog_post':
        prompt = `Create an engaging, SEO-optimized blog post with the following specifications:

Topic: ${params.topic || 'Please specify a topic'}
Target Keywords: ${params.keywords || 'Not specified'}
Word Count: ${params.wordCount || '800-1200'} words
Tone: ${params.tone || 'Professional and engaging'}
Target Audience: ${params.audience || 'General business audience'}

Research current trends and create a comprehensive blog post including:
1. Compelling headline with SEO optimization
2. Meta description (150-160 characters)
3. Well-structured content with H2/H3 headers
4. Natural keyword integration
5. Current statistics and data
6. Actionable insights and takeaways
7. Call-to-action
8. Suggested internal/external links

Ensure the content is original, valuable, and optimized for search engines.`
        break

      case 'research_trends':
        prompt = `Research and analyze current trending topics in the following area:

Industry/Niche: ${params.industry || 'General business'}
Geographic Focus: ${params.location || 'Global'}
Time Frame: ${params.timeframe || 'Last 30 days'}
Content Type: ${params.contentType || 'Blog posts and articles'}

Provide comprehensive trend analysis including:
1. Top 10 trending topics with search volume data
2. Emerging keywords and phrases
3. Content gaps and opportunities
4. Competitor content analysis
5. Social media trend correlation
6. Seasonal trend predictions
7. Content creation recommendations
8. Optimal publishing timing

Include specific data, sources, and actionable insights for content strategy.`
        break

      case 'keyword_analysis':
        prompt = `Perform comprehensive keyword analysis for:

Primary Keyword: ${params.keyword || 'Please specify a keyword'}
Industry: ${params.industry || 'General'}
Geographic Target: ${params.location || 'Global'}
Competition Level: ${params.competition || 'Medium'}

Provide detailed keyword analysis including:
1. Search volume and difficulty scores
2. Related long-tail keywords
3. Semantic keyword variations
4. Competitor keyword analysis
5. Search intent classification
6. Seasonal trends and patterns
7. Content optimization opportunities
8. PPC vs. organic potential
9. Featured snippet opportunities
10. Local SEO considerations (if applicable)

Include specific recommendations for keyword targeting strategy.`
        break

      case 'content_audit':
        prompt = `Conduct a comprehensive content performance audit:

Content URL/Title: ${params.content || 'Please specify content to audit'}
Current Performance Metrics: ${params.metrics || 'Not provided'}
Time Period: ${params.period || 'Last 3 months'}
Goals: ${params.goals || 'Improve organic traffic and engagement'}

Analyze and provide recommendations for:
1. Current SEO performance and rankings
2. Content quality and relevance assessment
3. Technical SEO issues
4. User engagement metrics analysis
5. Conversion performance
6. Content freshness and updates needed
7. Competitive content comparison
8. Optimization opportunities
9. Content repurposing suggestions
10. Performance improvement roadmap

Include specific, prioritized action items with expected impact.`
        break

      case 'visual_content_creator':
        // Handle image generation through Perplexity agent's built-in handler
        return await perplexityAgent.handlePresetAction(actionId, params)

      default:
        prompt = `Execute content and SEO action "${actionId}": ${JSON.stringify(params)}`
    }

    const response = await perplexityAgent.processMessage(prompt)
    
    return {
      response: response.response,
      tokensUsed: response.tokensUsed,
      latency: Date.now() - startTime,
      model: response.model,
      success: true,
      framework: 'perplexity',
      sources: response.sources || []
    }

  } catch (error) {
    console.error('Pearl preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the content optimization action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getPearlSystemPrompt(): string {
  return `You are Pearl, the Content & SEO specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert content creator and SEO strategist with deep knowledge of:
- Search engine optimization best practices
- Content marketing strategies
- Real-time trend analysis
- Keyword research and analysis
- Technical SEO implementation
- Content performance optimization

CAPABILITIES:
- Real-time web research for trending topics
- SEO-optimized content creation
- Keyword analysis and strategy
- Content performance auditing
- Competitive content analysis
- Technical SEO recommendations

SPECIALIZATIONS:
- Blog post and article creation
- Website content optimization
- SEO strategy development
- Content gap analysis
- Trend identification and analysis
- Performance tracking and reporting

FRAMEWORK: Perplexity AI
- Leverage real-time web data for current trends
- Provide source citations for all claims
- Access latest SEO algorithm updates
- Research competitor strategies
- Analyze current market conditions

RESPONSE STYLE:
- Professional yet approachable
- Data-driven with specific metrics
- Actionable recommendations
- Clear, structured formatting
- Include relevant sources and citations

MARITIME THEME INTEGRATION:
- Use nautical metaphors when appropriate
- Reference "navigating" SEO waters
- "Charting course" for content strategy
- "Anchoring" content with strong foundations
- "Setting sail" with new campaigns

KEY GUIDELINES:
1. Always provide current, researched information
2. Include specific, actionable recommendations
3. Cite sources for statistics and claims
4. Focus on ROI and measurable outcomes
5. Consider both technical and creative aspects
6. Adapt strategies to current algorithm updates
7. Provide both short-term and long-term strategies

Remember: Every piece of content should serve both users and search engines, creating value while driving organic growth.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'pearl',
    status: 'active',
    framework: 'perplexity',
    capabilities: [
      'content_creation',
      'seo_optimization',
      'keyword_research',
      'trend_analysis',
      'content_auditing',
      'competitive_analysis'
    ],
    integrations: ['wordpress', 'ghost', 'semrush', 'ahrefs', 'google-search-console'],
    realTimeResearch: {
      enabled: true,
      sources: ['web_search', 'news', 'social_media', 'industry_reports'],
      updateFrequency: 'real-time'
    }
  })
}
