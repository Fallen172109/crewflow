import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { upsertInstall, logOAuth } from '@/lib/shopify/install'
import { normalizeShopDomain } from '@/lib/shopify/constants'

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export async function GET(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?err=no_user`)

  const url = new URL(req.url)
  const shop = normalizeShopDomain(url.searchParams.get('shop') || '')
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const hmac = url.searchParams.get('hmac') || ''

  // 1) Validate state
  const stateCookie = cookieStore.get('shopify_oauth_state')?.value || ''
  if (!state || !stateCookie || !timingSafeEqual(state, stateCookie)) {
    logOAuth('callback.state_fail', { state, stateCookie })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/shopify/error?reason=state`)
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

  // 4) Persist token using service role
  await upsertInstall({
    user_id: user.id,
    shop_domain: shop,
    access_token: data.access_token,
    scope: data.scope,
    status: 'connected'
  })

  // 5) Clear install cookies and redirect to dashboard once
  const res = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=shopify&shop=${encodeURIComponent(shop)}`)
  res.cookies.set('shopify_oauth_state','', { maxAge: 0, path: '/' })
  res.cookies.set('shopify_oauth_shop','', { maxAge: 0, path: '/' })
  logOAuth('callback.success', { shop })
  return res
}


