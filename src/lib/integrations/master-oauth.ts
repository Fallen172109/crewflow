// Master OAuth Application Manager
// Handles centralized OAuth credentials so users never need to set up API keys

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface MasterOAuthConfig {
  clientId: string
  clientSecret: string
  isProduction: boolean
  appName: string
  appDescription: string
  webhookUrl?: string
}

export interface IntegrationCredentials {
  [key: string]: MasterOAuthConfig
}

// Master OAuth credentials - these are set up once by CrewFlow admin
// Users never see or need to configure these
const MASTER_OAUTH_CREDENTIALS: IntegrationCredentials = {
  'facebook-business': {
    clientId: process.env.CREWFLOW_FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_FACEBOOK_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI Business Manager',
    appDescription: 'AI-powered business automation and management platform',
    webhookUrl: process.env.CREWFLOW_FACEBOOK_WEBHOOK_URL
  },
  'google-ads': {
    clientId: process.env.CREWFLOW_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_GOOGLE_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI Marketing Manager',
    appDescription: 'AI-powered advertising and marketing automation'
  },
  'linkedin': {
    clientId: process.env.CREWFLOW_LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_LINKEDIN_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI Professional Manager',
    appDescription: 'AI-powered professional networking and content management'
  },
  'twitter': {
    clientId: process.env.CREWFLOW_TWITTER_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_TWITTER_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI Social Manager',
    appDescription: 'AI-powered social media management and automation'
  },
  'shopify': {
    clientId: process.env.CREWFLOW_SHOPIFY_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_SHOPIFY_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI Commerce Manager',
    appDescription: 'AI-powered e-commerce automation and optimization'
  },
  'salesforce': {
    clientId: process.env.CREWFLOW_SALESFORCE_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_SALESFORCE_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI CRM Manager',
    appDescription: 'AI-powered customer relationship management'
  },
  'hubspot': {
    clientId: process.env.CREWFLOW_HUBSPOT_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_HUBSPOT_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI Marketing Hub',
    appDescription: 'AI-powered inbound marketing and sales automation'
  },
  'slack': {
    clientId: process.env.CREWFLOW_SLACK_CLIENT_ID || '',
    clientSecret: process.env.CREWFLOW_SLACK_CLIENT_SECRET || '',
    isProduction: process.env.NODE_ENV === 'production',
    appName: 'CrewFlow AI Team Manager',
    appDescription: 'AI-powered team communication and workflow automation'
  }
}

export class MasterOAuthManager {
  private static instance: MasterOAuthManager
  private credentials: IntegrationCredentials

  private constructor() {
    this.credentials = MASTER_OAUTH_CREDENTIALS
  }

  public static getInstance(): MasterOAuthManager {
    if (!MasterOAuthManager.instance) {
      MasterOAuthManager.instance = new MasterOAuthManager()
    }
    return MasterOAuthManager.instance
  }

  // Get OAuth credentials for a specific integration
  public getCredentials(integrationId: string): MasterOAuthConfig | null {
    const credentials = this.credentials[integrationId]
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      console.warn(`Master OAuth credentials not configured for ${integrationId}`)
      return null
    }

    return credentials
  }

  // Check if an integration is ready for one-click connection
  public isIntegrationReady(integrationId: string): boolean {
    const credentials = this.getCredentials(integrationId)
    return credentials !== null && credentials.clientId.length > 0 && credentials.clientSecret.length > 0
  }

  // Get all available integrations that are ready for connection
  public getAvailableIntegrations(): string[] {
    return Object.keys(this.credentials).filter(id => this.isIntegrationReady(id))
  }

  // Validate that all required environment variables are set
  public validateConfiguration(): { valid: boolean; missing: string[] } {
    const missing: string[] = []
    const requiredEnvVars = [
      'CREWFLOW_FACEBOOK_CLIENT_ID',
      'CREWFLOW_FACEBOOK_CLIENT_SECRET',
      'CREWFLOW_GOOGLE_CLIENT_ID', 
      'CREWFLOW_GOOGLE_CLIENT_SECRET'
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar)
      }
    }

    return {
      valid: missing.length === 0,
      missing
    }
  }

  // Log OAuth connection for audit purposes
  public async logConnection(userId: string, integrationId: string, success: boolean, metadata?: any): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      
      await supabase.from('oauth_audit_log').insert({
        user_id: userId,
        integration_id: integrationId,
        action: 'connection_attempt',
        success,
        metadata: {
          timestamp: new Date().toISOString(),
          master_app: true,
          ...metadata
        }
      })
    } catch (error) {
      console.error('Failed to log OAuth connection:', error)
    }
  }

  // Get integration display information for UI
  public getIntegrationInfo(integrationId: string): { name: string; description: string; ready: boolean } {
    const credentials = this.credentials[integrationId]
    const ready = this.isIntegrationReady(integrationId)

    if (!credentials) {
      return {
        name: integrationId,
        description: 'Integration not configured',
        ready: false
      }
    }

    return {
      name: credentials.appName,
      description: credentials.appDescription,
      ready
    }
  }
}

// Export singleton instance
export const masterOAuth = MasterOAuthManager.getInstance()

// Helper function to check if master OAuth is properly configured
export function isMasterOAuthConfigured(): boolean {
  const validation = masterOAuth.validateConfiguration()
  return validation.valid
}

// Helper function to get ready integrations for UI
export function getReadyIntegrations(): Array<{ id: string; name: string; description: string }> {
  const availableIds = masterOAuth.getAvailableIntegrations()
  
  return availableIds.map(id => ({
    id,
    ...masterOAuth.getIntegrationInfo(id)
  }))
}
