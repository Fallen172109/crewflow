// API Route: Integration Testing
// Endpoints for running OAuth integration tests and validation

import { NextRequest, NextResponse } from 'next/server'
import { withOAuthSecurity } from '@/lib/integrations/middleware'
import { createIntegrationTester } from '@/lib/integrations/testing'
import { getIntegration } from '@/lib/integrations/config'

// Run integration tests
export async function POST(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { action, integrationId, testType } = body

        const tester = createIntegrationTester()

        switch (action) {
          case 'test_integration':
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

            const testSuite = await tester.runIntegrationTestSuite(integrationId, userId)
            return NextResponse.json({
              testSuite,
              timestamp: new Date().toISOString()
            })

          case 'test_all':
            const fullSuite = await tester.runFullTestSuite(userId)
            return NextResponse.json({
              fullTestSuite: fullSuite,
              timestamp: new Date().toISOString()
            })

          case 'validate_health':
            if (!integrationId) {
              return NextResponse.json({ 
                error: 'Integration ID is required',
                code: 'MISSING_INTEGRATION_ID'
              }, { status: 400 })
            }

            const healthCheck = await tester.validateIntegrationHealth(userId, integrationId)
            return NextResponse.json({
              healthCheck,
              timestamp: new Date().toISOString()
            })

          case 'validate_config':
            if (!integrationId) {
              return NextResponse.json({ 
                error: 'Integration ID is required',
                code: 'MISSING_INTEGRATION_ID'
              }, { status: 400 })
            }

            const validationReport = await tester.generateValidationReport(integrationId)
            return NextResponse.json({
              validation: validationReport,
              timestamp: new Date().toISOString()
            })

          case 'test_specific':
            if (!integrationId || !testType) {
              return NextResponse.json({ 
                error: 'Integration ID and test type are required',
                code: 'MISSING_PARAMETERS'
              }, { status: 400 })
            }

            let testResult
            switch (testType) {
              case 'oauth_config':
                testResult = await tester.testOAuthConfiguration(integrationId)
                break
              case 'auth_url':
                testResult = await tester.testAuthUrlGeneration(integrationId, userId)
                break
              case 'api_connectivity':
                testResult = await tester.testApiConnectivity(integrationId)
                break
              case 'database_schema':
                testResult = await tester.testDatabaseSchema()
                break
              default:
                return NextResponse.json({ 
                  error: 'Invalid test type',
                  code: 'INVALID_TEST_TYPE'
                }, { status: 400 })
            }

            return NextResponse.json({
              testResult,
              timestamp: new Date().toISOString()
            })

          default:
            return NextResponse.json({ 
              error: 'Invalid action',
              code: 'INVALID_ACTION'
            }, { status: 400 })
        }

      } catch (error) {
        console.error('Integration testing API error:', error)
        return NextResponse.json({ 
          error: 'Test execution failed',
          code: 'TEST_EXECUTION_ERROR'
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

// Get test history and results
export async function GET(request: NextRequest) {
  return withOAuthSecurity(
    request,
    async (request: NextRequest, userId?: string) => {
      try {
        if (!userId) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const integrationId = searchParams.get('integration')
        const action = searchParams.get('action')

        const tester = createIntegrationTester()

        switch (action) {
          case 'validation_report':
            if (!integrationId) {
              return NextResponse.json({ 
                error: 'Integration ID is required',
                code: 'MISSING_INTEGRATION_ID'
              }, { status: 400 })
            }

            const validationReport = await tester.generateValidationReport(integrationId)
            return NextResponse.json({
              validation: validationReport,
              timestamp: new Date().toISOString()
            })

          case 'health_status':
            if (!integrationId) {
              return NextResponse.json({ 
                error: 'Integration ID is required',
                code: 'MISSING_INTEGRATION_ID'
              }, { status: 400 })
            }

            const healthStatus = await tester.validateIntegrationHealth(userId, integrationId)
            return NextResponse.json({
              health: healthStatus,
              timestamp: new Date().toISOString()
            })

          default:
            // Return available test actions and integration status
            return NextResponse.json({
              availableActions: [
                'test_integration',
                'test_all', 
                'validate_health',
                'validate_config',
                'test_specific'
              ],
              availableTestTypes: [
                'oauth_config',
                'auth_url',
                'api_connectivity',
                'database_schema'
              ],
              timestamp: new Date().toISOString()
            })
        }

      } catch (error) {
        console.error('Integration testing info API error:', error)
        return NextResponse.json({ 
          error: 'Failed to get test information',
          code: 'TEST_INFO_ERROR'
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
