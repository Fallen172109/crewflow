// API Route: Integration Status
// Simplified version for initial setup - returns demo data until OAuth is configured

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // For now, return a simple response to avoid complex OAuth dependencies
    // This allows the UI to load while the OAuth system is being set up

    const searchParams = request.nextUrl.searchParams
    const integrationId = searchParams.get('integrationId') || searchParams.get('integration')

    if (integrationId) {
      // Return status for specific integration
      return NextResponse.json({
        integration: integrationId,
        status: {
          connected: false,
          status: 'not_configured',
          connectionHealth: 'unknown',
          connectedAt: null,
          lastUsed: null,
          expiresAt: null,
          error: 'OAuth system not configured',
          errorCount: 0,
          scope: null
        },
        integration_info: {
          name: integrationId,
          category: 'unknown',
          features: {},
          productionReady: false
        }
      })
    } else {
      // Return empty connections list
      return NextResponse.json({
        connections: [],
        summary: {
          total: 0,
          connected: 0,
          disconnected: 0,
          errors: 0,
          expired: 0
        },
        metadata: {
          userId: 'demo',
          timestamp: new Date().toISOString(),
          includeAll: false,
          note: 'OAuth system not configured - showing demo data'
        }
      })
    }
  } catch (error) {
    console.error('Integration status API error:', error)
    return NextResponse.json({
      error: 'OAuth system not configured',
      code: 'OAUTH_NOT_CONFIGURED',
      message: 'The OAuth integration system needs to be set up. Please follow the setup guide.'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json({
        error: 'Integration ID is required',
        code: 'MISSING_INTEGRATION_ID'
      }, { status: 400 })
    }

    // For now, return a simple success response
    return NextResponse.json({
      success: true,
      integration: integrationId,
      disconnectedAt: new Date().toISOString(),
      note: 'OAuth system not configured - simulated disconnect'
    })

  } catch (error) {
    console.error('Integration disconnect error:', error)
    return NextResponse.json({
      error: 'OAuth system not configured',
      code: 'OAUTH_NOT_CONFIGURED'
    }, { status: 500 })
  }
}

// Test connection health endpoint
export async function POST(request: NextRequest) {
  try {
    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json({
        error: 'Integration ID is required',
        code: 'MISSING_INTEGRATION_ID'
      }, { status: 400 })
    }

    // For now, return a simple test result
    return NextResponse.json({
      integration: integrationId,
      test: {
        healthy: false,
        error: 'OAuth system not configured',
        timestamp: new Date().toISOString(),
        note: 'Configure OAuth credentials to enable connection testing'
      }
    })

  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json({
      error: 'OAuth system not configured',
      code: 'OAUTH_NOT_CONFIGURED'
    }, { status: 500 })
  }
}
