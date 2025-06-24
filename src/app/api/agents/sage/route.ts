import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createLangChainAgent } from '@/lib/ai/langchain-working'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Sage agent configuration
    const sage = getAgent('sage')
    if (!sage) {
      return NextResponse.json(
        { error: 'Sage agent not found' },
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

    // Create LangChain agent instance
    const langchainAgent = createLangChainAgent(sage, getSageSystemPrompt())

    let response
    if (action) {
      // Handle preset actions
      response = await handleSagePresetAction(langchainAgent, action, params)
    } else {
      // Handle regular chat message
      response = await langchainAgent.processMessage(message, context)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'sage',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: sage.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'langchain',
          knowledge_focus: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: 'langchain',
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: sage.costPerRequest
      }
    })

  } catch (error) {
    console.error('Sage agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleSagePresetAction(langchainAgent: any, actionId: string, params: any) {
  const startTime = Date.now()
  
  try {
    let prompt = ''
    
    switch (actionId) {
      case 'search_documents':
        prompt = `Search and analyze company documents for the following query:

Search Query: ${params.query || 'Please specify search terms'}
Document Types: ${params.documentTypes || 'All document types'}
Date Range: ${params.dateRange || 'All dates'}
Relevance Threshold: ${params.relevance || 'High relevance'}

Perform comprehensive document search including:
1. Keyword and semantic search across documents
2. Relevance ranking and scoring
3. Document summary and key findings
4. Related document suggestions
5. Information extraction and synthesis
6. Source attribution and citations
7. Knowledge gaps identification
8. Search result categorization

Provide organized, actionable search results with clear source references.`
        break

      case 'summarize_content':
        prompt = `Create a comprehensive summary of the following content:

Content to Summarize: ${params.content || 'Please provide content to summarize'}
Summary Length: ${params.length || 'Medium (2-3 paragraphs)'}
Focus Areas: ${params.focus || 'Key points and actionable insights'}
Target Audience: ${params.audience || 'Business professionals'}

Generate structured summary including:
1. Executive summary with key takeaways
2. Main points and supporting details
3. Important statistics and data
4. Actionable insights and recommendations
5. Key stakeholders and responsibilities
6. Timeline and deadlines (if applicable)
7. Related topics and cross-references
8. Follow-up questions and areas for exploration

Deliver clear, concise, and actionable summary content.`
        break

      case 'create_knowledge_base':
        prompt = `Design and structure a comprehensive knowledge base:

Knowledge Domain: ${params.domain || 'General business knowledge'}
Content Sources: ${params.sources || 'Internal documents and data'}
User Groups: ${params.users || 'All employees'}
Organization Structure: ${params.structure || 'Hierarchical categories'}
Access Levels: ${params.access || 'Role-based permissions'}

Create knowledge base framework including:
1. Information architecture and taxonomy
2. Content categorization and tagging system
3. Search and discovery mechanisms
4. Content creation and maintenance workflows
5. Quality control and review processes
6. User access and permission management
7. Integration with existing systems
8. Performance metrics and analytics
9. Content lifecycle management
10. Training and adoption strategies

Provide comprehensive knowledge management strategy.`
        break

      case 'answer_questions':
        prompt = `Answer the following question using company knowledge and data:

Question: ${params.question || 'Please provide a question'}
Context: ${params.context || 'General business context'}
Required Detail Level: ${params.detail || 'Comprehensive'}
Source Preference: ${params.sources || 'All available sources'}

Provide comprehensive answer including:
1. Direct answer to the question
2. Supporting evidence and data
3. Source citations and references
4. Related information and context
5. Alternative perspectives or considerations
6. Confidence level and limitations
7. Recommended follow-up actions
8. Additional resources for deeper learning

Ensure accuracy, completeness, and actionable insights.`
        break

      default:
        prompt = `Execute knowledge management action "${actionId}": ${JSON.stringify(params)}`
    }

    const response = await langchainAgent.processMessage(prompt)
    
    return {
      response: response.response,
      tokensUsed: response.tokensUsed,
      latency: Date.now() - startTime,
      model: response.model,
      success: true,
      framework: 'langchain'
    }

  } catch (error) {
    console.error('Sage preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the knowledge management action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getSageSystemPrompt(): string {
  return `You are Sage, the Knowledge Management specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert knowledge management professional with deep expertise in:
- Information architecture and organization
- Document search and retrieval systems
- Content summarization and synthesis
- Knowledge base design and maintenance
- Information extraction and analysis
- Question answering and research

CAPABILITIES:
- Advanced document search and analysis
- Intelligent content summarization
- Knowledge base architecture design
- Information synthesis and extraction
- Question answering with source attribution
- Content organization and categorization

SPECIALIZATIONS:
- Enterprise knowledge management
- Document intelligence and processing
- Information retrieval and search
- Content lifecycle management
- Knowledge discovery and mining
- Organizational learning systems

FRAMEWORK: LangChain
- Leverage advanced NLP and NER capabilities
- Provide structured information processing
- Create systematic knowledge organization
- Develop comprehensive search strategies

RESPONSE STYLE:
- Precise and well-organized
- Clear source attribution
- Structured information presentation
- Actionable insights and recommendations
- Comprehensive yet concise

MARITIME THEME INTEGRATION:
- "Navigating" vast seas of information
- "Charting" knowledge territories
- "Anchoring" insights with solid sources
- "Setting course" for learning objectives
- "Weathering" information overload

KEY GUIDELINES:
1. Always provide clear source attribution
2. Organize information in logical, accessible structures
3. Focus on actionable insights and practical applications
4. Maintain high standards for accuracy and relevance
5. Consider multiple perspectives and viewpoints
6. Identify knowledge gaps and learning opportunities
7. Provide clear next steps and recommendations

Remember: Great knowledge management transforms information into wisdom, making organizational intelligence accessible and actionable.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'sage',
    status: 'active',
    framework: 'langchain',
    capabilities: [
      'document_search',
      'content_summarization',
      'knowledge_base_creation',
      'question_answering',
      'information_extraction',
      'content_organization'
    ],
    integrations: ['notion', 'confluence', 'sharepoint', 'google-drive', 'dropbox'],
    specialization: 'enterprise knowledge management and information retrieval'
  })
}
