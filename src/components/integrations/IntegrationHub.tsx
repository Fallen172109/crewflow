'use client'

// Integration Hub Component
// Production-ready one-click API integration interface with enhanced UX

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Zap,
  Shield,
  Clock,
  Info,
  BookOpen,
  RefreshCw,
  Search,
  Filter,
  X,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react'

interface IntegrationHubProps {
  className?: string
}

export default function IntegrationHub({ className = '' }: IntegrationHubProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [connectingIntegration, setConnectingIntegration] = useState<string | null>(null)

  // Demo integrations to show in the interface
  const demoIntegrations = [
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Customer relationship management and sales automation',
      category: 'crm',
      authType: 'oauth2',
      productionReady: true,
      features: { webhooks: true, realTimeSync: true },
      logo: '🏢'
    },
    {
      id: 'facebook-business',
      name: 'Facebook Business',
      description: 'Manage Facebook pages, ads, and business accounts',
      category: 'marketing',
      authType: 'oauth2',
      productionReady: true,
      features: { webhooks: true, realTimeSync: false },
      logo: '📘'
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      description: 'Manage Google advertising campaigns and analytics',
      category: 'marketing',
      authType: 'oauth2',
      productionReady: true,
      features: { webhooks: false, realTimeSync: true },
      logo: '🎯'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication and workflow automation',
      category: 'productivity',
      authType: 'oauth2',
      productionReady: true,
      features: { webhooks: true, realTimeSync: true },
      logo: '💬'
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'E-commerce platform and store management',
      category: 'ecommerce',
      authType: 'oauth2',
      productionReady: true,
      features: { webhooks: true, realTimeSync: true },
      logo: '🛒'
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Inbound marketing, sales, and customer service',
      category: 'crm',
      authType: 'oauth2',
      productionReady: true,
      features: { webhooks: true, realTimeSync: true },
      logo: '🧲'
    }
  ]

  useEffect(() => {
    // Simulate loading and check if API is available
    const checkAPI = async () => {
      try {
        // Try to fetch integration status
        const response = await fetch('/api/integrations/status')
        if (response.ok) {
          const data = await response.json()
          setConnections(data.connections || [])
          setLoading(false)
        } else {
          throw new Error('API not configured')
        }
      } catch (err) {
        console.log('API not fully configured, showing demo mode')
        setError('Demo mode - OAuth not configured')
        setLoading(false)
      }
    }

    checkAPI()
  }, [])

  const handleConnect = async (integrationId: string) => {
    setConnectingIntegration(integrationId)

    try {
      // Call the real OAuth connect endpoint
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationId,
          returnUrl: '/dashboard/integrations'
        })
      })

      if (response.ok) {
        const data = await response.json()

        if (data.authUrl) {
          // Redirect to OAuth provider for one-click connection
          window.location.href = data.authUrl
        } else {
          throw new Error('No authorization URL received')
        }
      } else {
        const errorData = await response.json()

        if (response.status === 400 && errorData.code === 'OAUTH_NOT_CONFIGURED') {
          // Show user-friendly message for unconfigured integrations
          alert(`${demoIntegrations.find(i => i.id === integrationId)?.name} integration is not yet available.\n\nThis integration is coming soon! Our team is working on enabling one-click connections for all users.`)
        } else {
          throw new Error(errorData.error || 'Connection failed')
        }
      }
    } catch (error) {
      console.error('Connection error:', error)
      alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setConnectingIntegration(null)
    }
  }

  const getConnectionStatus = (integrationId: string) => {
    return connections.find(conn => conn.integration?.id === integrationId) || null
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Integration Hub</h2>
        <p className="text-gray-600 mb-6">
          Connect your business tools with secure OAuth 2.0 authentication.
          <span className="text-orange-600 font-medium">One-click setup</span> - no API keys required!
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Setup Required for OAuth Integrations
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                To use these integrations, you need to configure OAuth credentials in your environment variables.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <a
                  href="/OAUTH_INTEGRATIONS_SETUP.md"
                  target="_blank"
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Setup Guide</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-blue-600">•</span>
                <span className="text-blue-700">Copy .env.example to .env.local</span>
                <span className="text-blue-600">•</span>
                <span className="text-blue-700">Add your OAuth credentials</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Mode Banner */}
        {error && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-orange-900 mb-1">Demo Mode Active</h4>
                <p className="text-sm text-orange-700 mb-2">
                  You're viewing demo integrations. Configure OAuth credentials to enable real connections.
                </p>
                <div className="text-xs text-orange-600">
                  <span>💡 Click "Connect" to see how the OAuth flow would work</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoIntegrations.map(integration => {
            const connectionStatus = getConnectionStatus(integration.id)
            const isConnected = connectionStatus?.connected || false
            const isConnecting = connectingIntegration === integration.id

            return (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                {/* Integration Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 text-xl">
                      {integration.logo}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{integration.name}</h3>
                        {integration.features?.webhooks && (
                          <Zap className="w-3 h-3 text-orange-500" title="Supports webhooks" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {integration.category}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center space-x-1">
                    {isConnected ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>

                {/* Action Button */}
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting}
                  className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium shadow-sm"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Connect</span>
                    </>
                  )}
                </button>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* One-click ready indicator for master OAuth integrations */}
                  {['facebook-business', 'google-ads', 'linkedin', 'twitter', 'shopify'].includes(integration.id) ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">
                      ⚡ One-Click Ready
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      OAuth 2.0
                    </span>
                  )}
                  {integration.features?.webhooks && (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      Webhooks
                    </span>
                  )}
                  {integration.features?.realTimeSync && (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                      Real-time
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
