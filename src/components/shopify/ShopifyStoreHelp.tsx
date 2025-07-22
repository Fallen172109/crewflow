'use client'

import { useState } from 'react'
import { HelpCircle, ExternalLink, Copy, CheckCircle, X, Store, Globe } from 'lucide-react'

export default function ShopifyStoreHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedText, setCopiedText] = useState('')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(''), 2000)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <HelpCircle className="w-4 h-4" />
        <span>How do I find my store URL?</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Find Your Shopify Store URL</h2>
              <p className="text-sm text-gray-600">Multiple ways to locate your store domain</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Method 1: From Shopify Admin */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Method 1: From Your Shopify Admin</span>
            </h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">Log into your Shopify admin panel</p>
                  <a 
                    href="https://admin.shopify.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline inline-flex items-center space-x-1"
                  >
                    <span>admin.shopify.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">Look at your browser's address bar</p>
                  <p>You'll see something like: <code className="bg-white px-2 py-1 rounded">https://admin.shopify.com/store/your-store-name</code></p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">Your store domain is:</p>
                  <div className="bg-white p-2 rounded border mt-1">
                    <code className="text-green-600 font-mono">your-store-name.myshopify.com</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Method 2: From Store Settings */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-3">Method 2: From Store Settings</h3>
            <div className="space-y-3 text-sm text-green-800">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <p>Go to <strong>Settings</strong> → <strong>General</strong> in your Shopify admin</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <p>Look for the <strong>"myshopify.com address"</strong> field</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <p>Copy the full domain (e.g., <code className="bg-white px-1 rounded">your-store.myshopify.com</code>)</p>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Example Store URLs</h3>
            <div className="space-y-2">
              {[
                'my-awesome-store.myshopify.com',
                'fashion-boutique.myshopify.com',
                'tech-gadgets-2024.myshopify.com'
              ].map((example, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                  <code className="text-sm font-mono text-gray-700">{example}</code>
                  <button
                    onClick={() => copyToClipboard(example)}
                    className="text-gray-500 hover:text-gray-700 p-1"
                    title="Copy to clipboard"
                  >
                    {copiedText === example ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Common Issues */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-3">⚠️ Common Issues</h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600">•</span>
                <p><strong>Don't include "https://"</strong> - Just use <code>your-store.myshopify.com</code></p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600">•</span>
                <p><strong>Don't use your custom domain</strong> - Use the .myshopify.com address</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600">•</span>
                <p><strong>Make sure it ends with .myshopify.com</strong> - Not .shopify.com</p>
              </div>
            </div>
          </div>

          {/* Quick Test */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-3">🧪 Quick Test</h3>
            <p className="text-sm text-orange-800 mb-3">
              You can test if your store URL is correct by visiting it directly:
            </p>
            <div className="bg-white p-3 rounded border">
              <code className="text-sm">https://your-store-name.myshopify.com</code>
            </div>
            <p className="text-xs text-orange-700 mt-2">
              If it loads your store, the URL is correct!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Still having trouble? Contact our support team.
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
