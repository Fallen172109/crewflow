// API Route: Connect Integration
// Production-ready OAuth flow initiation with enhanced security

import { NextRequest, NextResponse } from 'next/server'
import { withOAuthSecurity } from '@/lib/integrations/middleware'
import { createOAuthManager } from '@/lib/integrations/oauth'
import { getIntegration, validateIntegrationConfig } from '@/lib/integrations/config'

export async function POST(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { integrationId, returnUrl, shopDomain, additionalParams } = body

        // Validate request body
        if (!integrationId) {
          return NextResponse.json({
            error: 'Integration ID is required',
            code: 'MISSING_INTEGRATION_ID'
          }, { status: 400 })
        }

        if (typeof integrationId !== 'string' || integrationId.length > 50) {
          return NextResponse.json({
            error: 'Invalid integration ID format',
            code: 'INVALID_INTEGRATION_ID'
          }, { status: 400 })
        }

        // Get and validate integration configuration
        const integration = getIntegration(integrationId)
        if (!integration) {
          return NextResponse.json({
            error: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND'
          }, { status: 404 })
        }

        // Validate integration configuration
        const configValidation = validateIntegrationConfig(integration)
        if (!configValidation.valid) {
          console.error('Integration configuration invalid:', configValidation.errors)
          return NextResponse.json({
            error: 'Integration configuration error',
            code: 'INVALID_CONFIGURATION'
          }, { status: 500 })
        }

        // Check if integration is production ready
        if (!integration.productionReady && process.env.NODE_ENV === 'production') {
          return NextResponse.json({
            error: 'Integration not available in production',
            code: 'NOT_PRODUCTION_READY'
          }, { status: 503 })
        }

        const oauthManager = createOAuthManager()

        if (integration.authType === 'oauth2') {
          try {
            // Generate OAuth authorization URL with enhanced security
            const authUrl = oauthManager.generateAuthUrl(integrationId, userId, returnUrl)

            return NextResponse.json({
              authUrl,
              integration: {
                id: integration.id,
                name: integration.name,
                authType: integration.authType,
                scopes: integration.scopes,
                features: integration.features
              },
              security: {
                pkceEnabled: integration.oauthConfig?.pkceSupported || false,
                refreshTokenSupported: integration.oauthConfig?.refreshTokenSupported || false
              }
            })
          } catch (oauthError) {
            console.error('OAuth URL generation error:', oauthError)

            // Provide specific error messages
            let errorMessage = 'OAuth configuration error'
            let errorCode = 'OAUTH_CONFIG_ERROR'

            if (oauthError instanceof Error) {
              if (oauthError.message.includes('not configured')) {
                errorMessage = 'OAuth credentials not configured for this integration'
                errorCode = 'OAUTH_NOT_CONFIGURED'
              } else if (oauthError.message.includes('Invalid')) {
                errorMessage = 'Invalid OAuth configuration'
                errorCode = 'INVALID_OAUTH_CONFIG'
              } else {
                errorMessage = oauthError.message
              }
            }

            return NextResponse.json({
              error: errorMessage,
              code: errorCode,
              integration: integration.id
            }, { status: 400 })
          }
        } else if (integration.authType === 'api_key') {
          // Handle API key based integrations
          return NextResponse.json({
            requiresManualSetup: true,
            integration: {
              id: integration.id,
              name: integration.name,
              authType: integration.authType,
              requiredFields: integration.requiredFields || []
            },
            setupInstructions: {
              docsUrl: integration.docsUrl,
              setupGuideUrl: integration.setupGuideUrl,
              requiredFields: integration.requiredFields
            }
          })
        } else {
          return NextResponse.json({
            error: 'Unsupported authentication type',
            code: 'UNSUPPORTED_AUTH_TYPE'
          }, { status: 400 })
        }

      } catch (error) {
        console.error('Connect integration error:', error)

        if (error instanceof SyntaxError) {
          return NextResponse.json({
            error: 'Invalid request body',
            code: 'INVALID_JSON'
          }, { status: 400 })
        }

        return NextResponse.json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }, { status: 500 })
      }
    },
    {
      requireAuth: true,
      rateLimitByUser: true,
      rateLimitByIP: true,
      validateOrigin: true,
      logRequests: true
    }
  )
}
    } else if (integration.authType === 'api_key') {
      // For API key integrations, return the required fields
      return NextResponse.json({
        requiresManualSetup: true,
        integration: {
          id: integration.id,
          name: integration.name,
          authType: integration.authType,
          requiredFields: integration.requiredFields
        }
      })
    } else {
      return NextResponse.json({ error: 'Unsupported authentication type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Integration connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    )
  }
}
