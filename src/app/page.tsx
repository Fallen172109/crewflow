'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if this is a Shopify OAuth request
    const shop = searchParams.get('shop')
    const hmac = searchParams.get('hmac')
    const timestamp = searchParams.get('timestamp')
    const host = searchParams.get('host')

    // Detect Shopify requests by multiple parameters
    const isShopifyRequest = shop && (hmac || timestamp || host)

    if (isShopifyRequest) {
      // This is a Shopify OAuth request - redirect to install endpoint
      console.log('Detected Shopify OAuth request on root page:', {
        shop,
        hasHmac: !!hmac,
        hasTimestamp: !!timestamp,
        hasHost: !!host
      })

      // Preserve all Shopify parameters and redirect to install endpoint
      const installUrl = `/api/auth/shopify/install?${searchParams.toString()}`
      console.log('Redirecting to:', installUrl)
      window.location.href = installUrl
      return
    }

    // Normal redirect to dashboard for regular users (will be handled by maintenance wrapper)
    router.push('/dashboard')
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  )
}


