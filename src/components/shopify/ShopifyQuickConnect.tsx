'use client'

import { useState, useRef, useEffect } from 'react'
import { Ship, ArrowRight, ExternalLink } from 'lucide-react'
import ShopifyStoreHelp from './ShopifyStoreHelp'

export default function ShopifyQuickConnect() {
  const [showInput, setShowInput] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const validateDomain = (domain: string): boolean => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return cleanDomain.endsWith('.myshopify.com') && cleanDomain.length > '.myshopify.com'.length
  }

  const handleConnect = () => {
    // Check if we have a remembered store domain
    const rememberedStore = localStorage.getItem('crewflow_last_store')

    if (!showInput && rememberedStore && validateDomain(rememberedStore)) {
      // Direct connect with remembered store (only if valid)
      setIsConnecting(true)
      window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(rememberedStore)}`
      return
    }

    // Clear invalid remembered store
    if (rememberedStore && !validateDomain(rememberedStore)) {
      localStorage.removeItem('crewflow_last_store')
    }

    if (!showInput) {
      setShowInput(true)
      return
    }

    if (!storeName.trim()) {
      return
    }

    setIsConnecting(true)

    // Auto-add .myshopify.com if not present
    let domain = storeName.trim()
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`
    }

    // Clean the domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Validate domain before proceeding
    if (!validateDomain(cleanDomain)) {
      setIsConnecting(false)
      alert('Please enter a valid Shopify store domain (e.g., your-store.myshopify.com)')
      return
    }

    // Remember this store for next time
    localStorage.setItem('crewflow_last_store', cleanDomain)

    // Redirect to OAuth flow
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(cleanDomain)}`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect()
    }
    if (e.key === 'Escape') {
      setShowInput(false)
      setStoreName('')
    }
  }

  const handleBlur = () => {
    // Don't hide input if there's content
    if (!storeName.trim()) {
      setTimeout(() => setShowInput(false), 150) // Small delay to allow button clicks
    }
  }

  if (showInput) {
    return (
      <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg p-2 shadow-sm">
        <input
          ref={inputRef}
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          placeholder="your-store"
          className="flex-1 px-2 py-1 border-none outline-none text-sm min-w-32"
          disabled={isConnecting}
        />
        <span className="text-gray-500 text-sm">.myshopify.com</span>
        <button
          onClick={handleConnect}
          disabled={isConnecting || !storeName.trim()}
          className="bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center space-x-1"
        >
          {isConnecting ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <ArrowRight className="w-3 h-3" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex space-x-3">
        <button
          onClick={handleConnect}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 group"
        >
          <Ship className="w-5 h-5" />
          <span>Connect with Shopify</span>
          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => window.location.href = '/dashboard/shopify/connect'}
          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
        >
          <span>Advanced Setup</span>
        </button>
      </div>

      <div className="text-center">
        <ShopifyStoreHelp />
      </div>
    </div>
  )
}
