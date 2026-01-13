import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logOAuth } from '@/lib/shopify/install'
import { normalizeShopDomain } from '@/lib/shopify/constants'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { addStore } from '@/lib/shopify/multi-store-manager'

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const supabase = await createSupabaseServerClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()

  // This callback expects the user to already be logged in when returning
  // from Shopify OAuth. If no user is found, we redirect to login without
  // persisting any Shopify tokens.

  const url = new URL(req.url)
  const shop = normalizeShopDomain(url.searchParams.get('shop') || '')
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const hmac = url.searchParams.get('hmac') || ''

  // Use the actual request origin here so dev (localhost) and prod (crewflow.ai)
  // both keep the OAuth round-trip on the same host as where it started.
  const baseUrl = url.origin

  // 1) Validate state
  const stateCookie = cookieStore.get('shopify_oauth_state')?.value || ''
  const storedShop = cookieStore.get('shopify_oauth_shop')?.value || ''
  if (!state || !stateCookie || !timingSafeEqual(state, stateCookie)) {
    logOAuth('callback.state_fail', { state, stateCookie })
    return NextResponse.redirect(`${baseUrl}/integrations/shopify/error?reason=state`)
  }
  if (storedShop && storedShop !== shop) {
    logOAuth('callback.shop_mismatch', { shop, storedShop })
    return NextResponse.redirect(`${baseUrl}/integrations/shopify/error?reason=shop_mismatch`)
  }

  // 2) Validate HMAC (basic implementation)
  const secret = process.env.SHOPIFY_CLIENT_SECRET!
  const params = Array.from(url.searchParams.entries())
    .filter(([k]) => k !== 'signature' && k !== 'hmac')
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const computed = crypto.createHmac('sha256', secret).update(params).digest('hex')
  if (!timingSafeEqual(computed, hmac)) {
    logOAuth('callback.hmac_fail', { shop })
    return NextResponse.redirect(`${baseUrl}/integrations/shopify/error?reason=hmac`)
  }

  // 3) Exchange code for token
  const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
      code
    })
  })
  if (!resp.ok) {
    const body = await resp.text()
    logOAuth('callback.token_fail', { shop, status: resp.status, body })
    return NextResponse.redirect(`${baseUrl}/integrations/shopify/error?reason=token`)
  }
  const data = await resp.json() as { access_token: string; scope: string }

  // 4) Require authenticated user before completing install
  if (!user) {
    // Enforce "login-first" rule for connecting stores
    logOAuth('callback.no_user', { shop })
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  // User is logged in - complete installation immediately
  logOAuth('callback.userLoggedIn', { shop, userId: user.id })

  // Add store to user's account (creates shopify_stores row and saves encrypted token)
  // Pass the authenticated Supabase client so RLS and user context work correctly
  const addStoreResult = await addStore(user.id, data.access_token, shop, supabase)

  if (!addStoreResult.success) {
    console.error('❌ Shopify callback: Failed to add store after OAuth:', addStoreResult.error)
    const errorRes = NextResponse.redirect(
      `${baseUrl}/dashboard/shopify?error=store_connection_failed&store=${encodeURIComponent(shop)}`
    )
    errorRes.cookies.set('shopify_oauth_state','', { maxAge: 0, path: '/' })
    errorRes.cookies.set('shopify_oauth_shop','', { maxAge: 0, path: '/' })
    return errorRes
  }

  // 5) Clear install cookies and redirect to Shopify dashboard
  const res = NextResponse.redirect(
    `${baseUrl}/dashboard/shopify?success=store_connected&store=${encodeURIComponent(shop)}`
  )
  res.cookies.set('shopify_oauth_state','', { maxAge: 0, path: '/' })
  res.cookies.set('shopify_oauth_shop','', { maxAge: 0, path: '/' })
  logOAuth('callback.success', { shop, userId: user.id })
  return res
}


