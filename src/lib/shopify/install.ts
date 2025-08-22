import { createClient } from '@supabase/supabase-js'
import { normalizeShopDomain } from '@/lib/shopify/constants'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
)

export type InstallRecord = {
  user_id: string
  shop_domain: string
  access_token: string
  scope?: string
  status?: string
}

export async function getInstallForUserShop(userId: string, shop: string) {
  const shop_domain = normalizeShopDomain(shop)
  const { data, error } = await supabaseAdmin
    .from('api_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('integration_id', 'shopify')
    .eq('shop_domain', shop_domain)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertInstall(rec: InstallRecord) {
  const shop_domain = normalizeShopDomain(rec.shop_domain)
  const payload = {
    user_id: rec.user_id,
    integration_id: 'shopify',
    shop_domain,
    access_token: rec.access_token,
    scope: rec.scope ?? '',
    status: rec.status ?? 'connected',
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabaseAdmin
    .from('api_connections')
    .upsert(payload, { onConflict: 'user_id,integration_id,shop_domain' })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export function logOAuth(step: string, details: any) {
  if (process.env.DEBUG_SHOPIFY_OAUTH === 'true') {
    // eslint-disable-next-line no-console
    console.log('[SHOPIFY_OAUTH]', step, JSON.stringify(details))
  }
}
