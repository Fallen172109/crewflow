import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RootPage({ searchParams }: PageProps) {
  // Await searchParams for Next.js 15 compatibility
  const params = await searchParams

  // Check if this is a Shopify request
  const shop = params.shop as string
  const hmac = params.hmac as string
  const timestamp = params.timestamp as string
  const host = params.host as string
  const embedded = params.embedded as string

  // Detect Shopify requests by shop parameter + any Shopify-specific parameter
  const isShopifyRequest = shop && (hmac || timestamp || host || embedded)

  console.log('Root page - server-side detection:', {
    shop,
    hasHmac: !!hmac,
    hasTimestamp: !!timestamp,
    hasHost: !!host,
    hasEmbedded: !!embedded,
    isShopifyRequest
  })

  if (isShopifyRequest) {
    // Check if this is an embedded app request (already installed)
    const isEmbeddedApp = embedded === '1' || embedded === 'true' || !!host

    if (isEmbeddedApp && !hmac) {
      // This is likely an embedded app access, redirect to embedded page
      console.log('Embedded app access detected, redirecting to embedded page')
      const urlParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          urlParams.set(key, Array.isArray(value) ? value[0] : value)
        }
      })
      redirect(`/embedded?${urlParams.toString()}`)
    } else {
      // This is an app installation or OAuth flow
      const urlParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          urlParams.set(key, Array.isArray(value) ? value[0] : value)
        }
      })

      console.log('Server-side redirect to install endpoint')
      redirect(`/api/auth/shopify/install?${urlParams.toString()}`)
    }
  }

  // Normal redirect to landing page for regular users (not dashboard to avoid auth loops)
  redirect('/auth/login')
}


