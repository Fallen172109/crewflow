import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import {
  researchProductPricing,
  type PriceResearchRequest
} from '@/lib/ai/web-price-research'
import { createPerplexityAgent, type PerplexityResponse } from '@/lib/ai/perplexity'

const log = createLogger('CompetitiveResearchAPI')

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 20 // 20 research queries per hour

// Maximum input length to prevent token abuse
const MAX_INPUT_LENGTH = {
  productName: 200,
  description: 2000,
  company: 200,
  industry: 200,
  market: 200,
  category: 200
}

/**
 * Check rate limit for research API
 */
async function checkResearchRateLimit(
  userId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClientWithCookies>>
) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

  try {
    const { count, error } = await supabase
      .from('research_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart)

    if (error) {
      // If table doesn't exist, allow the request
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
      }
      log.warn('Rate limit check failed:', error)
      return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS }
    }

    const currentCount = count || 0
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount)
    const allowed = currentCount < RATE_LIMIT_MAX_REQUESTS

    return { allowed, remaining }
  } catch (err) {
    log.warn('Rate limit check error:', err)
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS }
  }
}

// Agent interface for research operations
// Defines the structure expected by createPerplexityAgent
interface ResearchAgent {
  id: string
  name: string
  title: string
  description: string
  framework: 'langchain' | 'autogen' | 'perplexity' | 'hybrid'
  optimalAiModules: string[]
  capabilities: string[]
  personality: string
  systemPrompt: string
  tools: string[]
  integrations: string[]
  isActive: boolean
  category: string
}

// Request body type definitions
interface PriceResearchBody {
  type: 'price_research'
  productName: string
  category: string
  description: string
  features?: string[]
  currency?: string
}

interface CompetitorAnalysisBody {
  type: 'competitor_analysis'
  company: string
  industry: string
}

interface MarketResearchBody {
  type: 'market_research'
  market: string
  timeframe?: string
}

type ResearchRequestBody = PriceResearchBody | CompetitorAnalysisBody | MarketResearchBody

// Validation functions with input length checks to prevent token abuse
function validatePriceResearchRequest(body: any): { isValid: boolean; error?: string } {
  if (!body.productName || typeof body.productName !== 'string') {
    return { isValid: false, error: 'productName is required and must be a string' }
  }
  if (body.productName.length > MAX_INPUT_LENGTH.productName) {
    return { isValid: false, error: `productName must be ${MAX_INPUT_LENGTH.productName} characters or less` }
  }
  if (!body.category || typeof body.category !== 'string') {
    return { isValid: false, error: 'category is required and must be a string' }
  }
  if (body.category.length > MAX_INPUT_LENGTH.category) {
    return { isValid: false, error: `category must be ${MAX_INPUT_LENGTH.category} characters or less` }
  }
  if (!body.description || typeof body.description !== 'string') {
    return { isValid: false, error: 'description is required and must be a string' }
  }
  if (body.description.length > MAX_INPUT_LENGTH.description) {
    return { isValid: false, error: `description must be ${MAX_INPUT_LENGTH.description} characters or less` }
  }
  if (body.features && !Array.isArray(body.features)) {
    return { isValid: false, error: 'features must be an array' }
  }
  if (body.features && body.features.length > 20) {
    return { isValid: false, error: 'features array must contain 20 or fewer items' }
  }
  return { isValid: true }
}

function validateCompetitorAnalysisRequest(body: any): { isValid: boolean; error?: string } {
  if (!body.company || typeof body.company !== 'string') {
    return { isValid: false, error: 'company is required and must be a string' }
  }
  if (body.company.length > MAX_INPUT_LENGTH.company) {
    return { isValid: false, error: `company must be ${MAX_INPUT_LENGTH.company} characters or less` }
  }
  if (!body.industry || typeof body.industry !== 'string') {
    return { isValid: false, error: 'industry is required and must be a string' }
  }
  if (body.industry.length > MAX_INPUT_LENGTH.industry) {
    return { isValid: false, error: `industry must be ${MAX_INPUT_LENGTH.industry} characters or less` }
  }
  return { isValid: true }
}

function validateMarketResearchRequest(body: any): { isValid: boolean; error?: string } {
  if (!body.market || typeof body.market !== 'string') {
    return { isValid: false, error: 'market is required and must be a string' }
  }
  if (body.market.length > MAX_INPUT_LENGTH.market) {
    return { isValid: false, error: `market must be ${MAX_INPUT_LENGTH.market} characters or less` }
  }
  return { isValid: true }
}

// Create a research agent configuration
function createResearchAgent(): ResearchAgent {
  return {
    id: 'competitive-researcher',
    name: 'Competitive Research Specialist',
    title: 'Market Intelligence Analyst',
    description: 'AI-powered competitive analysis and market research specialist',
    framework: 'perplexity',
    optimalAiModules: ['Perplexity AI'],
    capabilities: ['competitive_analysis', 'market_research', 'industry_analysis'],
    personality: 'Analytical and data-driven market researcher',
    systemPrompt: 'You are a specialized competitive research analyst with access to real-time web data.',
    tools: [],
    integrations: ['web_search'],
    isActive: true,
    category: 'research'
  }
}

