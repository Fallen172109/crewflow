// Integration Hub Configuration
// Production-ready configuration for all third-party service integrations

export interface OAuthProviderConfig {
  // OAuth 2.0 specific configuration
  authorizationUrl: string
  tokenUrl: string
  revokeUrl?: string
  userInfoUrl?: string

  // OAuth flow configuration
  responseType: 'code' | 'token'
  grantType: 'authorization_code' | 'client_credentials'
  pkceSupported: boolean
  refreshTokenSupported: boolean

  // Provider-specific parameters
  additionalAuthParams?: Record<string, string>
  additionalTokenParams?: Record<string, string>

  // Token handling
  tokenType: 'Bearer' | 'Basic'
  expiresInField?: string
  refreshTokenField?: string

  // Rate limiting
  rateLimitHeaders?: {
    limit?: string
    remaining?: string
    reset?: string
  }
}

export interface IntegrationConfig {
  id: string
  name: string
  description: string
  logo: string
  category: string
  authType: 'oauth2' | 'api_key' | 'basic'

  // OAuth 2.0 configuration
  scopes?: string[]
  defaultScopes?: string[]
  optionalScopes?: string[]
  oauthConfig?: OAuthProviderConfig

  // API endpoints
  endpoints: {
    auth?: string
    token?: string
    api: string
    webhook?: string
  }

  // Connection requirements
  requiredFields?: string[]
  testEndpoint?: string

  // Provider capabilities
  features?: {
    webhooks?: boolean
    realTimeSync?: boolean
    bulkOperations?: boolean
    fileUpload?: boolean
    customFields?: boolean
  }

  // Documentation and support
  docsUrl?: string
  supportUrl?: string
  setupGuideUrl?: string

  // Production readiness
  productionReady: boolean
  betaFeatures?: string[]

  // Rate limiting and quotas
  rateLimits?: {
    requestsPerMinute?: number
    requestsPerHour?: number
    requestsPerDay?: number
  }
}

