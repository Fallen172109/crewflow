import { NextRequest, NextResponse } from 'next/server'
import { processAgentMessage } from '@/lib/ai'
import { getAgent } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAutoGenAgent } from '@/lib/ai/autogen'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId, dataFile } = await request.json()

    if (!message && !action) {
      return NextResponse.json(
        { error: 'Message or action is required' },
        { status: 400 }
      )
    }

    // Get Tide agent configuration
    const tide = getAgent('tide')
    if (!tide) {
      return NextResponse.json(
        { error: 'Tide agent not found' },
        { status: 404 }
      )
    }

    // Verify user authentication if userId provided
    let userProfile = null
    if (userId) {
      const supabase = await createSupabaseServerClient()
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      userProfile = profile
    }

    let response

    if (action) {
      // Handle preset action with AutoGen multi-agent workflow
      response = await handleTidePresetAction(tide, action, params || {})
    } else {
      // Handle regular message with data analysis focus
      const systemPrompt = buildTideSystemPrompt()
      const autoGenAgent = createAutoGenAgent(tide, systemPrompt)
      response = await autoGenAgent.processMessage(message, context)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = await createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'tide',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: tide.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'autogen',
          agent_steps: response.agentSteps?.length || 0,
          workflow_complexity: response.agentSteps ? 'multi-agent' : 'single'
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: 'autogen',
      agentSteps: response.agentSteps,
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: tide.costPerRequest
      }
    })

  } catch (error) {
    console.error('Tide API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleTidePresetAction(agent: any, actionId: string, params: any) {
  const systemPrompt = buildTideSystemPrompt()
  const autoGenAgent = createAutoGenAgent(agent, systemPrompt)
  
  let message = ''
  
  switch (actionId) {
    case 'generate_report':
      message = `Generate a comprehensive performance report with the following specifications:
      
Data Source: ${params.dataSource || 'Business metrics'}
Report Type: ${params.reportType || 'Performance analysis'}
Time Period: ${params.timePeriod || 'Last 30 days'}
Key Metrics: ${params.metrics || 'Revenue, growth, efficiency'}
Audience: ${params.audience || 'Management team'}

Create a detailed report including:
1. Executive summary with key findings
2. Data analysis and trends identification
3. Visual representation recommendations
4. Actionable insights and recommendations
5. Next steps and monitoring plan`
      break

    case 'identify_trends':
      message = `Analyze data to identify trends and patterns:
      
Dataset Description: ${params.dataset || 'Business performance data'}
Analysis Period: ${params.period || 'Last 6 months'}
Focus Areas: ${params.focusAreas || 'Growth, efficiency, customer behavior'}
Comparison Baseline: ${params.baseline || 'Previous period'}

Provide comprehensive trend analysis including:
1. Statistical trend identification
2. Pattern recognition and anomaly detection
3. Correlation analysis between variables
4. Predictive insights and forecasting
5. Business impact assessment`
      break

    case 'create_dashboard':
      message = `Design an analytics dashboard for data visualization:
      
Dashboard Purpose: ${params.purpose || 'Business performance monitoring'}
Target Users: ${params.users || 'Management and analysts'}
Key Metrics: ${params.metrics || 'KPIs and operational metrics'}
Update Frequency: ${params.frequency || 'Real-time'}
Platform: ${params.platform || 'Web-based'}

Create dashboard specifications including:
1. Layout and visual hierarchy design
2. Chart types and data visualization recommendations
3. Interactive features and filtering options
4. Alert and notification systems
5. Mobile responsiveness considerations`
      break

    case 'predictive_model':
      message = `Develop predictive models for forecasting:
      
Prediction Target: ${params.target || 'Business outcomes'}
Historical Data: ${params.historicalData || 'Past performance data'}
Model Type: ${params.modelType || 'Time series forecasting'}
Accuracy Requirements: ${params.accuracy || 'High precision'}
Implementation Timeline: ${params.timeline || '30 days'}

Design predictive modeling approach including:
1. Data preprocessing and feature engineering
2. Model selection and algorithm recommendations
3. Training and validation methodology
4. Performance metrics and evaluation criteria
5. Deployment and monitoring strategy`
      break

    case 'data_cleanup':
      message = `Clean and prepare data for analysis:
      
Data Source: ${params.dataSource || 'Raw business data'}
Data Quality Issues: ${params.issues || 'Missing values, duplicates, inconsistencies'}
Target Format: ${params.targetFormat || 'Analysis-ready dataset'}
Validation Rules: ${params.validation || 'Business logic validation'}

Provide data cleaning strategy including:
1. Data quality assessment and profiling
2. Missing data handling strategies
3. Duplicate detection and removal
4. Data standardization and normalization
5. Validation and quality assurance procedures`
      break

    default:
      message = `Execute data analysis action: ${actionId} with parameters: ${JSON.stringify(params)}`
  }

  return await autoGenAgent.processMessage(message)
}

function buildTideSystemPrompt(): string {
  return `You are Tide, the Data Analysis specialist in CrewFlow's maritime AI automation platform.

MISSION: Transform raw data into actionable business insights through advanced analytics, reporting, and predictive modeling.

CORE COMPETENCIES:
- Advanced statistical analysis and data mining
- Business intelligence and reporting
- Predictive modeling and forecasting
- Data visualization and dashboard design
- ETL processes and data pipeline management
- Anomaly detection and trend analysis

AUTOGEN MULTI-AGENT WORKFLOW:
Your AutoGen framework coordinates multiple specialized agents:
1. PLANNER AGENT - Analyzes data requirements and creates analysis strategy
2. EXECUTOR AGENT - Performs statistical analysis and data processing
3. REVIEWER AGENT - Validates results and ensures analytical rigor
4. COORDINATOR AGENT - Synthesizes findings into actionable insights

AVAILABLE INTEGRATIONS:
Google Analytics, Mixpanel, Amplitude, Tableau, Power BI - Use these for comprehensive data analysis

DATA ANALYSIS METHODOLOGY:
1. DATA DISCOVERY - Understand data sources, quality, and structure
2. EXPLORATORY ANALYSIS - Identify patterns, trends, and anomalies
3. STATISTICAL MODELING - Apply appropriate analytical techniques
4. INSIGHT GENERATION - Extract meaningful business insights
5. VISUALIZATION - Create clear, compelling data presentations
6. RECOMMENDATION - Provide actionable next steps

ANALYTICAL EXCELLENCE STANDARDS:
- Ensure statistical rigor and methodological soundness
- Validate assumptions and test hypotheses
- Consider business context in all analyses
- Communicate findings clearly to non-technical stakeholders
- Recommend specific, measurable actions

QUALITY ASSURANCE:
- Cross-validate results using multiple approaches
- Document methodology and assumptions
- Provide confidence intervals and uncertainty measures
- Consider potential biases and limitations
- Ensure reproducibility of analyses

Remember: Your goal is to turn data into strategic advantage through rigorous analysis and clear communication of insights.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'tide',
    status: 'active',
    framework: 'autogen',
    capabilities: [
      'data_analysis',
      'statistical_modeling',
      'predictive_analytics',
      'business_intelligence',
      'data_visualization',
      'trend_analysis'
    ],
    integrations: ['google-analytics', 'mixpanel', 'amplitude', 'tableau', 'powerbi'],
    multiAgentWorkflow: {
      agents: ['planner', 'executor', 'reviewer', 'coordinator'],
      maxRounds: 3,
      specialization: 'data_analysis'
    }
  })
}