/**
 * POST /api/research/competitive
 *
 * Performs competitive research based on the request type:
 * - price_research: Analyze pricing for a product
 * - competitor_analysis: Analyze competitors in an industry
 * - market_research: Conduct market research for a specific market
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.warn('Unauthorized access attempt to competitive research')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check rate limit before processing
    const rateLimit = await checkResearchRateLimit(user.id, supabase)
    if (!rateLimit.allowed) {
      log.warn('Rate limit exceeded for research', { userId: user.id })
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. You can perform up to 20 research queries per hour.',
          remaining: rateLimit.remaining
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimit.remaining)
          }
        }
      )
    }

    const body = await request.json()

    // Validate research type
    if (!body.type || !['price_research', 'competitor_analysis', 'market_research'].includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid research type. Must be one of: price_research, competitor_analysis, market_research'
        },
        { status: 400 }
      )
    }

    log.debug('Competitive research request', {
      userId: user.id,
      type: body.type
    })

    let result: any

    switch (body.type) {
      case 'price_research': {
        // Validate price research request
        const validation = validatePriceResearchRequest(body)
        if (!validation.isValid) {
          return NextResponse.json(
            { success: false, error: validation.error },
            { status: 400 }
          )
        }

        const priceRequest: PriceResearchRequest = {
          productName: body.productName,
          category: body.category,
          description: body.description,
          features: body.features || [],
          storeCurrency: body.currency || 'USD'
        }

        log.debug('Performing price research', {
          productName: body.productName,
          category: body.category
        })

        const priceResult = await researchProductPricing(priceRequest)

        result = {
          type: 'price_research',
          pricing: priceResult
        }
        break
      }

      case 'competitor_analysis': {
        // Validate competitor analysis request
        const validation = validateCompetitorAnalysisRequest(body)
        if (!validation.isValid) {
          return NextResponse.json(
            { success: false, error: validation.error },
            { status: 400 }
          )
        }

        log.debug('Performing competitor analysis', {
          company: body.company,
          industry: body.industry
        })

        const researchAgent = createResearchAgent()
        // Cast to any since the Agent type from the deleted agents.ts is expected by createPerplexityAgent
        const perplexityAgent = createPerplexityAgent(
          researchAgent as any,
          `You are an expert competitive analyst specializing in ${body.industry}.
           Provide comprehensive, data-driven analysis with specific insights and actionable recommendations.
           Focus on market positioning, strengths, weaknesses, and strategic opportunities.`,
          user.id
        )

        const analysisResult = await perplexityAgent.handlePresetAction('competitive_analysis', {
          company: body.company,
          industry: body.industry
        })

        result = {
          type: 'competitor_analysis',
          analysis: {
            company: body.company,
            industry: body.industry,
            content: analysisResult.response,
            sources: analysisResult.sources || [],
            tokensUsed: analysisResult.tokensUsed,
            latency: analysisResult.latency,
            success: analysisResult.success
          }
        }
        break
      }

      case 'market_research': {
        // Validate market research request
        const validation = validateMarketResearchRequest(body)
        if (!validation.isValid) {
          return NextResponse.json(
            { success: false, error: validation.error },
            { status: 400 }
          )
        }

        log.debug('Performing market research', {
          market: body.market,
          timeframe: body.timeframe
        })

        const researchAgent = createResearchAgent()
        // Cast to any since the Agent type from the deleted agents.ts is expected by createPerplexityAgent
        const perplexityAgent = createPerplexityAgent(
          researchAgent as any,
          `You are an expert market research analyst specializing in ${body.market}.
           Provide comprehensive market analysis including market size, growth trends, key players,
           opportunities, challenges, and strategic recommendations.
           Use current data and cite sources when available.`,
          user.id
        )

        const marketResult = await perplexityAgent.handlePresetAction('market_research', {
          market: body.market,
          timeframe: body.timeframe || 'current'
        })

        result = {
          type: 'market_research',
          research: {
            market: body.market,
            timeframe: body.timeframe || 'current',
            content: marketResult.response,
            sources: marketResult.sources || [],
            tokensUsed: marketResult.tokensUsed,
            latency: marketResult.latency,
            success: marketResult.success
          }
        }
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid research type' },
          { status: 400 }
        )
    }

    // Attempt to save to research history (non-blocking)
    try {
      await supabase.from('research_history').insert({
        user_id: user.id,
        research_type: body.type,
        request_data: body,
        result_data: result,
        created_at: new Date().toISOString()
      })
    } catch (dbError) {
      // Log but don't fail if the table doesn't exist or save fails
      log.warn('Failed to save research history', { error: dbError })
    }

    log.debug('Research completed successfully', {
      userId: user.id,
      type: body.type
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    log.error('Competitive research error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Research request failed'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/research/competitive
 *
 * Returns recent research history for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.warn('Unauthorized access attempt to research history')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const type = searchParams.get('type') // Optional filter by research type

    log.debug('Fetching research history', {
      userId: user.id,
      limit,
      offset,
      type
    })

    try {
      // Build query
      let query = supabase
        .from('research_history')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Filter by type if provided
      if (type && ['price_research', 'competitor_analysis', 'market_research'].includes(type)) {
        query = query.eq('research_type', type)
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        // If the table doesn't exist, return empty array
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          log.info('research_history table does not exist yet')
          return NextResponse.json({
            success: true,
            data: {
              history: [],
              total: 0,
              limit,
              offset
            }
          })
        }
        throw error
      }

      return NextResponse.json({
        success: true,
        data: {
          history: data || [],
          total: count || 0,
          limit,
          offset
        }
      })

    } catch (dbError: any) {
      // Handle case where table doesn't exist
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        log.info('research_history table does not exist')
        return NextResponse.json({
          success: true,
          data: {
            history: [],
            total: 0,
            limit,
            offset
          }
        })
      }
      throw dbError
    }

  } catch (error) {
    log.error('Error fetching research history:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch research history'
      },
      { status: 500 }
    )
  }
}
