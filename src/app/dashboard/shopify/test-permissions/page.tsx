'use client'

import { useState, useEffect } from 'react'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

interface TestResult {
  name: string
  success: boolean
  allowed?: boolean
  reason?: string
  data?: any
  error?: string
}

export default function TestPermissionsPage() {
  const { stores, selectedStore } = useShopifyStore()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')

  useEffect(() => {
    if (selectedStore) {
      setSelectedStoreId(selectedStore.id)
    } else if (stores.length > 0) {
      setSelectedStoreId(stores[0].id)
    }
  }, [selectedStore, stores])

  const runTest = async (name: string, endpoint: string, body?: any) => {
    try {
      const response = await fetch(endpoint, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      })

      const data = await response.json()
      
      return {
        name,
        success: response.ok,
        allowed: data.allowed,
        reason: data.reason || data.error,
        data,
        error: response.ok ? undefined : data.error
      }
    } catch (error) {
      return {
        name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const runAllTests = async () => {
    if (!selectedStoreId) {
      alert('Please select a store first')
      return
    }

    setIsRunning(true)
    setTestResults([])

    const tests = [
      {
        name: 'Check read_products permission',
        endpoint: `/api/shopify/stores/${selectedStoreId}/test-permissions`,
        body: { action: 'check_permission', permission: 'read_products' }
      },
      {
        name: 'Check write_products permission',
        endpoint: `/api/shopify/stores/${selectedStoreId}/test-permissions`,
        body: { action: 'check_permission', permission: 'write_products' }
      },
      {
        name: 'Check Anchor agent access',
        endpoint: `/api/shopify/stores/${selectedStoreId}/test-permissions`,
        body: { action: 'check_permission', permission: 'read_inventory', agentId: 'anchor' }
      },
      {
        name: 'Check Pearl agent access',
        endpoint: `/api/shopify/stores/${selectedStoreId}/test-permissions`,
        body: { action: 'check_permission', permission: 'read_analytics', agentId: 'pearl' }
      },
      {
        name: 'Test actual products API',
        endpoint: `/api/shopify/stores/${selectedStoreId}/products`
      },
      {
        name: 'Test products API with Anchor agent',
        endpoint: `/api/shopify/stores/${selectedStoreId}/products?agentId=anchor`
      },
      {
        name: 'Test product creation (write)',
        endpoint: `/api/shopify/stores/${selectedStoreId}/products`,
        body: { 
          agentId: 'anchor',
          product: { 
            title: 'Test Product', 
            price: '99.99',
            inventory_quantity: 10 
          }
        }
      }
    ]

    const results: TestResult[] = []

    for (const test of tests) {
      const result = await runTest(test.name, test.endpoint, test.body)
      results.push(result)
      setTestResults([...results])
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    setIsRunning(false)
  }

  const getResultIcon = (result: TestResult) => {
    if (result.success && result.allowed !== false) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    } else if (result.success && result.allowed === false) {
      return <Shield className="w-5 h-5 text-yellow-600" />
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />
    }
  }

  const getResultColor = (result: TestResult) => {
    if (result.success && result.allowed !== false) {
      return 'border-green-200 bg-green-50'
    } else if (result.success && result.allowed === false) {
      return 'border-yellow-200 bg-yellow-50'
    } else {
      return 'border-red-200 bg-red-50'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Permissions Test</h1>
        <p className="text-gray-600">
          Test that store permissions and agent access controls are working correctly.
        </p>
      </div>

      {/* Store Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Store to Test</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select a store...</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.storeName} ({store.shopDomain})
              </option>
            ))}
          </select>
          <button
            onClick={runAllTests}
            disabled={!selectedStoreId || isRunning}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">How to Test</h3>
            <ol className="text-blue-800 space-y-1 text-sm">
              <li>1. Run the tests with default settings (should mostly pass)</li>
              <li>2. Open the store settings modal and disable some permissions</li>
              <li>3. Run the tests again to see permissions being denied</li>
              <li>4. Toggle agent access off and test agent-specific operations</li>
              <li>5. Set the store to inactive and verify all operations are blocked</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getResultColor(result)}`}
              >
                <div className="flex items-start space-x-3">
                  {getResultIcon(result)}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{result.name}</h3>
                    {result.success && result.allowed !== false && (
                      <p className="text-green-700 text-sm mt-1">
                        ✅ {result.data?.message || 'Test passed'}
                      </p>
                    )}
                    {result.success && result.allowed === false && (
                      <p className="text-yellow-700 text-sm mt-1">
                        🛡️ Permission denied: {result.reason}
                      </p>
                    )}
                    {!result.success && (
                      <p className="text-red-700 text-sm mt-1">
                        ❌ {result.error || result.reason || 'Test failed'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {testResults.filter(r => r.success).length} / {testResults.length} tests completed successfully
              </span>
              <span className="text-gray-600">
                {testResults.filter(r => r.allowed === false).length} permissions denied (expected behavior)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
