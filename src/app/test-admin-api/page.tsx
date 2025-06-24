'use client'

import { useState } from 'react'

export default function TestAdminAPIPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAPI = async (endpoint: string, method: string = 'GET', body?: any) => {
    setLoading(true)
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      }
      
      if (body) {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(endpoint, options)
      const data = await response.json()
      
      setResult({
        endpoint,
        method,
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        endpoint,
        method,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Admin API Test</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={() => testAPI('/api/admin/users')}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
        >
          Test GET /api/admin/users
        </button>
        
        <button
          onClick={() => testAPI('/api/admin/stats')}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
        >
          Test GET /api/admin/stats
        </button>
        
        <button
          onClick={() => testAPI('/api/admin/audit-logs')}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
        >
          Test GET /api/admin/audit-logs
        </button>
      </div>

      {loading && (
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2">Testing API...</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">API Test Result:</h2>
          <pre className="text-sm bg-slate-700 p-3 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ol className="text-sm space-y-1">
          <li>1. Make sure you're logged in as an admin user</li>
          <li>2. Click the test buttons above to check API responses</li>
          <li>3. If you get 401 errors, try signing out and signing back in</li>
          <li>4. Check the browser's Network tab for detailed error information</li>
        </ol>
      </div>
    </div>
  )
}
