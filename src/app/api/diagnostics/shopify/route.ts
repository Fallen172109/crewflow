import { NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { SHOPIFY_API_VERSION } from '@/lib/shopify/constants'

const adminBase = (shopDomain: string) =>
  `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}`

export const dynamic = 'force-dynamic'

type Conn = {
  source: 'api_connections' | 'shopify_stores'
  id: string
  user_id?: string
  store_id?: string
  shop_domain: string
  access_token: string
  updated_at?: string
  status?: string
}

export async function GET() {
  const supabase = await createSupabaseServerClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok:false, step:'auth', error:'Not authenticated' }, { status: 401 })

  // Load from BOTH sources
  const { data: connsA } = await supabase
    .from('api_connections')
    .select('id,user_id,shop_domain,access_token,status,updated_at')
    .eq('user_id', user.id)
    .eq('integration_id', 'shopify')

  const { data: stores } = await supabase
    .from('shopify_stores')
    .select('id,user_id,shop_domain,access_token,updated_at')
    .eq('user_id', user.id)

  const candidates: Conn[] = []
  for (const c of connsA ?? []) {
    if (c?.shop_domain && c?.access_token) {
      candidates.push({
        source: 'api_connections',
        id: c.id,
        user_id: c.user_id,
        shop_domain: c.shop_domain,
        access_token: c.access_token,
        updated_at: c.updated_at,
        status: c.status
      })
    }
  }
  for (const s of stores ?? []) {
    if (s?.shop_domain && s?.access_token) {
      candidates.push({
        source: 'shopify_stores',
        id: s.id,
        user_id: s.user_id,
        store_id: s.id,
        shop_domain: s.shop_domain,
        access_token: s.access_token,
        updated_at: s.updated_at
      })
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok:false, step:'connection', error:'No tokens found in api_connections or shopify_stores' }, { status: 404 })
  }

  const results: any[] = []
  for (const c of candidates) {
    const res = await fetch(`${adminBase(c.shop_domain)}/shop.json`, {
      headers: { 'X-Shopify-Access-Token': c.access_token },
      cache: 'no-store',
    }).catch((e)=>({ ok:false, status:0, _err:e } as any))

    const body = await (async () => {
      try { return await (res as Response).text() } catch { return '' }
    })()

    results.push({
      source: c.source,
      id: c.id,
      shop_domain: c.shop_domain,
      token_preview: `...${c.access_token.slice(-6)}`, // safe preview
      updated_at: c.updated_at,
      status: (res as Response)?.status ?? 0,
      ok: (res as Response)?.ok ?? false,
      body: body?.slice(0, 400) // trim
    })
  }

  // If none OK, return the matrix so we can act
  const anyOK = results.some(r => r.ok)
  return NextResponse.json({
    ok: anyOK,
    step: anyOK ? 'token_check' : 'token_check_failed',
    api_version: SHOPIFY_API_VERSION,
    results
  }, { status: anyOK ? 200 : 502 })
}
