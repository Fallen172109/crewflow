// Production Deployment Configuration
// Production-ready settings and environment management for OAuth integrations

export interface ProductionConfig {
  environment: 'development' | 'staging' | 'production'
  baseUrl: string
  redirectUris: {
    oauth: string
    webhook: string
  }
  security: {
    encryptionKey: string
    rateLimiting: {
      enabled: boolean
      windowMs: number
      maxRequests: number
    }
    cors: {
      origins: string[]
      credentials: boolean
    }
    csrf: {
      enabled: boolean
      secret: string
    }
  }
  database: {
    connectionString: string
    ssl: boolean
    poolSize: number
    timeout: number
  }
  monitoring: {
    enabled: boolean
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    metricsEndpoint?: string
    alerting: {
      enabled: boolean
      webhookUrl?: string
      errorThreshold: number
    }
  }
  oauth: {
    tokenRefreshInterval: number
    maxRetries: number
    timeoutMs: number
    providers: Record<string, {
      clientId: string
      clientSecret: string
      enabled: boolean
      rateLimits?: {
        requestsPerMinute: number
        requestsPerHour: number
      }
    }>
  }
  features: {
    autoTokenRefresh: boolean
    healthChecks: boolean
    auditLogging: boolean
    errorRecovery: boolean
    webhookSupport: boolean
  }
}

// Default production configuration
const DEFAULT_PRODUCTION_CONFIG: Partial<ProductionConfig> = {
  security: {
    rateLimiting: {
      enabled: true,
      windowMs: 60000, // 1 minute
      maxRequests: 100
    },
    cors: {
      credentials: true
    },
    csrf: {
      enabled: true
    }
  },
  database: {
    ssl: true,
    poolSize: 20,
    timeout: 30000
  },
  monitoring: {
    enabled: true,
    logLevel: 'info',
    alerting: {
      enabled: true,
      errorThreshold: 10
    }
  },
  oauth: {
    tokenRefreshInterval: 15, // minutes
    maxRetries: 3,
    timeoutMs: 30000
  },
  features: {
    autoTokenRefresh: true,
    healthChecks: true,
    auditLogging: true,
    errorRecovery: true,
    webhookSupport: true
  }
}

// Environment-specific configurations
const ENVIRONMENT_CONFIGS: Record<string, Partial<ProductionConfig>> = {
  development: {
    environment: 'development',
    baseUrl: 'http://localhost:3000',
    security: {
      rateLimiting: {
        enabled: false
      },
      cors: {
        origins: ['http://localhost:3000', 'http://localhost:3001']
      },
      csrf: {
        enabled: false
      }
    },
    database: {
      ssl: false,
      poolSize: 5
    },
    monitoring: {
      logLevel: 'debug',
      alerting: {
        enabled: false
      }
    }
  },
  staging: {
    environment: 'staging',
    baseUrl: 'https://staging.crewflow.ai',
    security: {
      rateLimiting: {
        enabled: true,
        maxRequests: 200
      },
      cors: {
        origins: ['https://staging.crewflow.ai']
      }
    },
    monitoring: {
      logLevel: 'info',
      alerting: {
        enabled: true,
        errorThreshold: 20
      }
    }
  },
  production: {
    environment: 'production',
    baseUrl: 'https://crewflow.ai',
    security: {
      rateLimiting: {
        enabled: true,
        maxRequests: 100
      },
      cors: {
        origins: ['https://crewflow.ai', 'https://www.crewflow.ai']
      }
    },
    monitoring: {
      logLevel: 'warn',
      alerting: {
        enabled: true,
        errorThreshold: 5
      }
    }
  }
}

export class ProductionConfigManager {
  private config: ProductionConfig

  constructor(environment?: string) {
    const env = environment || process.env.NODE_ENV || 'development'
    this.config = this.buildConfig(env)
  }

  private buildConfig(environment: string): ProductionConfig {
    const envConfig = ENVIRONMENT_CONFIGS[environment] || ENVIRONMENT_CONFIGS.development
    
    return {
      ...DEFAULT_PRODUCTION_CONFIG,
      ...envConfig,
      redirectUris: {
        oauth: `${envConfig.baseUrl}/api/integrations/oauth/callback`,
        webhook: `${envConfig.baseUrl}/api/integrations/webhook`
      },
      security: {
        ...DEFAULT_PRODUCTION_CONFIG.security,
        ...envConfig.security,
        encryptionKey: process.env.OAUTH_ENCRYPTION_KEY || 'change-in-production',
        rateLimiting: {
          ...DEFAULT_PRODUCTION_CONFIG.security?.rateLimiting,
          ...envConfig.security?.rateLimiting
        },
        cors: {
          ...DEFAULT_PRODUCTION_CONFIG.security?.cors,
          ...envConfig.security?.cors
        },
        csrf: {
          ...DEFAULT_PRODUCTION_CONFIG.security?.csrf,
          ...envConfig.security?.csrf,
          secret: process.env.CSRF_SECRET || 'change-in-production'
        }
      },
      database: {
        ...DEFAULT_PRODUCTION_CONFIG.database,
        ...envConfig.database,
        connectionString: process.env.DATABASE_URL || ''
      },
      monitoring: {
        ...DEFAULT_PRODUCTION_CONFIG.monitoring,
        ...envConfig.monitoring,
        metricsEndpoint: process.env.METRICS_ENDPOINT,
        alerting: {
          ...DEFAULT_PRODUCTION_CONFIG.monitoring?.alerting,
          ...envConfig.monitoring?.alerting,
          webhookUrl: process.env.ALERT_WEBHOOK_URL
        }
      },
      oauth: {
        ...DEFAULT_PRODUCTION_CONFIG.oauth,
        ...envConfig.oauth,
        providers: this.loadOAuthProviders()
      }
    } as ProductionConfig
  }

