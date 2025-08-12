'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminTestPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch('/api/debug/admin-check')
        const data = await response.json()
        setDebugInfo(data)
      } catch (error) {
        setDebugInfo({ error: 'Failed to check admin access' })
      } finally {
        setLoading(false)
      }
    }

    checkAdminAccess()
  }, [])

  const testAdminAPI = async () => {
    try {
      const response = await fetch('/api/shopify/stores/permissions')
      const data = await response.json()
      setDebugInfo(prev => ({ ...prev, permissionsTest: data }))
    } catch (error) {
      setDebugInfo(prev => ({ ...prev, permissionsTest: { error: 'Failed to test permissions API' } }))
    }
  }

  if (loading) {
    return <div className="p-6">Loading admin test...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Access Debug</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button onClick={testAdminAPI}>
          Test Permissions API
        </Button>
        
        <Button onClick={() => window.location.href = '/admin/shopify-permissions'}>
          Try Admin Route
        </Button>
        
        <Button onClick={() => window.location.href = '/dashboard/shopify/permissions'}>
          Try User Route
        </Button>
      </div>
    </div>
  )
}
