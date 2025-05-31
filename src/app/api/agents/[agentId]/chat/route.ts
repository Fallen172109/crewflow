import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getAgent, canUserAccessAgent } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const user = await requireAuth()
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const agent = getAgent(params.agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const supabase = createSupabaseServerClient()
    
    // Get user profile to check subscription
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user can access this agent
    if (!canUserAccessAgent(userProfile.subscription_tier, params.agentId)) {
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
        content: message
      })

    // TODO: Implement actual AI agent processing based on framework
    // For now, return a simulated response
    let response = ''
    
    switch (agent.framework) {
      case 'langchain':
        response = `[LangChain] I'm ${agent.name}, processing your request: "${message}". This is a simulated response using LangChain framework.`
        break
      case 'perplexity':
        response = `[Perplexity AI] I'm ${agent.name}, researching your query: "${message}". This is a simulated response using Perplexity AI for real-time information.`
        break
      case 'autogen':
        response = `[AutoGen] I'm ${agent.name}, coordinating multiple agents for: "${message}". This is a simulated response using AutoGen framework.`
        break
      case 'hybrid':
        response = `[Hybrid] I'm ${agent.name}, using multiple AI frameworks for: "${message}". This is a simulated response combining different AI capabilities.`
        break
      default:
        response = `I'm ${agent.name}, processing your request: "${message}". This is a simulated response.`
    }

    // Store agent response in chat history
    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        agent_name: agent.id,
        message_type: 'agent',
        content: response
      })

    // Increment usage counter
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
