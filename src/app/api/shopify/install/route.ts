import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl, getOAuthRedirectUri } from '@/lib/utils/environment'
import crypto from 'crypto'

/**
 * Alternative Shopify installation endpoint
 * Some Shopify Partner configurations expect /api/shopify/install instead of /api/auth/shopify/install
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const hmac = searchParams.get('hmac')
    const timestamp = searchParams.get('timestamp')

    console.log('Shopify install request (alternative endpoint):', {
      shop,
      timestamp,
      hasHmac: !!hmac,
      baseUrl: getBaseUrl(),
      redirectUri: getOAuthRedirectUri('shopify')
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Get Shopify credentials
    const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: 'Shopify app not configured' },
        { status: 500 }
      )
    }

    // Generate state parameter for security
    const state = crypto.randomUUID()

    // Required Shopify scopes
    const scopes = [
      'read_products',
      'write_products',
      'read_orders',
      'write_orders',
      'read_customers',
      'read_analytics',
      'read_inventory',
      'write_inventory',
      'read_fulfillments',
      'write_fulfillments'
    ].join(',')

    // Build Shopify OAuth URL with environment-aware redirect URI
    const redirectUri = getOAuthRedirectUri('shopify')
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)

    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    console.log('Redirecting to Shopify OAuth:', {
      authUrl: authUrl.toString(),
      redirectUri,
      shop,
      clientId: clientId.substring(0, 8) + '...'
    })

    // Redirect to Shopify OAuth
    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('Shopify installation error (alternative endpoint):', error)
    return NextResponse.json(
      { error: 'Installation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
