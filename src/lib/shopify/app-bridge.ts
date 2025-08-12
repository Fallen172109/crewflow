/**
 * Shopify App Bridge utilities for CrewFlow
 * Handles embedded app initialization and session token management
 */

declare global {
  interface Window {
    'app-bridge': any
    'app-bridge-utils': any
  }
}

export interface AppBridgeConfig {
  apiKey: string
  host?: string
  shopOrigin?: string
}

export interface SessionTokenResult {
  token: string
  payload: any
}

/**
 * Initialize Shopify App Bridge
 * @param config App Bridge configuration
 * @returns App Bridge instance or null if not available
 */
export function initializeAppBridge(config: AppBridgeConfig): any | null {
  try {
    if (typeof window === 'undefined' || !window['app-bridge']) {
      console.warn('App Bridge not available - not in embedded context or scripts not loaded')
      return null
    }

    const AppBridge = window['app-bridge']
    
    // Check if we're in an embedded context
    if (window.parent === window) {
      console.log('Not in embedded context - App Bridge not needed')
      return null
    }

    const appConfig: any = {
      apiKey: config.apiKey
    }

    // Add host parameter if available
    if (config.host) {
      appConfig.host = config.host
    } else if (config.shopOrigin) {
      appConfig.shopOrigin = config.shopOrigin
    }

    console.log('Initializing App Bridge with config:', { 
      apiKey: config.apiKey.substring(0, 8) + '...', 
      hasHost: !!config.host,
      hasShopOrigin: !!config.shopOrigin
    })

    const app = AppBridge.createApp(appConfig)
    
    // Set up error handling
    app.subscribe(AppBridge.Error.Action.UNHANDLED, (error: any) => {
      console.error('App Bridge error:', error)
    })

    return app

  } catch (error) {
    console.error('Failed to initialize App Bridge:', error)
    return null
  }
}

/**
 * Get session token from App Bridge
 * @param app App Bridge instance
 * @returns Promise resolving to session token
 */
export async function getSessionToken(app: any): Promise<string | null> {
  try {
    if (!app || typeof window === 'undefined' || !window['app-bridge-utils']) {
      console.warn('App Bridge or utils not available for session token')
      return null
    }

    const { getSessionToken } = window['app-bridge-utils']
    const token = await getSessionToken(app)
    
    console.log('Session token obtained successfully')
    return token

  } catch (error) {
    console.error('Failed to get session token:', error)
    return null
  }
}

/**
 * Decode session token payload (without verification)
 * @param token Session token
 * @returns Decoded payload or null
 */
export function decodeSessionToken(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const payload = JSON.parse(atob(parts[1]))
    return payload

  } catch (error) {
    console.error('Failed to decode session token:', error)
    return null
  }
}

/**
 * Check if we're in a Shopify embedded context
 * @returns True if embedded, false otherwise
 */
export function isEmbeddedContext(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if we're in an iframe
  const inIframe = window.parent !== window
  
  // Check for Shopify-specific parameters
  const urlParams = new URLSearchParams(window.location.search)
  const hasShopifyParams = !!(
    urlParams.get('shop') || 
    urlParams.get('host') || 
    urlParams.get('hmac')
  )

  return inIframe && hasShopifyParams
}

/**
 * Get Shopify parameters from URL
 * @returns Object with shop, host, and other Shopify parameters
 */
export function getShopifyParams(): {
  shop?: string
  host?: string
  hmac?: string
  timestamp?: string
  embedded?: string
} {
  if (typeof window === 'undefined') return {}

  const urlParams = new URLSearchParams(window.location.search)
  
  return {
    shop: urlParams.get('shop') || undefined,
    host: urlParams.get('host') || undefined,
    hmac: urlParams.get('hmac') || undefined,
    timestamp: urlParams.get('timestamp') || undefined,
    embedded: urlParams.get('embedded') || undefined
  }
}

/**
 * Create authenticated fetch function that includes session token
 * @param app App Bridge instance
 * @returns Fetch function with session token authentication
 */
export function createAuthenticatedFetch(app: any) {
  return async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getSessionToken(app)
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      return fetch(url, {
        ...options,
        headers
      })

    } catch (error) {
      console.error('Authenticated fetch error:', error)
      throw error
    }
  }
}

/**
 * Redirect using App Bridge (for embedded apps)
 * @param app App Bridge instance
 * @param url URL to redirect to
 */
export function appBridgeRedirect(app: any, url: string): void {
  try {
    if (!app || typeof window === 'undefined' || !window['app-bridge']) {
      // Fallback to regular redirect
      window.location.href = url
      return
    }

    const AppBridge = window['app-bridge']
    const redirect = AppBridge.Redirect.create(app)
    
    if (url.startsWith('http')) {
      // External redirect
      redirect.dispatch(AppBridge.Redirect.Action.REMOTE, url)
    } else {
      // Internal redirect
      redirect.dispatch(AppBridge.Redirect.Action.APP, url)
    }

  } catch (error) {
    console.error('App Bridge redirect error:', error)
    // Fallback to regular redirect
    window.location.href = url
  }
}

/**
 * Show toast notification using App Bridge
 * @param app App Bridge instance
 * @param message Toast message
 * @param isError Whether this is an error toast
 */
export function showToast(app: any, message: string, isError: boolean = false): void {
  try {
    if (!app || typeof window === 'undefined' || !window['app-bridge']) {
      console.log('Toast (fallback):', message)
      return
    }

    const AppBridge = window['app-bridge']
    const toast = AppBridge.Toast.create(app, {
      message,
      duration: 5000,
      isError
    })
    
    toast.dispatch(AppBridge.Toast.Action.SHOW)

  } catch (error) {
    console.error('App Bridge toast error:', error)
    console.log('Toast (fallback):', message)
  }
}
