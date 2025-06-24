'use client'

// Production Configuration Dashboard
// Monitor and manage production deployment settings

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  Globe,
  Database,
  Activity,
  Lock,
  Eye,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface EnvironmentSettings {
  environment: string
  baseUrl: string
  redirectUris: { oauth: string; webhook: string }
  securityEnabled: boolean
  monitoringEnabled: boolean
}

interface ProviderStatus {
  id: string
  enabled: boolean
  configured: boolean
  rateLimits?: {
    requestsPerMinute: number
    requestsPerHour: number
  }
}

interface SecurityConfig {
  rateLimitingEnabled: boolean
  corsOrigins: string[]
  csrfEnabled: boolean
  encryptionConfigured: boolean
}

interface ProductionConfigProps {
  className?: string
}

export default function ProductionConfig({ className = '' }: ProductionConfigProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentSettings | null>(null)
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [security, setSecurity] = useState<SecurityConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showRedirectUris, setShowRedirectUris] = useState(false)
  const [redirectUris, setRedirectUris] = useState<Record<string, string>>({})
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    setRefreshing(true)
    try {
      const [configResponse, urisResponse] = await Promise.all([
        fetch('/api/integrations/config?action=validate'),
        fetch('/api/integrations/config?action=oauth_uris')
      ])

      if (configResponse.ok) {
        const configData = await configResponse.json()
        setValidation(configData.validation)
        setEnvironment(configData.environment)
        
        // Load provider details
        const providersResponse = await fetch('/api/integrations/config?action=providers')
        if (providersResponse.ok) {
          const providersData = await providersResponse.json()
          setProviders(providersData.providers)
        }

        // Load security details
        const securityResponse = await fetch('/api/integrations/config?action=security')
        if (securityResponse.ok) {
          const securityData = await securityResponse.json()
          setSecurity(securityData.security)
        }
      }

      if (urisResponse.ok) {
        const urisData = await urisResponse.json()
        setRedirectUris(urisData.redirectUris)
        setWebhookUrls(urisData.webhookUrls)
      }
    } catch (error) {
      console.error('Failed to load configuration:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'text-red-600 bg-red-100'
      case 'staging': return 'text-yellow-600 bg-yellow-100'
      case 'development': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getValidationIcon = (valid: boolean) => {
    return valid ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Production Configuration</h3>
            <p className="text-sm text-gray-600">
              Monitor deployment settings and OAuth provider configuration
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {environment && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEnvironmentColor(environment.environment)}`}>
                {environment.environment.toUpperCase()}
              </span>
            )}
            <button
              onClick={loadConfiguration}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Validation Status */}
        {validation && (
          <div className={`mb-6 p-4 rounded-lg border ${
            validation.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-3">
              {getValidationIcon(validation.valid)}
              <div className="flex-1">
                <h4 className={`font-medium ${validation.valid ? 'text-green-800' : 'text-red-800'}`}>
                  Configuration {validation.valid ? 'Valid' : 'Invalid'}
                </h4>
                
                {validation.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Environment */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Environment</p>
                <p className="text-lg font-bold text-blue-900">
                  {environment?.environment || 'Unknown'}
                </p>
              </div>
              <Globe className="w-6 h-6 text-blue-500" />
            </div>
          </div>

          {/* Security */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Security</p>
                <p className="text-lg font-bold text-green-900">
                  {security?.rateLimitingEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <Shield className="w-6 h-6 text-green-500" />
            </div>
          </div>

          {/* Providers */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Providers</p>
                <p className="text-lg font-bold text-purple-900">
                  {providers.filter(p => p.configured).length}/{providers.length}
                </p>
              </div>
              <Settings className="w-6 h-6 text-purple-500" />
            </div>
          </div>

          {/* Monitoring */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Monitoring</p>
                <p className="text-lg font-bold text-orange-900">
                  {environment?.monitoringEnabled ? 'Active' : 'Inactive'}
                </p>
              </div>
              <Activity className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>

        {/* OAuth Providers */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">OAuth Providers</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`p-3 rounded-lg border ${
                  provider.configured 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {provider.id.replace('-', ' ')}
                    </p>
                    <p className={`text-sm ${
                      provider.configured ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {provider.configured ? 'Configured' : 'Not configured'}
                    </p>
                  </div>
                  {provider.configured ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {provider.rateLimits && (
                  <div className="mt-2 text-xs text-gray-600">
                    {provider.rateLimits.requestsPerMinute}/min, {provider.rateLimits.requestsPerHour}/hour
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Redirect URIs */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">OAuth Configuration</h4>
            <button
              onClick={() => setShowRedirectUris(!showRedirectUris)}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <Eye className="w-4 h-4" />
              <span>{showRedirectUris ? 'Hide' : 'Show'} URIs</span>
            </button>
          </div>

          {showRedirectUris && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">OAuth Callback URI</p>
                    <p className="text-sm text-gray-600 font-mono">
                      {environment?.redirectUris.oauth}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(environment?.redirectUris.oauth || '')}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Webhook Base URL</p>
                    <p className="text-sm text-gray-600 font-mono">
                      {environment?.redirectUris.webhook}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(environment?.redirectUris.webhook || '')}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Settings */}
        {security && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Security Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rate Limiting</span>
                  <span className={`text-sm font-medium ${
                    security.rateLimitingEnabled ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {security.rateLimitingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CSRF Protection</span>
                  <span className={`text-sm font-medium ${
                    security.csrfEnabled ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {security.csrfEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Encryption</span>
                  <span className={`text-sm font-medium ${
                    security.encryptionConfigured ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {security.encryptionConfigured ? 'Configured' : 'Default'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CORS Origins</span>
                  <span className="text-sm font-medium text-gray-900">
                    {security.corsOrigins.length} configured
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
