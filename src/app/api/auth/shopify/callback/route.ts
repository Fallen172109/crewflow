import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { upsertInstall, logOAuth } from '@/lib/shopify/install'
import { normalizeShopDomain } from '@/lib/shopify/constants'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

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

  // Allow OAuth callback to proceed even without logged-in user initially
  // We'll handle user association after validating the OAuth response

  const url = new URL(req.url)
  const shop = normalizeShopDomain(url.searchParams.get('shop') || '')
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const hmac = url.searchParams.get('hmac') || ''

  // 1) Validate state
  const stateCookie = cookieStore.get('shopify_oauth_state')?.value || ''
  const storedShop = cookieStore.get('shopify_oauth_shop')?.value || ''
  if (!state || !stateCookie || !timingSafeEqual(state, stateCookie)) {
    logOAuth('callback.state_fail', { state, stateCookie })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/shopify/error?reason=state`)
  }
  if (storedShop && storedShop !== shop) {
    logOAuth('callback.shop_mismatch', { shop, storedShop })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/shopify/error?reason=shop_mismatch`)
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
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/shopify/error?reason=hmac`)
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
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/shopify/error?reason=token`)
  }
  const data = await resp.json() as { access_token: string; scope: string }

  // 4) Handle user authentication and token persistence
  if (!user) {
    // User not logged in - store token temporarily and redirect to login
    logOAuth('callback.no_user', { shop })

    // Store OAuth result temporarily in cookies for post-login processing
    const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?oauth_pending=shopify&shop=${encodeURIComponent(shop)}`)
    res.cookies.set('shopify_oauth_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/'
    })
    res.cookies.set('shopify_oauth_scope', data.scope, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/'
    })
    res.cookies.set('shopify_oauth_shop_final', shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/'
    })
    // Clear OAuth state cookies
    res.cookies.set('shopify_oauth_state','', { maxAge: 0, path: '/' })
    res.cookies.set('shopify_oauth_shop','', { maxAge: 0, path: '/' })
    return res
  }

  // User is logged in - persist token immediately
  await upsertInstall({
    user_id: user.id,
    shop_domain: shop,
    access_token: data.access_token,
    scope: data.scope,
    status: 'connected'
  })

  // 5) Clear install cookies and redirect to dashboard
  const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=shopify&shop=${encodeURIComponent(shop)}`)
  res.cookies.set('shopify_oauth_state','', { maxAge: 0, path: '/' })
  res.cookies.set('shopify_oauth_shop','', { maxAge: 0, path: '/' })
  logOAuth('callback.success', { shop })
  return res
}


