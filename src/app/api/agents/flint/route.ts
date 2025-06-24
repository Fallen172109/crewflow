import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
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

    // Get Flint agent configuration
    const flint = getAgent('flint')
    if (!flint) {
      return NextResponse.json(
        { error: 'Flint agent not found' },
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

    // Create AutoGen agent instance
    const autogenAgent = createAutoGenAgent(flint, getFlintSystemPrompt())

    let response
    if (action) {
      // Handle preset actions
      response = await handleFlintPresetAction(autogenAgent, action, params)
    } else {
      // Handle regular chat message
      response = await autogenAgent.processMessage(message, context)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'flint',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: flint.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'autogen',
          workflow_focus: true,
          agent_steps: response.agentSteps?.length || 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: 'autogen',
      agentSteps: response.agentSteps || [],
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: flint.costPerRequest
      }
    })

  } catch (error) {
    console.error('Flint agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleFlintPresetAction(autogenAgent: any, actionId: string, params: any) {
  const startTime = Date.now()
  
  try {
    let prompt = ''
    
    switch (actionId) {
      case 'create_workflow':
        prompt = `Design a comprehensive automation workflow with the following specifications:

Business Process: ${params.process || 'General business process'}
Departments Involved: ${params.departments || 'Multiple departments'}
Current Pain Points: ${params.painPoints || 'Manual, time-consuming tasks'}
Desired Outcomes: ${params.outcomes || 'Increased efficiency and accuracy'}
Integration Requirements: ${params.integrations || 'Standard business tools'}
Complexity Level: ${params.complexity || 'Medium'}

Create a detailed workflow automation plan including:
1. Process mapping and current state analysis
2. Automation opportunities identification
3. Multi-step workflow design with decision points
4. Tool and integration requirements
5. Implementation timeline and phases
6. Success metrics and KPIs
7. Risk assessment and mitigation strategies
8. Training and change management plan
9. Monitoring and optimization procedures
10. ROI projections and cost-benefit analysis

Provide a comprehensive, actionable workflow automation strategy.`
        break

      case 'optimize_process':
        prompt = `Analyze and optimize the following business process:

Current Process: ${params.currentProcess || 'Existing business workflow'}
Performance Issues: ${params.issues || 'Inefficiencies and bottlenecks'}
Available Tools: ${params.tools || 'Standard business software'}
Team Size: ${params.teamSize || 'Small to medium team'}
Budget Constraints: ${params.budget || 'Moderate budget'}

Conduct comprehensive process optimization including:
1. Current process analysis and bottleneck identification
2. Workflow efficiency assessment
3. Automation opportunity mapping
4. Resource utilization optimization
5. Technology integration recommendations
6. Process redesign with automation points
7. Performance improvement projections
8. Implementation roadmap with priorities
9. Change management considerations
10. Continuous improvement framework

Deliver specific, actionable optimization recommendations.`
        break

      case 'schedule_tasks':
        prompt = `Create an automated task scheduling system:

Task Types: ${params.taskTypes || 'Various business tasks'}
Frequency Requirements: ${params.frequency || 'Daily, weekly, monthly'}
Dependencies: ${params.dependencies || 'Task interdependencies'}
Team Members: ${params.teamMembers || 'Multiple team members'}
Business Hours: ${params.businessHours || 'Standard business hours'}
Priority Levels: ${params.priorities || 'High, medium, low'}

Design comprehensive task scheduling automation including:
1. Task categorization and priority matrix
2. Automated scheduling algorithms
3. Dependency management system
4. Resource allocation optimization
5. Conflict resolution procedures
6. Notification and reminder systems
7. Progress tracking mechanisms
8. Escalation procedures for delays
9. Performance monitoring dashboards
10. Continuous schedule optimization

Provide detailed scheduling automation framework.`
        break

      case 'monitor_workflows':
        prompt = `Establish comprehensive workflow performance monitoring:

Workflows to Monitor: ${params.workflows || 'All active workflows'}
Key Metrics: ${params.metrics || 'Efficiency, accuracy, completion time'}
Reporting Frequency: ${params.reportingFrequency || 'Real-time and periodic'}
Alert Thresholds: ${params.thresholds || 'Performance degradation points'}
Stakeholders: ${params.stakeholders || 'Management and operations teams'}

Create workflow monitoring system including:
1. Performance metrics definition and tracking
2. Real-time monitoring dashboard design
3. Automated alert and notification systems
4. Trend analysis and pattern recognition
5. Bottleneck identification and resolution
6. Success rate and failure analysis
7. Resource utilization monitoring
8. Compliance and audit trail maintenance
9. Predictive analytics for proactive management
10. Continuous improvement recommendations

Deliver comprehensive monitoring and optimization strategy.`
        break

      default:
        prompt = `Execute workflow automation action "${actionId}": ${JSON.stringify(params)}`
    }

    const response = await autogenAgent.processMessage(prompt)
    
    return {
      response: response.response,
      tokensUsed: response.tokensUsed,
      latency: Date.now() - startTime,
      model: response.model,
      success: true,
      framework: 'autogen',
      agentSteps: response.agentSteps || []
    }

  } catch (error) {
    console.error('Flint preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the workflow automation action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getFlintSystemPrompt(): string {
  return `You are Flint, the Workflow Automation specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert business process automation architect with deep knowledge of:
- Multi-step workflow design and orchestration
- Business process optimization and reengineering
- Automation tool integration and deployment
- Task scheduling and resource management
- Performance monitoring and continuous improvement
- Change management and process adoption

CAPABILITIES:
- Complex workflow design and automation
- Multi-agent process orchestration
- Task scheduling and dependency management
- Performance monitoring and optimization
- Integration with business tools and systems
- Process documentation and training

SPECIALIZATIONS:
- Business process mapping and analysis
- Automation opportunity identification
- Workflow optimization and efficiency improvement
- Cross-departmental process coordination
- Compliance and audit trail management
- Scalable automation architecture

FRAMEWORK: AutoGen Multi-Agent System
- Planner Agent: Analyzes requirements and creates automation strategy
- Designer Agent: Creates detailed workflow specifications
- Implementer Agent: Develops automation solutions
- Monitor Agent: Tracks performance and identifies improvements
- Coordinator Agent: Orchestrates multi-agent collaboration

RESPONSE STYLE:
- Systematic and methodical approach
- Clear step-by-step processes
- Detailed implementation plans
- Measurable outcomes and KPIs
- Risk assessment and mitigation
- Scalable and maintainable solutions

MARITIME THEME INTEGRATION:
- "Charting course" for process automation
- "Navigating" complex workflows
- "Anchoring" processes with solid foundations
- "Setting sail" with new automations
- "Weathering" process challenges

KEY GUIDELINES:
1. Always break complex processes into manageable steps
2. Consider dependencies and potential bottlenecks
3. Design for scalability and maintainability
4. Include monitoring and optimization mechanisms
5. Provide clear implementation timelines
6. Consider change management and user adoption
7. Focus on measurable business outcomes

Remember: Great automation requires careful planning, systematic implementation, and continuous optimization.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'flint',
    status: 'active',
    framework: 'autogen',
    capabilities: [
      'workflow_design',
      'process_automation',
      'task_scheduling',
      'performance_monitoring',
      'process_optimization',
      'multi_agent_orchestration'
    ],
    integrations: ['zapier', 'microsoft-power-automate', 'ifttt', 'integromat', 'n8n'],
    multiAgentWorkflow: {
      agents: ['planner', 'designer', 'implementer', 'monitor', 'coordinator'],
      maxRounds: 4,
      specialization: 'workflow_automation'
    }
  })
}
