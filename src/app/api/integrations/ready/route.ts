// API Route: Check One-Click Ready Integrations
// Returns which integrations are configured for seamless one-click connections

import { NextRequest, NextResponse } from 'next/server'
import { masterOAuth } from '@/lib/integrations/master-oauth'
import { getIntegration } from '@/lib/integrations/config'

export async function GET(request: NextRequest) {
  try {
    // Get all available integrations from master OAuth
    const availableIntegrations = masterOAuth.getAvailableIntegrations()
    
    // Get detailed information for each ready integration
    const readyIntegrations = availableIntegrations.map(integrationId => {
      const integration = getIntegration(integrationId)
      const masterInfo = masterOAuth.getIntegrationInfo(integrationId)
      
      return {
        id: integrationId,
        name: integration?.name || masterInfo.name,
        description: integration?.description || masterInfo.description,
        category: integration?.category || 'other',
        logo: integration?.logo || '🔗',
        oneClickReady: true,
        masterApp: true,
        scopes: integration?.scopes || [],
        features: integration?.features || {},
        capabilities: getIntegrationCapabilities(integrationId)
      }
    })

    // Get configuration validation
    const validation = masterOAuth.validateConfiguration()
    
    return NextResponse.json({
      success: true,
      readyIntegrations,
      totalReady: readyIntegrations.length,
      configuration: {
        valid: validation.valid,
        missing: validation.missing
      },
      message: validation.valid 
        ? 'One-click OAuth is fully configured!' 
        : 'Some integrations need configuration'
    })
  } catch (error) {
    console.error('Failed to check ready integrations:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check integration status',
      readyIntegrations: [],
      totalReady: 0
    }, { status: 500 })
  }
}

// Get AI agent capabilities for each integration
function getIntegrationCapabilities(integrationId: string): string[] {
  const capabilities: Record<string, string[]> = {
    'facebook-business': [
      'Autonomous posting to pages',
      'Comment monitoring and replies',
      'Page insights and analytics',
      'Ad campaign management',
      'Customer message responses',
      'Content scheduling'
    ],
    'google-ads': [
      'Campaign creation and optimization',
      'Keyword research and bidding',
      'Performance monitoring',
      'Budget management',
      'Ad copy generation',
      'Conversion tracking'
    ],
    'linkedin': [
      'Professional content posting',
      'Company page management',
      'Lead generation campaigns',
      'Network engagement',
      'Industry insights',
      'Recruitment automation'
    ],
    'twitter': [
      'Tweet scheduling and posting',
      'Trend monitoring and engagement',
      'Customer support responses',
      'Hashtag optimization',
      'Follower growth strategies',
      'Brand mention tracking'
    ],
    'shopify': [
      'Product catalog management',
      'Order processing automation',
      'Customer service responses',
      'Inventory optimization',
      'Marketing campaign creation',
      'Sales analytics'
    ],
    'salesforce': [
      'Lead management and scoring',
      'Customer relationship tracking',
      'Sales pipeline optimization',
      'Email campaign automation',
      'Report generation',
      'Data synchronization'
    ],
    'hubspot': [
      'Inbound marketing automation',
      'Contact management',
      'Email marketing campaigns',
      'Lead nurturing workflows',
      'Content optimization',
      'Performance analytics'
    ],
    'slack': [
      'Team communication automation',
      'Workflow notifications',
      'Project status updates',
      'Meeting scheduling',
      'File sharing automation',
      'Integration orchestration'
    ]
  }

  return capabilities[integrationId] || ['Basic API integration']
}

// Health check for master OAuth configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json({
        error: 'Integration ID is required'
      }, { status: 400 })
    }

    const isReady = masterOAuth.isIntegrationReady(integrationId)
    const credentials = masterOAuth.getCredentials(integrationId)
    
    return NextResponse.json({
      integrationId,
      ready: isReady,
      configured: !!credentials,
      appName: credentials?.appName || 'Not configured',
      isProduction: credentials?.isProduction || false
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check integration health'
    }, { status: 500 })
  }
}
