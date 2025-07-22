import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    console.log('🚢 Shopify OAuth initiation started')
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parameter is required' },
        { status: 400 }
      )
    }
    
    // Validate shop domain format
    if (!shop.endsWith('.myshopify.com')) {
      return NextResponse.json(
        { error: 'Invalid shop domain format' },
        { status: 400 }
      )
    }
    
    const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: 'Shopify client ID not configured' },
        { status: 500 }
      )
    }
    
    // Generate state parameter for security
    const state = crypto.randomUUID()
    
    // Store state in session/database for verification
    const supabase = await createSupabaseServerClientWithCookies()

    // Check if supabase client was created successfully
    if (!supabase || !supabase.auth) {
      console.error('Supabase client not properly initialized')
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      console.log('User not authenticated during Shopify OAuth initiation:', userError?.message)
      // For Shopify OAuth, we can proceed without user authentication initially
      // The user will be required to authenticate during the callback
    }
    
    // Store OAuth state (with or without user_id)
    await supabase.from('oauth_states').insert({
      user_id: user?.id || null, // Allow null for unauthenticated users
      state,
      shop_domain: shop,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    })
    
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
    
    // Build Shopify OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('grant_options[]', 'per-user')
    
    // Redirect to Shopify OAuth
    return NextResponse.redirect(authUrl.toString())
    
  } catch (error) {
    console.error('Shopify OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}
