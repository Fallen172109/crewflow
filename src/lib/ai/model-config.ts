// AI Model Configuration for Cost-Effective Development
// Allows switching between cost-effective and premium models

export interface ModelConfig {
  name: string
  provider: 'openai' | 'anthropic' | 'perplexity'
  maxTokens: number
  temperature: number
  costTier: 'budget' | 'standard' | 'premium'
  useCase: string[]
  estimatedCostPer1kTokens: number // in USD
}

export const AI_MODELS: Record<string, ModelConfig> = {
  // GPT-5 - Primary model for all features
  'gpt-5': {
    name: 'gpt-5',
    provider: 'openai',
    maxTokens: 8000,
    temperature: 0.7,
    costTier: 'premium',
    useCase: ['product-creation', 'general-chat', 'complex-analysis', 'creative-writing', 'enterprise'],
    estimatedCostPer1kTokens: 0.02
  },

  // Legacy models (kept for fallback compatibility)
  'gpt-4': {
    name: 'gpt-4',
    provider: 'openai',
    maxTokens: 2000,
    temperature: 0.7,
    costTier: 'standard',
    useCase: ['product-creation', 'complex-analysis', 'creative-writing'],
    estimatedCostPer1kTokens: 0.03
  },

  'gpt-4-turbo-preview': {
    name: 'gpt-4-turbo-preview',
    provider: 'openai',
    maxTokens: 4000,
    temperature: 0.7,
    costTier: 'standard',
    useCase: ['premium-product-creation', 'complex-analysis', 'enterprise'],
    estimatedCostPer1kTokens: 0.01
  },

  'gpt-4-vision-preview': {
    name: 'gpt-4-vision-preview',
    provider: 'openai',
    maxTokens: 2000,
    temperature: 0.7,
    costTier: 'standard',
    useCase: ['image-analysis', 'product-image-description'],
    estimatedCostPer1kTokens: 0.01
  }
}

export interface ModelSelectionOptions {
  useCase: string
  environment?: 'development' | 'staging' | 'production'
  userTier?: 'starter' | 'professional' | 'enterprise'
  costPreference?: 'budget' | 'balanced' | 'premium'
}

export function selectOptimalModel(options: ModelSelectionOptions): ModelConfig {
  const { useCase } = options

  // Use GPT-5 for all use cases except image analysis
  if (useCase === 'image-analysis') {
    return AI_MODELS['gpt-4-vision-preview']
  }

  // GPT-5 is the primary model for all features
  return AI_MODELS['gpt-5']
}

export function getModelForProductCreation(
  environment: string = process.env.NODE_ENV || 'development',
  userTier: string = 'starter'
): ModelConfig {
  // Use GPT-5 for product creation
  return AI_MODELS['gpt-5']
}

export function estimateRequestCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = AI_MODELS[modelName]
  if (!model) return 0

  const totalTokens = inputTokens + outputTokens
  return (totalTokens / 1000) * model.estimatedCostPer1kTokens
}

// Environment-based model selection - GPT-5 is the primary model
export const MODEL_PRESETS = {
  development: {
    productCreation: 'gpt-5',
    imageAnalysis: 'gpt-4-vision-preview',
    generalChat: 'gpt-5',
    complexAnalysis: 'gpt-5'
  },

  staging: {
    productCreation: 'gpt-5',
    imageAnalysis: 'gpt-4-vision-preview',
    generalChat: 'gpt-5',
    complexAnalysis: 'gpt-5'
  },

  production: {
    productCreation: 'gpt-5',
    imageAnalysis: 'gpt-4-vision-preview',
    generalChat: 'gpt-5',
    complexAnalysis: 'gpt-5'
  }
}

// Helper function to get model name for current environment
export function getModelName(
  useCase: keyof typeof MODEL_PRESETS.development,
  environment: string = process.env.NODE_ENV || 'development'
): string {
  const env = environment as keyof typeof MODEL_PRESETS
  return MODEL_PRESETS[env]?.[useCase] || MODEL_PRESETS.development[useCase]
}

// Cost tracking utilities
export interface UsageMetrics {
  modelName: string
  inputTokens: number
  outputTokens: number
  requestCount: number
  totalCost: number
  timestamp: Date
}

export function createUsageMetrics(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): UsageMetrics {
  return {
    modelName,
    inputTokens,
    outputTokens,
    requestCount: 1,
    totalCost: estimateRequestCost(modelName, inputTokens, outputTokens),
    timestamp: new Date()
  }
}

// Development helper to show cost estimates
export function logCostEstimate(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
  context: string = ''
) {
  if (process.env.NODE_ENV === 'development') {
    const cost = estimateRequestCost(modelName, inputTokens, outputTokens)
    console.log(`💰 AI Cost Estimate ${context ? `(${context})` : ''}:`, {
      model: modelName,
      inputTokens,
      outputTokens,
      estimatedCost: `$${cost.toFixed(4)}`,
      tier: AI_MODELS[modelName]?.costTier || 'unknown',
      note: 'Using GPT-5 for optimal quality'
    })
  }
}
