// API Route: Token Management
// Token refresh and lifecycle management endpoints

import { NextRequest, NextResponse } from 'next/server'
import { withOAuthSecurity } from '@/lib/integrations/middleware'
import { getTokenManager } from '@/lib/integrations/token-manager'
import { getIntegration } from '@/lib/integrations/config'
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createErrorResponse,
  ERROR_CODES
} from '@/lib/api/response-formatter'

// Get token status and statistics
export async function GET(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return createAuthErrorResponse()
        }

        const searchParams = request.nextUrl.searchParams
        const action = searchParams.get('action')
        const integrationId = searchParams.get('integration')

        const tokenManager = getTokenManager()

        switch (action) {
          case 'health':
            const healthStatus = await tokenManager.getHealthStatus()
            return createSuccessResponse(
              { health: healthStatus },
              'Token service health status retrieved'
            )

          case 'stats':
            const stats = tokenManager.getStats()
            return createSuccessResponse(
              {
                stats,
                serviceRunning: tokenManager.isServiceRunning(),
                nextMaintenance: tokenManager.getNextMaintenanceTime()
              },
              'Token service statistics retrieved'
            )

          default:
            return createSuccessResponse(
              {
                stats: tokenManager.getStats(),
                serviceRunning: tokenManager.isServiceRunning()
              },
              'Token service status retrieved'
            )
        }

      } catch (error) {
        console.error('Token management API error:', error)
        return createErrorResponse(
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          'Failed to get token information',
          error
        )
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

// Refresh tokens
export async function POST(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { action, integrationId } = body

        const tokenManager = getTokenManager()

        switch (action) {
          case 'refresh':
            if (!integrationId) {
              return NextResponse.json({ 
                error: 'Integration ID is required for refresh',
                code: 'MISSING_INTEGRATION_ID'
              }, { status: 400 })
            }

            // Validate integration exists
            const integration = getIntegration(integrationId)
            if (!integration) {
              return NextResponse.json({ 
                error: 'Integration not found',
                code: 'INTEGRATION_NOT_FOUND'
              }, { status: 404 })
            }

            const refreshResult = await tokenManager.refreshUserToken(userId, integrationId)
            return NextResponse.json({
              refresh: refreshResult,
              timestamp: new Date().toISOString()
            })

          case 'force_maintenance':
            // Admin-only action to force maintenance cycle
            const maintenanceStats = await tokenManager.forceMaintenanceCycle()
            return NextResponse.json({
              maintenance: {
                forced: true,
                stats: maintenanceStats
              },
              timestamp: new Date().toISOString()
            })

          default:
            return NextResponse.json({ 
              error: 'Invalid action',
              code: 'INVALID_ACTION'
            }, { status: 400 })
        }

      } catch (error) {
        console.error('Token refresh API error:', error)
        return NextResponse.json({ 
          error: 'Token operation failed',
          code: 'TOKEN_OPERATION_ERROR'
        }, { status: 500 })
      }
    },
    {
      requireAuth: true,
      rateLimitByUser: true,
      rateLimitByIP: true,
      validateOrigin: true,
      logRequests: true,
      allowedMethods: ['POST']
    }
  )
}

// Start/stop token management service (admin only)
export async function PUT(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        // TODO: Add admin role check here
        // For now, allow any authenticated user to control the service
        
        const body = await request.json()
        const { action, intervalMinutes } = body

        const tokenManager = getTokenManager()

        switch (action) {
          case 'start':
            if (tokenManager.isServiceRunning()) {
              return NextResponse.json({ 
                error: 'Token management service is already running',
                code: 'SERVICE_ALREADY_RUNNING'
              }, { status: 400 })
            }

            tokenManager.start(intervalMinutes || 15)
            return NextResponse.json({
              service: {
                action: 'started',
                intervalMinutes: intervalMinutes || 15,
                running: true
              },
              timestamp: new Date().toISOString()
            })

          case 'stop':
            if (!tokenManager.isServiceRunning()) {
              return NextResponse.json({ 
                error: 'Token management service is not running',
                code: 'SERVICE_NOT_RUNNING'
              }, { status: 400 })
            }

            tokenManager.stop()
            return NextResponse.json({
              service: {
                action: 'stopped',
                running: false
              },
              timestamp: new Date().toISOString()
            })

          case 'restart':
            tokenManager.stop()
            tokenManager.start(intervalMinutes || 15)
            return NextResponse.json({
              service: {
                action: 'restarted',
                intervalMinutes: intervalMinutes || 15,
                running: true
              },
              timestamp: new Date().toISOString()
            })

          default:
            return NextResponse.json({ 
              error: 'Invalid service action',
              code: 'INVALID_SERVICE_ACTION'
            }, { status: 400 })
        }

      } catch (error) {
        console.error('Token service control API error:', error)
        return NextResponse.json({ 
          error: 'Service control failed',
          code: 'SERVICE_CONTROL_ERROR'
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