// Production-ready integrations configuration
export const INTEGRATIONS: Record<string, IntegrationConfig> = {
  // CRM & Sales
  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Customer relationship management and sales automation',
    logo: '/integrations/salesforce.png',
    category: 'crm',
    authType: 'oauth2',
    productionReady: true,

    // OAuth configuration
    scopes: ['api', 'refresh_token', 'offline_access'],
    defaultScopes: ['api', 'refresh_token'],
    optionalScopes: ['full', 'chatter_api', 'visualforce', 'web'],

    oauthConfig: {
      authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
      userInfoUrl: 'https://login.salesforce.com/services/oauth2/userinfo',
      responseType: 'code',
      grantType: 'authorization_code',
      pkceSupported: true,
      refreshTokenSupported: true,
      tokenType: 'Bearer',
      additionalAuthParams: {
        prompt: 'login consent'
      }
    },

    endpoints: {
      auth: 'https://login.salesforce.com/services/oauth2/authorize',
      token: 'https://login.salesforce.com/services/oauth2/token',
      api: 'https://api.salesforce.com',
      webhook: 'https://api.salesforce.com/services/data/v58.0/sobjects/StreamingChannel'
    },

    testEndpoint: '/services/data/v58.0/sobjects',

    features: {
      webhooks: true,
      realTimeSync: true,
      bulkOperations: true,
      fileUpload: true,
      customFields: true
    },

    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      requestsPerDay: 100000
    },

    docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
    supportUrl: 'https://help.salesforce.com/',
    setupGuideUrl: 'https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm'
  },
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Inbound marketing, sales, and customer service platform',
    logo: '/integrations/hubspot.png',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['contacts', 'content', 'reports', 'social', 'automation'],
    endpoints: {
      auth: 'https://app.hubspot.com/oauth/authorize',
      token: 'https://api.hubapi.com/oauth/v1/token',
      api: 'https://api.hubapi.com'
    },
    testEndpoint: '/contacts/v1/lists/all/contacts/all'
  },
  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales pipeline management and CRM',
    logo: '/integrations/pipedrive.png',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['deals:read', 'deals:write', 'contacts:read', 'contacts:write'],
    endpoints: {
      auth: 'https://oauth.pipedrive.com/oauth/authorize',
      token: 'https://oauth.pipedrive.com/oauth/token',
      api: 'https://api.pipedrive.com/v1'
    },
    testEndpoint: '/users/me'
  },

  // E-commerce
  shopify: {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce platform for online stores',
    logo: '/integrations/shopify.png',
    category: 'ecommerce',
    authType: 'oauth2',
    scopes: ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_customers'],
    endpoints: {
      auth: 'https://{shop}.myshopify.com/admin/oauth/authorize',
      token: 'https://{shop}.myshopify.com/admin/oauth/access_token',
      api: 'https://{shop}.myshopify.com/admin/api/2023-10'
    },
    requiredFields: ['shop_domain'],
    testEndpoint: '/shop.json'
  },
  woocommerce: {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'WordPress e-commerce plugin',
    logo: '/integrations/woocommerce.png',
    category: 'ecommerce',
    authType: 'api_key',
    endpoints: {
      api: '{site_url}/wp-json/wc/v3'
    },
    requiredFields: ['site_url', 'consumer_key', 'consumer_secret'],
    testEndpoint: '/products'
  },

  // Marketing & Analytics
  'google-ads': {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Online advertising platform',
    logo: '/integrations/google-ads.png',
    category: 'marketing',
    authType: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/adwords'],
    endpoints: {
      auth: 'https://accounts.google.com/o/oauth2/auth',
      token: 'https://oauth2.googleapis.com/token',
      api: 'https://googleads.googleapis.com'
    },
    testEndpoint: '/v14/customers:listAccessibleCustomers'
  },
  'facebook-business': {
    id: 'facebook-business',
    name: 'Facebook Business',
    description: 'Complete Facebook business management - pages, comments, posts, insights, and advertising',
    logo: '/integrations/facebook.png',
    category: 'social',
    authType: 'oauth2',
    productionReady: true,

    // OAuth configuration with MAXIMUM permissions for autonomous AI agent operations
    // These scopes enable full background management without user intervention
    scopes: [
      // Basic profile and authentication
      'public_profile',
      'email',

      // Page management (full autonomous control)
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_metadata',
      'pages_read_user_content',
      'pages_messaging',
      'pages_messaging_subscriptions',

      // Business and advertising (autonomous campaign management)
      'business_management',
      'ads_management',
      'ads_read',
      'pages_manage_ads',

      // Analytics and insights (performance monitoring)
      'read_insights',
      'pages_read_user_content',

      // Advanced permissions for comprehensive management
      'manage_pages',
      'publish_pages',
      'read_page_mailboxes',
      'pages_manage_cta',
      'pages_manage_instant_articles'
    ],
    scopes: [
      // Page management
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_read_user_content',
      'pages_manage_ads',
      'pages_show_list',

      // Business management
      'business_management',
      'read_insights',

      // Advertising
      'ads_management',
      'ads_read',

      // User data
      'email',
      'public_profile',

      // Messaging (for customer service)
      'pages_messaging',
      'pages_messaging_subscriptions'
    ],

    oauthConfig: {
      authorizationUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/v19.0/me',
      responseType: 'code',
      grantType: 'authorization_code',
      pkceSupported: false,
      refreshTokenSupported: true,
      tokenType: 'Bearer',
      additionalAuthParams: {
        auth_type: 'rerequest',
        display: 'popup'
      }
    },

    endpoints: {
      auth: 'https://www.facebook.com/v19.0/dialog/oauth',
      token: 'https://graph.facebook.com/v19.0/oauth/access_token',
      api: 'https://graph.facebook.com/v19.0',
      webhook: 'https://graph.facebook.com/v19.0/{page-id}/subscribed_apps'
    },

    testEndpoint: '/me/accounts',

    features: {
      webhooks: true,
      realTimeSync: true,
      bulkOperations: false,
      fileUpload: true,
      customFields: false
    },

    rateLimits: {
      requestsPerMinute: 200,
      requestsPerHour: 4800,
      requestsPerDay: 100000
    },

    docsUrl: 'https://developers.facebook.com/docs/graph-api/',
    supportUrl: 'https://developers.facebook.com/support/',
    setupGuideUrl: 'https://developers.facebook.com/docs/development/create-an-app/'
  },
  'facebook-ads': {
    id: 'facebook-ads',
    name: 'Facebook Ads',
    description: 'Social media advertising platform (legacy - use Facebook Business for full features)',
    logo: '/integrations/facebook.png',
    category: 'marketing',
    authType: 'oauth2',
    scopes: ['ads_management', 'ads_read', 'business_management'],
    endpoints: {
      auth: 'https://www.facebook.com/v18.0/dialog/oauth',
      token: 'https://graph.facebook.com/v18.0/oauth/access_token',
      api: 'https://graph.facebook.com/v18.0'
    },
    testEndpoint: '/me/adaccounts'
  },
  mailchimp: {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing automation platform',
    logo: '/integrations/mailchimp.png',
    category: 'marketing',
    authType: 'oauth2',
    scopes: ['read', 'write'],
    endpoints: {
      auth: 'https://login.mailchimp.com/oauth2/authorize',
      token: 'https://login.mailchimp.com/oauth2/token',
      api: 'https://{dc}.api.mailchimp.com/3.0'
    },
    testEndpoint: '/lists'
  },

  // Project Management
  jira: {
    id: 'jira',
    name: 'Jira',
    description: 'Project management and issue tracking',
    logo: '/integrations/jira.png',
    category: 'project',
    authType: 'oauth2',
    scopes: ['read:jira-work', 'write:jira-work', 'manage:jira-project'],
    endpoints: {
      auth: 'https://auth.atlassian.com/authorize',
      token: 'https://auth.atlassian.com/oauth/token',
      api: 'https://api.atlassian.com/ex/jira/{cloudid}/rest/api/3'
    },
    testEndpoint: '/myself'
  },
  asana: {
    id: 'asana',
    name: 'Asana',
    description: 'Team collaboration and project management',
    logo: '/integrations/asana.png',
    category: 'project',
    authType: 'oauth2',
    scopes: ['default'],
    endpoints: {
      auth: 'https://app.asana.com/-/oauth_authorize',
      token: 'https://app.asana.com/-/oauth_token',
      api: 'https://app.asana.com/api/1.0'
    },
    testEndpoint: '/users/me'
  },
  monday: {
    id: 'monday',
    name: 'Monday.com',
    description: 'Work operating system for teams',
    logo: '/integrations/monday.png',
    category: 'project',
    authType: 'oauth2',
    scopes: ['boards:read', 'boards:write', 'users:read'],
    endpoints: {
      auth: 'https://auth.monday.com/oauth2/authorize',
      token: 'https://auth.monday.com/oauth2/token',
      api: 'https://api.monday.com/v2'
    },
    testEndpoint: '/users'
  },

  // Communication
  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and collaboration',
    logo: '/integrations/slack.png',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['channels:read', 'chat:write', 'users:read', 'files:write'],
    endpoints: {
      auth: 'https://slack.com/oauth/v2/authorize',
      token: 'https://slack.com/api/oauth.v2.access',
      api: 'https://slack.com/api'
    },
    testEndpoint: '/auth.test'
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    description: 'Voice, video and text communication',
    logo: '/integrations/discord.png',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['bot', 'messages.read', 'guilds'],
    endpoints: {
      auth: 'https://discord.com/api/oauth2/authorize',
      token: 'https://discord.com/api/oauth2/token',
      api: 'https://discord.com/api/v10'
    },
    testEndpoint: '/users/@me'
  },

  // Social Media
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Social media platform',
    logo: '/integrations/twitter.png',
    category: 'social',
    authType: 'oauth2',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
    endpoints: {
      auth: 'https://twitter.com/i/oauth2/authorize',
      token: 'https://api.twitter.com/2/oauth2/token',
      api: 'https://api.twitter.com/2'
    },
    testEndpoint: '/users/me'
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional networking platform',
    logo: '/integrations/linkedin.png',
    category: 'social',
    authType: 'oauth2',
    productionReady: true,

    defaultScopes: ['r_liteprofile', 'r_emailaddress'],
    optionalScopes: ['w_member_social', 'r_organization_social', 'rw_organization_admin'],
    scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],

    oauthConfig: {
      authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoUrl: 'https://api.linkedin.com/v2/people/~',
      responseType: 'code',
      grantType: 'authorization_code',
      pkceSupported: false,
      refreshTokenSupported: true,
      tokenType: 'Bearer'
    },

    endpoints: {
      auth: 'https://www.linkedin.com/oauth/v2/authorization',
      token: 'https://www.linkedin.com/oauth/v2/accessToken',
      api: 'https://api.linkedin.com/v2'
    },

    testEndpoint: '/me',

    features: {
      webhooks: false,
      realTimeSync: false,
      bulkOperations: false,
      fileUpload: true,
      customFields: false
    },

    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 2000,
      requestsPerDay: 50000
    },

    docsUrl: 'https://docs.microsoft.com/en-us/linkedin/',
    supportUrl: 'https://www.linkedin.com/help/linkedin',
    setupGuideUrl: 'https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow'
  },

  // Additional popular integrations
  'google-workspace': {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Google Workspace (Gmail, Drive, Calendar, Docs)',
    logo: '/integrations/google-workspace.png',
    category: 'productivity',
    authType: 'oauth2',
    productionReady: true,

    defaultScopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    optionalScopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ],
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],

    oauthConfig: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      responseType: 'code',
      grantType: 'authorization_code',
      pkceSupported: true,
      refreshTokenSupported: true,
      tokenType: 'Bearer',
      additionalAuthParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    },

    endpoints: {
      auth: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
      api: 'https://www.googleapis.com'
    },

    testEndpoint: '/oauth2/v2/userinfo',

    features: {
      webhooks: true,
      realTimeSync: true,
      bulkOperations: true,
      fileUpload: true,
      customFields: false
    },

    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 10000,
      requestsPerDay: 1000000
    },

    docsUrl: 'https://developers.google.com/workspace',
    supportUrl: 'https://developers.google.com/workspace/support',
    setupGuideUrl: 'https://developers.google.com/workspace/guides/create-credentials'
  },

  stripe: {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing and financial services',
    logo: '/integrations/stripe.png',
    category: 'finance',
    authType: 'oauth2',
    productionReady: true,

    defaultScopes: ['read_only'],
    optionalScopes: ['read_write'],
    scopes: ['read_only'],

    oauthConfig: {
      authorizationUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
      responseType: 'code',
      grantType: 'authorization_code',
      pkceSupported: false,
      refreshTokenSupported: true,
      tokenType: 'Bearer'
    },

    endpoints: {
      auth: 'https://connect.stripe.com/oauth/authorize',
      token: 'https://connect.stripe.com/oauth/token',
      api: 'https://api.stripe.com/v1',
      webhook: 'https://api.stripe.com/v1/webhook_endpoints'
    },

    testEndpoint: '/account',

    features: {
      webhooks: true,
      realTimeSync: true,
      bulkOperations: false,
      fileUpload: false,
      customFields: true
    },

    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 25000
    },

    docsUrl: 'https://stripe.com/docs/api',
    supportUrl: 'https://support.stripe.com/',
    setupGuideUrl: 'https://stripe.com/docs/connect/oauth-reference'
  }
}

