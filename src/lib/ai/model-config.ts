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
  // Budget-friendly models for development and testing
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    provider: 'openai',
    maxTokens: 1500,
    temperature: 0.7,
    costTier: 'budget',
    useCase: ['product-creation', 'general-chat', 'testing'],
    estimatedCostPer1kTokens: 0.002
  },
  
  'gpt-3.5-turbo-16k': {
    name: 'gpt-3.5-turbo-16k',
    provider: 'openai',
    maxTokens: 4000,
    temperature: 0.7,
    costTier: 'standard',
    useCase: ['product-creation', 'long-content', 'analysis'],
    estimatedCostPer1kTokens: 0.004
  },

  // Standard models for production
  'gpt-4': {
    name: 'gpt-4',
    provider: 'openai',
    maxTokens: 2000,
    temperature: 0.7,
    costTier: 'standard',
    useCase: ['product-creation', 'complex-analysis', 'creative-writing'],
    estimatedCostPer1kTokens: 0.03
  },

  // Premium models for high-quality output
  'gpt-4-turbo-preview': {
    name: 'gpt-4-turbo-preview',
    provider: 'openai',
    maxTokens: 4000,
    temperature: 0.7,
    costTier: 'premium',
    useCase: ['premium-product-creation', 'complex-analysis', 'enterprise'],
    estimatedCostPer1kTokens: 0.01
  },

  'gpt-4-vision-preview': {
    name: 'gpt-4-vision-preview',
    provider: 'openai',
    maxTokens: 2000,
    temperature: 0.7,
    costTier: 'premium',
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
  const { useCase, environment = 'development', userTier = 'starter', costPreference = 'budget' } = options

  // Use GPT-4 for all environments for better quality
  // Keep the infrastructure for future cost optimization if needed

  if (useCase === 'image-analysis') {
    return AI_MODELS['gpt-4-vision-preview']
  }

  if (useCase === 'product-creation' || useCase === 'complex-analysis') {
    return AI_MODELS['gpt-4']
  }

  // For general chat, GPT-4 is still preferred for consistency
  return AI_MODELS['gpt-4']
}

export function getModelForProductCreation(
  environment: string = process.env.NODE_ENV || 'development',
  userTier: string = 'starter'
): ModelConfig {
  // Always use GPT-4 for product creation for best quality
  return AI_MODELS['gpt-4']
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

// Environment-based model selection - Updated to use GPT-4 for quality
export const MODEL_PRESETS = {
  development: {
    productCreation: 'gpt-4',
    imageAnalysis: 'gpt-4-vision-preview',
    generalChat: 'gpt-4',
    complexAnalysis: 'gpt-4'
  },

  staging: {
    productCreation: 'gpt-4',
    imageAnalysis: 'gpt-4-vision-preview',
    generalChat: 'gpt-4',
    complexAnalysis: 'gpt-4'
  },

  production: {
    productCreation: 'gpt-4',
    imageAnalysis: 'gpt-4-vision-preview',
    generalChat: 'gpt-4',
    complexAnalysis: 'gpt-4-turbo-preview'
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
      note: 'Using GPT-4 for optimal quality'
    })
  }
}
