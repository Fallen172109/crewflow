/**
 * Environment-aware utility functions for CrewFlow
 * Handles development vs production URL detection
 */

/**
 * Get the correct base URL for the current environment
 * Automatically detects production vs development vs ngrok
 */
export function getBaseUrl(): string {
  // In browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Priority order for server-side URL detection:

  // 1. Explicit ngrok URL for Shopify development testing
  if (process.env.NGROK_URL) {
    // Ensure ngrok URL is properly formatted
    const ngrokUrl = process.env.NGROK_URL.replace(/\/$/, '') // Remove trailing slash
    console.log('Using ngrok URL for Shopify development:', ngrokUrl)
    return ngrokUrl
  }

  // 2. Vercel deployment URLs
  if (process.env.VERCEL_URL) {
    const vercelUrl = `https://${process.env.VERCEL_URL}`
    console.log('Using Vercel URL:', vercelUrl)
    return vercelUrl
  }

  // In server environment - prioritize production detection
  // Check if we're in production environment
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    // Use production URL if available
    if (process.env.NEXT_PUBLIC_PRODUCTION_URL) {
      return process.env.NEXT_PUBLIC_PRODUCTION_URL
    }
    // Use Vercel URL for production deployments
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    // Default production URL
    return 'https://crewflow.ai'
  }

  // For development, use configured app URL or localhost
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'http://localhost:3000') {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Default to localhost for development
  return 'http://localhost:3000'
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || 
         process.env.VERCEL_ENV === 'production' ||
         (typeof window !== 'undefined' && window.location.hostname === 'crewflow.ai')
}

/**
 * Get the correct redirect URI for OAuth flows
 */
export function getOAuthRedirectUri(provider: string, endpoint: string = 'callback'): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/api/auth/${provider}/${endpoint}`
}

/**
 * Generate Shopify embedded app URL
 * Format: https://admin.shopify.com/store/{shop_id}/apps/{api_key}/
 */
export function getShopifyEmbeddedAppUrl(shop: string, apiKey: string): string {
  const shopId = shop.replace('.myshopify.com', '')
  return `https://admin.shopify.com/store/${shopId}/apps/${apiKey}/`
}

/**
 * Check if the current request is from Shopify embedded context
 */
export function isShopifyEmbeddedRequest(searchParams: URLSearchParams): boolean {
  return !!(
    searchParams.get('shop') &&
    (searchParams.get('hmac') || searchParams.get('host') || searchParams.get('embedded'))
  )
}
