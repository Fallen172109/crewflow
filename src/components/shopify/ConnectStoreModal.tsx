'use client'

import { useState } from 'react'
import { X, Ship, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'

interface ConnectStoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (storeDomain: string) => void
}

export default function ConnectStoreModal({ isOpen, onClose, onSuccess }: ConnectStoreModalProps) {
  const [storeDomain, setStoreDomain] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'connecting' | 'success'>('input')

  const validateDomain = (domain: string): boolean => {
    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, '')
    
    // Check if it ends with .myshopify.com
    if (!domain.endsWith('.myshopify.com')) {
      // If it doesn't, add it
      domain = domain + '.myshopify.com'
      setStoreDomain(domain)
    }
    
    // Validate format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.myshopify\.com$/
    return domainRegex.test(domain)
  }

  const handleConnect = async () => {
    setError('')
    
    if (!storeDomain.trim()) {
      setError('Please enter your store domain')
      return
    }

    if (!validateDomain(storeDomain)) {
      setError('Please enter a valid Shopify store domain (e.g., your-store.myshopify.com)')
      return
    }

    setIsConnecting(true)
    setStep('connecting')

    try {
      // Clean the domain
      const cleanDomain = storeDomain.replace(/^https?:\/\//, '')
      
      // Redirect to OAuth flow
      const oauthUrl = `/api/auth/shopify?shop=${encodeURIComponent(cleanDomain)}`
      window.location.href = oauthUrl
      
    } catch (error) {
      console.error('Connection error:', error)
      setError('Failed to initiate connection. Please try again.')
      setIsConnecting(false)
      setStep('input')
    }
  }

  const handleDomainChange = (value: string) => {
    setStoreDomain(value)
    setError('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleConnect()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Connect Shopify Store</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isConnecting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'input' && (
          <>
            {/* Instructions */}
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Enter your Shopify store domain to connect it to CrewFlow. Your AI maritime crew will be able to manage your store operations automatically.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">What happens next:</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• You'll be redirected to Shopify to authorize CrewFlow</li>
                      <li>• Your store data will be securely synced</li>
                      <li>• AI agents will be activated for your store</li>
                      <li>• You'll return to the CrewFlow dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Domain Input */}
            <div className="mb-6">
              <label htmlFor="storeDomain" className="block text-sm font-medium text-gray-700 mb-2">
                Store Domain
              </label>
              <div className="relative">
                <input
                  id="storeDomain"
                  type="text"
                  value={storeDomain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="your-store.myshopify.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={isConnecting}
                />
                {storeDomain && !storeDomain.includes('.myshopify.com') && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    .myshopify.com
                  </div>
                )}
              </div>
              {error && (
                <div className="mt-2 flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isConnecting}
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={isConnecting || !storeDomain.trim()}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Ship className="w-4 h-4" />
                <span>Connect Store</span>
              </button>
            </div>
          </>
        )}

        {step === 'connecting' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ship className="w-8 h-8 text-orange-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting to Shopify</h3>
            <p className="text-gray-600 mb-4">
              You'll be redirected to Shopify to authorize CrewFlow...
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Store Connected!</h3>
            <p className="text-gray-600 mb-6">
              Your Shopify store has been successfully connected to CrewFlow. Your AI maritime crew is now ready to manage your store operations.
            </p>
            <button
              onClick={onClose}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
            >
              Continue to Dashboard
            </button>
          </div>
        )}

        {/* Help Link */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Need help? Check our{' '}
            <a
              href="/help/shopify-connection"
              target="_blank"
              className="text-orange-600 hover:text-orange-700 inline-flex items-center space-x-1"
            >
              <span>connection guide</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
