import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createLangChainAgent } from '@/lib/ai/langchain-working'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId, threadId } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Patch agent configuration
    const patch = getAgent('patch')
    if (!patch) {
      return NextResponse.json(
        { error: 'Patch agent not found' },
        { status: 404 }
      )
    }

    // Verify user authentication if userId provided
    let userProfile = null
    let threadContext = ''
    let fileContext = ''

    if (userId) {
      const supabase = await createSupabaseServerClient()
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      userProfile = profile

      // Load thread context if threadId is provided
      if (threadId) {
        const { data: thread } = await supabase
          .from('chat_threads')
          .select('title, context')
          .eq('id', threadId)
          .eq('user_id', userId)
          .single()

        if (thread) {
          threadContext = `\n\nThread Context:\nTitle: ${thread.title}\nBackground: ${thread.context || 'No additional context provided'}\n`
        }

        // Get and analyze file attachments
        try {
          const { getFileAttachments, analyzeFileAttachments, createFileContext } = await import('@/lib/ai/file-analysis')
          const attachments = await getFileAttachments(threadId, undefined, userId)
          if (attachments.length > 0) {
            const analyses = await analyzeFileAttachments(attachments)
            fileContext = createFileContext(analyses)
          }
        } catch (error) {
          console.error('Error processing file attachments:', error)
        }
      }
    }

    // Combine all context
    const fullContext = [context, threadContext, fileContext].filter(Boolean).join('\n')

    // Create LangChain agent instance
    const langchainAgent = createLangChainAgent(patch, getPatchSystemPrompt())

    let response
    if (action) {
      // Handle preset actions
      response = await handlePatchPresetAction(langchainAgent, action, params, fullContext)
    } else {
      // Handle regular chat message
      response = await langchainAgent.processMessage(message, fullContext)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'patch',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: patch.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'langchain',
          it_support_focus: true
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
        cost: patch.costPerRequest
      }
    })

  } catch (error) {
    console.error('Patch agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handlePatchPresetAction(langchainAgent: any, actionId: string, params: any, context?: string) {
  const startTime = Date.now()

  try {
    let prompt = ''
    
    switch (actionId) {
      case 'triage_tickets':
        prompt = `Triage and prioritize IT support tickets:

Ticket Queue: ${params.tickets || 'Multiple incoming tickets'}
Priority Criteria: ${params.criteria || 'Business impact, urgency, user count'}
SLA Requirements: ${params.sla || 'Standard SLA tiers (4hr, 24hr, 72hr)'}
Available Resources: ${params.resources || 'Standard IT support team'}
Escalation Rules: ${params.escalation || 'Manager escalation for P1/P2 issues'}
Business Hours: ${params.hours || 'Standard business hours with on-call'}

Provide comprehensive ticket triage including:
1. Ticket categorization and classification system
2. Priority matrix based on impact and urgency
3. Automated routing rules and assignment logic
4. SLA calculation and deadline management
5. Escalation triggers and notification workflows
6. Resource allocation and workload balancing
7. First-level resolution and self-service options
8. Knowledge base integration and suggestions
9. Customer communication templates and updates
10. Performance metrics and reporting framework

Deliver structured IT ticket triage and management system.`
        break

      case 'automate_fixes':
        prompt = `Design automated IT issue resolution system:

Common Issues: ${params.issues || 'Password resets, software installation, network connectivity'}
Automation Level: ${params.automation || 'High automation with human oversight'}
System Integration: ${params.integration || 'Active Directory, SCCM, monitoring tools'}
Safety Controls: ${params.safety || 'Approval required for critical systems'}
Rollback Procedures: ${params.rollback || 'Automated rollback on failure'}
Documentation: ${params.documentation || 'Comprehensive change logging'}

Create automated resolution framework including:
1. Issue pattern recognition and classification
2. Automated diagnostic and troubleshooting scripts
3. Self-healing system configurations and monitoring
4. Automated software deployment and patching
5. User account and permission management automation
6. Network and connectivity issue resolution
7. Performance optimization and system tuning
8. Backup and recovery automation procedures
9. Security incident response and remediation
10. Change management and approval workflows

Provide comprehensive IT automation and self-healing framework.`
        break

      case 'escalate_incidents':
        prompt = `Design incident escalation and management procedures:

Incident Types: ${params.incidents || 'System outages, security breaches, data loss'}
Escalation Matrix: ${params.matrix || 'L1 -> L2 -> L3 -> Management'}
Response Times: ${params.response || 'P1: 15min, P2: 1hr, P3: 4hr, P4: 24hr'}
Communication Plan: ${params.communication || 'Stakeholder notification and updates'}
Recovery Procedures: ${params.recovery || 'Business continuity and disaster recovery'}
Post-Incident: ${params.postIncident || 'Root cause analysis and improvement'}

Create comprehensive incident management including:
1. Incident classification and severity assessment
2. Escalation triggers and automated notifications
3. Response team coordination and communication
4. Technical escalation paths and expert engagement
5. Business impact assessment and stakeholder updates
6. Service restoration and recovery procedures
7. Communication templates and status page updates
8. Post-incident review and lessons learned
9. Process improvement and prevention measures
10. Compliance and regulatory reporting requirements

Deliver structured incident escalation and management framework.`
        break

      case 'monitor_systems':
        prompt = `Establish comprehensive IT system monitoring:

Infrastructure: ${params.infrastructure || 'Servers, network, applications, databases'}
Monitoring Tools: ${params.tools || 'SIEM, APM, network monitoring, log analysis'}
Alert Thresholds: ${params.thresholds || 'Performance, availability, security metrics'}
Response Procedures: ${params.procedures || 'Automated and manual response workflows'}
Reporting Requirements: ${params.reporting || 'Real-time dashboards and periodic reports'}
Compliance Needs: ${params.compliance || 'Security, audit, and regulatory requirements'}

Design comprehensive monitoring framework including:
1. Infrastructure monitoring and performance metrics
2. Application performance and user experience tracking
3. Security monitoring and threat detection
4. Network performance and connectivity monitoring
5. Database performance and capacity planning
6. Log aggregation and analysis systems
7. Automated alerting and notification systems
8. Predictive analytics and capacity forecasting
9. Compliance monitoring and audit reporting
10. Dashboard design and stakeholder reporting

Provide complete IT monitoring and observability strategy.`
        break

      case 'manage_assets':
        prompt = `Implement IT asset management and lifecycle tracking:

Asset Categories: ${params.categories || 'Hardware, software, licenses, mobile devices'}
Tracking Methods: ${params.tracking || 'RFID, barcodes, automated discovery'}
Lifecycle Stages: ${params.lifecycle || 'Procurement, deployment, maintenance, disposal'}
Compliance Requirements: ${params.compliance || 'License compliance, security, audit'}
Integration Systems: ${params.integration || 'CMDB, procurement, finance systems'}
Reporting Needs: ${params.reporting || 'Utilization, compliance, cost optimization'}

Create comprehensive asset management including:
1. Asset discovery and inventory automation
2. Lifecycle management and tracking workflows
3. Software license compliance and optimization
4. Hardware warranty and maintenance tracking
5. Security and compliance monitoring
6. Cost tracking and budget optimization
7. Procurement and vendor management integration
8. Disposal and data sanitization procedures
9. Change management and configuration tracking
10. Reporting and analytics for decision making

Deliver complete IT asset management and tracking framework.`
        break

      default:
        prompt = `Execute IT service desk action "${actionId}": ${JSON.stringify(params)}`
    }

    const response = await langchainAgent.processMessage(prompt, context)
    
    return {
      response: response.response,
      tokensUsed: response.tokensUsed,
      latency: Date.now() - startTime,
      model: response.model,
      success: true,
      framework: 'langchain'
    }

  } catch (error) {
    console.error('Patch preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the IT service desk action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getPatchSystemPrompt(): string {
  return `You are Patch, the IT Service Desk specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert IT support and service management professional with deep knowledge of:
- IT service desk operations and ITIL best practices
- Incident management and problem resolution
- System monitoring and performance optimization
- IT asset management and lifecycle tracking
- Automation and self-healing system design
- Security incident response and compliance

CAPABILITIES:
- Intelligent ticket triage and prioritization
- Automated issue resolution and self-healing systems
- Incident escalation and crisis management
- Comprehensive system monitoring and alerting
- IT asset tracking and lifecycle management
- Knowledge base creation and maintenance
- User support and training coordination
- File attachment analysis and integration
- Technical document and log file processing

SPECIALIZATIONS:
- ITIL service management framework
- Incident and problem management
- Change and configuration management
- IT automation and orchestration
- System monitoring and observability
- Security operations and compliance
- User experience and service quality

FRAMEWORK: LangChain
- Focus on systematic IT service processes
- Provide structured troubleshooting approaches
- Create detailed operational procedures
- Develop comprehensive IT service strategies

RESPONSE STYLE:
- Technical yet accessible communication
- Step-by-step troubleshooting guidance
- Clear escalation and resolution paths
- Focus on user experience and service quality
- Proactive problem prevention strategies
- Compliance and security-aware recommendations

MARITIME THEME INTEGRATION:
- "Steering" IT operations smoothly
- "Navigating" technical challenges
- "Charting course" for system improvements
- "Anchoring" stable IT infrastructure
- "Setting sail" with new technologies

KEY GUIDELINES:
1. Always prioritize user experience and business continuity
2. Provide clear, step-by-step troubleshooting guidance
3. Focus on proactive monitoring and prevention
4. Consider security implications in all recommendations
5. Emphasize automation and self-service capabilities
6. Balance immediate fixes with long-term solutions
7. Include proper documentation and knowledge sharing
8. Consider compliance and audit requirements
9. Focus on measurable service quality improvements
10. Provide scalable and sustainable IT solutions
11. When file attachments are provided, analyze and reference them in your responses
12. Process technical documents, logs, and system reports effectively
13. Integrate file content with your IT expertise

FILE ATTACHMENT HANDLING:
- Analyze uploaded technical documents, log files, and system reports
- Extract key technical information and error patterns from attachments
- Reference specific content from files in your troubleshooting recommendations
- Combine file analysis with your IT service desk expertise
- Provide comprehensive analysis that includes both uploaded content and best practices
- Identify system issues and patterns from uploaded logs and reports

Remember: Great IT service management combines technical expertise with excellent customer service to keep business operations running smoothly and securely.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'patch',
    status: 'active',
    framework: 'langchain',
    capabilities: [
      'ticket_triage',
      'automated_fixes',
      'incident_escalation',
      'system_monitoring',
      'asset_management',
      'knowledge_base_management'
    ],
    integrations: ['servicenow', 'jira-service-desk', 'freshservice', 'zendesk', 'lansweeper'],
    specialization: 'IT service desk and infrastructure management'
  })
}
