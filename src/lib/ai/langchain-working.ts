// Working LangChain Implementation
import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from './config'
import type { Agent } from '../agents'

export interface LangChainResponse {
  response: string
  tokensUsed: number
  latency: number
  model: string
  success: boolean
  error?: string
  metadata?: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    urgency?: 'low' | 'medium' | 'high' | 'critical'
    category?: string
    escalationRequired?: boolean
    suggestedActions?: string[]
  }
}

export interface CustomerSupportContext {
  customerHistory?: string[]
  ticketId?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  previousInteractions?: number
  customerTier?: 'basic' | 'premium' | 'enterprise'
}

export class LangChainAgent {
  private agent: Agent
  private systemPrompt: string
  private llm: ChatOpenAI

  constructor(config: { agent: Agent; systemPrompt: string }) {
    this.agent = config.agent
    this.systemPrompt = config.systemPrompt
    this.llm = this.initializeLLM()
  }

  private initializeLLM(): ChatOpenAI {
    const aiConfig = getAIConfig()
    return new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: aiConfig.openai.model,
      maxTokens: aiConfig.openai.maxTokens,
      temperature: aiConfig.openai.temperature
    })
  }

  async processMessage(message: string, context?: string | CustomerSupportContext): Promise<LangChainResponse> {
    const startTime = Date.now()

    try {
      const systemMessage = this.buildSystemPrompt()
      const contextStr = this.formatContext(context)
      const fullPrompt = `${systemMessage}\n\n${contextStr}User Message: ${message}\n\nProvide a helpful response and analyze the message for sentiment, urgency, and escalation needs:`

      const response = await this.llm.invoke([{ role: 'user', content: fullPrompt }])
      const responseText = response.content as string

      // Enhanced response processing for customer support
      const metadata = this.agent.id === 'coral' ? this.analyzeCustomerMessage(message, responseText) : undefined

      return {
        response: responseText,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: true,
        metadata
      }
    } catch (error) {
      console.error('LangChain error:', error)
      return {
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private formatContext(context?: string | CustomerSupportContext): string {
    if (!context) return ''

    if (typeof context === 'string') {
      return `Context: ${context}\n\n`
    }

    // Format CustomerSupportContext
    let contextStr = 'Customer Support Context:\n'
    if (context.ticketId) contextStr += `- Ticket ID: ${context.ticketId}\n`
    if (context.priority) contextStr += `- Priority: ${context.priority}\n`
    if (context.category) contextStr += `- Category: ${context.category}\n`
    if (context.customerTier) contextStr += `- Customer Tier: ${context.customerTier}\n`
    if (context.previousInteractions) contextStr += `- Previous Interactions: ${context.previousInteractions}\n`
    if (context.customerHistory?.length) {
      contextStr += `- Recent History:\n${context.customerHistory.map(h => `  • ${h}`).join('\n')}\n`
    }
    return contextStr + '\n'
  }

  private analyzeCustomerMessage(message: string, response: string): LangChainResponse['metadata'] {
    // Simple sentiment analysis based on keywords
    const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'hate', 'worst', 'broken', 'useless', 'disappointed']
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'down', 'not working', 'broken']
    const escalationWords = ['manager', 'supervisor', 'cancel', 'refund', 'lawsuit', 'complaint']

    const messageLower = message.toLowerCase()

    const sentiment = negativeWords.some(word => messageLower.includes(word)) ? 'negative' :
                     messageLower.includes('thank') || messageLower.includes('great') || messageLower.includes('good') ? 'positive' : 'neutral'

    const urgency = urgentWords.some(word => messageLower.includes(word)) ? 'high' :
                   messageLower.includes('when') || messageLower.includes('how long') ? 'medium' : 'low'

    const escalationRequired = escalationWords.some(word => messageLower.includes(word)) ||
                              (sentiment === 'negative' && urgency === 'high')

    const suggestedActions = []
    if (escalationRequired) suggestedActions.push('Consider escalation to human agent')
    if (sentiment === 'negative') suggestedActions.push('Follow up with customer satisfaction survey')
    if (urgency === 'high') suggestedActions.push('Prioritize response and resolution')

    return {
      sentiment,
      urgency: urgency as 'low' | 'medium' | 'high',
      escalationRequired,
      suggestedActions
    }
  }

  private buildSystemPrompt(): string {
    if (this.agent.id === 'coral') {
      return this.buildCoralSystemPrompt()
    }

    return `You are ${this.agent.name}, a ${this.agent.title} specialist in the CrewFlow maritime AI automation platform.

${this.agent.description}

Your role and capabilities:
- Framework: LangChain with ${this.agent.optimalAiModules.join(', ')}
- Specialization: ${this.agent.category}
- Available integrations: ${this.agent.integrations.join(', ')}

System Instructions:
${this.systemPrompt}

Key Guidelines:
- Provide expert-level assistance in ${this.agent.category}
- Use your specialized knowledge and integrations
- Maintain a professional, helpful tone
- Focus on practical, actionable solutions`
  }

  private buildCoralSystemPrompt(): string {
    return `You are Coral, the Customer Support specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY & MISSION:
You are an expert customer support agent with deep knowledge of customer service best practices, policy compliance, and workflow management. Your mission is to provide exceptional, empathetic, and efficient customer support while maintaining company policies and standards.

SPECIALIZED CAPABILITIES:
- Advanced sentiment analysis and emotional intelligence
- Policy compliance and escalation protocols
- Multi-channel support coordination (email, chat, phone, social media)
- Customer data management and CRM integration
- Knowledge base creation and maintenance
- Workflow automation for support processes

AVAILABLE INTEGRATIONS:
${this.agent.integrations.join(', ')} - Use these to provide comprehensive support solutions

CUSTOMER SUPPORT PROTOCOLS:

1. GREETING & ACKNOWLEDGMENT:
   - Always acknowledge the customer's concern immediately
   - Use empathetic language and show understanding
   - Confirm details to ensure accuracy

2. PROBLEM ANALYSIS:
   - Ask clarifying questions to fully understand the issue
   - Categorize the problem type (technical, billing, product, etc.)
   - Assess urgency and impact on the customer

3. SOLUTION DELIVERY:
   - Provide clear, step-by-step solutions
   - Offer multiple options when possible
   - Explain the reasoning behind recommendations
   - Set realistic expectations for resolution times

4. ESCALATION CRITERIA:
   - Technical issues beyond first-level support
   - Billing disputes over $500
   - Customer requests for manager/supervisor
   - Threats of legal action or complaints to authorities
   - Repeated unresolved issues (3+ interactions)

5. FOLLOW-UP & CLOSURE:
   - Confirm the solution resolved the issue
   - Provide additional resources or documentation
   - Schedule follow-up if needed
   - Document the interaction for future reference

COMMUNICATION STYLE:
- Professional yet warm and approachable
- Clear and concise explanations
- Avoid technical jargon unless necessary
- Use positive language and solution-focused responses
- Show genuine concern for customer satisfaction

POLICY COMPLIANCE:
- Always follow company policies and procedures
- Protect customer privacy and data security
- Document all interactions according to standards
- Escalate when policies require management approval
- Never make promises outside your authority

${this.systemPrompt ? `\nADDITIONAL INSTRUCTIONS:\n${this.systemPrompt}` : ''}

Remember: Your goal is not just to solve problems, but to create positive customer experiences that build loyalty and trust.`
  }

  async handlePresetAction(actionId: string, params: any = {}): Promise<LangChainResponse> {
    const action = this.agent.presetActions.find(a => a.id === actionId)
    if (!action) {
      return this.processMessage(`Execute action: ${actionId}`, JSON.stringify(params))
    }

    // Enhanced preset action handling for Coral
    if (this.agent.id === 'coral') {
      return this.handleCoralPresetAction(actionId, params, action)
    }

    const message = `Execute the preset action "${action.label}": ${action.description}. Parameters: ${JSON.stringify(params)}`
    return this.processMessage(message)
  }

  private async handleCoralPresetAction(actionId: string, params: any, action: any): Promise<LangChainResponse> {
    const startTime = Date.now()

    try {
      let prompt = ''

      switch (actionId) {
        case 'generate_response':
          prompt = `Create a professional customer support response template for the following scenario:

Customer Issue: ${params.issue || 'General inquiry'}
Customer Tone: ${params.tone || 'neutral'}
Priority: ${params.priority || 'medium'}
Category: ${params.category || 'general'}

Generate a comprehensive response that includes:
1. Acknowledgment and empathy
2. Clear explanation or solution
3. Next steps or follow-up actions
4. Professional closing

Make it adaptable for similar situations.`
          break

        case 'escalate_ticket':
          prompt = `Prepare an escalation summary for the following customer support case:

Issue Details: ${params.issue || 'Not specified'}
Customer Information: ${params.customer || 'Not provided'}
Previous Actions Taken: ${params.actions || 'None specified'}
Escalation Reason: ${params.reason || 'Customer request'}

Create a comprehensive escalation summary that includes:
1. Clear problem statement
2. Customer impact assessment
3. Actions already attempted
4. Recommended next steps
5. Urgency level and justification`
          break

        case 'analyze_sentiment':
          prompt = `Analyze the customer sentiment and provide insights for the following interaction:

Customer Message: "${params.message || 'No message provided'}"
Context: ${params.context || 'No additional context'}

Provide analysis including:
1. Overall sentiment (positive/negative/neutral)
2. Emotional indicators
3. Urgency level
4. Satisfaction likelihood
5. Recommended response approach`
          break

        case 'update_customer':
          prompt = `Generate a customer record update summary for:

Customer ID: ${params.customerId || 'Not provided'}
Update Type: ${params.updateType || 'General update'}
Changes Made: ${params.changes || 'Not specified'}
Integration Target: ${params.integration || 'CRM system'}

Create an update summary that includes:
1. Customer identification
2. Changes made and rationale
3. System synchronization notes
4. Follow-up requirements`
          break

        case 'create_knowledge':
          prompt = `Create a knowledge base entry for the following support case:

Issue Type: ${params.issueType || 'General'}
Problem Description: ${params.problem || 'Not specified'}
Solution Applied: ${params.solution || 'Not provided'}
Category: ${params.category || 'General'}

Generate a knowledge base article that includes:
1. Clear problem title and description
2. Step-by-step solution
3. Alternative approaches
4. Prevention tips
5. Related articles or resources`
          break

        default:
          prompt = `Execute the customer support action "${action.label}": ${action.description}. Parameters: ${JSON.stringify(params)}`
      }

      const response = await this.llm.invoke([{ role: 'user', content: prompt }])

      return {
        response: response.content as string,
        tokensUsed: response.usage?.totalTokens || 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: true,
        metadata: {
          actionId,
          category: action.category,
          estimatedTime: action.estimatedTime
        }
      }
    } catch (error) {
      console.error('Coral preset action error:', error)
      return {
        response: `I apologize, but I encountered an error while executing the ${action.label} action. Please try again.`,
        tokensUsed: 0,
        latency: Date.now() - startTime,
        model: this.llm.model,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export function createLangChainAgent(agent: Agent, systemPrompt: string): LangChainAgent {
  return new LangChainAgent({ agent, systemPrompt })
}
