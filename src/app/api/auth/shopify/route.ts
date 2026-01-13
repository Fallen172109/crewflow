import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { normalizeShopDomain } from '@/lib/shopify/constants'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const shop = normalizeShopDomain(url.searchParams.get('shop') || '')
    
    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Validate environment variables
    const clientId = process.env.SHOPIFY_CLIENT_ID
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

    // Derive the app URL from the incoming request origin so localhost and prod
    // both loop back to the correct host. This avoids relying on NEXT_PUBLIC_APP_URL
    // being different between environments.
    const appUrl = url.origin

    if (!clientId || !clientSecret || !appUrl) {
      console.error('Missing Shopify OAuth environment variables:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasAppUrl: !!appUrl
      })
      return NextResponse.json({ error: 'OAuth configuration missing' }, { status: 500 })
    }

    // Generate state parameter for OAuth security
    const state = crypto.randomUUID()

    // Build OAuth redirect URI
    const redirectUri = `${appUrl}/api/auth/shopify/callback`

    // Shopify OAuth scopes
    const scopes = 'read_products,write_products,read_files,write_files,read_inventory,write_inventory,read_orders,write_orders,read_customers,write_customers'
    
    // Build Shopify OAuth authorization URL
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    console.log('🚀 OAuth Start:', {
      shop,
      redirectUri,
      state: state.substring(0, 8) + '...',
      authUrl: authUrl.toString().substring(0, 100) + '...'
    })

    // Store state in cookie for validation (signed for security)
    const response = NextResponse.redirect(authUrl.toString())
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/'
    })
    response.cookies.set('shopify_oauth_shop', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/'
    })

    return response
  } catch (error) {
    console.error('OAuth start error:', error)
    return NextResponse.json({ error: 'OAuth initialization failed' }, { status: 500 })
  }
}
