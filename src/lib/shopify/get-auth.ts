import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export type ShopifyAuth = { 
  shop_domain: string
  access_token: string
  source: 'shopify_stores' | 'api_connections' 
}

export async function getShopifyAuthForUser(storeId?: string): Promise<ShopifyAuth | null> {
  const supabase = await createSupabaseServerClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Prefer the store record if storeId provided
  if (storeId) {
    const { data: s } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, access_token')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (s?.shop_domain && s?.access_token) {
      return { 
        shop_domain: s.shop_domain, 
        access_token: s.access_token, 
        source: 'shopify_stores' 
      }
    }
  }

  // Fallback: a connected api_connections row
  const { data: c } = await supabase
    .from('api_connections')
    .select('shop_domain, access_token, status')
    .eq('user_id', user.id)
    .eq('integration_id', 'shopify')
    .eq('status', 'connected')
    .maybeSingle()

  if (c?.shop_domain && c?.access_token) {
    return { 
      shop_domain: c.shop_domain, 
      access_token: c.access_token, 
      source: 'api_connections' 
    }
  }

  return null
}
