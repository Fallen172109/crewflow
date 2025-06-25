'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, AlertCircle, User, Mail, Calendar, Hash } from 'lucide-react'

interface FacebookUserData {
  id: string
  name: string
  email?: string
}

interface FacebookPermission {
  permission: string
  status: string
}

interface TokenInfo {
  app_id: string
  is_valid: boolean
  expires_at: string
  scopes: string[]
}

export default function TestFacebookIntegration() {
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<FacebookUserData | null>(null)
  const [permissions, setPermissions] = useState<FacebookPermission[]>([])
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Your Facebook access token (in production, this would come from secure storage)
  const ACCESS_TOKEN = 'EAAPTtXPuiZB8BOybGicnuenwEaZA0XKZBAsuWGBNWERXh4gSWP49qtUqvijUAcaqZBs3gsvpKKgAGXwk6F0Dg6dGZBOWLgMZB8ucrKexY8upAIodvnp8Q1JJv1hmexxkEXVzVXZAsfzG4vpCDDmUcWZB5W64zxJZBsFuAH04nEdV8K8RMtuBGPBB7EZAZBcuGxrQqppE1bEhPZB6ZBvAnnQjwkZAGMTDLGDhjUt8ZB7DwrIN5ZCZAOq8vPFuJorFkPO7eIFJJzRX1bZAXjKi7NtSDm'

  const testFacebookConnection = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const FACEBOOK_API_BASE = 'https://graph.facebook.com/v19.0'
      
      // Test 1: Get user info
      const userResponse = await fetch(`${FACEBOOK_API_BASE}/me?fields=id,name,email&access_token=${ACCESS_TOKEN}`)
      if (!userResponse.ok) {
        throw new Error('Failed to get user info')
      }
      const userData = await userResponse.json()
      setUserData(userData)
      
      // Test 2: Get permissions
      const permissionsResponse = await fetch(`${FACEBOOK_API_BASE}/me/permissions?access_token=${ACCESS_TOKEN}`)
      if (!permissionsResponse.ok) {
        throw new Error('Failed to get permissions')
      }
      const permissionsData = await permissionsResponse.json()
      setPermissions(permissionsData.data)
      
      // Test 3: Get token info
      const debugResponse = await fetch(`${FACEBOOK_API_BASE}/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`)
      if (!debugResponse.ok) {
        throw new Error('Failed to debug token')
      }
      const debugData = await debugResponse.json()
      setTokenInfo(debugData.data)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            🚀 CrewFlow Facebook Integration Test
          </h1>
          <p className="text-lg text-gray-600">
            Testing Facebook API connection with basic permissions
          </p>
        </div>

        {/* Test Button */}
        <div className="text-center">
          <Button 
            onClick={testFacebookConnection}
            disabled={loading}
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3"
          >
            {loading ? 'Testing Connection...' : '🧪 Test Facebook Connection'}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Connection Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {userData && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  User Information
                </CardTitle>
                <CardDescription>Basic profile data from Facebook</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">ID:</span>
                  <span className="text-gray-600">{userData.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Name:</span>
                  <span className="text-gray-600">{userData.name}</span>
                </div>
                {userData.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Email:</span>
                    <span className="text-gray-600">{userData.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Current Permissions
                </CardTitle>
                <CardDescription>Granted Facebook permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {permissions.map((perm, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{perm.permission}</span>
                      <Badge 
                        variant={perm.status === 'granted' ? 'default' : 'secondary'}
                        className={perm.status === 'granted' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {perm.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Token Info */}
        {tokenInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Access Token Information
              </CardTitle>
              <CardDescription>Token validation and expiry details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="font-medium">App ID:</span>
                  <p className="text-gray-600">{tokenInfo.app_id}</p>
                </div>
                <div>
                  <span className="font-medium">Valid:</span>
                  <p className="text-gray-600">
                    {tokenInfo.is_valid ? '✅ Yes' : '❌ No'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Expires:</span>
                  <p className="text-gray-600">
                    {new Date(tokenInfo.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Scopes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tokenInfo.scopes.map((scope, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {userData && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">🚀 Next Steps for Full Page Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-blue-700">✅ Basic Facebook connection is working!</p>
                <p className="text-blue-700">✅ User authentication successful</p>
                <p className="text-red-700">❌ Page management requires additional permissions</p>
              </div>
              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-blue-800">🔑 Required Permissions for Page Management:</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <code className="bg-gray-100 px-2 py-1 rounded">pages_show_list</code>
                    <span className="text-gray-600">- View user's pages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <code className="bg-gray-100 px-2 py-1 rounded">manage_pages</code>
                    <span className="text-gray-600">- Manage page settings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <code className="bg-gray-100 px-2 py-1 rounded">pages_manage_posts</code>
                    <span className="text-gray-600">- Create/edit posts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <code className="bg-gray-100 px-2 py-1 rounded">pages_read_engagement</code>
                    <span className="text-gray-600">- Read comments/reactions</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-blue-800">📋 Implementation Steps:</h4>
                <div className="space-y-2 text-sm text-blue-600">
                  <p>1. 🔧 <strong>Update Facebook App:</strong> Add advanced permissions in Facebook Developer Console</p>
                  <p>2. 📝 <strong>App Review:</strong> Submit Facebook app for review (required for page permissions)</p>
                  <p>3. 🔄 <strong>Update CrewFlow:</strong> Modify OAuth scopes in integration config</p>
                  <p>4. 👥 <strong>User Consent:</strong> Each user must grant permissions to their own pages</p>
                  <p>5. 🤖 <strong>AI Integration:</strong> Connect with CrewFlow AI agents for automation</p>
                </div>
              </div>

              <Separator />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</h4>
                <div className="space-y-1 text-sm text-yellow-700">
                  <p>• Facebook requires app review for advanced permissions (2-4 weeks)</p>
                  <p>• Users can only grant access to pages they admin</p>
                  <p>• Each user needs to connect their own Facebook account</p>
                  <p>• Current setup works for testing with your own pages only</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
