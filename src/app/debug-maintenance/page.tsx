'use client'

import { useState, useEffect } from 'react'

export default function DebugMaintenancePage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/maintenance-status')
        const data = await response.json()
        setStatus(data)
      } catch (error) {
        setStatus({ error: error.message })
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Maintenance Mode Debug</h1>
      
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">API Response:</h2>
        <pre className="text-sm bg-slate-700 p-3 rounded overflow-auto">
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>

      <div className="mt-6 bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Expected Behavior:</h2>
        <ul className="text-sm space-y-1">
          <li>• If maintenanceMode: true → Should show maintenance page</li>
          <li>• If maintenanceMode: false → Should show normal site</li>
          <li>• Environment variable MAINTENANCE_MODE should be "true"</li>
        </ul>
      </div>

      <div className="mt-6">
        <button 
          onClick={() => window.location.reload()}
          className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded"
        >
          Refresh Status
        </button>
      </div>
    </div>
  )
}
