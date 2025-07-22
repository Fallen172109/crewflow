'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import ShopifyStoreHelp from '@/components/shopify/ShopifyStoreHelp'

export default function ShopifyConnectPage() {
  const [shopDomain, setShopDomain] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const validateDomain = (domain: string): boolean => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return cleanDomain.includes('.myshopify.com') || cleanDomain.includes('.shopify.com')
  }

  const handleConnect = async () => {
    setError('')
    
    if (!shopDomain.trim()) {
      setError('Please enter your store domain')
      return
    }

    if (!validateDomain(shopDomain)) {
      setError('Please enter a valid Shopify store domain (e.g., your-store.myshopify.com)')
      return
    }

    setIsConnecting(true)

    try {
      // Clean the domain
      const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      
      // Redirect directly to OAuth flow
      window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(cleanDomain)}`
      
    } catch (error) {
      console.error('Connection error:', error)
      setError('Failed to initiate connection. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Shopify Store</h1>
          <p className="text-gray-600">
            Enter your store domain to connect with CrewFlow AI agents
          </p>
        </div>

        {/* Connection Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-2">
                Store Domain
              </label>
              <input
                id="shopDomain"
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="your-store.myshopify.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isConnecting}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Enter your full Shopify store domain
                </p>
                <ShopifyStoreHelp />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={isConnecting || !shopDomain.trim()}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Connect Store</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            You'll be redirected to Shopify to authorize CrewFlow access to your store.
          </p>
          <button
            onClick={() => router.push('/dashboard/shopify')}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium mt-2"
          >
            ← Back to Shopify Dashboard
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Secure Connection</p>
              <p>CrewFlow uses OAuth 2.0 for secure authentication. We never store your Shopify login credentials.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
