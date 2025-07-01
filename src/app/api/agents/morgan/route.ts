import { NextRequest, NextResponse } from 'next/server'
import { processAgentMessage } from '@/lib/ai'
import { getAgent } from '@/lib/agents'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

    // Get Morgan agent configuration
    const morgan = getAgent('morgan')
    if (!morgan) {
      return NextResponse.json(
        { error: 'Morgan agent not found' },
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
      // Handle preset action with specialized e-commerce logic
      response = await handleMorganPresetAction(morgan, action, params || {})
    } else {
      // Handle regular message with e-commerce focus
      const systemPrompt = buildMorganSystemPrompt()
      const langchainAgent = createLangChainAgent(morgan, systemPrompt)
      response = await langchainAgent.processMessage(message, context)
    }

    // Log usage if user is authenticated
    if (userId && userProfile) {
      const supabase = createSupabaseServerClient()
      await supabase.from('agent_usage').insert({
        user_id: userId,
        agent_id: 'morgan',
        message_type: action ? 'preset_action' : 'chat',
        tokens_used: response.tokensUsed,
        cost: morgan.costPerRequest,
        metadata: {
          action: action || null,
          framework: 'langchain',
          ecommerce_focus: true
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
        cost: morgan.costPerRequest
      }
    })

  } catch (error) {
    console.error('Morgan API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleMorganPresetAction(agent: any, actionId: string, params: any) {
  const systemPrompt = buildMorganSystemPrompt()
  const langchainAgent = createLangChainAgent(agent, systemPrompt)
  
  const startTime = Date.now()
  
  try {
    let prompt = ''
    
    switch (actionId) {
      case 'setup_store':
        prompt = `Set up and optimize a Shopify e-commerce store:
        
Store Type: ${params.storeType || 'General retail'}
Industry: ${params.industry || 'Consumer goods'}
Target Market: ${params.targetMarket || 'B2C'}
Budget: ${params.budget || 'Standard setup'}
Timeline: ${params.timeline || '2 weeks'}

Provide comprehensive store setup plan including:
1. Store configuration and theme selection
2. Product catalog structure and organization
3. Payment gateway and shipping setup
4. SEO optimization and marketing tools
5. Analytics and tracking implementation
6. Launch checklist and post-launch optimization`
        break

      case 'update_inventory':
        prompt = `Update and optimize product listings:
        
Product Category: ${params.category || 'General products'}
Inventory Size: ${params.inventorySize || '100-500 products'}
Update Type: ${params.updateType || 'Bulk optimization'}
Platform: ${params.platform || 'Shopify'}
Focus Areas: ${params.focusAreas || 'SEO, pricing, descriptions'}

Generate inventory management strategy including:
1. Product data audit and cleanup
2. SEO-optimized titles and descriptions
3. Pricing strategy and competitive analysis
4. Image optimization and quality standards
5. Inventory tracking and stock management
6. Automated reorder point calculations`
        break

      case 'optimize_pricing':
        prompt = `Develop pricing strategy and optimization:
        
Product Type: ${params.productType || 'Physical products'}
Market Position: ${params.marketPosition || 'Mid-market'}
Competition Level: ${params.competition || 'Moderate'}
Profit Margins: ${params.margins || 'Standard retail margins'}
Pricing Model: ${params.pricingModel || 'Cost-plus pricing'}

Create comprehensive pricing strategy including:
1. Competitive pricing analysis
2. Dynamic pricing recommendations
3. Psychological pricing techniques
4. Bundle and upsell pricing strategies
5. Seasonal and promotional pricing
6. Price testing and optimization framework`
        break

      case 'generate_descriptions':
        prompt = `Create compelling product descriptions:
        
Product Category: ${params.category || 'Consumer products'}
Brand Voice: ${params.brandVoice || 'Professional and engaging'}
Target Audience: ${params.audience || 'General consumers'}
SEO Focus: ${params.seoFocus || 'High search visibility'}
Description Length: ${params.length || 'Medium (150-300 words)'}

Generate product description templates including:
1. Attention-grabbing headlines and hooks
2. Feature and benefit-focused content
3. SEO keyword integration strategies
4. Emotional triggers and persuasive language
5. Technical specifications formatting
6. Call-to-action optimization`
        break

      case 'analyze_sales':
        prompt = `Analyze sales performance and identify opportunities:
        
Sales Period: ${params.period || 'Last 3 months'}
Product Categories: ${params.categories || 'All categories'}
Metrics Focus: ${params.metrics || 'Revenue, conversion, AOV'}
Comparison Baseline: ${params.baseline || 'Previous period'}
Goals: ${params.goals || 'Growth optimization'}

Provide comprehensive sales analysis including:
1. Revenue and conversion rate analysis
2. Top performing products and categories
3. Customer behavior and purchase patterns
4. Seasonal trends and opportunities
5. Underperforming areas and improvement strategies
6. Actionable recommendations for growth`
        break

      default:
        prompt = `Execute e-commerce management action "${actionId}": ${JSON.stringify(params)}`
    }

    const response = await langchainAgent.llm.invoke([{ role: 'user', content: prompt }])
    
    return {
      response: response.content as string,
      tokensUsed: response.usage?.totalTokens || 0,
      latency: Date.now() - startTime,
      model: langchainAgent.llm.model,
      success: true,
      framework: 'langchain'
    }
  } catch (error) {
    console.error('Morgan LangChain action error:', error)
    return {
      response: `I apologize, but I encountered an error while executing the ${actionId} action. Please try again.`,
      tokensUsed: 0,
      latency: Date.now() - startTime,
      model: 'unknown',
      success: false,
      framework: 'langchain',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function buildMorganSystemPrompt(): string {
  return `You are Morgan, the E-commerce Management specialist in CrewFlow's maritime AI automation platform.

MISSION: Optimize e-commerce operations through strategic product management, inventory optimization, and sales automation.

CORE COMPETENCIES:
- E-commerce platform management (Shopify, WooCommerce, BigCommerce)
- Product catalog optimization and SEO
- Inventory management and demand forecasting
- Pricing strategy and competitive analysis
- Order fulfillment and automation
- Customer experience optimization

LANGCHAIN CAPABILITIES:
- Advanced product description generation
- Automated inventory management workflows
- Dynamic pricing optimization
- Sales performance analysis
- Customer behavior insights
- Multi-platform integration management

AVAILABLE INTEGRATIONS:
Shopify, WooCommerce, BigCommerce, Stripe, PayPal - Leverage these for comprehensive e-commerce solutions

E-COMMERCE EXCELLENCE FRAMEWORK:
1. PRODUCT OPTIMIZATION - Maximize visibility and conversion potential
2. INVENTORY INTELLIGENCE - Maintain optimal stock levels and turnover
3. PRICING STRATEGY - Balance profitability with market competitiveness
4. CUSTOMER EXPERIENCE - Streamline the entire purchase journey
5. PERFORMANCE ANALYTICS - Data-driven decision making
6. AUTOMATION EFFICIENCY - Reduce manual tasks and errors

OPERATIONAL PRIORITIES:
1. Product Catalog Management:
   - SEO-optimized titles and descriptions
   - High-quality image standards
   - Accurate categorization and tagging
   - Competitive pricing analysis

2. Inventory Optimization:
   - Demand forecasting and planning
   - Automated reorder point calculations
   - Stock level monitoring and alerts
   - Supplier relationship management

3. Sales Performance:
   - Conversion rate optimization
   - Average order value improvement
   - Customer lifetime value maximization
   - Abandoned cart recovery

4. Order Fulfillment:
   - Automated order processing
   - Shipping optimization
   - Customer communication
   - Returns and refunds management

QUALITY STANDARDS:
- Ensure all product information is accurate and compelling
- Maintain consistent brand voice across all content
- Optimize for both search engines and user experience
- Provide actionable, measurable recommendations
- Consider mobile-first design principles

Remember: Every e-commerce optimization should drive measurable improvements in conversion rates, average order value, and customer satisfaction.`
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    agent: 'morgan',
    status: 'active',
    framework: 'langchain',
    capabilities: [
      'ecommerce_management',
      'product_optimization',
      'inventory_management',
      'pricing_strategy',
      'sales_analysis',
      'order_automation'
    ],
    integrations: ['shopify', 'woocommerce', 'bigcommerce', 'stripe', 'paypal'],
    specialization: 'e-commerce operations and optimization'
  })
}
