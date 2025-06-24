import { NextRequest, NextResponse } from 'next/server'
import { processAgentMessage } from '@/lib/ai'
import { getAgent } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createLangChainAgent } from '@/lib/ai/langchain-working'
import { createPerplexityAgent } from '@/lib/ai/perplexity'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId, framework } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Mariner agent configuration
    const mariner = getAgent('mariner')
    if (!mariner) {
      return NextResponse.json(
        { error: 'Mariner agent not found' },
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

    let response

    if (action) {
      // Handle preset action with hybrid approach
      response = await handleMarinerPresetAction(mariner, action, params || {})
    } else {
      // Handle regular message with intelligent framework selection
      const selectedFramework = framework || selectFrameworkForMessage(message)
      response = await processMarinerMessage(mariner, message, context, selectedFramework)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'mariner',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: mariner.costPerRequest,
        metadata: {
          action: action || null,
          framework: response.framework || 'hybrid',
          sources: response.sources || null
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: response.framework,
      sources: response.sources,
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: mariner.costPerRequest
      }
    })

  } catch (error) {
    console.error('Mariner API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function selectFrameworkForMessage(message: string): 'langchain' | 'perplexity' {
  const lowerMessage = message.toLowerCase()
  
  // Use Perplexity for research, trends, current market data
  if (lowerMessage.includes('research') || 
      lowerMessage.includes('trend') || 
      lowerMessage.includes('current') || 
      lowerMessage.includes('latest') ||
      lowerMessage.includes('competitor') ||
      lowerMessage.includes('market data') ||
      lowerMessage.includes('industry news')) {
    return 'perplexity'
  }
  
  // Use LangChain for campaign creation, strategy, automation
  return 'langchain'
}

async function processMarinerMessage(agent: any, message: string, context?: string, framework: string = 'langchain') {
  const systemPrompt = buildMarinerSystemPrompt()
  
  if (framework === 'perplexity') {
    const perplexityAgent = createPerplexityAgent(agent, systemPrompt)
    return await perplexityAgent.processMessage(message, context)
  } else {
    const langchainAgent = createLangChainAgent(agent, systemPrompt)
    return await langchainAgent.processMessage(message, context)
  }
}

async function handleMarinerPresetAction(agent: any, actionId: string, params: any) {
  const systemPrompt = buildMarinerSystemPrompt()
  
  // Route actions to appropriate framework
  const framework = selectFrameworkForAction(actionId)
  
  if (framework === 'perplexity') {
    const perplexityAgent = createPerplexityAgent(agent, systemPrompt)
    return await perplexityAgent.handlePresetAction(actionId, params)
  } else {
    const langchainAgent = createLangChainAgent(agent, systemPrompt)
    return await handleMarinerLangChainAction(langchainAgent, actionId, params)
  }
}

function selectFrameworkForAction(actionId: string): 'langchain' | 'perplexity' {
  // Research-based actions use Perplexity
  if (actionId.includes('analyze_competitors') || 
      actionId.includes('research') ||
      actionId.includes('trends')) {
    return 'perplexity'
  }
  
  // Campaign and automation actions use LangChain
  return 'langchain'
}

async function handleMarinerLangChainAction(agent: any, actionId: string, params: any) {
  const startTime = Date.now()
  
  try {
    let prompt = ''
    
    switch (actionId) {
      case 'create_campaign':
        prompt = `Create a comprehensive marketing campaign strategy:
        
Campaign Type: ${params.campaignType || 'Multi-channel'}
Target Audience: ${params.audience || 'General'}
Budget: ${params.budget || 'Not specified'}
Duration: ${params.duration || '30 days'}
Goals: ${params.goals || 'Brand awareness and lead generation'}

Generate a detailed campaign strategy including:
1. Campaign objectives and KPIs
2. Target audience analysis
3. Channel strategy (email, social, ads, content)
4. Content calendar outline
5. Budget allocation recommendations
6. Success metrics and tracking plan`
        break

      case 'generate_content_calendar':
        prompt = `Generate a content calendar for marketing campaigns:
        
Industry: ${params.industry || 'General'}
Duration: ${params.duration || '1 month'}
Channels: ${params.channels || 'Social media, blog, email'}
Brand Voice: ${params.brandVoice || 'Professional and engaging'}

Create a comprehensive content calendar with:
1. Daily content themes and topics
2. Platform-specific content suggestions
3. Optimal posting times
4. Content types (posts, videos, articles)
5. Hashtag and keyword recommendations
6. Engagement strategies`
        break

      case 'optimize_ads':
        prompt = `Optimize advertising performance and strategy:
        
Current Performance: ${params.performance || 'Not specified'}
Ad Platform: ${params.platform || 'Google Ads, Facebook Ads'}
Budget: ${params.budget || 'Not specified'}
Target Metrics: ${params.metrics || 'CTR, CPC, ROAS'}

Provide optimization recommendations including:
1. Audience targeting improvements
2. Ad copy and creative suggestions
3. Bidding strategy optimization
4. Landing page recommendations
5. A/B testing strategies
6. Performance monitoring plan`
        break

      case 'segment_audience':
        prompt = `Create detailed audience segmentation strategy:
        
Business Type: ${params.businessType || 'General'}
Customer Data: ${params.customerData || 'Basic demographics'}
Goals: ${params.goals || 'Improve targeting'}
Channels: ${params.channels || 'Multi-channel'}

Develop audience segments including:
1. Demographic segmentation
2. Behavioral segmentation
3. Psychographic profiles
4. Customer journey mapping
5. Personalization strategies
6. Segment-specific messaging`
        break

      default:
        prompt = `Execute the marketing automation action "${actionId}": ${JSON.stringify(params)}`
    }

    const response = await agent.llm.invoke([{ role: 'user', content: prompt }])
    
    return {
      response: response.content as string,
      tokensUsed: response.usage?.totalTokens || 0,
      latency: Date.now() - startTime,
      model: agent.llm.model,
      success: true,
      framework: 'langchain'
    }
  } catch (error) {
    console.error('Mariner LangChain action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the ${actionId} action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      framework: 'langchain',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function buildMarinerSystemPrompt(): string {
  return `You are Mariner, the Marketing Automation specialist in CrewFlow's maritime AI automation platform.

MISSION: Execute sophisticated marketing campaigns, analyze market trends, and drive business growth through data-driven marketing strategies.

CORE COMPETENCIES:
- Multi-channel campaign management and optimization
- Real-time market research and competitive analysis
- Marketing automation and workflow orchestration
- Analytics tracking and performance optimization
- Content strategy and calendar management
- Audience segmentation and personalization

HYBRID AI CAPABILITIES:
- LangChain: Campaign creation, strategy development, automation workflows
- Perplexity AI: Real-time market research, trend analysis, competitive intelligence

AVAILABLE INTEGRATIONS:
Google Ads, Facebook Ads, Mailchimp, HubSpot, Google Analytics - Leverage these for comprehensive marketing solutions

MARKETING EXCELLENCE FRAMEWORK:
1. STRATEGY FIRST - Always start with clear objectives and KPIs
2. DATA-DRIVEN - Base decisions on analytics and market research
3. CUSTOMER-CENTRIC - Focus on audience needs and journey mapping
4. OMNICHANNEL - Coordinate across all marketing channels
5. CONTINUOUS OPTIMIZATION - Monitor, test, and improve constantly

CAMPAIGN DEVELOPMENT PROCESS:
1. Market research and competitive analysis
2. Audience segmentation and persona development
3. Channel strategy and budget allocation
4. Content creation and calendar planning
5. Campaign execution and automation setup
6. Performance monitoring and optimization

Remember: Every marketing initiative should drive measurable business results while building lasting customer relationships.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'mariner',
    status: 'active',
    framework: 'hybrid',
    capabilities: [
      'campaign_management',
      'market_research',
      'competitive_analysis',
      'content_strategy',
      'audience_segmentation',
      'performance_optimization'
    ],
    integrations: ['google-ads', 'facebook-ads', 'mailchimp', 'hubspot', 'google-analytics']
  })
}
