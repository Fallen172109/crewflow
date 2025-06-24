// API Route: Integration Recovery
// Automatic recovery for failed OAuth integrations

import { NextRequest, NextResponse } from 'next/server'
import { withOAuthSecurity } from '@/lib/integrations/middleware'
import { createRecoveryService } from '@/lib/integrations/recovery-service'
import { createErrorHandler } from '@/lib/integrations/error-handler'
import { getIntegration } from '@/lib/integrations/config'

// Recover a specific integration
export async function POST(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { integrationId, errorCode, errorMessage } = body

        if (!integrationId) {
          return NextResponse.json({ 
            error: 'Integration ID is required',
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

        const recoveryService = createRecoveryService()
        const errorHandler = createErrorHandler()

        // Create error object from provided information
        const error = errorHandler.createError(
          errorCode || 'UNKNOWN_ERROR',
          errorMessage ? new Error(errorMessage) : undefined,
          { userId, integrationId }
        )

        // Attempt recovery
        const result = await recoveryService.attemptRecovery(userId, integrationId, error)

        return NextResponse.json({
          integration: integrationId,
          recovery: result,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Recovery API error:', error)
        return NextResponse.json({ 
          error: 'Recovery attempt failed',
          code: 'RECOVERY_ERROR'
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

// Bulk recovery for all failed integrations
export async function PUT(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const recoveryService = createRecoveryService()
        const result = await recoveryService.bulkRecovery(userId)

        return NextResponse.json({
          bulkRecovery: result,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Bulk recovery API error:', error)
        return NextResponse.json({ 
          error: 'Bulk recovery failed',
          code: 'BULK_RECOVERY_ERROR'
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

// Health check for all integrations
export async function GET(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const recoveryService = createRecoveryService()
        const healthCheck = await recoveryService.healthCheck(userId)
        const stats = recoveryService.getStats()

        return NextResponse.json({
          health: healthCheck,
          recoveryStats: stats,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Health check API error:', error)
        return NextResponse.json({ 
          error: 'Health check failed',
          code: 'HEALTH_CHECK_ERROR'
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
