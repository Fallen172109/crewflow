'use client'

import { useState } from 'react'
import { Ship, ArrowRight, Shield, Zap, CheckCircle, Store } from 'lucide-react'
import ShopifyStoreHelp from '@/components/shopify/ShopifyStoreHelp'

export default function ShopifyInstallPage() {
  const [storeName, setStoreName] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstall = () => {
    if (!storeName.trim()) {
      return
    }

    setIsInstalling(true)
    
    // Auto-add .myshopify.com if not present
    let domain = storeName.trim()
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`
    }
    
    // Clean the domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    
    // Redirect to OAuth flow
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(cleanDomain)}`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInstall()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center">
              <Ship className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-900">CrewFlow</h1>
              <p className="text-orange-600 font-medium">Maritime AI Automation</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Install CrewFlow for Shopify
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your e-commerce operations with AI-powered maritime crew members. 
            Automate inventory, orders, customer service, and analytics.
          </p>
        </div>

        {/* Installation Form */}
        <div className="max-w-md mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <Store className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Store</h3>
              <p className="text-gray-600 text-sm">Enter your Shopify store name to get started</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="your-store-name"
                  className="w-full px-4 py-4 pr-32 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                  disabled={isInstalling}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
                  .myshopify.com
                </div>
              </div>

              <button
                onClick={handleInstall}
                disabled={isInstalling || !storeName.trim()}
                className="w-full bg-orange-600 text-white py-4 px-6 rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-lg font-medium"
              >
                {isInstalling ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Installing...</span>
                  </>
                ) : (
                  <>
                    <span>Install CrewFlow</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-4 space-y-2">
              <p className="text-xs text-gray-500">
                You'll be redirected to Shopify to authorize the installation
              </p>
              <ShopifyStoreHelp />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Automation</h3>
            <p className="text-gray-600">
              Intelligent agents handle inventory, orders, and customer service automatically
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
            <p className="text-gray-600">
              Enterprise-grade security with OAuth 2.0 and encrypted data handling
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Setup</h3>
            <p className="text-gray-600">
              One-click installation with automatic configuration and onboarding
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by maritime merchants worldwide</p>
          <div className="flex items-center justify-center space-x-6 text-gray-400">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">GDPR Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
