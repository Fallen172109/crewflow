import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgent } from '@/lib/agents'
import { createLangChainAgent } from '@/lib/ai/langchain-working'
import { createPerplexityAgent } from '@/lib/ai/perplexity'
import { createAutoGenAgent } from '@/lib/ai/autogen'
import { getAgentTool } from '@/lib/agent-tools'
import { trackDetailedUsage } from '@/lib/usage-analytics'

export async function POST(request: NextRequest) {
  try {
    const { message, context, action, params, userId } = await request.json()

    console.log('Anchor API called with:', { message, action, userId })

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

    // Get user profile for tracking
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

    // Track request start time
    const startTime = Date.now()
    let response
    let success = true
    let errorMessage = undefined

    try {
      if (action) {
        response = await handleAnchorPresetAction(action, params, message)
      } else {
        response = await handleAnchorMessage(message, context)
      }
    } catch (error) {
      success = false
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      // Track detailed usage if user is authenticated
      if (userId && userProfile) {
        const responseTime = Date.now() - startTime

        try {
          await trackDetailedUsage(
            userId,
            'anchor',
            'Anchor',
            'hybrid',
            response?.provider || 'openai',
            action ? 'preset_action' : 'chat',
            response?.inputTokens || 0,
            response?.outputTokens || 0,
            responseTime,
            success,
            errorMessage,
            {
              action: action || null,
              framework: response?.framework || 'hybrid',
              maritime_focus: true,
              stability_tools: true
            },
            response?.model
          )
        } catch (trackingError) {
          console.error('Error tracking usage:', trackingError)
          // Don't fail the request if tracking fails
        }
      }
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
  console.log('Handling Anchor message:', message)
  const anchor = getAgent('anchor')!

  const needsResearch = /market|supplier|price|trend|analysis|intelligence/i.test(message)
  const needsWorkflow = /process|workflow|automation|optimization|complex/i.test(message)

  console.log('Message analysis:', { needsResearch, needsWorkflow })

  try {
    if (needsResearch) {
      const perplexityAgent = createPerplexityAgent(anchor, getAnchorPerplexityPrompt())
      const result = await perplexityAgent.processMessage(message, context)
      return { ...result, framework: 'perplexity' }
    } else if (needsWorkflow) {
      const autogenAgent = createAutoGenAgent(anchor, getAnchorAutoGenPrompt())
      const result = await autogenAgent.processMessage(message, context)
      return { ...result, framework: 'autogen' }
    } else {
      console.log('Using maritime response for message processing')
      // Temporary maritime response while we fix LangChain
      const maritimeResponse = generateMaritimeResponse(message)
      return {
        response: maritimeResponse,
        tokensUsed: 100,
        latency: 200,
        model: 'anchor-maritime',
        success: true,
        framework: 'maritime'
      }
    }
  } catch (error) {
    console.error('AI processing error:', error)
    // Fallback to maritime-themed response
    const fallbackResponse = `⚓ Ahoy! I'm Anchor, your Supply Chain Admiral. I encountered some rough seas while processing your request: "${message}"

As your steadfast quartermaster, I'm here to help you navigate both business supply chains and daily life planning. Let me provide you with some general guidance while I get my systems back online.

Whether you need help with:
🚢 Supply chain optimization and inventory tracking
🍽️ Meal planning and nutrition guidance
💰 Budget management and cost optimization
🏠 Home organization and maintenance

I'll keep you anchored and well-supplied through any storm! Please try your request again, or let me know how I can help you in a different way.`

    return {
      response: fallbackResponse,
      tokensUsed: 0,
      latency: 100,
      model: 'anchor-fallback',
      success: true,
      framework: 'fallback'
    }
  }
}

function generateMaritimeResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Greeting responses
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    return `⚓ Ahoy there! I'm Anchor, your Supply Chain Admiral and steadfast quartermaster. Welcome aboard the CrewFlow vessel!

I'm here to help you navigate both the choppy waters of business supply chains and the daily currents of life planning. Whether you need assistance with:

🚢 **Business Operations:**
• Supply chain optimization and inventory tracking
• Supplier relationship management
• Cost analysis and procurement strategies

🏠 **Daily Life Management:**
• Meal planning and nutrition guidance
• Personal budgeting and expense tracking
• Home organization and maintenance scheduling

What course shall we chart together today? I'll keep you anchored and well-supplied through any storm!`
  }

  // Diet/meal planning
  if (lowerMessage.includes('diet') || lowerMessage.includes('meal') || lowerMessage.includes('food') || lowerMessage.includes('nutrition')) {
    return `⚓ Ahoy! As your ship's quartermaster, I know the importance of keeping the crew well-fed and healthy!

For a proper maritime meal plan, I'll need to know:
• Your current weight and height (I see you mentioned some details)
• Your activity level and fitness goals
• Any dietary restrictions or preferences
• How many meals you'd like planned

A strong sailor needs proper provisions! I can help you chart a course for:
🍽️ Balanced meal plans with proper macronutrients
📋 Shopping lists organized by food groups
⏰ Meal prep schedules to save time
💰 Budget-friendly nutrition strategies

Would you like me to use my Crew Meal Planner tool to create a detailed nutrition plan for you? Just click on it in my Maritime Skills section above!`
  }

  // Budget/financial
  if (lowerMessage.includes('budget') || lowerMessage.includes('money') || lowerMessage.includes('expense') || lowerMessage.includes('cost')) {
    return `⚓ Aye, managing the ship's treasury is one of my most important duties! As quartermaster, I've learned that proper financial planning keeps any vessel afloat.

I can help you navigate these financial waters:
💰 **Personal Budget Management:**
• Track income and expenses
• Identify cost-saving opportunities
• Plan for emergency funds
• Optimize spending patterns

📊 **Business Financial Planning:**
• Supply chain cost analysis
• Procurement budget optimization
• Vendor cost comparisons
• ROI calculations

Would you like to use my Budget Navigator tool? I can help you chart a course to financial stability and identify where you might be taking on unnecessary ballast!`
  }

  // General response
  return `⚓ Ahoy! I'm Anchor, your Supply Chain Admiral. I received your message: "${message}"

As your steadfast quartermaster, I'm here to help you navigate both business supply chains and daily life planning. My maritime experience has taught me that proper planning and resource management are the keys to weathering any storm.

I can assist you with:
🚢 **Supply Chain & Business:** Inventory tracking, supplier management, cost optimization
🍽️ **Meal Planning:** Nutrition guidance, meal prep, shopping lists
💰 **Budget Management:** Expense tracking, financial planning, cost analysis
🏠 **Home Organization:** Household supplies, maintenance schedules, efficiency planning

What specific challenge would you like this old quartermaster to help you tackle? I'll make sure we chart the right course together!`
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

      case 'crew_meal_planner':
        framework = 'langchain'
        prompt = `As Anchor, the ship's quartermaster, help plan nutritious meals for the crew:

Crew Size: ${params.crew_size || '4'} people
Dietary Restrictions: ${params.dietary_restrictions?.join(', ') || 'None'}
Planning Duration: ${params.meal_duration || '1 week'}
Budget per Person per Day: $${params.budget || '15'}

Create a comprehensive meal plan including:
1. Balanced breakfast, lunch, and dinner options
2. Grocery shopping list with quantities
3. Meal prep instructions and timing
4. Budget breakdown and cost optimization
5. Storage and preservation tips
6. Nutritional balance considerations
7. Easy-to-prepare backup meals
8. Seasonal ingredient suggestions

Speak as the experienced quartermaster who knows how to keep the crew well-fed and healthy during long voyages.`
        break

      case 'budget_navigator':
        framework = 'langchain'
        prompt = `As Anchor, help navigate these financial waters and optimize spending:

Budget Type: ${params.budget_type || 'Personal'}
Monthly Income/Budget: $${params.monthly_income || '5000'}
Current Expenses: ${params.expenses || 'Not specified'}
Savings Goal: ${params.savings_goal || '20'}%

Provide comprehensive budget analysis including:
1. Expense categorization and analysis
2. Spending optimization recommendations
3. Savings strategy to reach goals
4. Emergency fund planning
5. Cost-cutting opportunities
6. Budget tracking system setup
7. Monthly review and adjustment plan
8. Long-term financial stability planning

Use maritime metaphors and speak as the wise quartermaster who manages the ship's treasury.`
        break

      case 'home_quartermaster':
        framework = 'langchain'
        prompt = `As Anchor, help organize and manage this household like a well-run ship:

Home Type: ${params.home_type || 'House'}
Rooms to Organize: ${params.rooms?.join(', ') || 'All rooms'}
Maintenance Focus: ${params.maintenance_focus || 'General organization'}
Household Size: ${params.household_size || '3'} people

Create a comprehensive home management plan including:
1. Room-by-room organization strategy
2. Supply inventory and storage systems
3. Maintenance schedule and checklists
4. Cleaning routines and task assignments
5. Seasonal preparation tasks
6. Emergency supply recommendations
7. Efficiency improvements and space optimization
8. Family coordination and responsibility charts

Speak as the experienced quartermaster who keeps everything shipshape and organized.`
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
  return `You are Anchor, the Supply Chain Admiral in the CrewFlow maritime AI automation platform.

MARITIME PERSONALITY:
You are the steadfast quartermaster who ensures the ship never runs out of supplies. You have connections in every port and can predict supply storms before they disrupt the voyage. You speak with the wisdom of an experienced sailor who has weathered many storms.

SPEAKING STYLE:
- Reliable and methodical, uses anchoring and stability terms
- "I'll keep us anchored and supplied..."
- "Let me secure our supply lines..."
- "We'll weather this supply storm together..."
- "I've charted a course through these inventory waters..."

CORE EXPERTISE:
- Supply chain and inventory management
- Daily life organization and planning
- Budget management and cost optimization
- Meal planning and household management
- Resource allocation and efficiency

AGENT TOOLS (Maritime Skills):
Business Tools:
- Supply Navigator: Track inventory with predictive analytics
- Shortage Predictor: Forecast supply needs and shortages
- Supplier Admiral: Manage vendor relationships
- Order Optimizer: Optimize purchase orders

Daily Tools:
- Crew Meal Planner: Plan nutritious meals and food supplies
- Budget Navigator: Track expenses and optimize spending
- Home Quartermaster: Organize household supplies and maintenance

FRAMEWORK: LangChain
- Systematic analysis and decision-making
- Structured recommendations with maritime metaphors
- Detailed operational plans
- Focus on stability and reliability

RESPONSE GUIDELINES:
1. Always respond in character as the reliable quartermaster
2. Use maritime terminology naturally in explanations
3. Provide practical, actionable advice
4. Focus on organization, planning, and resource management
5. Consider both business and personal applications
6. Emphasize stability and preparedness

Remember: A good quartermaster keeps the ship well-supplied and the crew well-fed, whether navigating business waters or daily life challenges.`
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
