// AI Cost Calculator - Real-time pricing for different AI providers
// Updated pricing as of December 2024

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface CostCalculation {
  inputCost: number
  outputCost: number
  totalCost: number
  provider: string
  model: string
  currency: 'USD'
}

export interface ProviderPricing {
  provider: string
  models: {
    [modelName: string]: {
      inputCostPer1kTokens: number
      outputCostPer1kTokens: number
      description: string
    }
  }
}

// Current AI provider pricing (per 1,000 tokens in USD) - Updated January 2026
export const AI_PROVIDER_PRICING: ProviderPricing[] = [
  {
    provider: 'openai',
    models: {
      // GPT-5 - Primary model
      'gpt-5': {
        inputCostPer1kTokens: 0.02,
        outputCostPer1kTokens: 0.06,
        description: 'GPT-5 (Primary)'
      },
      // Legacy models for fallback
      'gpt-4.1': {
        inputCostPer1kTokens: 0.002,
        outputCostPer1kTokens: 0.008,
        description: 'GPT-4.1 (Legacy)'
      },
      'gpt-4o': {
        inputCostPer1kTokens: 0.005,
        outputCostPer1kTokens: 0.02,
        description: 'GPT-4o (Legacy)'
      },
      'gpt-4-turbo': {
        inputCostPer1kTokens: 0.01,
        outputCostPer1kTokens: 0.03,
        description: 'GPT-4 Turbo (Legacy)'
      },
      'gpt-4-turbo-preview': {
        inputCostPer1kTokens: 0.01,
        outputCostPer1kTokens: 0.03,
        description: 'GPT-4 Turbo Preview (Legacy)'
      },
      'text-embedding-3-small': {
        inputCostPer1kTokens: 0.00002,
        outputCostPer1kTokens: 0,
        description: 'Text Embedding 3 Small'
      },
      'text-embedding-3-large': {
        inputCostPer1kTokens: 0.00013,
        outputCostPer1kTokens: 0,
        description: 'Text Embedding 3 Large'
      }
    }
  },
  {
    provider: 'anthropic',
    models: {
      'claude-3-5-sonnet': {
        inputCostPer1kTokens: 0.003,
        outputCostPer1kTokens: 0.015,
        description: 'Claude 3.5 Sonnet'
      },
      'claude-3-opus': {
        inputCostPer1kTokens: 0.015,
        outputCostPer1kTokens: 0.075,
        description: 'Claude 3 Opus'
      },
      'claude-3-sonnet': {
        inputCostPer1kTokens: 0.003,
        outputCostPer1kTokens: 0.015,
        description: 'Claude 3 Sonnet'
      },
      'claude-3-haiku': {
        inputCostPer1kTokens: 0.00025,
        outputCostPer1kTokens: 0.00125,
        description: 'Claude 3 Haiku'
      },
      'claude-3.5-sonnet-20241022': {
        inputCostPer1kTokens: 0.003,
        outputCostPer1kTokens: 0.015,
        description: 'Claude 3.5 Sonnet (20241022)'
      }
    }
  },
  {
    provider: 'perplexity',
    models: {
      'llama-3.1-sonar-small-128k-online': {
        inputCostPer1kTokens: 0.0002,
        outputCostPer1kTokens: 0.0002,
        description: 'Llama 3.1 Sonar Small Online'
      },
      'llama-3.1-sonar-large-128k-online': {
        inputCostPer1kTokens: 0.001,
        outputCostPer1kTokens: 0.001,
        description: 'Llama 3.1 Sonar Large Online'
      },
      'llama-3.1-sonar-huge-128k-online': {
        inputCostPer1kTokens: 0.005,
        outputCostPer1kTokens: 0.005,
        description: 'Llama 3.1 Sonar Huge Online'
      }
    }
  },
  {
    provider: 'google',
    models: {
      'gemini-1.5-pro': {
        inputCostPer1kTokens: 0.00125,
        outputCostPer1kTokens: 0.005,
        description: 'Gemini 1.5 Pro'
      },
      'gemini-1.5-flash': {
        inputCostPer1kTokens: 0.000075,
        outputCostPer1kTokens: 0.0003,
        description: 'Gemini 1.5 Flash'
      },
      'gemini-pro': {
        inputCostPer1kTokens: 0.0005,
        outputCostPer1kTokens: 0.0015,
        description: 'Gemini Pro'
      }
    }
  }
]

