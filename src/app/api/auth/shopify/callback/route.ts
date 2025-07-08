import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { addStore } from '@/lib/shopify/multi-store-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')
    const error = searchParams.get('error')
    
    // Handle OAuth errors
    if (error) {
      console.error('Shopify OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=oauth_denied`
      )
    }
    
    if (!code || !state || !shop) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=missing_parameters`
      )
    }
    
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=not_authenticated`
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
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=invalid_state`
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
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=invalid_state`
      )
    }
    
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code, shop)
    
    if (!accessToken) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=token_exchange_failed`
      )
    }
    
    // Add store to user's account
    const result = await addStore(user.id, accessToken, shop)
    
    if (!result.success) {
      console.error('Failed to add store:', result.error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=store_connection_failed`
      )
    }
    
    // Mark OAuth state as used instead of deleting (for audit trail)
    await supabase
      .from('oauth_states')
      .update({ used: true })
      .eq('state', state)
    
    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?success=store_connected&store=${encodeURIComponent(shop)}`
    )
    
  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shopify?error=callback_failed`
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
