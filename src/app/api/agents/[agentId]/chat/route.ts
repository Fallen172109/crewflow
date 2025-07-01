import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getAgent, canUserAccessAgent, type Agent, AGENTS } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getFileAttachments, analyzeFileAttachments, createFileContext } from '@/lib/ai/file-analysis'
import { formatAgentResponse, formatErrorResponse } from '@/lib/ai/response-formatter'
import { analyzeDomain, shouldReferToSpecialist, generateReferralResponse } from '@/lib/ai/agent-routing'
import { trackReferral } from '@/lib/ai/referral-analytics'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    // Check authentication without redirect
    const { getUser } = await import('@/lib/auth')
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { message, taskType, userId, threadId } = await request.json()
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

    // Get thread context and file attachments if threadId is provided
    let threadContext = ''
    let fileContext = ''

    if (threadId) {
      // Get thread details
      const { data: thread } = await supabase
        .from('chat_threads')
        .select('title, context')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .single()

      if (thread) {
        threadContext = `\n\nThread Context:\nTitle: ${thread.title}\nBackground: ${thread.context || 'No additional context provided'}\n`
      }

      // Get and analyze file attachments
      try {
        const attachments = await getFileAttachments(threadId, undefined, user.id)
        if (attachments.length > 0) {
          const analyses = await analyzeFileAttachments(attachments)
          fileContext = createFileContext(analyses)
        }
      } catch (error) {
        console.error('Error processing file attachments:', error)
        // Don't fail the request if file processing fails
      }
    }

    // Store user message in chat history
    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        agent_name: agent.id,
        message_type: 'user',
        content: message,
        task_type: taskType || 'general',
        thread_id: threadId || null
      })

    // Generate real AI response based on agent framework
    let response = ''
    let aiResponse: any

    try {
      // Build complete context including thread and file information
      const fullContext = threadContext + fileContext

      // Get conversation context for formatting
      const { data: messageHistory } = await supabase
        .from('chat_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('agent_name', agent.id)
        .eq('thread_id', threadId || null)
        .order('created_at', { ascending: true })

      const messageCount = messageHistory?.length || 0

      // Determine if this is the first message in the conversation context
      let isFirstMessage = false

      if (threadId) {
        // For thread-based conversations, check if this is the first message in the specific thread
        isFirstMessage = messageCount === 0
      } else {
        // For non-thread conversations, check if this is the first message in the task type
        // Get message count for this specific task type and agent
        const { data: taskTypeMessages } = await supabase
          .from('chat_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('agent_name', agent.name)
          .eq('task_type', taskType)
          .eq('thread_id', null) // Only non-thread messages

        isFirstMessage = (taskTypeMessages?.length || 0) === 0
      }

      // Check for intelligent agent routing before processing
      const availableAgents = Object.values(AGENTS)
      const domainAnalysis = analyzeDomain(message)
      const referralDecision = shouldReferToSpecialist(agent, domainAnalysis, availableAgents)

      // If we should refer to a specialist, generate referral response
      if (referralDecision.shouldRefer && referralDecision.targetAgent) {
        const referralResponse = generateReferralResponse(agent, referralDecision, message)

        // Track the referral for analytics
        await trackReferral({
          user_id: user.id,
          source_agent_id: agent.id,
          target_agent_id: referralDecision.targetAgent.id,
          original_message: message,
          domain_detected: domainAnalysis.primaryDomain,
          confidence_score: referralDecision.confidence,
          referral_reason: referralDecision.reason || 'Domain specialization',
          thread_id: threadId || null
        })

        // Return the referral response
        response = referralResponse.response
        aiResponse = {
          response: referralResponse.response,
          tokensUsed: 50, // Minimal tokens for referral
          latency: 100,
          model: 'routing-system',
          framework: 'referral',
          success: true,
          metadata: {
            referral: true,
            targetAgent: referralDecision.targetAgent.id,
            domain: domainAnalysis.primaryDomain,
            confidence: referralDecision.confidence
          }
        }
      } else {
        // Build system prompt with meal planning context if applicable
        const systemPrompt = await buildSystemPrompt(agent, fullContext, user.id, taskType)

        // Import the appropriate AI framework
        switch (agent.framework) {
          case 'langchain':
            const { createLangChainAgent } = await import('@/lib/ai/langchain-working')
            const langchainAgent = createLangChainAgent(agent, systemPrompt, user.id)
            aiResponse = await langchainAgent.processMessage(message)
            response = aiResponse.response
            break

          case 'perplexity':
            const { createPerplexityAgent } = await import('@/lib/ai/perplexity')
            const perplexityAgent = createPerplexityAgent(agent, systemPrompt, user.id)
            aiResponse = await perplexityAgent.processMessage(message)
            response = aiResponse.response
            break

          case 'autogen':
            const { createAutoGenAgent } = await import('@/lib/ai/autogen')
            const autogenAgent = createAutoGenAgent(agent, systemPrompt)
            aiResponse = await autogenAgent.processMessage(message)
            response = aiResponse.response
            break

          case 'hybrid':
            // For hybrid agents, use intelligent framework selection
            const { processAgentMessage } = await import('@/lib/ai')
            aiResponse = await processAgentMessage(agent, message, undefined, systemPrompt)
            response = aiResponse.response
            break

          default:
            response = formatErrorResponse(
              `AI framework (${agent.framework}) is not properly configured`,
              agent.name,
              ['Please try again', 'Contact support if the issue persists']
            )
        }
      }

      // Format the response for better readability
      if (response && !response.includes('⚠️')) { // Don't format error responses
        response = formatAgentResponse(response, {
          useMarkdown: true,
          structureContent: true,
          addSpacing: true,
          maritimeTheming: true
        }, {
          isFirstMessage,
          threadId,
          messageCount,
          agentName: agent.name
        })
      }

    } catch (error) {
      console.error('AI processing error:', error)
      response = formatErrorResponse(
        'An unexpected error occurred while processing your request',
        agent.name,
        ['Please try again', 'Check your internet connection', 'Contact support if the issue persists']
      )
    }

    // Store agent response in chat history
    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        agent_name: agent.id,
        message_type: 'agent',
        content: response,
        task_type: taskType || 'general',
        thread_id: threadId || null
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
async function buildSystemPrompt(agent: Agent, threadContext?: string, userId?: string, taskType?: string): Promise<string> {
  // Check if this is a meal planning related task
  const isMealPlanningTask = taskType === 'crew_ability' && (
    agent.id === 'sage' || agent.id === 'coral' || agent.id === 'beacon'
  )

  if (isMealPlanningTask && userId) {
    try {
      const { enhanceAgentPromptWithMealContext } = await import('@/lib/ai/meal-planning-context')
      return await enhanceAgentPromptWithMealContext(userId, agent.name, agent.description, taskType)
    } catch (error) {
      console.error('Error loading meal planning context:', error)
      // Fall back to standard prompt
    }
  }

  let prompt = `You are ${agent.name}, a ${agent.title} specialist in the CrewFlow maritime AI automation platform.

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

Intelligent Routing Protocol:
- You can answer basic questions in any domain using your general knowledge
- For complex questions clearly outside your ${agent.category} specialization, you may refer users to specialist agents
- Only refer when the question requires specialized tools, deep expertise, or domain-specific knowledge you don't possess
- When referring, provide a brief helpful response first, then explain why the specialist is better suited
- Use maritime-themed language for referrals: "While I can provide some guidance, [Agent Name] is your best navigator for [specific expertise]"

Response Formatting Instructions:
- Structure responses with clear sections, bullet points, and numbered lists
- Use proper spacing between paragraphs and sections
- Break up long text blocks for better readability
- Use markdown formatting for emphasis and structure
- Always reference attached files when relevant to the conversation

Maritime Greeting Protocol:
- For first interactions: Use a full maritime greeting (e.g., "⚓ Ahoy! I'm ${agent.name}...")
- For subsequent messages in the same conversation: Use brief acknowledgments (e.g., "⚓ Aye," "⚓ Understood," "⚓ Right away,")
- Focus on being helpful rather than repetitive with introductions
- Maintain maritime personality without overwhelming the user

Always provide detailed, helpful responses that demonstrate your expertise in ${agent.category}. Prioritize clarity and usefulness in your responses.`

  if (threadContext) {
    prompt += `\n\n${threadContext}\n\nRemember this context throughout our conversation and reference it when relevant to provide more personalized and contextual assistance.`
  }

  return prompt
}
