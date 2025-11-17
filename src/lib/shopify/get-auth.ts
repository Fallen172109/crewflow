import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { OAuthSecurityManager } from '@/lib/integrations/security'

export type ShopifyAuth = {
  shop_domain: string
  access_token: string
  source: 'shopify_stores' | 'api_connections'
}

export async function getShopifyAuthForUser(storeId?: string): Promise<ShopifyAuth | null> {
  const supabase = await createSupabaseServerClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const securityManager = new OAuthSecurityManager()

  // Prefer the store record if storeId provided
  if (storeId) {
    const { data: s } = await supabase
      .from('shopify_stores')
      .select('id, shop_domain, access_token, api_key_encrypted')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (s?.shop_domain && (s?.access_token || s?.api_key_encrypted)) {
      // Try to decrypt the token (prefer api_key_encrypted, fallback to access_token)
      const encryptedToken = s.api_key_encrypted || s.access_token
      let decryptedToken: string

      try {
        decryptedToken = securityManager.decrypt(encryptedToken)
      } catch (error) {
        console.error('Failed to decrypt store token:', error)
        // If decryption fails, try using the token as-is (might be plain text)
        decryptedToken = encryptedToken
      }

      return {
        shop_domain: s.shop_domain,
        access_token: decryptedToken,
        source: 'shopify_stores'
      }
    }
  }

  // Fallback: a connected api_connections row
  const { data: c } = await supabase
    .from('api_connections')
    .select('shop_domain, access_token, api_key_encrypted, status')
    .eq('user_id', user.id)
    .eq('integration_id', 'shopify')
    .eq('status', 'connected')
    .maybeSingle()

  if (c?.shop_domain && (c?.access_token || c?.api_key_encrypted)) {
    // Try to decrypt the token (prefer api_key_encrypted, fallback to access_token)
    const encryptedToken = c.api_key_encrypted || c.access_token
    let decryptedToken: string

    try {
      decryptedToken = securityManager.decrypt(encryptedToken)
    } catch (error) {
      console.error('Failed to decrypt connection token:', error)
      // If decryption fails, try using the token as-is (might be plain text)
      decryptedToken = encryptedToken
    }

    return {
      shop_domain: c.shop_domain,
      access_token: decryptedToken,
      source: 'api_connections'
    }
  }

  return null
}
