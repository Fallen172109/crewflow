// Shopify Embedded App Installation Route
// This route handles Shopify's embedded app installation flow
// Required for Shopify Partner app automated checks

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/env'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const client_id = searchParams.get('client_id')
    const signature = searchParams.get('signature')
    const app_store_s = searchParams.get('app_store_s')
    const app_store_y = searchParams.get('app_store_y')
    const presentation = searchParams.get('presentation')

    console.log('🚀 Shopify embedded app installation request:', {
      shop,
      client_id,
      presentation,
      hasSignature: !!signature,
      app_store_s,
      app_store_y,
      baseUrl: getBaseUrl(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    })

    // Validate required parameters
    if (!shop || !client_id) {
      console.error('❌ Missing required parameters:', { shop, client_id })
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          required: ['shop', 'client_id'],
          received: { shop: !!shop, client_id: !!client_id }
        },
        { status: 400 }
      )
    }

    // Validate client_id matches our app
    const expectedClientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
    if (client_id !== expectedClientId) {
      console.error('❌ Client ID mismatch:', { 
        received: client_id, 
        expected: expectedClientId?.substring(0, 8) + '...' 
      })
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 401 }
      )
    }

    // Validate shop domain format
    if (!shop.includes('.myshopify.com')) {
      console.error('❌ Invalid shop domain format:', shop)
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      )
    }

    // Generate state parameter for OAuth security
    const state = crypto.randomUUID()
    
    // Store OAuth state in database
    const supabase = createSupabaseServerClient()
    
    try {
      const { error: stateError } = await supabase.from('oauth_states').insert({
        user_id: null, // Will be updated after user authentication
        state,
        shop_domain: shop,
        integration_type: 'shopify',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

      if (stateError) {
        console.error('❌ Failed to store OAuth state:', stateError)
        throw stateError
      }
    } catch (dbError) {
      console.error('❌ Database error storing OAuth state:', dbError)
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      )
    }

    // Required Shopify scopes for CrewFlow
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

    // Build OAuth redirect URI
    const redirectUri = `${getBaseUrl()}/api/auth/shopify/callback`
    
    // Build Shopify OAuth authorization URL
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', client_id)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('grant_options[]', 'per-user')

    console.log('✅ Redirecting to Shopify OAuth:', {
      shop,
      redirectUri,
      authUrl: authUrl.toString().substring(0, 100) + '...',
      scopes: scopes.split(',').length + ' scopes'
    })

    // Redirect to Shopify OAuth authorization
    return NextResponse.redirect(authUrl.toString())

  } catch (error) {
    console.error('❌ Shopify embedded app installation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error during app installation',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Handle POST requests (some Shopify flows use POST)
export async function POST(request: NextRequest) {
  console.log('📝 POST request to embedded app installation route')
  return GET(request)
}
