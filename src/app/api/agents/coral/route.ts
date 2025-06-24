import { NextRequest, NextResponse } from 'next/server'
import { processAgentMessage } from '@/lib/ai'
import { getAgent } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { trackAgentUsage } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Coral agent configuration
    const coral = getAgent('coral')
    if (!coral) {
      return NextResponse.json(
        { error: 'Coral agent not found' },
        { status: 404 }
      )
    }

    // Verify user authentication if userId provided
    let userProfile = null
    if (userId) {
      const supabase = await createSupabaseServerClient()
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      userProfile = profile
    }

    let response

    if (action) {
      // Handle preset action
      const { createLangChainAgent } = await import('@/lib/ai/langchain-working')
      const agent = createLangChainAgent(coral, buildCoralSystemPrompt())
      response = await agent.handlePresetAction(action, params || {})
    } else {
      // Handle regular message
      const systemPrompt = buildCoralSystemPrompt()
      response = await processAgentMessage(coral, message, context, systemPrompt)
    }

    // Log detailed usage analytics if user is authenticated
    if (userId && userProfile) {
      await trackAgentUsage(
        userId,
        'coral',
        action ? 'preset_action' : 'chat',
        response.tokensUsed || 0,
        coral.costPerRequest,
        response.latency || 0,
        response.success !== false, // Default to true unless explicitly false
        {
          action: action || null,
          sentiment: response.metadata?.sentiment || null,
          urgency: response.metadata?.urgency || null,
          escalation_required: response.metadata?.escalationRequired || false,
          framework: 'langchain'
        }
      )
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      metadata: response.metadata,
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: coral.costPerRequest
      }
    })

  } catch (error) {
    console.error('Coral API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildCoralSystemPrompt(): string {
  return `You are Coral, the premier Customer Support specialist in CrewFlow's maritime AI automation platform.

MISSION: Provide exceptional, empathetic, and efficient customer support while maintaining the highest standards of professionalism and policy compliance.

CORE COMPETENCIES:
- Advanced customer service and communication skills
- Emotional intelligence and sentiment analysis
- Policy compliance and escalation management
- Multi-channel support coordination
- CRM integration and data management
- Knowledge base creation and maintenance

SUPPORT PROTOCOLS:
1. IMMEDIATE ACKNOWLEDGMENT - Always acknowledge customer concerns promptly
2. ACTIVE LISTENING - Ask clarifying questions to fully understand issues
3. SOLUTION-FOCUSED - Provide clear, actionable solutions with alternatives
4. ESCALATION AWARENESS - Know when and how to escalate appropriately
5. FOLLOW-UP COMMITMENT - Ensure customer satisfaction and proper closure

COMMUNICATION EXCELLENCE:
- Use warm, professional, and empathetic language
- Provide clear, jargon-free explanations
- Show genuine concern for customer success
- Maintain positive, solution-oriented responses
- Adapt communication style to customer needs

ESCALATION TRIGGERS:
- Technical issues requiring specialized expertise
- Billing disputes over significant amounts
- Customer requests for management
- Legal threats or regulatory complaints
- Repeated unresolved issues

Remember: Every interaction is an opportunity to build customer loyalty and demonstrate CrewFlow's commitment to excellence.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'coral',
    status: 'active',
    capabilities: [
      'customer_support',
      'sentiment_analysis',
      'escalation_management',
      'knowledge_base_creation',
      'policy_compliance'
    ],
    integrations: ['zendesk', 'intercom', 'salesforce', 'hubspot', 'slack']
  })
}
