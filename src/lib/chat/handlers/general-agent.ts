// General Agent Chat Handler
// Handles chat for all general agents (coral, sage, helm, etc.)

import { 
  ChatHandler, 
  UnifiedChatRequest, 
  UnifiedChatResponse,
  ChatHandlerError 
} from '../types'
import { getAgent, canUserAccessAgent } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getFileAttachments, analyzeFileAttachments, createFileContext } from '@/lib/ai/file-analysis'
import { formatAgentResponse, formatErrorResponse } from '@/lib/ai/response-formatter'
import { analyzeDomain, shouldReferToSpecialist, generateReferralResponse } from '@/lib/ai/agent-routing'
import { trackReferral } from '@/lib/ai/referral-analytics'

export class GeneralAgentHandler implements ChatHandler {
  canHandle(request: UnifiedChatRequest): boolean {
    // Handle requests with agentId that are not Shopify-specialized
    if (request.agentId) {
      const agent = getAgent(request.agentId)
      return agent !== null && !agent.shopifySpecialized
    }
    
    // Handle requests explicitly marked as 'agent' type
    return request.chatType === 'agent'
  }

  async process(request: UnifiedChatRequest, user: any): Promise<UnifiedChatResponse> {
    try {
      console.log('🤖 GENERAL AGENT HANDLER: Processing request', {
        agentId: request.agentId,
        taskType: request.taskType,
        threadId: request.threadId,
        messageLength: request.message.length
      })

      // Validate agent exists and user has access
      if (!request.agentId) {
        throw new ChatHandlerError('Agent ID is required for general agent chat', 400)
      }

      const agent = getAgent(request.agentId)
      if (!agent) {
        throw new ChatHandlerError(`Agent with ID "${request.agentId}" not found`, 404)
      }

      if (!canUserAccessAgent(user.subscription_tier, request.agentId)) {
        throw new ChatHandlerError(`Access denied to agent "${agent.name}"`, 403)
      }

      const supabase = await createSupabaseServerClient()

      // Check usage limits
      const { data: usageData } = await supabase
        .from('user_agent_usage')
        .select('usage_count, daily_limit')
        .eq('user_id', user.id)
        .eq('agent_name', agent.id)
        .single()

      const currentUsage = usageData?.usage_count || 0
      const userLimit = usageData?.daily_limit || 50

      if (currentUsage >= userLimit) {
        throw new ChatHandlerError(`Daily usage limit (${userLimit}) reached for ${agent.name}`, 429)
      }

      // Handle file attachments if present
      let fileContext = ''
      if (request.attachments && request.attachments.length > 0) {
        try {
          const attachments = await getFileAttachments(request.attachments)
          const analysis = await analyzeFileAttachments(attachments)
          fileContext = createFileContext(analysis)
          console.log('🤖 GENERAL AGENT HANDLER: File context created', {
            attachmentCount: attachments.length,
            contextLength: fileContext.length
          })
        } catch (error) {
          console.error('🤖 GENERAL AGENT HANDLER: File analysis error:', error)
          // Continue without file context rather than failing
        }
      }

      // Load thread context if threadId provided
      let threadContext = ''
      if (request.threadId && !request.threadId.startsWith('temp-')) {
        try {
          const { data: messages } = await supabase
            .from('chat_history')
            .select('message_type, content')
            .eq('thread_id', request.threadId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(10) // Last 10 messages for context

          if (messages && messages.length > 0) {
            threadContext = messages
              .map(msg => `${msg.message_type}: ${msg.content}`)
              .join('\n')
          }
        } catch (error) {
          console.error('🤖 GENERAL AGENT HANDLER: Thread context error:', error)
          // Continue without thread context
        }
      }

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(agent, request.taskType, threadContext, fileContext)

      // Check for intelligent routing
      const domain = analyzeDomain(request.message)
      const shouldRefer = shouldReferToSpecialist(domain, agent.category)

      let response: string
      let aiResponse: any = null

      if (shouldRefer.should) {
        // Generate referral response
        response = generateReferralResponse(
          request.message,
          agent,
          shouldRefer.specialist,
          shouldRefer.reason
        )

        // Track referral analytics
        await trackReferral({
          fromAgent: agent.id,
          toAgent: shouldRefer.specialist.id,
          query: request.message,
          domain,
          reason: shouldRefer.reason,
          userId: user.id
        })
      } else {
        // Process with appropriate AI framework
        switch (agent.framework) {
          case 'langchain':
            const { createLangChainAgent } = await import('@/lib/ai/langchain-working')
            const langchainAgent = createLangChainAgent(agent, systemPrompt)
            aiResponse = await langchainAgent.processMessage(request.message)
            response = aiResponse.response
            break

          case 'perplexity':
            const { createPerplexityAgent } = await import('@/lib/ai/perplexity')
            const perplexityAgent = createPerplexityAgent(agent, systemPrompt)
            aiResponse = await perplexityAgent.processMessage(request.message)
            response = aiResponse.response
            break

          case 'autogen':
            const { createAutoGenAgent } = await import('@/lib/ai/autogen')
            const autogenAgent = createAutoGenAgent(agent, systemPrompt)
            aiResponse = await autogenAgent.processMessage(request.message)
            response = aiResponse.response
            break

          case 'hybrid':
            const { processAgentMessage } = await import('@/lib/ai')
            aiResponse = await processAgentMessage(agent, request.message, undefined, systemPrompt)
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

      // Format the response
      const formattedResponse = formatAgentResponse(response, agent.name)

      // Save conversation to database
      if (request.threadId && !request.threadId.startsWith('temp-')) {
        try {
          const { data: savedMessages } = await supabase
            .from('chat_history')
            .insert([
              {
                user_id: user.id,
                thread_id: request.threadId,
                agent_name: agent.id,
                message_type: 'user',
                content: request.message,
                task_type: request.taskType || 'general'
              },
              {
                user_id: user.id,
                thread_id: request.threadId,
                agent_name: agent.id,
                message_type: 'agent',
                content: formattedResponse,
                task_type: request.taskType || 'general'
              }
            ])
            .select('id')

          console.log('🤖 GENERAL AGENT HANDLER: Conversation saved', {
            messageIds: savedMessages?.map(m => m.id)
          })
        } catch (error) {
          console.error('🤖 GENERAL AGENT HANDLER: Database save error:', error)
          // Don't fail the request if database save fails
        }
      }

      // Track usage
      try {
        await supabase.rpc('increment_agent_usage', {
          p_user_id: user.id,
          p_agent_name: agent.id
        })
      } catch (error) {
        console.error('🤖 GENERAL AGENT HANDLER: Usage tracking error:', error)
        // Don't fail the request if usage tracking fails
      }

      return {
        response: formattedResponse,
        success: true,
        threadId: request.threadId,
        agent: {
          id: agent.id,
          name: agent.name,
          framework: agent.framework
        },
        usage: currentUsage + 1,
        limit: userLimit,
        tokensUsed: aiResponse?.tokensUsed
      }

    } catch (error) {
      console.error('🤖 GENERAL AGENT HANDLER: Error:', error)
      
      if (error instanceof ChatHandlerError) {
        throw error
      }

      throw new ChatHandlerError(
        `Failed to process agent chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  private buildSystemPrompt(agent: any, taskType?: string, threadContext?: string, fileContext?: string): string {
    let prompt = `You are ${agent.name}, ${agent.title}.

${agent.description}

Key Guidelines:
- Provide expert-level assistance in ${agent.category}
- Use your specialized knowledge and integrations
- Focus on practical, actionable solutions
- Use maritime terminology naturally but sparingly (navigate, chart course, anchor, set sail, etc.)

Intelligent Routing Protocol:
- You can answer basic questions in any domain using your general knowledge
- For complex questions clearly outside your ${agent.category} specialization, you may refer users to specialist agents
- Only refer when the question requires specialized tools, deep expertise, or domain-specific knowledge you don't possess
- When referring, provide a brief helpful response first, then explain why the specialist is better suited`

    if (taskType) {
      prompt += `\n\nCurrent Task Context: ${taskType}`
    }

    if (threadContext) {
      prompt += `\n\nConversation History:\n${threadContext}`
    }

    if (fileContext) {
      prompt += `\n\nFile Context:\n${fileContext}`
    }

    return prompt
  }
}
