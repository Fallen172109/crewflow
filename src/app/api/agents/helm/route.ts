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

    const helm = getAgent('helm')
    if (!helm) {
      return NextResponse.json(
        { error: 'Helm agent not found' },
        { status: 404 }
      )
    }

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

    const langchainAgent = createLangChainAgent(helm, getHelmSystemPrompt())

    let response
    if (action) {
      response = await handleHelmPresetAction(langchainAgent, action, params)
    } else {
      response = await langchainAgent.processMessage(message, context)
    }

    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'helm',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: helm.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'langchain',
          hr_focus: true
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
        cost: helm.costPerRequest
      }
    })

  } catch (error) {
    console.error('Helm agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleHelmPresetAction(langchainAgent: any, actionId: string, params: any) {
  const startTime = Date.now()
  
  try {
    let prompt = ''
    
    switch (actionId) {
      case 'screen_candidates':
        prompt = `Screen job candidates for the following position:

Position: ${params.position || 'General position'}
Required Skills: ${params.skills || 'Not specified'}
Experience Level: ${params.experience || 'Mid-level'}
Company Culture: ${params.culture || 'Collaborative and innovative'}
Candidate Pool: ${params.candidates || 'Multiple candidates'}

Provide comprehensive candidate screening including:
1. Skills assessment and gap analysis
2. Experience evaluation and relevance
3. Cultural fit assessment
4. Interview question recommendations
5. Reference check guidelines
6. Salary expectation analysis
7. Candidate ranking and scoring
8. Next steps and recommendations

Deliver structured candidate evaluation framework.`
        break

      case 'schedule_interviews':
        prompt = `Coordinate interview scheduling for candidates:

Position: ${params.position || 'Open position'}
Candidates: ${params.candidates || 'Multiple candidates'}
Interview Panel: ${params.panel || 'Hiring manager and team'}
Timeline: ${params.timeline || 'Next 2 weeks'}
Interview Format: ${params.format || 'In-person and virtual options'}

Create interview scheduling plan including:
1. Interview process design and stages
2. Panel coordination and availability
3. Candidate communication templates
4. Scheduling logistics and coordination
5. Interview preparation materials
6. Evaluation criteria and scorecards
7. Follow-up and feedback collection
8. Decision-making timeline

Provide comprehensive interview coordination strategy.`
        break

      case 'onboard_employees':
        prompt = `Design employee onboarding process for new hires:

Role Type: ${params.roleType || 'General employee'}
Department: ${params.department || 'Various departments'}
Start Date: ${params.startDate || 'Flexible'}
Remote/Hybrid: ${params.workMode || 'Hybrid work environment'}
Company Size: ${params.companySize || 'Medium-sized company'}

Create comprehensive onboarding program including:
1. Pre-boarding preparation and communication
2. First day and week schedule
3. Training and orientation programs
4. System access and equipment setup
5. Mentor assignment and buddy system
6. Goal setting and performance expectations
7. Cultural integration activities
8. 30-60-90 day check-ins and milestones

Deliver structured onboarding experience framework.`
        break

      case 'manage_benefits':
        prompt = `Manage employee benefits enrollment and administration:

Employee Group: ${params.employeeGroup || 'All employees'}
Benefits Package: ${params.benefits || 'Standard benefits package'}
Enrollment Period: ${params.period || 'Annual enrollment'}
Communication Needs: ${params.communication || 'Clear, accessible information'}
Compliance Requirements: ${params.compliance || 'Standard compliance'}

Provide benefits management strategy including:
1. Benefits package overview and options
2. Enrollment process and timeline
3. Employee communication and education
4. Decision support tools and resources
5. Compliance and regulatory requirements
6. Cost analysis and budgeting
7. Vendor management and coordination
8. Ongoing administration and support

Create comprehensive benefits management framework.`
        break

      default:
        prompt = `Execute HR action "${actionId}": ${JSON.stringify(params)}`
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
    console.error('Helm preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the HR action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getHelmSystemPrompt(): string {
  return `You are Helm, the HR & Hiring specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert human resources professional with deep knowledge of:
- Talent acquisition and recruitment
- Employee onboarding and development
- Performance management and evaluation
- Benefits administration and compliance
- Employee relations and engagement
- HR policy development and implementation

CAPABILITIES:
- Candidate screening and assessment
- Interview coordination and management
- Employee onboarding and training
- Benefits enrollment and administration
- Performance review and development
- HR compliance and policy management

SPECIALIZATIONS:
- Recruitment and talent acquisition
- Employee lifecycle management
- Benefits and compensation administration
- Training and development programs
- Employee engagement and retention
- HR analytics and reporting

FRAMEWORK: LangChain
- Focus on systematic HR processes
- Provide structured recommendations
- Create detailed implementation plans
- Develop comprehensive HR strategies

RESPONSE STYLE:
- Professional and empathetic
- Clear policy and procedure guidance
- Structured implementation frameworks
- Focus on employee experience
- Compliance-aware recommendations

MARITIME THEME INTEGRATION:
- "Steering" HR initiatives
- "Navigating" employee relations
- "Charting course" for talent development
- "Anchoring" company culture
- "Setting sail" with new hires

KEY GUIDELINES:
1. Always consider legal compliance and best practices
2. Focus on positive employee experience
3. Provide clear, actionable HR guidance
4. Consider diversity, equity, and inclusion
5. Emphasize data-driven HR decisions
6. Balance company needs with employee welfare
7. Provide scalable HR solutions

Remember: Great HR management creates an environment where both employees and the organization can thrive.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'helm',
    status: 'active',
    framework: 'langchain',
    capabilities: [
      'candidate_screening',
      'interview_scheduling',
      'employee_onboarding',
      'benefits_management',
      'performance_management',
      'hr_compliance'
    ],
    integrations: ['workday', 'bamboohr', 'greenhouse', 'lever', 'adp'],
    specialization: 'human resources and talent management'
  })
}
