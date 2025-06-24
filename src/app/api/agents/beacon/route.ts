import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createLangChainAgent } from '@/lib/ai/langchain-working'
import { createAutoGenAgent } from '@/lib/ai/autogen'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Beacon agent configuration
    const beacon = getAgent('beacon')
    if (!beacon) {
      return NextResponse.json(
        { error: 'Beacon agent not found' },
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

    let response
    if (action) {
      // Handle preset actions with hybrid approach
      response = await handleBeaconPresetAction(action, params, message)
    } else {
      // Handle regular chat message with intelligent routing
      response = await handleBeaconMessage(message, context)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'beacon',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: beacon.costPerRequest,
        metadata: {
          action: action || null,
          framework: response.framework || 'hybrid',
          project_management_focus: true,
          agent_steps: response.agentSteps?.length || 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: response.framework || 'hybrid',
      agentSteps: response.agentSteps || [],
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: beacon.costPerRequest
      }
    })

  } catch (error) {
    console.error('Beacon agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleBeaconMessage(message: string, context?: string) {
  const beacon = getAgent('beacon')!
  
  // Determine if we need complex workflow orchestration (AutoGen) or content generation (LangChain)
  const needsWorkflow = /workflow|process|automation|orchestration|complex|multi-step|coordinate/i.test(message)
  
  if (needsWorkflow) {
    // Use AutoGen for complex project workflows and coordination
    const autogenAgent = createAutoGenAgent(beacon, getBeaconAutoGenPrompt())
    const result = await autogenAgent.processMessage(message, context)
    return {
      ...result,
      framework: 'autogen'
    }
  } else {
    // Use LangChain for project planning, reporting, and content generation
    const langchainAgent = createLangChainAgent(beacon, getBeaconLangChainPrompt())
    const result = await langchainAgent.processMessage(message, context)
    return {
      ...result,
      framework: 'langchain'
    }
  }
}

async function handleBeaconPresetAction(actionId: string, params: any, message?: string) {
  const beacon = getAgent('beacon')!
  const startTime = Date.now()
  
  try {
    let prompt = ''
    let useAutoGen = false
    
    switch (actionId) {
      case 'create_project':
        useAutoGen = true // Use AutoGen for complex project planning
        prompt = `Create a comprehensive project plan with the following specifications:

Project Name: ${params.projectName || 'New Project'}
Project Type: ${params.projectType || 'General project'}
Duration: ${params.duration || '3 months'}
Team Size: ${params.teamSize || '5-10 people'}
Budget: ${params.budget || 'Medium budget'}
Complexity: ${params.complexity || 'Medium complexity'}
Stakeholders: ${params.stakeholders || 'Internal team and management'}

Design comprehensive project plan including:
1. Project scope and objectives definition
2. Work breakdown structure (WBS)
3. Task dependencies and critical path
4. Resource allocation and team assignments
5. Timeline and milestone planning
6. Risk assessment and mitigation strategies
7. Communication and reporting framework
8. Quality assurance and testing plans
9. Budget allocation and cost tracking
10. Success criteria and KPIs

Provide detailed project management framework with clear deliverables.`
        break

      case 'assign_tasks':
        prompt = `Assign and distribute tasks to team members:

Project: ${params.project || 'Current project'}
Team Members: ${params.teamMembers || 'Development team'}
Task Types: ${params.taskTypes || 'Various project tasks'}
Skills Required: ${params.skills || 'Mixed skill requirements'}
Timeline: ${params.timeline || 'Standard timeline'}
Workload Balance: ${params.workload || 'Balanced distribution'}

Create task assignment strategy including:
1. Task analysis and skill matching
2. Team member capacity assessment
3. Workload balancing and optimization
4. Task priority and dependency mapping
5. Assignment communication templates
6. Progress tracking mechanisms
7. Escalation procedures for blockers
8. Performance monitoring framework

Deliver structured task assignment and management plan.`
        break

      case 'track_progress':
        prompt = `Track and analyze project progress:

Project: ${params.project || 'Current project'}
Tracking Period: ${params.period || 'Weekly'}
Key Metrics: ${params.metrics || 'Timeline, budget, quality'}
Reporting Level: ${params.reporting || 'Management dashboard'}
Team Size: ${params.teamSize || 'Medium team'}

Provide comprehensive progress tracking including:
1. Milestone completion status
2. Task progress and velocity analysis
3. Budget utilization and burn rate
4. Resource allocation efficiency
5. Risk and issue identification
6. Quality metrics and deliverable status
7. Team performance and productivity
8. Stakeholder communication updates
9. Corrective action recommendations
10. Forecast and projection updates

Create detailed progress monitoring and reporting framework.`
        break

      case 'generate_reports':
        prompt = `Generate comprehensive project status reports:

Project: ${params.project || 'Current project'}
Report Type: ${params.reportType || 'Executive summary'}
Audience: ${params.audience || 'Stakeholders and management'}
Frequency: ${params.frequency || 'Weekly'}
Detail Level: ${params.detail || 'High-level with key details'}

Create project status reports including:
1. Executive summary and key highlights
2. Project health and status indicators
3. Milestone achievements and upcoming deadlines
4. Budget status and financial projections
5. Risk and issue summary with mitigation
6. Team performance and resource utilization
7. Quality metrics and deliverable status
8. Stakeholder feedback and requirements
9. Next steps and action items
10. Recommendations and strategic insights

Deliver professional, actionable project reporting framework.`
        break

      default:
        prompt = `Execute project management action "${actionId}": ${JSON.stringify(params)}`
    }

    let result
    if (useAutoGen) {
      const autogenAgent = createAutoGenAgent(beacon, getBeaconAutoGenPrompt())
      result = await autogenAgent.processMessage(prompt)
      result.framework = 'autogen'
    } else {
      const langchainAgent = createLangChainAgent(beacon, getBeaconLangChainPrompt())
      result = await langchainAgent.processMessage(prompt)
      result.framework = 'langchain'
    }
    
    return {
      response: result.response,
      tokensUsed: result.tokensUsed,
      latency: Date.now() - startTime,
      model: result.model,
      success: true,
      framework: result.framework,
      agentSteps: result.agentSteps || []
    }

  } catch (error) {
    console.error('Beacon preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the project management action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getBeaconLangChainPrompt(): string {
  return `You are Beacon, the Project Management specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert project manager with deep knowledge of:
- Project planning and execution methodologies
- Team coordination and resource management
- Progress tracking and performance monitoring
- Risk management and issue resolution
- Stakeholder communication and reporting
- Quality assurance and delivery management

CAPABILITIES:
- Project planning and scope definition
- Task assignment and team coordination
- Progress monitoring and reporting
- Risk assessment and mitigation
- Stakeholder communication
- Quality and delivery management

SPECIALIZATIONS:
- Agile and traditional project methodologies
- Cross-functional team management
- Project portfolio management
- Resource optimization and allocation
- Performance tracking and analytics
- Change management and adaptation

FRAMEWORK: LangChain
- Focus on structured project management processes
- Provide detailed planning and documentation
- Create comprehensive reporting frameworks
- Develop systematic project approaches

RESPONSE STYLE:
- Organized and methodical
- Clear action items and deliverables
- Structured timelines and milestones
- Focus on measurable outcomes
- Professional project communication

MARITIME THEME INTEGRATION:
- "Steering" projects to success
- "Navigating" project challenges
- "Charting course" for deliverables
- "Anchoring" project foundations
- "Setting sail" with new initiatives

KEY GUIDELINES:
1. Always provide clear project structure and organization
2. Focus on actionable tasks and deliverables
3. Include realistic timelines and resource requirements
4. Consider risk factors and mitigation strategies
5. Emphasize team collaboration and communication
6. Provide measurable success criteria and KPIs
7. Balance scope, time, cost, and quality constraints

Remember: Great project management requires clear vision, systematic execution, and adaptive leadership to deliver value.`
}

function getBeaconAutoGenPrompt(): string {
  return `You are Beacon, the Project Management specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert project orchestration and workflow coordination specialist with deep knowledge of:
- Complex project workflow design and automation
- Multi-team coordination and collaboration
- Project process optimization and efficiency
- Cross-functional project orchestration
- Automated project monitoring and control
- Scalable project management systems

CAPABILITIES:
- Complex project workflow orchestration
- Multi-team coordination and communication
- Automated project monitoring and alerts
- Process optimization and efficiency improvement
- Resource allocation and optimization
- Performance analytics and reporting

SPECIALIZATIONS:
- Enterprise project portfolio management
- Cross-functional team coordination
- Automated project workflows
- Resource optimization algorithms
- Performance monitoring systems
- Scalable project architectures

FRAMEWORK: AutoGen Multi-Agent System
- Project Planner Agent: Develops comprehensive project strategies
- Resource Manager Agent: Optimizes team and resource allocation
- Progress Monitor Agent: Tracks performance and identifies issues
- Risk Analyst Agent: Assesses and mitigates project risks
- Coordinator Agent: Orchestrates multi-agent collaboration

RESPONSE STYLE:
- Systematic and process-oriented
- Clear workflow specifications
- Detailed coordination plans
- Measurable performance metrics
- Scalable automation frameworks

MARITIME THEME INTEGRATION:
- "Charting course" for complex projects
- "Navigating" multi-team coordination
- "Anchoring" project processes
- "Setting sail" with automated workflows
- "Weathering" project challenges

KEY GUIDELINES:
1. Design for scalability and automation
2. Break complex projects into manageable workflows
3. Include multi-agent coordination mechanisms
4. Provide clear performance monitoring
5. Consider cross-functional dependencies
6. Focus on measurable business outcomes
7. Design for continuous optimization

Remember: Great project orchestration requires systematic coordination of people, processes, and technology at scale.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'beacon',
    status: 'active',
    framework: 'hybrid',
    capabilities: [
      'project_planning',
      'task_assignment',
      'progress_tracking',
      'team_coordination',
      'status_reporting',
      'workflow_orchestration'
    ],
    integrations: ['jira', 'asana', 'monday', 'trello', 'microsoft-project'],
    hybridApproach: {
      langchain: 'Project planning, reporting, documentation',
      autogen: 'Complex workflows, multi-team coordination, process automation'
    }
  })
}
