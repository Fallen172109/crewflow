'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Store, Settings, Users, ArrowRight } from 'lucide-react'

export default function ShopifySetupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const shop = searchParams.get('shop')
  const connectionToken = searchParams.get('token')
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  useEffect(() => {
    if (!shop) {
      router.push('/dashboard/shopify?error=missing_shop_parameter')
    }
  }, [shop, router])

  const handleContinueToApp = async () => {
    setIsLoading(true)

    try {
      // If we have a connection token, try to complete the store connection
      if (connectionToken) {
        // Call API to complete the store connection
        const response = await fetch('/api/shopify/complete-installation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shop,
            connectionToken
          })
        })

        if (response.ok) {
          // Connection completed successfully, redirect to dashboard
          router.push(`/dashboard/shopify?success=store_connected&shop=${encodeURIComponent(shop)}`)
          return
        } else {
          console.error('Failed to complete store connection')
        }
      }

      // Fallback: redirect to login/signup with the shop connection info
      const returnUrl = encodeURIComponent(`/dashboard/shopify?shop=${shop}&token=${connectionToken}`)
      router.push(`/auth/login?returnUrl=${returnUrl}&message=Complete your account setup to manage ${shop}`)
    } catch (error) {
      console.error('Error completing installation:', error)
      // Fallback to login flow
      const returnUrl = encodeURIComponent(`/dashboard/shopify?shop=${shop}&token=${connectionToken}`)
      router.push(`/auth/login?returnUrl=${returnUrl}&message=Complete your account setup to manage ${shop}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigureLater = () => {
    // For Shopify App Store compliance - allow users to configure the app later
    // This satisfies the requirement that apps don't immediately redirect to app UI
    window.close() // Close the installation window
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Installation Error</CardTitle>
            <CardDescription>
              There was an issue installing CrewFlow for your Shopify store.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Error: {error}
            </p>
            <Button 
              onClick={() => window.close()} 
              className="w-full"
              variant="outline"
            >
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">
            CrewFlow Successfully Installed!
          </CardTitle>
          <CardDescription className="text-lg">
            Your Shopify store <strong>{shop}</strong> is now connected to CrewFlow
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Installation Success Message */}
          {success === 'app_installed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  App installed successfully! Your store is ready for AI automation.
                </span>
              </div>
            </div>
          )}

          {/* What's Next Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">What's Next?</h3>
            
            <div className="grid gap-4">
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                <Store className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Store Connected</h4>
                  <p className="text-sm text-gray-600">
                    CrewFlow can now access your Shopify store data and perform automated tasks.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                <Settings className="w-6 h-6 text-orange-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Configure AI Agents</h4>
                  <p className="text-sm text-gray-600">
                    Set up your AI agents to automate inventory, orders, and customer management.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                <Users className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Team Access</h4>
                  <p className="text-sm text-gray-600">
                    Create your CrewFlow account to manage your store and invite team members.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleContinueToApp}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                'Setting up...'
              ) : (
                <>
                  Continue to CrewFlow
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleConfigureLater}
              variant="outline"
              className="flex-1"
            >
              Configure Later
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Need help? Visit our{' '}
              <a 
                href="https://docs.crewflow.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                documentation
              </a>{' '}
              or contact{' '}
              <a 
                href="mailto:support@crewflow.ai" 
                className="text-blue-600 hover:underline"
              >
                support@crewflow.ai
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