  private loadOAuthProviders(): Record<string, any> {
    const providers: Record<string, any> = {}
    
    const integrationIds = [
      'salesforce', 'hubspot', 'shopify', 'google-ads', 'facebook-business', 'facebook-ads',
      'mailchimp', 'jira', 'asana', 'monday', 'slack', 'discord', 'twitter', 'linkedin',
      'google-workspace', 'stripe'
    ]

    integrationIds.forEach(id => {
      const envKey = id.toUpperCase().replace('-', '_')
      const clientId = process.env[`${envKey}_CLIENT_ID`]
      const clientSecret = process.env[`${envKey}_CLIENT_SECRET`]

      if (clientId && clientSecret) {
        providers[id] = {
          clientId,
          clientSecret,
          enabled: true,
          rateLimits: this.getProviderRateLimits(id)
        }
      }
    })

    return providers
  }

  private getProviderRateLimits(providerId: string): { requestsPerMinute: number; requestsPerHour: number } {
    const limits: Record<string, { requestsPerMinute: number; requestsPerHour: number }> = {
      'facebook-business': { requestsPerMinute: 200, requestsPerHour: 4800 },
      'facebook-ads': { requestsPerMinute: 200, requestsPerHour: 4800 },
      'google-ads': { requestsPerMinute: 100, requestsPerHour: 10000 },
      'google-workspace': { requestsPerMinute: 100, requestsPerHour: 10000 },
      'salesforce': { requestsPerMinute: 100, requestsPerHour: 5000 },
      'hubspot': { requestsPerMinute: 100, requestsPerHour: 2400 },
      'stripe': { requestsPerMinute: 100, requestsPerHour: 1000 },
      'linkedin': { requestsPerMinute: 100, requestsPerHour: 2000 },
      'twitter': { requestsPerMinute: 300, requestsPerHour: 15000 },
      'shopify': { requestsPerMinute: 40, requestsPerHour: 1000 },
      'slack': { requestsPerMinute: 50, requestsPerHour: 1200 },
      'discord': { requestsPerMinute: 50, requestsPerHour: 1200 },
      'mailchimp': { requestsPerMinute: 10, requestsPerHour: 500 },
      'jira': { requestsPerMinute: 100, requestsPerHour: 2400 },
      'asana': { requestsPerMinute: 100, requestsPerHour: 2400 },
      'monday': { requestsPerMinute: 100, requestsPerHour: 2400 }
    }

    return limits[providerId] || { requestsPerMinute: 60, requestsPerHour: 1000 }
  }

  // Get current configuration
  getConfig(): ProductionConfig {
    return { ...this.config }
  }

  // Get environment-specific settings
  getEnvironmentSettings(): {
    environment: string
    baseUrl: string
    redirectUris: { oauth: string; webhook: string }
    securityEnabled: boolean
    monitoringEnabled: boolean
  } {
    return {
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
      redirectUris: this.config.redirectUris,
      securityEnabled: this.config.security.rateLimiting.enabled,
      monitoringEnabled: this.config.monitoring.enabled
    }
  }

  // Validate configuration
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Required environment variables
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL environment variable is required')
    }

    if (!process.env.OAUTH_ENCRYPTION_KEY || process.env.OAUTH_ENCRYPTION_KEY === 'change-in-production') {
      if (this.config.environment === 'production') {
        errors.push('OAUTH_ENCRYPTION_KEY must be set to a secure value in production')
      } else {
        warnings.push('OAUTH_ENCRYPTION_KEY should be set to a secure value')
      }
    }

    if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET === 'change-in-production') {
      if (this.config.environment === 'production') {
        errors.push('CSRF_SECRET must be set to a secure value in production')
      } else {
        warnings.push('CSRF_SECRET should be set to a secure value')
      }
    }

    // OAuth providers
    const configuredProviders = Object.keys(this.config.oauth.providers)
    if (configuredProviders.length === 0) {
      warnings.push('No OAuth providers are configured')
    }

    // Production-specific checks
    if (this.config.environment === 'production') {
      if (!this.config.security.rateLimiting.enabled) {
        errors.push('Rate limiting must be enabled in production')
      }

      if (!this.config.monitoring.enabled) {
        warnings.push('Monitoring should be enabled in production')
      }

      if (!this.config.database.ssl) {
        errors.push('Database SSL must be enabled in production')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Get OAuth redirect URIs for provider configuration
  getOAuthRedirectUris(): Record<string, string> {
    const uris: Record<string, string> = {}
    
    Object.keys(this.config.oauth.providers).forEach(providerId => {
      uris[providerId] = this.config.redirectUris.oauth
    })

    return uris
  }

  // Get webhook URLs for provider configuration
  getWebhookUrls(): Record<string, string> {
    const urls: Record<string, string> = {}
    
    Object.keys(this.config.oauth.providers).forEach(providerId => {
      urls[providerId] = `${this.config.redirectUris.webhook}/${providerId}`
    })

    return urls
  }
}

// Global configuration instance
let configInstance: ProductionConfigManager | null = null

// Get or create configuration manager
export function getProductionConfig(): ProductionConfigManager {
  if (!configInstance) {
    configInstance = new ProductionConfigManager()
  }
  return configInstance
}

// Validate current configuration
export function validateProductionConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const config = getProductionConfig()
  return config.validateConfig()
}
