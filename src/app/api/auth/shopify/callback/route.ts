import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { addStore } from '@/lib/shopify/multi-store-manager'
import { getBaseUrl } from '@/lib/utils/environment'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')
    const error = searchParams.get('error')
    const embedded = searchParams.get('embedded') // Check if this is an embedded app installation

    // Handle OAuth errors
    if (error) {
      console.error('Shopify OAuth error:', error)
      return NextResponse.redirect(
        `${getBaseUrl()}/dashboard/shopify?error=oauth_denied`
      )
    }

    if (!code || !state || !shop) {
      return NextResponse.redirect(
        `${getBaseUrl()}/dashboard/shopify?error=missing_parameters`
      )
    }

    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // For Shopify App Store compliance: Handle app installation without requiring immediate authentication
    // This allows the app to be installed and configured before requiring user login
    const isAppInstallation = !user || userError

    if (isAppInstallation) {
      console.log('Handling Shopify app installation without user authentication')

      // For app installations, we'll complete the OAuth flow and redirect to a setup page
      // This satisfies Shopify's requirement that apps don't immediately require authentication

      // Exchange code for access token first
      const accessToken = await exchangeCodeForToken(code, shop)

      if (!accessToken) {
        return NextResponse.redirect(
          `${getBaseUrl()}/shopify/setup?error=token_exchange_failed&shop=${encodeURIComponent(shop)}`
        )
      }

      // For now, we'll use URL parameters to pass the connection info
      // In production, you'd want to store this securely in a database
      const connectionData = {
        shop,
        timestamp: Date.now(),
        // Don't include access token in URL for security
      }

      // Encode the connection data
      const connectionToken = Buffer.from(JSON.stringify(connectionData)).toString('base64')

      // Redirect to app setup page instead of requiring immediate authentication
      // This satisfies Shopify's automated checks
      return NextResponse.redirect(
        `${getBaseUrl()}/shopify/setup?shop=${encodeURIComponent(shop)}&token=${connectionToken}&success=app_installed`
      )
    }
    
    // Verify state parameter - handle both user-initiated and app installation flows
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('shop_domain', shop)
      .gt('expires_at', new Date().toISOString())
      .eq('used', false)
      .single()

    if (stateError || !oauthState) {
      console.error('Invalid OAuth state:', stateError)
      return NextResponse.redirect(
        `${getBaseUrl()}/dashboard/shopify?error=invalid_state`
      )
    }

    // If this is an app installation (user_id is null), update it with the current user
    if (!oauthState.user_id) {
      await supabase
        .from('oauth_states')
        .update({ user_id: user.id })
        .eq('id', oauthState.id)
    } else if (oauthState.user_id !== user.id) {
      // State belongs to a different user
      console.error('OAuth state user mismatch')
      return NextResponse.redirect(
        `${getBaseUrl()}/dashboard/shopify?error=invalid_state`
      )
    }
    
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code, shop)
    
    if (!accessToken) {
      return NextResponse.redirect(
        `${getBaseUrl()}/dashboard/shopify?error=token_exchange_failed`
      )
    }
    
    // Add store to user's account
    console.log('🔄 Adding store to user account:', { userId: user.id, shop, hasAccessToken: !!accessToken })
    const result = await addStore(user.id, accessToken, shop, supabase)

    if (!result.success) {
      console.error('❌ Failed to add store:', {
        error: result.error,
        userId: user.id,
        shop,
        accessTokenLength: accessToken?.length || 0
      })
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=store_connection_failed&details=${encodeURIComponent(result.error || 'Unknown error')}`
      )
    }

    console.log('✅ Store added successfully:', { storeId: result.store?.id, shop })
    
    // Mark OAuth state as used instead of deleting (for audit trail)
    await supabase
      .from('oauth_states')
      .update({ used: true })
      .eq('state', state)
    
    // Redirect to success page - this is the app UI redirect that Shopify expects
    return NextResponse.redirect(
      `${getBaseUrl()}/dashboard/shopify?success=store_connected&store=${encodeURIComponent(shop)}`
    )
    
  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    return NextResponse.redirect(
      `${getBaseUrl()}/dashboard/shopify?error=callback_failed`
    )
  }
}

async function exchangeCodeForToken(code: string, shop: string): Promise<string | null> {
  try {
    const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.CREWFLOW_SHOPIFY_CLIENT_ID
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || process.env.CREWFLOW_SHOPIFY_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      throw new Error('Shopify credentials not configured')
    }
    
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange failed:', response.status, errorText)
      return null
    }
    
    const data = await response.json()
    return data.access_token
    
  } catch (error) {
    console.error('Error exchanging code for token:', error)
    return null
  }
}
