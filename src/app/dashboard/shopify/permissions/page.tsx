'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface StorePermissions {
  id: string
  shopDomain: string
  storeName: string
  isActive: boolean
  connectedAt: string
  connectionStatus: string
  permissions: Record<string, boolean>
  agentAccess: Record<string, any>
  metadata: Record<string, any>
  userId?: string
  userEmail?: string
}

interface PermissionsData {
  success: boolean
  stores: StorePermissions[]
  requestedScopes: string[]
  isAdmin: boolean
  currentUser: {
    id: string
    email: string
  }
  summary: {
    totalStores: number
    activeStores: number
    connectedStores: number
  }
}

export default function ShopifyPermissionsPage() {
  const [data, setData] = useState<PermissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shopify/stores/permissions')
      const result = await response.json()
      
      if (result.success) {
        setData(result)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch permissions')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Error fetching permissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const getPermissionIcon = (granted: boolean) => {
    return granted ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading permissions...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center text-red-500">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span>Error: {error}</span>
            </div>
            <Button onClick={fetchPermissions} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {data?.isAdmin ? 'All Shopify Store Permissions (Admin View)' : 'My Shopify Store Permissions'}
          </h1>
          <p className="text-gray-600 mt-2">
            {data?.isAdmin
              ? 'View API permissions for all connected Shopify stores across CrewFlow'
              : 'View API permissions for your connected Shopify stores'
            }
          </p>
          {data?.isAdmin && (
            <div className="mt-2 flex items-center">
              <Badge variant="destructive" className="mr-2">ADMIN</Badge>
              <span className="text-sm text-gray-500">
                Viewing as: {data.currentUser.email}
              </span>
            </div>
          )}
        </div>
        <Button onClick={fetchPermissions} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{data.summary.totalStores}</div>
              <p className="text-sm text-gray-600">Total Stores</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{data.summary.activeStores}</div>
              <p className="text-sm text-gray-600">Active Stores</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{data.summary.connectedStores}</div>
              <p className="text-sm text-gray-600">Connected Stores</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stores */}
      {data?.stores.map((store) => (
        <Card key={store.id} className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{store.storeName}</CardTitle>
                <p className="text-gray-600">{store.shopDomain}</p>
                {data?.isAdmin && store.userEmail && (
                  <p className="text-sm text-blue-600 mt-1">
                    Owner: {store.userEmail}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(store.connectionStatus, store.isActive)}
                <Badge variant="outline">
                  Connected {new Date(store.connectedAt).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.requestedScopes.map((scope) => (
                <div key={scope} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{scope.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  {getPermissionIcon(store.permissions[scope] || false)}
                </div>
              ))}
            </div>
            
            {/* Agent Access */}
            {Object.keys(store.agentAccess).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Agent Access</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(store.agentAccess).map(([agentId, access]: [string, any]) => (
                    <Badge key={agentId} variant={access.enabled ? "default" : "secondary"}>
                      {agentId}: {access.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {data?.stores.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No Shopify stores connected yet.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/dashboard/shopify'}>
              Connect Your First Store
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
