// AI Framework Configuration
// Centralized configuration for all AI frameworks used in CrewFlow

export interface AIConfig {
  openai: {
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
  }
  anthropic: {
    apiKey: string
    model: string
    maxTokens: number
  }
  perplexity: {
    apiKey: string
    model: string
    maxTokens: number
  }
  langchain: {
    verbose: boolean
    temperature: number
    maxRetries: number
  }
  autogen: {
    maxRounds: number
    temperature: number
    timeout: number
  }
}

// Default AI configuration
export const defaultAIConfig: AIConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-5',
    temperature: 0.7,
    maxTokens: 8000
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    model: 'llama-3.1-sonar-large-128k-online',
    maxTokens: 4000
  },
  langchain: {
    verbose: process.env.NODE_ENV === 'development',
    temperature: 0.7,
    maxRetries: 3
  },
  autogen: {
    maxRounds: 10,
    temperature: 0.7,
    timeout: 300000 // 5 minutes
  }
}

// Validate AI configuration
export function validateAIConfig(config: AIConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.openai.apiKey) {
    errors.push('OpenAI API key is required')
  }

  if (!config.anthropic.apiKey) {
    errors.push('Anthropic API key is required')
  }

  if (!config.perplexity.apiKey) {
    errors.push('Perplexity API key is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Get AI configuration with environment variable overrides
export function getAIConfig(): AIConfig {
  return {
    ...defaultAIConfig,
    openai: {
      ...defaultAIConfig.openai,
      apiKey: process.env.OPENAI_API_KEY || defaultAIConfig.openai.apiKey,
      model: process.env.OPENAI_MODEL || defaultAIConfig.openai.model
    },
    anthropic: {
      ...defaultAIConfig.anthropic,
      apiKey: process.env.ANTHROPIC_API_KEY || defaultAIConfig.anthropic.apiKey,
      model: process.env.ANTHROPIC_MODEL || defaultAIConfig.anthropic.model
    },
    perplexity: {
      ...defaultAIConfig.perplexity,
      apiKey: process.env.PERPLEXITY_API_KEY || defaultAIConfig.perplexity.apiKey,
      model: process.env.PERPLEXITY_MODEL || defaultAIConfig.perplexity.model
    }
  }
}

// Framework-specific model configurations
export const FRAMEWORK_MODELS = {
  langchain: {
    openai: ['gpt-5', 'gpt-4-turbo-preview', 'gpt-4'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
  },
  perplexity: {
    models: [
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-small-128k-online',
      'llama-3.1-sonar-large-128k-chat',
      'llama-3.1-sonar-small-128k-chat'
    ]
  },
  autogen: {
    supportedModels: ['gpt-5', 'gpt-4-turbo-preview', 'claude-3-5-sonnet-20241022']
  }
} as const

// Error handling configuration
export const AI_ERROR_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeoutMs: 30000, // 30 seconds
  rateLimitDelay: 5000 // 5 seconds
} as const

// Usage tracking configuration
export const USAGE_CONFIG = {
  trackTokens: true,
  trackLatency: true,
  trackErrors: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
} as const
