'use client'

import { useSearchParams } from 'next/navigation'

export default function ShopifyError() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const getErrorMessage = (reason: string | null) => {
    switch (reason) {
      case 'state':
        return 'Security validation failed. Please try connecting again.'
      case 'hmac':
        return 'Request verification failed. Please try connecting again.'
      case 'token':
        return 'Failed to obtain access token. Please try connecting again.'
      default:
        return 'An error occurred during Shopify connection. Please try again.'
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-10">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600">⚠️ Connection Failed</h1>
        <p className="mt-2 opacity-80">{getErrorMessage(reason)}</p>
        <div className="mt-6 space-x-4">
          <a href="/dashboard/shopify" className="inline-block rounded-xl px-4 py-2 bg-orange-600 text-white">
            Try Again
          </a>
          <a href="/dashboard" className="inline-block rounded-xl px-4 py-2 bg-gray-600 text-white">
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
