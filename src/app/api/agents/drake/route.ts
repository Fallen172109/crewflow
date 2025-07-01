import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createLangChainAgent } from '@/lib/ai/langchain-working'
import { createPerplexityAgent } from '@/lib/ai/perplexity'
import { createAutoGenAgent } from '@/lib/ai/autogen'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId, threadId } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Drake agent configuration
    const drake = getAgent('drake')
    if (!drake) {
      return NextResponse.json(
        { error: 'Drake agent not found' },
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
      response = await handleDrakePresetAction(action, params, message, fullContext)
    } else {
      // Handle regular chat message with intelligent routing
      response = await handleDrakeMessage(message, fullContext)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'drake',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: drake.costPerRequest,
        metadata: {
          action: action || null,
          framework: response.framework || 'hybrid',
          business_development_focus: true,
          agent_steps: response.agentSteps?.length || 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: response.framework || 'hybrid',
      agentSteps: response.agentSteps || [],
      sources: response.sources || [],
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: drake.costPerRequest
      }
    })

  } catch (error) {
    console.error('Drake agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleDrakeMessage(message: string, context?: string) {
  const drake = getAgent('drake')!
  
  // Intelligent framework routing based on message content
  const needsResearch = /competitor|market|research|intelligence|trends|analysis|current|latest/i.test(message)
  const needsWorkflow = /process|workflow|automation|sequence|steps|campaign|multi-step/i.test(message)
  const needsContent = /write|create|generate|draft|template|email|proposal|pitch/i.test(message)
  
  if (needsWorkflow) {
    // Use AutoGen for complex multi-step processes
    const autogenAgent = createAutoGenAgent(drake, getDrakeAutoGenPrompt())
    const result = await autogenAgent.processMessage(message, context)
    return {
      ...result,
      framework: 'autogen'
    }
  } else if (needsResearch) {
    // Use Perplexity for research and intelligence
    const perplexityAgent = createPerplexityAgent(drake, getDrakePerplexityPrompt())
    const result = await perplexityAgent.processMessage(message, context)
    return {
      ...result,
      framework: 'perplexity'
    }
  } else {
    // Use LangChain for content generation and CRM tasks
    const langchainAgent = createLangChainAgent(drake, getDrakeLangChainPrompt())
    const result = await langchainAgent.processMessage(message, context)
    return {
      ...result,
      framework: 'langchain'
    }
  }
}

async function handleDrakePresetAction(actionId: string, params: any, message?: string, context?: string) {
  const drake = getAgent('drake')!
  const startTime = Date.now()

  try {
    let prompt = ''
    let framework = 'langchain' // default
    
    switch (actionId) {
      case 'generate_leads':
        framework = 'perplexity' // Use Perplexity for real-time lead research
        prompt = `Research and generate qualified sales leads with the following criteria:

Industry: ${params.industry || 'Technology/SaaS'}
Company Size: ${params.companySize || '50-500 employees'}
Geographic Location: ${params.location || 'United States'}
Budget Range: ${params.budget || '$10K-$100K annually'}
Decision Maker Roles: ${params.roles || 'CEO, CTO, VP Sales, Marketing Director'}
Pain Points: ${params.painPoints || 'Efficiency, automation, growth'}

Research and provide:
1. List of 20+ qualified prospect companies
2. Key decision maker contact information
3. Company background and recent news
4. Specific pain points and challenges
5. Budget and decision-making timeline
6. Competitive landscape analysis
7. Personalized outreach angles
8. Lead scoring and prioritization
9. Contact methods and preferences
10. Follow-up strategy recommendations

Include current, verified information with sources.`
        break

      case 'automate_outreach':
        framework = 'autogen' // Use AutoGen for multi-step campaign orchestration
        prompt = `Design and automate a comprehensive sales outreach campaign:

Target Audience: ${params.audience || 'B2B decision makers'}
Campaign Goal: ${params.goal || 'Generate qualified meetings'}
Outreach Channels: ${params.channels || 'Email, LinkedIn, phone'}
Campaign Duration: ${params.duration || '4 weeks'}
Follow-up Sequence: ${params.followups || '5 touchpoints'}
Personalization Level: ${params.personalization || 'High'}

Create multi-step outreach automation including:
1. Audience segmentation and targeting strategy
2. Multi-channel outreach sequence design
3. Personalized message templates for each touchpoint
4. Timing and frequency optimization
5. A/B testing framework for optimization
6. Response handling and qualification process
7. CRM integration and lead scoring
8. Performance tracking and analytics
9. Automated follow-up workflows
10. Escalation procedures for hot leads

Provide comprehensive campaign automation blueprint.`
        break

      case 'competitive_analysis':
        framework = 'perplexity' // Use Perplexity for real-time competitive intelligence
        prompt = `Conduct comprehensive competitive intelligence analysis:

Primary Competitors: ${params.competitors || 'Main industry competitors'}
Analysis Focus: ${params.focus || 'Pricing, features, positioning, marketing'}
Market Segment: ${params.segment || 'Mid-market B2B'}
Geographic Scope: ${params.geography || 'North America'}
Time Frame: ${params.timeframe || 'Current state and 6-month trends'}

Research and analyze:
1. Competitor product offerings and positioning
2. Pricing strategies and models
3. Marketing and sales approaches
4. Customer reviews and satisfaction
5. Recent funding, partnerships, acquisitions
6. Leadership team and key personnel changes
7. Technology stack and capabilities
8. Market share and growth trends
9. Strengths, weaknesses, opportunities, threats
10. Competitive differentiation opportunities

Provide actionable competitive intelligence with sources.`
        break

      case 'proposal_generation':
        framework = 'langchain' // Use LangChain for content generation
        prompt = `Generate a comprehensive business proposal:

Client Company: ${params.client || 'Prospect company'}
Industry: ${params.industry || 'Technology'}
Project Scope: ${params.scope || 'Business automation solution'}
Budget Range: ${params.budget || '$50K-$200K'}
Timeline: ${params.timeline || '3-6 months'}
Key Stakeholders: ${params.stakeholders || 'C-level executives'}
Pain Points: ${params.painPoints || 'Efficiency and growth challenges'}

Create detailed business proposal including:
1. Executive summary with value proposition
2. Client needs analysis and pain point identification
3. Proposed solution overview and benefits
4. Detailed scope of work and deliverables
5. Implementation timeline and milestones
6. Pricing structure and investment breakdown
7. ROI projections and success metrics
8. Team qualifications and experience
9. Risk mitigation and contingency plans
10. Next steps and call-to-action

Deliver professional, persuasive proposal content.`
        break

      default:
        prompt = `Execute business development action "${actionId}": ${JSON.stringify(params)}`
    }

    let result
    if (framework === 'perplexity') {
      const perplexityAgent = createPerplexityAgent(drake, getDrakePerplexityPrompt())
      result = await perplexityAgent.processMessage(prompt, context)
    } else if (framework === 'autogen') {
      const autogenAgent = createAutoGenAgent(drake, getDrakeAutoGenPrompt())
      result = await autogenAgent.processMessage(prompt, context)
    } else {
      const langchainAgent = createLangChainAgent(drake, getDrakeLangChainPrompt())
      result = await langchainAgent.processMessage(prompt, context)
    }
    
    return {
      response: result.response,
      tokensUsed: result.tokensUsed,
      latency: Date.now() - startTime,
      model: result.model,
      success: true,
      framework: framework,
      agentSteps: result.agentSteps || [],
      sources: result.sources || []
    }

  } catch (error) {
    console.error('Drake preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the business development action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getDrakeLangChainPrompt(): string {
  return `You are Drake, the Business Development specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert business development professional with deep knowledge of:
- Sales process optimization and automation
- Lead qualification and nurturing
- Proposal writing and presentation
- CRM management and data analysis
- Customer relationship building
- Revenue growth strategies

CAPABILITIES:
- Sales content creation and templates
- Proposal and pitch development
- CRM data management and analysis
- Sales process automation
- Customer communication strategies
- Revenue forecasting and planning

SPECIALIZATIONS:
- B2B sales and business development
- SaaS and technology sales
- Enterprise sales processes
- Sales enablement and training
- Customer success and retention
- Partnership development

FRAMEWORK: LangChain
- Focus on content generation and automation
- Provide structured sales processes
- Create detailed proposals and templates
- Develop systematic approaches to business development

RESPONSE STYLE:
- Professional and persuasive
- Results-oriented with clear metrics
- Actionable recommendations
- Structured templates and frameworks
- Focus on ROI and business value

MARITIME THEME INTEGRATION:
- "Charting course" for business growth
- "Navigating" sales waters
- "Anchoring" relationships with clients
- "Setting sail" with new opportunities
- "Weathering" market challenges

KEY GUIDELINES:
1. Always focus on qualified leads and opportunities
2. Provide specific, actionable sales strategies
3. Include measurable goals and KPIs
4. Consider the full sales funnel and customer journey
5. Emphasize relationship building and value creation
6. Provide templates and frameworks for scalability
7. Focus on sustainable, long-term growth

Remember: Great business development requires strategic thinking, systematic execution, and genuine value creation for customers.`
}

function getDrakePerplexityPrompt(): string {
  return `You are Drake, the Business Development specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert business intelligence and market research professional with deep knowledge of:
- Competitive intelligence and market analysis
- Lead research and prospecting
- Industry trends and market dynamics
- Company research and due diligence
- Real-time market data and insights
- Competitive positioning and strategy

CAPABILITIES:
- Real-time lead research and qualification
- Competitive intelligence gathering
- Market trend analysis and forecasting
- Company background research
- Industry analysis and insights
- Prospect identification and scoring

SPECIALIZATIONS:
- B2B lead generation and research
- Competitive landscape analysis
- Market opportunity assessment
- Industry trend identification
- Company intelligence and profiling
- Decision maker identification

FRAMEWORK: Perplexity AI
- Leverage real-time business data
- Provide current market intelligence
- Access latest company information
- Research competitor activities in real-time
- Monitor industry trends and changes

RESPONSE STYLE:
- Data-driven with current statistics
- Include specific company examples
- Provide real-time market insights
- Cite sources for all claims and data
- Focus on actionable intelligence

MARITIME THEME INTEGRATION:
- "Navigating" market waters
- "Charting" competitive landscape
- "Anchoring" strategies in data
- "Setting course" for opportunities
- "Weathering" market storms

KEY GUIDELINES:
1. Always provide current, researched information
2. Include specific examples and case studies
3. Cite sources for all statistics and claims
4. Focus on actionable business intelligence
5. Research competitor activities and strategies
6. Identify emerging opportunities and threats
7. Provide data-driven recommendations

Remember: Great business development starts with great intelligence - stay current with real-time market insights.`
}

function getDrakeAutoGenPrompt(): string {
  return `You are Drake, the Business Development specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert sales process architect and automation specialist with deep knowledge of:
- Multi-step sales campaign design
- Sales process optimization and automation
- Lead nurturing workflow development
- Sales funnel management and optimization
- Cross-channel outreach orchestration
- Sales performance tracking and analysis

CAPABILITIES:
- Complex sales workflow design
- Multi-channel campaign orchestration
- Sales process automation
- Lead scoring and qualification systems
- Sales performance optimization
- Team coordination and management

SPECIALIZATIONS:
- Enterprise sales process design
- Multi-touch outreach campaigns
- Sales automation workflows
- Lead nurturing sequences
- Sales team coordination
- Performance tracking systems

FRAMEWORK: AutoGen Multi-Agent System
- Strategist Agent: Develops overall sales strategy
- Researcher Agent: Gathers prospect intelligence
- Content Agent: Creates personalized outreach content
- Coordinator Agent: Orchestrates multi-channel campaigns
- Analyst Agent: Tracks performance and optimizes

RESPONSE STYLE:
- Systematic and process-oriented
- Clear step-by-step workflows
- Detailed implementation plans
- Measurable outcomes and KPIs
- Scalable automation frameworks

MARITIME THEME INTEGRATION:
- "Charting course" for sales campaigns
- "Navigating" complex sales processes
- "Anchoring" strategies with solid foundations
- "Setting sail" with new campaigns
- "Weathering" sales challenges

KEY GUIDELINES:
1. Break complex sales processes into manageable steps
2. Design for scalability and automation
3. Include performance tracking and optimization
4. Consider multi-channel coordination
5. Provide clear implementation timelines
6. Focus on measurable business outcomes
7. Design for team collaboration and handoffs

Remember: Great sales automation requires careful orchestration of people, processes, and technology.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'drake',
    status: 'active',
    framework: 'hybrid',
    capabilities: [
      'lead_generation',
      'competitive_intelligence',
      'sales_automation',
      'proposal_generation',
      'market_research',
      'outreach_campaigns'
    ],
    integrations: ['salesforce', 'hubspot', 'pipedrive', 'linkedin-sales', 'apollo'],
    hybridApproach: {
      langchain: 'Content generation, proposals, CRM management',
      perplexity: 'Lead research, competitive intelligence, market analysis',
      autogen: 'Multi-step campaigns, process automation, workflow orchestration'
    }
  })
}
