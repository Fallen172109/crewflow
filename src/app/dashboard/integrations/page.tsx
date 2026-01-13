// Integrations Dashboard Page
// Main page for managing third-party service integrations

import { Suspense } from 'react'
import IntegrationHub from '@/components/integrations/IntegrationHub'
import { Zap, Shield, Clock, CheckCircle } from 'lucide-react'

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h1>
          <p className="text-gray-600">
            Connect your business tools to unlock the full power of CrewFlow AI agents
          </p>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2 text-green-600">
            <Shield className="w-4 h-4" />
            <span>Secure OAuth 2.0</span>
          </div>
          <div className="flex items-center space-x-2 text-blue-600">
            <Zap className="w-4 h-4" />
            <span>One-Click Setup</span>
          </div>
        </div>
      </div>

      {/* Integration Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-gray-900">Instant Automation</h3>
          </div>
          <p className="text-sm text-gray-600">
            Connect once and let your AI agents automatically access and manage your data across platforms.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-gray-900">Secure & Private</h3>
          </div>
          <p className="text-sm text-gray-600">
            All connections use industry-standard OAuth 2.0 with encrypted token storage in Supabase Vault.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-gray-900">Always Synced</h3>
          </div>
          <p className="text-sm text-gray-600">
            Real-time synchronization ensures your agents always have access to the latest data.
          </p>
        </div>
      </div>

      {/* Integration Hub */}
      <Suspense fallback={<IntegrationHubSkeleton />}>
        <IntegrationHub />
      </Suspense>

      {/* Help Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Setting Up Integrations</h4>
            <p className="text-sm text-gray-600 mb-3">
              Most integrations use OAuth 2.0 for secure, one-click setup. Simply click "Connect" and authorize CrewFlow to access your account.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• No need to manually enter API keys</li>
              <li>• Permissions are clearly defined</li>
              <li>• You can revoke access anytime</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Troubleshooting</h4>
            <p className="text-sm text-gray-600 mb-3">
              If you encounter issues connecting an integration:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your account permissions</li>
              <li>• Ensure pop-ups are enabled</li>
              <li>• Try disconnecting and reconnecting</li>
              <li>• Contact support if issues persist</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton for the integration hub
function IntegrationHubSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="flex space-x-2 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded-full w-20"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