// Default model mappings for each provider (matching your .env configuration)
export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-5', // Primary model for all AI features
  anthropic: 'claude-3.5-sonnet-20241022', // Fallback
  perplexity: 'llama-3.1-sonar-large-128k-online', // Web search
  google: 'gemini-1.5-flash'
}

// Calculate cost for token usage
export function calculateTokenCost(
  provider: string,
  model: string | null,
  tokenUsage: TokenUsage
): CostCalculation {
  // Use default model if none specified
  const actualModel = model || DEFAULT_MODELS[provider] || 'unknown'
  
  // Find provider pricing
  const providerPricing = AI_PROVIDER_PRICING.find(p => p.provider === provider)
  if (!providerPricing) {
    console.warn(`Unknown provider: ${provider}`)
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      provider,
      model: actualModel,
      currency: 'USD'
    }
  }

  // Find model pricing
  const modelPricing = providerPricing.models[actualModel]
  if (!modelPricing) {
    console.warn(`Unknown model: ${actualModel} for provider: ${provider}`)
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      provider,
      model: actualModel,
      currency: 'USD'
    }
  }

  // Calculate costs
  const inputCost = (tokenUsage.inputTokens / 1000) * modelPricing.inputCostPer1kTokens
  const outputCost = (tokenUsage.outputTokens / 1000) * modelPricing.outputCostPer1kTokens
  const totalCost = inputCost + outputCost

  return {
    inputCost: Math.round(inputCost * 1000000) / 1000000, // Round to 6 decimal places
    outputCost: Math.round(outputCost * 1000000) / 1000000,
    totalCost: Math.round(totalCost * 1000000) / 1000000,
    provider,
    model: actualModel,
    currency: 'USD'
  }
}

// Get estimated cost for a request (before making it)
export function estimateRequestCost(
  provider: string,
  model: string | null,
  estimatedInputTokens: number,
  estimatedOutputTokens: number = 0
): CostCalculation {
  return calculateTokenCost(provider, model, {
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    totalTokens: estimatedInputTokens + estimatedOutputTokens
  })
}

// Get all available models for a provider
export function getProviderModels(provider: string): string[] {
  const providerPricing = AI_PROVIDER_PRICING.find(p => p.provider === provider)
  return providerPricing ? Object.keys(providerPricing.models) : []
}

// Get model description
export function getModelDescription(provider: string, model: string): string {
  const providerPricing = AI_PROVIDER_PRICING.find(p => p.provider === provider)
  const modelPricing = providerPricing?.models[model]
  return modelPricing?.description || `${provider}/${model}`
}

// Format cost for display
export function formatCost(cost: number, currency: string = 'USD'): string {
  if (cost === 0) return '$0.00'
  if (cost < 0.01) return `<$0.01`
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(cost)
}

// Calculate cost savings between models
export function compareCosts(
  provider: string,
  model1: string,
  model2: string,
  tokenUsage: TokenUsage
): {
  model1Cost: CostCalculation
  model2Cost: CostCalculation
  savings: number
  savingsPercentage: number
} {
  const model1Cost = calculateTokenCost(provider, model1, tokenUsage)
  const model2Cost = calculateTokenCost(provider, model2, tokenUsage)
  const savings = model1Cost.totalCost - model2Cost.totalCost
  const savingsPercentage = model1Cost.totalCost > 0 
    ? (savings / model1Cost.totalCost) * 100 
    : 0

  return {
    model1Cost,
    model2Cost,
    savings,
    savingsPercentage
  }
}

// Get cost breakdown by provider for analytics
export function getCostBreakdownByProvider(usageData: Array<{
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
}>): Record<string, {
  totalCost: number
  requests: number
  totalTokens: number
}> {
  const breakdown: Record<string, {
    totalCost: number
    requests: number
    totalTokens: number
  }> = {}

  usageData.forEach(usage => {
    const cost = calculateTokenCost(usage.provider, usage.model, {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.inputTokens + usage.outputTokens
    })

    if (!breakdown[usage.provider]) {
      breakdown[usage.provider] = {
        totalCost: 0,
        requests: 0,
        totalTokens: 0
      }
    }

    breakdown[usage.provider].totalCost += cost.totalCost
    breakdown[usage.provider].requests += 1
    breakdown[usage.provider].totalTokens += cost.totalCost > 0 ? usage.inputTokens + usage.outputTokens : 0
  })

  return breakdown
}
