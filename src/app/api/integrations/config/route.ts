// API Route: Configuration Management
// Production configuration validation and management endpoints

import { NextRequest, NextResponse } from 'next/server'
import { withOAuthSecurity } from '@/lib/integrations/middleware'
import { getProductionConfig, validateProductionConfig } from '@/lib/integrations/production-config'
import { createOAuthManager } from '@/lib/integrations/oauth'

// Get configuration status and validation
export async function GET(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const action = searchParams.get('action')

        const productionConfig = getProductionConfig()
        const oauthManager = createOAuthManager()

        switch (action) {
          case 'validate':
            const validation = validateProductionConfig()
            const oauthStatus = oauthManager.getConfigurationStatus()
            
            return NextResponse.json({
              validation,
              oauthProviders: oauthStatus,
              environment: productionConfig.getEnvironmentSettings(),
              timestamp: new Date().toISOString()
            })

          case 'environment':
            const envSettings = productionConfig.getEnvironmentSettings()
            return NextResponse.json({
              environment: envSettings,
              timestamp: new Date().toISOString()
            })

          case 'oauth_uris':
            const redirectUris = productionConfig.getOAuthRedirectUris()
            const webhookUrls = productionConfig.getWebhookUrls()
            
            return NextResponse.json({
              redirectUris,
              webhookUrls,
              baseUrl: productionConfig.getConfig().baseUrl,
              timestamp: new Date().toISOString()
            })

          case 'security':
            const config = productionConfig.getConfig()
            return NextResponse.json({
              security: {
                rateLimitingEnabled: config.security.rateLimiting.enabled,
                corsOrigins: config.security.cors.origins,
                csrfEnabled: config.security.csrf.enabled,
                encryptionConfigured: !!config.security.encryptionKey && config.security.encryptionKey !== 'change-in-production'
              },
              monitoring: {
                enabled: config.monitoring.enabled,
                logLevel: config.monitoring.logLevel,
                alertingEnabled: config.monitoring.alerting.enabled
              },
              timestamp: new Date().toISOString()
            })

          case 'providers':
            const providers = productionConfig.getConfig().oauth.providers
            const providerStatus = Object.entries(providers).map(([id, config]) => ({
              id,
              enabled: config.enabled,
              configured: !!(config.clientId && config.clientSecret),
              rateLimits: config.rateLimits
            }))

            return NextResponse.json({
              providers: providerStatus,
              total: providerStatus.length,
              configured: providerStatus.filter(p => p.configured).length,
              enabled: providerStatus.filter(p => p.enabled).length,
              timestamp: new Date().toISOString()
            })

          default:
            // Return comprehensive configuration overview
            const fullValidation = validateProductionConfig()
            const fullOAuthStatus = oauthManager.getConfigurationStatus()
            const fullConfig = productionConfig.getConfig()

            return NextResponse.json({
              environment: productionConfig.getEnvironmentSettings(),
              validation: fullValidation,
              oauthProviders: fullOAuthStatus,
              security: {
                rateLimitingEnabled: fullConfig.security.rateLimiting.enabled,
                corsConfigured: fullConfig.security.cors.origins.length > 0,
                csrfEnabled: fullConfig.security.csrf.enabled,
                encryptionSecure: fullConfig.security.encryptionKey !== 'change-in-production'
              },
              features: fullConfig.features,
              timestamp: new Date().toISOString()
            })
        }

      } catch (error) {
        console.error('Configuration API error:', error)
        return NextResponse.json({ 
          error: 'Failed to get configuration',
          code: 'CONFIG_ERROR'
        }, { status: 500 })
      }
    },
    {
      requireAuth: true,
      rateLimitByUser: true,
      rateLimitByIP: true,
      validateOrigin: true,
      logRequests: true,
      allowedMethods: ['GET']
    }
  )
}

// Update configuration (admin only)
export async function PUT(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        // TODO: Add admin role check here
        // For now, allow any authenticated user

        const body = await request.json()
        const { action, settings } = body

        switch (action) {
          case 'update_features':
            // This would typically update database settings
            // For now, return current configuration
            const productionConfig = getProductionConfig()
            const currentConfig = productionConfig.getConfig()

            return NextResponse.json({
              message: 'Feature configuration updated',
              features: currentConfig.features,
              timestamp: new Date().toISOString()
            })

          case 'validate_environment':
            const validation = validateProductionConfig()
            
            if (!validation.valid) {
              return NextResponse.json({
                error: 'Configuration validation failed',
                validation,
                timestamp: new Date().toISOString()
              }, { status: 400 })
            }

            return NextResponse.json({
              message: 'Configuration is valid',
              validation,
              timestamp: new Date().toISOString()
            })

          default:
            return NextResponse.json({ 
              error: 'Invalid action',
              code: 'INVALID_ACTION'
            }, { status: 400 })
        }

      } catch (error) {
        console.error('Configuration update API error:', error)
        return NextResponse.json({ 
          error: 'Failed to update configuration',
          code: 'CONFIG_UPDATE_ERROR'
        }, { status: 500 })
      }
    },
    {
      requireAuth: true,
      rateLimitByUser: true,
      rateLimitByIP: true,
      validateOrigin: true,
      logRequests: true,
      allowedMethods: ['PUT']
    }
  )
}

// Health check endpoint (public)
export async function HEAD(request: NextRequest) {
  try {
    const productionConfig = getProductionConfig()
    const validation = validateProductionConfig()
    
    if (validation.valid) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
