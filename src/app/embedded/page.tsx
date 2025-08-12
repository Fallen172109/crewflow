'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppBridge } from '@/hooks/useAppBridge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Store, Settings, Users, BarChart3 } from 'lucide-react'

/**
 * Embedded Shopify App Page
 * This page is loaded when merchants access CrewFlow through Shopify admin
 */
export default function EmbeddedAppPage() {
  const searchParams = useSearchParams()
  const { app, isEmbedded, isLoading, shopifyParams, sessionToken, toast, authenticatedFetch } = useAppBridge()
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [loadingStore, setLoadingStore] = useState(false)

  const shop = searchParams.get('shop') || shopifyParams.shop

  // Load store information when app is ready
  useEffect(() => {
    const loadStoreInfo = async () => {
      if (!app || !sessionToken || !shop) return

      setLoadingStore(true)
      try {
        const response = await authenticatedFetch('/api/shopify/store-info')
        if (response.ok) {
          const data = await response.json()
          setStoreInfo(data)
        } else {
          console.error('Failed to load store info:', response.statusText)
        }
      } catch (error) {
        console.error('Error loading store info:', error)
      } finally {
        setLoadingStore(false)
      }
    }

    loadStoreInfo()
  }, [app, sessionToken, shop, authenticatedFetch])

  const handleQuickAction = async (action: string) => {
    toast(`${action} feature coming soon!`)
  }

  if (!isEmbedded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-orange-600">CrewFlow</CardTitle>
            <CardDescription>
              This page is designed for embedded Shopify app access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
          <p className="text-gray-600">Initializing CrewFlow...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CrewFlow</h1>
              <p className="text-gray-600 mt-1">
                AI Automation for {shop || 'your store'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {sessionToken && (
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  ✓ Connected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickAction('Product Management')}>
            <CardContent className="p-6 text-center">
              <Store className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Products</h3>
              <p className="text-sm text-gray-600">Manage inventory with AI</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickAction('Order Automation')}>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Orders</h3>
              <p className="text-sm text-gray-600">Automate fulfillment</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickAction('Customer Service')}>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Customers</h3>
              <p className="text-sm text-gray-600">AI customer support</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickAction('Settings')}>
            <CardContent className="p-6 text-center">
              <Settings className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
              <p className="text-sm text-gray-600">Configure automation</p>
            </CardContent>
          </Card>
        </div>

        {/* Store Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Status</CardTitle>
              <CardDescription>Current connection and sync status</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStore ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading store information...</span>
                </div>
              ) : storeInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Store:</span>
                    <span className="font-medium">{storeInfo.name || shop}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="font-medium">Just now</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">Store information not available</p>
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Agents</CardTitle>
              <CardDescription>Your maritime automation crew</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Anchor (Store Manager)</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Helm (Order Fulfillment)</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Standby</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pearl (Customer Service)</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Standby</span>
                </div>
                <Button 
                  onClick={() => handleQuickAction('Agent Configuration')}
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                >
                  Configure Agents
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>CrewFlow - Maritime AI Automation Platform</p>
          <p className="mt-1">
            Need help? Visit our{' '}
            <a 
              href="https://docs.crewflow.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-orange-600 hover:underline"
            >
              documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
