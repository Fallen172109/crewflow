'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  initializeAppBridge, 
  getSessionToken, 
  isEmbeddedContext, 
  getShopifyParams,
  createAuthenticatedFetch,
  appBridgeRedirect,
  showToast
} from '@/lib/shopify/app-bridge'

export interface UseAppBridgeResult {
  app: any | null
  isEmbedded: boolean
  isLoading: boolean
  shopifyParams: ReturnType<typeof getShopifyParams>
  sessionToken: string | null
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
  redirect: (url: string) => void
  toast: (message: string, isError?: boolean) => void
  refreshSessionToken: () => Promise<string | null>
}

/**
 * React hook for Shopify App Bridge integration
 * Handles initialization, session tokens, and embedded app functionality
 */
export function useAppBridge(): UseAppBridgeResult {
  const [app, setApp] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [isEmbedded] = useState(() => isEmbeddedContext())
  const [shopifyParams] = useState(() => getShopifyParams())

  // Initialize App Bridge
  useEffect(() => {
    const initApp = async () => {
      try {
        if (!isEmbedded) {
          console.log('Not in embedded context - skipping App Bridge initialization')
          setIsLoading(false)
          return
        }

        // Wait for App Bridge scripts to load
        let attempts = 0
        const maxAttempts = 10
        
        while (attempts < maxAttempts) {
          if (typeof window !== 'undefined' && window['app-bridge']) {
            break
          }
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (attempts >= maxAttempts) {
          console.warn('App Bridge scripts not loaded after waiting')
          setIsLoading(false)
          return
        }

        const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID
        if (!apiKey) {
          console.error('Shopify API key not configured')
          setIsLoading(false)
          return
        }

        const appInstance = initializeAppBridge({
          apiKey,
          host: shopifyParams.host,
          shopOrigin: shopifyParams.shop ? `https://${shopifyParams.shop}` : undefined
        })

        if (appInstance) {
          setApp(appInstance)
          
          // Get initial session token
          try {
            const token = await getSessionToken(appInstance)
            setSessionToken(token)
          } catch (error) {
            console.warn('Failed to get initial session token:', error)
          }
        }

      } catch (error) {
        console.error('Failed to initialize App Bridge:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initApp()
  }, [isEmbedded, shopifyParams.host, shopifyParams.shop])

  // Refresh session token
  const refreshSessionToken = useCallback(async (): Promise<string | null> => {
    if (!app) {
      console.warn('App Bridge not initialized - cannot refresh session token')
      return null
    }

    try {
      const token = await getSessionToken(app)
      setSessionToken(token)
      return token
    } catch (error) {
      console.error('Failed to refresh session token:', error)
      return null
    }
  }, [app])

  // Create authenticated fetch function
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!app) {
      // Fallback to regular fetch if App Bridge not available
      return fetch(url, options)
    }

    const authFetch = createAuthenticatedFetch(app)
    return authFetch(url, options)
  }, [app])

  // Redirect function
  const redirect = useCallback((url: string) => {
    if (app) {
      appBridgeRedirect(app, url)
    } else {
      // Fallback to regular redirect
      window.location.href = url
    }
  }, [app])

  // Toast function
  const toast = useCallback((message: string, isError: boolean = false) => {
    if (app) {
      showToast(app, message, isError)
    } else {
      // Fallback to console log
      console.log(`Toast: ${message}`)
    }
  }, [app])

  return {
    app,
    isEmbedded,
    isLoading,
    shopifyParams,
    sessionToken,
    authenticatedFetch,
    redirect,
    toast,
    refreshSessionToken
  }
}

/**
 * Hook for checking if we're in Shopify embedded context
 */
export function useIsEmbedded(): boolean {
  const [isEmbedded] = useState(() => isEmbeddedContext())
  return isEmbedded
}

/**
 * Hook for getting Shopify URL parameters
 */
export function useShopifyParams() {
  const [params] = useState(() => getShopifyParams())
  return params
}

/**
 * Hook for session token management only
 */
export function useSessionToken() {
  const { sessionToken, refreshSessionToken, isLoading } = useAppBridge()
  
  return {
    sessionToken,
    refreshSessionToken,
    isLoading,
    hasToken: !!sessionToken
  }
}
