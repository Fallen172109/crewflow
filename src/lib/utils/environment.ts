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

  // Check for ngrok development URL (for Shopify testing)
  if (process.env.NGROK_URL) {
    console.log('Using ngrok URL for development:', process.env.NGROK_URL)
    return process.env.NGROK_URL
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
