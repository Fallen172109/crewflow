import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { normalizeShopDomain } from '@/lib/shopify/constants'
import { getInstallForUserShop, logOAuth } from '@/lib/shopify/install'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()

  // Log session debug info
  logOAuth('authorize.session_check', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email
  })

  if (!user) return NextResponse.json({ error:'Auth required' }, { status: 401 })

  const url = new URL(req.url)
  const rawShop = url.searchParams.get('shop') || ''
  const force = url.searchParams.get('force') === 'true'
  const shop = normalizeShopDomain(rawShop)

  // 1) If we already have a token and not forcing, DO NOT re-authorize
  const existing = await getInstallForUserShop(user.id, shop)
  if (existing?.access_token && existing?.status === 'connected' && !force) {
    logOAuth('authorize.skip', { shop, reason: 'already_connected' })
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=shopify&shop=${encodeURIComponent(shop)}`
    return NextResponse.redirect(redirectUrl)
  }

  // 2) Build Shopify install URL (replace with your actual values/helpers)
  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const scopes = encodeURIComponent('read_products,write_products,read_files,write_files,read_inventory,write_inventory,read_orders,write_orders,read_customers,write_customers')
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/shopify/callback`)
  const state = crypto.randomUUID()

  const installUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`

  logOAuth('authorize.redirect', { shop, installUrl })
  const res = NextResponse.redirect(installUrl)
  // set a short-lived cookie with state to validate later
  res.cookies.set('shopify_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 600, path: '/' })
  res.cookies.set('shopify_oauth_shop', shop, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 600, path: '/' })
  return res
}
