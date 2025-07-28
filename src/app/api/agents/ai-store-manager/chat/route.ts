import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { getAIConfig } from '@/lib/ai/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { analyzeFiles } from '@/lib/ai/file-analysis'
import { UploadedFile } from '@/components/ui/FileUpload'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIStoreManagerChatRequest {
  message: string
  taskType: string
  threadId: string
  attachments?: UploadedFile[]
  userId?: string
}

// Enhanced system prompt for AI Store Manager
const AI_STORE_MANAGER_SYSTEM_PROMPT = `You are the AI Store Manager - a comprehensive e-commerce management assistant with intelligent routing capabilities. You maintain context across conversations and provide expert guidance on all aspects of store management.

## Your Core Expertise:

### 🎨 Product & Catalog Management
- AI-powered product creation from images and descriptions
- Inventory optimization and stock level management
- Product performance analysis and recommendations
- SEO optimization for product listings

### 📊 Analytics & Intelligence
- Sales performance analysis and insights
- Customer behavior analytics
- Market trend identification
- Revenue optimization strategies

### 🛒 Order & Customer Management
- Order processing and fulfillment optimization
- Customer service automation
- Return and refund management
- Customer retention strategies

### 📈 Marketing & Growth
- Marketing campaign optimization
- Social media content creation
- Email marketing automation
- Conversion rate optimization

### ⚙️ Operations & Automation
- Workflow automation setup
- Integration management
- Performance monitoring
- Cost optimization

## Your Approach:
- Maintain conversational context and memory
- Provide actionable, specific recommendations
- Ask clarifying questions when needed
- Route complex requests to specialized capabilities
- Always consider the business impact of suggestions
- Use maritime-themed language when appropriate (professional but engaging)

## Response Format:
- Be concise but comprehensive
- Use bullet points and structured formatting
- Include specific next steps when applicable
- Provide relevant metrics or data when available

Remember: You are the central hub for all store management needs. When users have complex requests that might benefit from specialized agents, acknowledge this and provide comprehensive guidance while maintaining your role as the primary interface.`