// Integration categories with enhanced metadata
export const INTEGRATION_CATEGORIES = {
  crm: {
    id: 'crm',
    name: 'Customer Relationship Management',
    description: 'Manage customer relationships, sales pipelines, and business processes',
    icon: 'users'
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce & Sales',
    description: 'Online stores, product management, and sales platforms',
    icon: 'shopping-cart'
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing & Analytics',
    description: 'Digital marketing, advertising, and analytics platforms',
    icon: 'trending-up'
  },
  project: {
    id: 'project',
    name: 'Project Management',
    description: 'Task management, team collaboration, and project tracking',
    icon: 'clipboard'
  },
  communication: {
    id: 'communication',
    name: 'Communication',
    description: 'Team chat, messaging, and communication tools',
    icon: 'message-circle'
  },
  social: {
    id: 'social',
    name: 'Social Media',
    description: 'Social media platforms and community management',
    icon: 'share-2'
  },
  finance: {
    id: 'finance',
    name: 'Finance & Accounting',
    description: 'Payment processing, accounting, and financial services',
    icon: 'dollar-sign'
  },
  hr: {
    id: 'hr',
    name: 'Human Resources',
    description: 'Employee management, recruitment, and HR systems',
    icon: 'user-check'
  },
  productivity: {
    id: 'productivity',
    name: 'Productivity Tools',
    description: 'Document management, calendars, and productivity suites',
    icon: 'briefcase'
  }
} as const

