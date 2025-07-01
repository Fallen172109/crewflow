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

    // Get Ledger agent configuration
    const ledger = getAgent('ledger')
    if (!ledger) {
      return NextResponse.json(
        { error: 'Ledger agent not found' },
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
    const langchainAgent = createLangChainAgent(ledger, getLedgerSystemPrompt())

    let response
    if (action) {
      // Handle preset actions
      response = await handleLedgerPresetAction(langchainAgent, action, params, fullContext)
    } else {
      // Handle regular chat message
      response = await langchainAgent.processMessage(message, fullContext)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'ledger',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: ledger.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'langchain',
          finance_focus: true
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
        cost: ledger.costPerRequest
      }
    })

  } catch (error) {
    console.error('Ledger agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleLedgerPresetAction(langchainAgent: any, actionId: string, params: any, context?: string) {
  const startTime = Date.now()

  try {
    let prompt = ''
    
    switch (actionId) {
      case 'process_invoices':
        prompt = `Process and analyze invoices with the following specifications:

Invoice Data: ${params.invoiceData || 'Multiple invoices to process'}
Processing Period: ${params.period || 'Current month'}
Vendor Information: ${params.vendors || 'Various vendors'}
Approval Workflow: ${params.workflow || 'Standard approval process'}
Payment Terms: ${params.paymentTerms || 'Net 30 standard'}
Budget Categories: ${params.categories || 'Standard expense categories'}

Provide comprehensive invoice processing including:
1. Invoice data extraction and validation
2. Vendor information verification and matching
3. Purchase order matching and three-way reconciliation
4. Budget category assignment and coding
5. Approval workflow routing and tracking
6. Payment scheduling and cash flow impact
7. Duplicate invoice detection and prevention
8. Tax calculation and compliance verification
9. Exception handling and escalation procedures
10. Reporting and audit trail maintenance

Deliver structured invoice processing framework with automation recommendations.`
        break

      case 'match_expenses':
        prompt = `Match and reconcile expenses across systems:

Expense Sources: ${params.sources || 'Credit cards, receipts, expense reports'}
Reconciliation Period: ${params.period || 'Monthly reconciliation'}
Account Categories: ${params.categories || 'Standard chart of accounts'}
Matching Criteria: ${params.criteria || 'Amount, date, vendor, description'}
Variance Tolerance: ${params.tolerance || '5% or $50 threshold'}
Review Process: ${params.review || 'Manager approval required'}

Create comprehensive expense matching process including:
1. Multi-source data aggregation and standardization
2. Automated matching algorithms and rules
3. Variance analysis and exception identification
4. Manual review workflow for unmatched items
5. Duplicate expense detection and resolution
6. Policy compliance verification and flagging
7. Approval routing and documentation requirements
8. Reporting and analytics for expense patterns
9. Integration with accounting systems and GL posting
10. Audit trail and documentation management

Provide detailed expense reconciliation and matching framework.`
        break

      case 'analyze_cash_flow':
        prompt = `Analyze cash flow patterns and projections:

Analysis Period: ${params.period || 'Last 12 months with 6-month forecast'}
Business Type: ${params.businessType || 'Service-based business'}
Revenue Streams: ${params.revenue || 'Multiple revenue sources'}
Expense Categories: ${params.expenses || 'Operating and capital expenses'}
Seasonality Factors: ${params.seasonality || 'Moderate seasonal variation'}
Growth Projections: ${params.growth || '10-15% annual growth'}

Provide comprehensive cash flow analysis including:
1. Historical cash flow pattern analysis and trends
2. Seasonal variation identification and modeling
3. Revenue forecasting with multiple scenarios
4. Expense projection and cost management analysis
5. Working capital requirements and optimization
6. Cash conversion cycle analysis and improvement
7. Liquidity risk assessment and mitigation strategies
8. Investment and financing needs evaluation
9. Scenario planning and stress testing
10. Actionable recommendations for cash flow optimization

Deliver detailed cash flow analysis with strategic recommendations.`
        break

      case 'generate_reports':
        prompt = `Generate comprehensive financial reports and analysis:

Report Types: ${params.reportTypes || 'P&L, Balance Sheet, Cash Flow, Budget vs Actual'}
Reporting Period: ${params.period || 'Monthly, quarterly, and annual'}
Audience: ${params.audience || 'Management, board, investors, stakeholders'}
Detail Level: ${params.detail || 'Summary with drill-down capability'}
Compliance Requirements: ${params.compliance || 'GAAP, tax, regulatory'}
Comparative Analysis: ${params.comparative || 'Prior period and budget comparisons'}

Create comprehensive financial reporting framework including:
1. Standard financial statement preparation and formatting
2. Management reporting and KPI dashboard development
3. Budget variance analysis and explanation
4. Trend analysis and performance metrics
5. Ratio analysis and financial health indicators
6. Segment and departmental reporting
7. Compliance and regulatory reporting requirements
8. Investor and stakeholder communication materials
9. Automated reporting workflows and scheduling
10. Data visualization and presentation optimization

Provide structured financial reporting and analysis framework.`
        break

      case 'budget_planning':
        prompt = `Develop comprehensive budget planning and forecasting:

Budget Period: ${params.period || 'Annual budget with quarterly reviews'}
Business Units: ${params.units || 'Multiple departments and cost centers'}
Revenue Assumptions: ${params.revenue || 'Growth-based revenue projections'}
Cost Structure: ${params.costs || 'Fixed and variable cost analysis'}
Capital Expenditures: ${params.capex || 'Technology and equipment investments'}
Scenario Planning: ${params.scenarios || 'Conservative, base, optimistic cases'}

Create comprehensive budget planning framework including:
1. Revenue forecasting methodology and assumptions
2. Expense budgeting by category and department
3. Capital expenditure planning and prioritization
4. Cash flow budgeting and financing requirements
5. Scenario modeling and sensitivity analysis
6. Budget approval workflow and governance
7. Variance tracking and performance monitoring
8. Rolling forecast updates and adjustments
9. Department collaboration and input collection
10. Strategic alignment and goal integration

Deliver structured budget planning and management framework.`
        break

      default:
        prompt = `Execute finance and accounting action "${actionId}": ${JSON.stringify(params)}`
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
    console.error('Ledger preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the finance and accounting action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getLedgerSystemPrompt(): string {
  return `You are Ledger, the Finance & Accounting specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert financial professional with deep knowledge of:
- Financial accounting principles and practices
- Invoice processing and accounts payable management
- Expense management and reconciliation
- Cash flow analysis and forecasting
- Financial reporting and compliance
- Budget planning and variance analysis
- Financial controls and audit procedures

CAPABILITIES:
- Automated invoice processing and approval workflows
- Expense matching and reconciliation systems
- Cash flow analysis and forecasting models
- Financial report generation and analysis
- Budget planning and performance monitoring
- Financial compliance and audit support
- Cost analysis and optimization strategies
- File attachment analysis and integration
- Financial document processing (invoices, receipts, statements, reports)

SPECIALIZATIONS:
- Accounts payable and receivable management
- Financial statement preparation and analysis
- Management reporting and KPI development
- Budget and forecast modeling
- Financial process automation
- Compliance and regulatory reporting
- Financial data analysis and insights

FRAMEWORK: LangChain
- Focus on systematic financial processes and controls
- Provide structured accounting frameworks
- Create detailed financial analysis and reporting
- Develop comprehensive financial strategies

RESPONSE STYLE:
- Precise and detail-oriented
- Compliance-focused recommendations
- Structured financial frameworks
- Clear audit trails and documentation
- Data-driven insights and analysis
- Professional financial communication

MARITIME THEME INTEGRATION:
- "Steering" financial performance
- "Navigating" complex accounting waters
- "Charting course" for financial success
- "Anchoring" solid financial foundations
- "Setting sail" with budget plans

KEY GUIDELINES:
1. Always prioritize accuracy and compliance
2. Provide clear audit trails and documentation
3. Focus on financial controls and risk management
4. Consider regulatory and tax implications
5. Emphasize data integrity and validation
6. Balance automation with human oversight
7. Provide actionable financial insights
8. Include variance analysis and explanations
9. Focus on cash flow and liquidity management
10. Ensure scalable financial processes
11. When file attachments are provided, analyze and reference them in your responses
12. Process financial documents (invoices, receipts, statements) effectively
13. Integrate file content with your financial expertise

FILE ATTACHMENT HANDLING:
- Analyze uploaded financial documents, invoices, receipts, and reports
- Extract key financial data and insights from attachments
- Reference specific content from files in your financial analysis
- Combine file analysis with your accounting expertise
- Provide comprehensive analysis that includes both uploaded content and best practices
- Ensure accuracy when processing financial data from documents

Remember: Great financial management requires precision, compliance, and strategic insight to drive business success and stakeholder confidence.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'ledger',
    status: 'active',
    framework: 'langchain',
    capabilities: [
      'invoice_processing',
      'expense_matching',
      'cash_flow_analysis',
      'financial_reporting',
      'budget_planning',
      'compliance_monitoring'
    ],
    integrations: ['quickbooks', 'xero', 'netsuite', 'sage', 'freshbooks'],
    specialization: 'finance and accounting automation'
  })
}
