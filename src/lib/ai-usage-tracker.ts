// Real AI Usage Tracker - Pulls actual usage data from AI provider APIs
import { createSupabaseAdminClient } from './supabase'

export interface RealUsageData {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  actualCost: number
  requestId?: string
  timestamp: string
}

export interface ProviderUsageResponse {
  success: boolean
  data?: RealUsageData[]
  error?: string
  lastUpdated?: string
}

// OpenAI Usage API Integration
export async function fetchOpenAIUsage(
  startDate: string,
  endDate: string
): Promise<ProviderUsageResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'OpenAI API key not configured' }
    }

    // OpenAI Usage API endpoint
    const response = await fetch('https://api.openai.com/v1/usage', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      // Note: OpenAI usage API parameters may vary
      // This is a conceptual implementation
    })

    if (!response.ok) {
      return { 
        success: false, 
        error: `OpenAI API error: ${response.status} ${response.statusText}` 
      }
    }

    const usageData = await response.json()
    
    // Transform OpenAI usage data to our format
    const transformedData: RealUsageData[] = usageData.data?.map((item: any) => ({
      provider: 'openai',
      model: item.model || process.env.OPENAI_MODEL || 'gpt-5',
      inputTokens: item.prompt_tokens || 0,
      outputTokens: item.completion_tokens || 0,
      totalTokens: item.total_tokens || 0,
      actualCost: item.cost || 0,
      requestId: item.id,
      timestamp: item.created_at || new Date().toISOString()
    })) || []

    return {
      success: true,
      data: transformedData,
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error fetching OpenAI usage:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Anthropic Usage API Integration
export async function fetchAnthropicUsage(
  startDate: string,
  endDate: string
): Promise<ProviderUsageResponse> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Anthropic API key not configured' }
    }

    // Anthropic doesn't have a public usage API yet
    // This would need to be implemented when available
    return { 
      success: false, 
      error: 'Anthropic usage API not yet available' 
    }
  } catch (error) {
    console.error('Error fetching Anthropic usage:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Perplexity Usage API Integration
export async function fetchPerplexityUsage(
  startDate: string,
  endDate: string
): Promise<ProviderUsageResponse> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Perplexity API key not configured' }
    }

    // Perplexity usage API (if available)
    // This would need to be implemented based on their API documentation
    return { 
      success: false, 
      error: 'Perplexity usage API integration pending' 
    }
  } catch (error) {
    console.error('Error fetching Perplexity usage:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Enhanced tracking function that captures real token usage from API responses
export async function trackRealUsage(
  userId: string,
  agentId: string,
  agentName: string,
  framework: string,
  provider: string,
  messageType: 'chat' | 'preset_action' | 'tool_execution',
  apiResponse: any, // The actual API response from the provider
  responseTimeMs: number,
  success: boolean,
  errorMessage?: string,
  requestMetadata?: any
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  try {
    // Extract real token usage from API response
    let inputTokens = 0
    let outputTokens = 0
    let actualCost = 0
    let model = ''

    // Parse different provider response formats
    switch (provider) {
      case 'openai':
        inputTokens = apiResponse?.usage?.prompt_tokens || 0
        outputTokens = apiResponse?.usage?.completion_tokens || 0
        model = apiResponse?.model || process.env.OPENAI_MODEL || 'gpt-5'
        // OpenAI doesn't return cost in response, so we calculate it
        actualCost = calculateCostFromTokens(provider, model, inputTokens, outputTokens)
        break

      case 'anthropic':
        inputTokens = apiResponse?.usage?.input_tokens || 0
        outputTokens = apiResponse?.usage?.output_tokens || 0
        model = apiResponse?.model || process.env.ANTHROPIC_MODEL || 'claude-3.5-sonnet-20241022'
        actualCost = calculateCostFromTokens(provider, model, inputTokens, outputTokens)
        break

      case 'perplexity':
        inputTokens = apiResponse?.usage?.prompt_tokens || 0
        outputTokens = apiResponse?.usage?.completion_tokens || 0
        model = apiResponse?.model || process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online'
        actualCost = calculateCostFromTokens(provider, model, inputTokens, outputTokens)
        break

      case 'google':
        // Google Gemini response format
        inputTokens = apiResponse?.usageMetadata?.promptTokenCount || 0
        outputTokens = apiResponse?.usageMetadata?.candidatesTokenCount || 0
        model = apiResponse?.model || 'gemini-1.5-flash'
        actualCost = calculateCostFromTokens(provider, model, inputTokens, outputTokens)
        break

      default:
        console.warn(`Unknown provider: ${provider}`)
        return
    }

    // Insert real usage record
    const { error } = await supabase
      .from('agent_usage_detailed')
      .insert({
        user_id: userId,
        agent_id: agentId,
        agent_name: agentName,
        framework,
        provider,
        message_type: messageType,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: actualCost,
        response_time_ms: responseTimeMs,
        success,
        error_message: errorMessage,
        request_metadata: {
          ...requestMetadata,
          model: model,
          api_response_id: apiResponse?.id,
          real_usage: true // Flag to indicate this is real usage data
        },
        timestamp: new Date().toISOString()
      })

    if (error) {
      console.error('Error tracking real usage:', error)
      throw error
    }

    console.log(`Tracked real usage: ${provider} ${model} - ${inputTokens}/${outputTokens} tokens - $${actualCost}`)
  } catch (error) {
    console.error('Error in trackRealUsage:', error)
    throw error
  }
}

// Helper function to calculate cost from tokens (fallback when API doesn't provide cost)
function calculateCostFromTokens(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Import the cost calculator
  const { calculateTokenCost } = require('./ai-cost-calculator')
  
  const costCalculation = calculateTokenCost(provider, model, {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  })
  
  return costCalculation.totalCost
}

// Sync real usage data from provider APIs
export async function syncRealUsageData(): Promise<{
  success: boolean
  synced: number
  errors: string[]
}> {
  const errors: string[] = []
  let totalSynced = 0

  const endDate = new Date().toISOString()
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours

  try {
    // Sync OpenAI usage
    const openaiResult = await fetchOpenAIUsage(startDate, endDate)
    if (openaiResult.success && openaiResult.data) {
      totalSynced += openaiResult.data.length
      // Store synced data in database
      // Implementation would go here
    } else if (openaiResult.error) {
      errors.push(`OpenAI: ${openaiResult.error}`)
    }

    // Sync other providers...
    // Similar implementation for Anthropic, Perplexity, etc.

  } catch (error) {
    errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    success: errors.length === 0,
    synced: totalSynced,
    errors
  }
}

// Get real vs estimated cost comparison
export async function compareRealVsEstimatedCosts(userId?: string): Promise<{
  realCost: number
  estimatedCost: number
  accuracy: number
  records: number
}> {
  const supabase = createSupabaseAdminClient()

  try {
    let query = supabase
      .from('agent_usage_detailed')
      .select('*')
      .eq('request_metadata->>real_usage', 'true')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: realUsageRecords, error } = await query

    if (error) throw error

    const realCost = realUsageRecords?.reduce((sum, record) => sum + parseFloat(record.cost_usd || '0'), 0) || 0
    
    // This would compare against estimated costs
    // Implementation would calculate estimated costs for the same records
    
    return {
      realCost,
      estimatedCost: 0, // Would be calculated
      accuracy: 0, // Would be calculated
      records: realUsageRecords?.length || 0
    }
  } catch (error) {
    console.error('Error comparing costs:', error)
    throw error
  }
}