// Enhanced utility functions for integration management

// Get integrations by category
export function getIntegrationsByCategory(category: string): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(integration => integration.category === category)
}

// Get integration by ID
export function getIntegration(id: string): IntegrationConfig | null {
  return INTEGRATIONS[id] || null
}

// Get all integration categories with enhanced metadata
export function getIntegrationCategories(): Array<{
  id: string
  name: string
  description: string
  icon: string
  count: number
  productionReady: number
}> {
  return Object.values(INTEGRATION_CATEGORIES).map(category => {
    const integrations = getIntegrationsByCategory(category.id)
    return {
      ...category,
      count: integrations.length,
      productionReady: integrations.filter(i => i.productionReady).length
    }
  }).filter(category => category.count > 0)
}

// Get production-ready integrations only
export function getProductionReadyIntegrations(): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(integration => integration.productionReady)
}

// Get integrations by authentication type
export function getIntegrationsByAuthType(authType: 'oauth2' | 'api_key' | 'basic'): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(integration => integration.authType === authType)
}

// Get OAuth 2.0 integrations with PKCE support
export function getPKCESupportedIntegrations(): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(
    integration => integration.authType === 'oauth2' && integration.oauthConfig?.pkceSupported
  )
}

// Get integrations with webhook support
export function getWebhookSupportedIntegrations(): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(
    integration => integration.features?.webhooks === true
  )
}

