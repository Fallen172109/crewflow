import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createLangChainAgent } from '@/lib/ai/langchain-working'
import { createPerplexityAgent } from '@/lib/ai/perplexity'
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

    const anchor = getAgent('anchor')
    if (!anchor) {
      return NextResponse.json(
        { error: 'Anchor agent not found' },
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

    let response
    if (action) {
      response = await handleAnchorPresetAction(action, params, message)
    } else {
      response = await handleAnchorMessage(message, context)
    }

    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'anchor',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: anchor.costPerRequest,
        metadata: {
          action: action || null,
          framework: response.framework || 'hybrid',
          supply_chain_focus: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      framework: response.framework || 'hybrid',
      usage: {
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        model: response.model,
        cost: anchor.costPerRequest
      }
    })

  } catch (error) {
    console.error('Anchor agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleAnchorMessage(message: string, context?: string) {
  const anchor = getAgent('anchor')!
  
  const needsResearch = /market|supplier|price|trend|analysis|intelligence/i.test(message)
  const needsWorkflow = /process|workflow|automation|optimization|complex/i.test(message)
  
  if (needsResearch) {
    const perplexityAgent = createPerplexityAgent(anchor, getAnchorPerplexityPrompt())
    const result = await perplexityAgent.processMessage(message, context)
    return { ...result, framework: 'perplexity' }
  } else if (needsWorkflow) {
    const autogenAgent = createAutoGenAgent(anchor, getAnchorAutoGenPrompt())
    const result = await autogenAgent.processMessage(message, context)
    return { ...result, framework: 'autogen' }
  } else {
    const langchainAgent = createLangChainAgent(anchor, getAnchorLangChainPrompt())
    const result = await langchainAgent.processMessage(message, context)
    return { ...result, framework: 'langchain' }
  }
}

async function handleAnchorPresetAction(actionId: string, params: any, message?: string) {
  const anchor = getAgent('anchor')!
  const startTime = Date.now()
  
  try {
    let prompt = ''
    let framework = 'langchain'
    
    switch (actionId) {
      case 'track_inventory':
        prompt = `Track and analyze inventory levels across all locations:

Products/SKUs: ${params.products || 'All products'}
Locations: ${params.locations || 'All warehouses'}
Time Period: ${params.period || 'Current status'}
Alert Thresholds: ${params.thresholds || 'Standard thresholds'}

Provide comprehensive inventory tracking including:
1. Current stock levels by location and product
2. Inventory turnover rates and velocity
3. Stock-out risk assessment
4. Reorder point recommendations
5. Excess inventory identification
6. Seasonal demand patterns
7. ABC analysis and categorization
8. Inventory valuation and carrying costs

Deliver actionable inventory management insights.`
        break

      case 'predict_shortages':
        framework = 'autogen'
        prompt = `Predict potential stock shortages using advanced analytics:

Product Categories: ${params.categories || 'All categories'}
Forecast Horizon: ${params.horizon || '3 months'}
Demand Factors: ${params.factors || 'Historical trends, seasonality'}
Supply Constraints: ${params.constraints || 'Lead times, supplier capacity'}

Create comprehensive shortage prediction including:
1. Demand forecasting with multiple models
2. Supply chain risk assessment
3. Lead time variability analysis
4. Seasonal and trend adjustments
5. Shortage probability calculations
6. Impact assessment and prioritization
7. Mitigation strategies and recommendations
8. Early warning system design

Provide predictive analytics for proactive inventory management.`
        break

      case 'monitor_suppliers':
        framework = 'perplexity'
        prompt = `Monitor and analyze supplier performance in real-time:

Suppliers: ${params.suppliers || 'All active suppliers'}
Performance Metrics: ${params.metrics || 'Delivery, quality, cost'}
Time Frame: ${params.timeframe || 'Last 6 months'}
Risk Factors: ${params.risks || 'Financial, operational, geographic'}

Research and provide supplier intelligence including:
1. Supplier performance scorecards
2. Delivery reliability and lead time analysis
3. Quality metrics and defect rates
4. Financial stability assessment
5. Market reputation and news monitoring
6. Competitive pricing analysis
7. Risk assessment and mitigation
8. Alternative supplier recommendations

Include current market intelligence and risk factors.`
        break

      case 'optimize_orders':
        framework = 'autogen'
        prompt = `Optimize purchase orders for cost and efficiency:

Product Mix: ${params.products || 'All products'}
Budget Constraints: ${params.budget || 'Standard budget'}
Service Level Targets: ${params.serviceLevel || '95% fill rate'}
Lead Time Constraints: ${params.leadTimes || 'Standard lead times'}

Create order optimization strategy including:
1. Economic order quantity calculations
2. Multi-product order bundling
3. Supplier consolidation opportunities
4. Volume discount optimization
5. Carrying cost minimization
6. Service level optimization
7. Cash flow impact analysis
8. Implementation roadmap

Provide comprehensive order optimization recommendations.`
        break

      default:
        prompt = `Execute supply chain action "${actionId}": ${JSON.stringify(params)}`
    }

    let result
    if (framework === 'perplexity') {
      const perplexityAgent = createPerplexityAgent(anchor, getAnchorPerplexityPrompt())
      result = await perplexityAgent.processMessage(prompt)
    } else if (framework === 'autogen') {
      const autogenAgent = createAutoGenAgent(anchor, getAnchorAutoGenPrompt())
      result = await autogenAgent.processMessage(prompt)
    } else {
      const langchainAgent = createLangChainAgent(anchor, getAnchorLangChainPrompt())
      result = await langchainAgent.processMessage(prompt)
    }
    
    return {
      response: result.response,
      tokensUsed: result.tokensUsed,
      latency: Date.now() - startTime,
      model: result.model,
      success: true,
      framework: framework
    }

  } catch (error) {
    console.error('Anchor preset action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the supply chain action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getAnchorLangChainPrompt(): string {
  return `You are Anchor, the Supply Chain/Inventory specialist in the CrewFlow maritime AI automation platform.

CORE IDENTITY:
You are an expert supply chain and inventory management professional with deep knowledge of:
- Inventory optimization and control systems
- Supply chain planning and execution
- Warehouse management and operations
- Demand forecasting and planning
- Supplier relationship management
- Cost optimization and efficiency

CAPABILITIES:
- Inventory tracking and analysis
- Demand planning and forecasting
- Supply chain optimization
- Warehouse operations management
- Cost analysis and reduction
- Performance monitoring and reporting

FRAMEWORK: LangChain
- Focus on systematic analysis and decision-making
- Provide structured recommendations
- Create detailed operational plans
- Develop optimization strategies

RESPONSE STYLE:
- Data-driven and analytical
- Clear operational recommendations
- Structured implementation plans
- Focus on measurable outcomes
- Cost-benefit analysis

MARITIME THEME INTEGRATION:
- "Anchoring" supply chain stability
- "Navigating" inventory challenges
- "Charting course" for optimization
- "Setting sail" with new strategies
- "Weathering" supply disruptions

KEY GUIDELINES:
1. Focus on operational efficiency and cost optimization
2. Provide specific, actionable recommendations
3. Consider both short-term and long-term impacts
4. Include risk assessment and mitigation
5. Emphasize data-driven decision making
6. Consider sustainability and environmental impact
7. Provide clear implementation timelines

Remember: Great supply chain management balances cost, service, and risk to create sustainable competitive advantage.`
}

function getAnchorPerplexityPrompt(): string {
  return `You are Anchor, the Supply Chain/Inventory specialist in the CrewFlow maritime AI automation platform.

FRAMEWORK: Perplexity AI
- Leverage real-time market intelligence
- Research supplier performance and reliability
- Monitor market trends and pricing
- Access current supply chain disruptions
- Analyze competitive landscape

SPECIALIZATIONS:
- Real-time supplier monitoring
- Market intelligence and pricing
- Supply chain risk assessment
- Industry trend analysis
- Competitive benchmarking

Remember: Stay current with real-time supply chain intelligence and market dynamics.`
}

function getAnchorAutoGenPrompt(): string {
  return `You are Anchor, the Supply Chain/Inventory specialist in the CrewFlow maritime AI automation platform.

FRAMEWORK: AutoGen Multi-Agent System
- Planner Agent: Develops supply chain strategy
- Analyst Agent: Performs demand and supply analysis
- Optimizer Agent: Creates optimization solutions
- Monitor Agent: Tracks performance and risks
- Coordinator Agent: Orchestrates supply chain operations

SPECIALIZATIONS:
- Complex supply chain optimization
- Multi-location inventory management
- Demand forecasting and planning
- Supplier coordination and management
- Risk management and contingency planning

Remember: Great supply chain automation requires coordinated planning, execution, and continuous optimization.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'anchor',
    status: 'active',
    framework: 'hybrid',
    capabilities: [
      'inventory_tracking',
      'shortage_prediction',
      'supplier_monitoring',
      'order_optimization',
      'demand_forecasting',
      'supply_chain_analytics'
    ],
    integrations: ['sap', 'oracle-scm', 'netsuite', 'fishbowl', 'cin7'],
    hybridApproach: {
      langchain: 'Inventory analysis, operational planning',
      perplexity: 'Supplier intelligence, market research',
      autogen: 'Complex optimization, multi-location coordination'
    }
  })
}