export async function POST(request: NextRequest) {
  try {
    console.log('🏪 AI STORE MANAGER API: Request received')

    const user = await requireAuth()
    console.log('🏪 AI STORE MANAGER API: User authenticated:', user.id)

    const body: AIStoreManagerChatRequest = await request.json()
    const { message, taskType, threadId, attachments = [] } = body

    console.log('🏪 AI STORE MANAGER API: Request details:', {
      message: message.substring(0, 100) + '...',
      taskType,
      threadId,
      attachmentsCount: attachments.length,
      isTemporaryThread: threadId?.startsWith('temp-')
    })

    if (!threadId) {
      console.log('🏪 AI STORE MANAGER API: Error - No thread ID provided')
      return NextResponse.json(
        { error: 'Thread ID is required for chat conversations' },
        { status: 400 }
      )
    }

    // Initialize Supabase
    const supabase = createSupabaseServerClient()

    // Get AI configuration
    const aiConfig = getAIConfig()
    if (!aiConfig.openai.apiKey) {
      console.log('🏪 AI STORE MANAGER API: Error - OpenAI API key not configured')
      return NextResponse.json(
        { error: 'AI service not properly configured' },
        { status: 500 }
      )
    }

    // Process file attachments if any
    let attachmentAnalysis = ''
    if (attachments.length > 0) {
      console.log('🏪 AI STORE MANAGER API: Processing attachments...')
      try {
        const analysisResults = await analyzeFiles(attachments)
        attachmentAnalysis = analysisResults.map(result => 
          `\n\nFile: ${result.fileName}\nAnalysis: ${result.analysis}`
        ).join('')
      } catch (error) {
        console.error('🏪 AI STORE MANAGER API: Error analyzing attachments:', error)
        attachmentAnalysis = '\n\nNote: Some attachments could not be processed.'
      }
    }

    // Get conversation history
    console.log('🏪 AI STORE MANAGER API: Fetching conversation history...')
    let history: any[] = []
    let historyError: any = null

    if (threadId && !threadId.startsWith('temp-')) {
      // Real thread ID - get thread-specific history
      const result = await supabase
        .from('chat_history')
        .select('*')
        .eq('thread_id', threadId)
        .order('timestamp', { ascending: true })
        .limit(20)

      history = result.data
      historyError = result.error
    } else {
      // Temporary session or no thread - get recent user history for this agent
      const result = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_name', 'ai-store-manager')
        .eq('task_type', 'business_automation')
        .is('thread_id', null) // Get non-threaded messages
        .order('timestamp', { ascending: true })
        .limit(20)

      history = result.data
      historyError = result.error
    }

    if (historyError) {
      console.error('🏪 AI STORE MANAGER API: Error fetching history:', historyError)
    }

    console.log('🏪 AI STORE MANAGER API: History loaded:', {
      messageCount: history?.length || 0,
      threadId: threadId?.startsWith('temp-') ? 'temporary' : threadId
    })

    // Build conversation history for LangChain
    const conversationHistory: (SystemMessage | HumanMessage | AIMessage)[] = []

    // Add system prompt
    conversationHistory.push(new SystemMessage(AI_STORE_MANAGER_SYSTEM_PROMPT))

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach((msg: any) => {
        if (msg.message_type === 'user') {
          conversationHistory.push(new HumanMessage(msg.content))
        } else if (msg.message_type === 'agent') {
          conversationHistory.push(new AIMessage(msg.content))
        }
      })
    }

    // Add current message
    const currentMessage = `${message}${attachmentAnalysis}`
    conversationHistory.push(new HumanMessage(currentMessage))

    // Initialize LangChain with GPT-4
    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: 'gpt-4-turbo-preview',
      maxTokens: 4000,
      temperature: 0.7
    })

    // Generate AI response
    console.log('🏪 AI STORE MANAGER API: Generating AI response...')
    const startTime = Date.now()

    const aiResponse = await llm.invoke(conversationHistory)
    const endTime = Date.now()
    const response = aiResponse.content as string

    console.log('🏪 AI STORE MANAGER API: AI response generated successfully', {
      responseLength: response.length,
      latency: endTime - startTime
    })

    // Determine the actual thread ID to save (null for temporary sessions)
    const saveThreadId = threadId && !threadId.startsWith('temp-') ? threadId : null

    console.log('🏪 AI STORE MANAGER API: Saving messages with thread ID:', {
      originalThreadId: threadId,
      saveThreadId,
      isTemporary: threadId?.startsWith('temp-')
    })

    // Save user message to history
    const { error: userMessageError } = await supabase.from('chat_history').insert({
      user_id: user.id,
      agent_name: 'ai-store-manager',
      message_type: 'user',
      content: message,
      task_type: taskType,
      thread_id: saveThreadId
    })

    if (userMessageError) {
      console.error('🏪 AI STORE MANAGER API: Error saving user message:', userMessageError)
    }

    // Save agent response to history
    const { error: agentMessageError } = await supabase.from('chat_history').insert({
      user_id: user.id,
      agent_name: 'ai-store-manager',
      message_type: 'agent',
      content: response,
      task_type: taskType,
      thread_id: saveThreadId
    })

    if (agentMessageError) {
      console.error('🏪 AI STORE MANAGER API: Error saving agent message:', agentMessageError)
    }

    // Update thread's updated_at timestamp if this is a real thread
    if (saveThreadId) {
      const { error: updateError } = await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', saveThreadId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('🏪 AI STORE MANAGER API: Error updating thread timestamp:', updateError)
      } else {
        console.log('🏪 AI STORE MANAGER API: Updated thread timestamp for:', saveThreadId)
      }
    }

    console.log('🏪 AI STORE MANAGER API: Response completed successfully')

    return NextResponse.json({
      response,
      success: true,
      metadata: {
        model: 'gpt-4-turbo-preview',
        tokensUsed: Math.ceil(response.length / 4),
        latency: endTime - startTime,
        threadId: saveThreadId || threadId,
        hasHistory: (history?.length || 0) > 0
      }
    })

  } catch (error) {
    console.error('🏪 AI STORE MANAGER API: Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process chat request',
        success: false 
      },
      { status: 500 }
    )
  }
}