// Get integration configuration for OAuth manager
export function getOAuthConfig(integrationId: string): OAuthProviderConfig | null {
  const integration = getIntegration(integrationId)
  return integration?.oauthConfig || null
}

// Validate integration configuration
export function validateIntegrationConfig(config: IntegrationConfig): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields validation
  if (!config.id) errors.push('Integration ID is required')
  if (!config.name) errors.push('Integration name is required')
  if (!config.category) errors.push('Integration category is required')
  if (!config.authType) errors.push('Authentication type is required')

  // OAuth specific validation
  if (config.authType === 'oauth2') {
    if (!config.endpoints.auth) errors.push('OAuth authorization endpoint is required')
    if (!config.endpoints.token) errors.push('OAuth token endpoint is required')
    if (!config.scopes || config.scopes.length === 0) {
      warnings.push('No OAuth scopes defined')
    }

    if (config.oauthConfig) {
      if (!config.oauthConfig.authorizationUrl) errors.push('OAuth authorization URL is required')
      if (!config.oauthConfig.tokenUrl) errors.push('OAuth token URL is required')
    }
  }

  // API endpoint validation
  if (!config.endpoints.api) errors.push('API endpoint is required')

  // Production readiness validation
  if (config.productionReady) {
    if (!config.testEndpoint) warnings.push('Test endpoint recommended for production integrations')
    if (!config.docsUrl) warnings.push('Documentation URL recommended for production integrations')
    if (!config.rateLimits) warnings.push('Rate limits should be defined for production integrations')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Get integration setup requirements
export function getIntegrationRequirements(integrationId: string): {
  envVars: string[]
  scopes: string[]
  webhookUrl?: string
  additionalSteps: string[]
} {
  const integration = getIntegration(integrationId)
  if (!integration) {
    return { envVars: [], scopes: [], additionalSteps: [] }
  }

  const envKey = integrationId.toUpperCase().replace('-', '_')
  const envVars = [`${envKey}_CLIENT_ID`, `${envKey}_CLIENT_SECRET`]

  const additionalSteps: string[] = []

  if (integration.features?.webhooks) {
    additionalSteps.push('Configure webhook endpoints in your provider dashboard')
  }

  if (integration.requiredFields) {
    additionalSteps.push(`Additional fields required: ${integration.requiredFields.join(', ')}`)
  }

  return {
    envVars,
    scopes: integration.scopes || [],
    webhookUrl: integration.endpoints.webhook,
    additionalSteps
  }
}
