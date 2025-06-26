import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getAgent, canUserAccessAgent, type Agent } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const user = await requireAuth()
    const { message, taskType, userId } = await request.json()
    const resolvedParams = await params

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const agent = getAgent(resolvedParams.agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const supabase = await createSupabaseServerClient()

    // Get user profile to check subscription
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user can access this agent (admin override or subscription check)
    const isAdmin = userProfile.role === 'admin'
    const hasEnterpriseAccess = userProfile.subscription_tier === 'enterprise'
    const canAccess = isAdmin || hasEnterpriseAccess || canUserAccessAgent(userProfile.subscription_tier, resolvedParams.agentId)

    if (!canAccess) {
      return NextResponse.json({ error: 'Agent not available in your plan' }, { status: 403 })
    }

    // Check usage limits (simplified for now)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    
    const { data: usage, error: usageError } = await supabase
      .from('agent_usage')
      .select('requests_used')
      .eq('user_id', user.id)
      .eq('agent_name', agent.id)
      .eq('month_year', currentMonth)
      .single()

    // Get subscription limits
    const limits = {
      starter: 500,
      professional: 750,
      enterprise: 1000
    }
    
    const userLimit = limits[userProfile.subscription_tier as keyof typeof limits] || 0
    const currentUsage = usage?.requests_used || 0

    if (currentUsage >= userLimit) {
      return NextResponse.json({ 
        error: 'Monthly usage limit exceeded',
        usage: currentUsage,
        limit: userLimit
      }, { status: 429 })
    }

    // Store user message in chat history
    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        agent_name: agent.id,
        message_type: 'user',
        content: message,
        task_type: taskType || 'general'
      })

    // Generate real AI response based on agent framework
    let response = ''
    let aiResponse: any

    try {
      // Import the appropriate AI framework
      switch (agent.framework) {
        case 'langchain':
          const { createLangChainAgent } = await import('@/lib/ai/langchain-working')
          const langchainAgent = createLangChainAgent(agent, buildSystemPrompt(agent))
          aiResponse = await langchainAgent.processMessage(message)
          response = aiResponse.response
          break

        case 'perplexity':
          const { createPerplexityAgent } = await import('@/lib/ai/perplexity')
          const perplexityAgent = createPerplexityAgent(agent, buildSystemPrompt(agent))
          aiResponse = await perplexityAgent.processMessage(message)
          response = aiResponse.response
          break

        case 'autogen':
          const { createAutoGenAgent } = await import('@/lib/ai/autogen')
          const autogenAgent = createAutoGenAgent(agent, buildSystemPrompt(agent))
          aiResponse = await autogenAgent.processMessage(message)
          response = aiResponse.response
          break

        case 'hybrid':
          // For hybrid agents, use intelligent framework selection
          const { processAgentMessage } = await import('@/lib/ai')
          aiResponse = await processAgentMessage(agent, message, undefined, buildSystemPrompt(agent))
          response = aiResponse.response
          break

        default:
          response = `I apologize, but there was an issue with my AI framework (${agent.framework}). Please try again or contact support.`
      }
    } catch (error) {
      console.error('AI processing error:', error)
      response = `I apologize, but I encountered an error while processing your request. Please try again. If the issue persists, please contact support.`
    }

    // Store agent response in chat history
    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        agent_name: agent.id,
        message_type: 'agent',
        content: response,
        task_type: taskType || 'general'
      })

    // Track real AI usage if we have AI response data
    if (aiResponse) {
      try {
        const { trackRealUsage } = await import('@/lib/ai-usage-tracker')

        // Determine provider based on framework
        const provider = agent.framework === 'langchain' ? 'openai' :
                        agent.framework === 'perplexity' ? 'perplexity' :
                        agent.framework === 'autogen' ? 'openai' :
                        'openai' // default for hybrid

        await trackRealUsage(
          user.id,
          agent.id,
          agent.name,
          agent.framework,
          provider,
          'chat',
          aiResponse.apiResponse || aiResponse, // Pass the actual API response
          aiResponse.latency || 0,
          aiResponse.success !== false,
          aiResponse.error,
          {
            task_type: taskType || 'general',
            message_length: message.length,
            response_length: response.length,
            framework: agent.framework,
            agent_category: agent.category
          }
        )
      } catch (error) {
        console.error('Error tracking real usage:', error)
        // Don't fail the request if usage tracking fails
      }
    }

    // Increment usage counter (legacy system)
    await supabase.rpc('increment_agent_usage', {
      p_user_id: user.id,
      p_agent_name: agent.id
    })

    return NextResponse.json({
      response,
      usage: currentUsage + 1,
      limit: userLimit,
      agent: {
        id: agent.id,
        name: agent.name,
        framework: agent.framework
      }
    })

  } catch (error) {
    console.error('Error in agent chat:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

// Build system prompt for agents
function buildSystemPrompt(agent: Agent): string {
  return `You are ${agent.name}, a ${agent.title} specialist in the CrewFlow maritime AI automation platform.

${agent.description}

Your role and capabilities:
- Framework: ${agent.framework}
- Specialization: ${agent.category}
- Available integrations: ${agent.integrations.join(', ')}

Key Guidelines:
- Provide expert-level assistance in ${agent.category}
- Use your specialized knowledge and integrations
- Maintain a professional, helpful tone with maritime theming
- Focus on practical, actionable solutions
- Use maritime terminology naturally (navigate, chart course, anchor, set sail, etc.)

Always provide detailed, helpful responses that demonstrate your expertise in ${agent.category}.`
}
