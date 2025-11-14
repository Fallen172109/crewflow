import { NextResponse } from 'next/server'
import { normalizeShopDomain } from '@/lib/shopify/constants'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok:false, error:'No user' }, { status: 401 })

  const url = new URL(req.url)
  const shop = url.searchParams.get('shop')
  if (!shop) return NextResponse.json({ ok:false, error:'Missing shop' }, { status: 400 })
  const shop_domain = normalizeShopDomain(shop)

  // check api_connections
  const { data: conn } = await supabase
    .from('api_connections')
    .select('shop_domain,status,scope,updated_at,access_token')
    .eq('user_id', user.id)
    .eq('integration_id','shopify')
    .eq('shop_domain', shop_domain)
    .maybeSingle()

  // check shopify_stores too (optional)
  const { data: store } = await supabase
    .from('shopify_stores')
    .select('id,shop_domain,store_name,updated_at,access_token')
    .eq('user_id', user.id)
    .eq('shop_domain', shop_domain)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    shop_domain,
    api_connections: !!conn ? { ...conn, has_token: !!conn.access_token } : null,
    shopify_stores: !!store ? { ...store, has_token: !!store.access_token } : null
  })
}
