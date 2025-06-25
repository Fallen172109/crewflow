'use client'

import { useAuth } from '@/lib/auth-context'
import { useAdmin } from '@/hooks/useAdmin'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestProfilePage() {
  const { user, userProfile, loading } = useAuth()
  const { isAdmin } = useAdmin()
  const [directDbQuery, setDirectDbQuery] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>({})

  useEffect(() => {
    if (user) {
      // Direct database query
      supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          setDirectDbQuery({ data, error: error?.message })
        })

      // Test access functions
      if (userProfile) {
        const tests = {
          hasAdminAccess: userProfile.role === 'admin',
          canAccessCoral: userProfile.subscription_tier === 'enterprise' || userProfile.subscription_tier === 'starter',
          canAccessAnchor: userProfile.subscription_tier === 'enterprise',
          isAdminFromHook: isAdmin
        }
        setTestResults(tests)
      }
    }
  }, [user, userProfile, isAdmin])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth Context */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Auth Context</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
              <div><strong>User ID:</strong> {user?.id || 'None'}</div>
              <div><strong>User Email:</strong> {user?.email || 'None'}</div>
              <div><strong>Profile Loaded:</strong> {userProfile ? 'Yes' : 'No'}</div>
              {userProfile && (
                <>
                  <div><strong>Profile Email:</strong> {userProfile.email}</div>
                  <div><strong>Profile Role:</strong> {userProfile.role}</div>
                  <div><strong>Profile Tier:</strong> {userProfile.subscription_tier}</div>
                  <div><strong>Profile Status:</strong> {userProfile.subscription_status}</div>
                </>
              )}
            </div>
          </div>

          {/* Direct DB Query */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Direct DB Query</h2>
            {directDbQuery ? (
              <div className="space-y-2 text-sm">
                {directDbQuery.error ? (
                  <div className="text-red-600">Error: {directDbQuery.error}</div>
                ) : directDbQuery.data ? (
                  <>
                    <div><strong>DB Email:</strong> {directDbQuery.data.email}</div>
                    <div><strong>DB Role:</strong> {directDbQuery.data.role}</div>
                    <div><strong>DB Tier:</strong> {directDbQuery.data.subscription_tier}</div>
                    <div><strong>DB Status:</strong> {directDbQuery.data.subscription_status}</div>
                    <div><strong>DB Suspended:</strong> {directDbQuery.data.suspended ? 'Yes' : 'No'}</div>
                  </>
                ) : (
                  <div>No data</div>
                )}
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </div>

          {/* Access Tests */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Access Tests</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Has Admin Access:</strong> {testResults.hasAdminAccess ? 'Yes' : 'No'}</div>
              <div><strong>Can Access Coral:</strong> {testResults.canAccessCoral ? 'Yes' : 'No'}</div>
              <div><strong>Can Access Anchor:</strong> {testResults.canAccessAnchor ? 'Yes' : 'No'}</div>
              <div><strong>Is Admin (Hook):</strong> {testResults.isAdminFromHook ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Raw Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Raw Data</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">User Profile:</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(userProfile, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-medium">DB Query Result:</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(directDbQuery, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/agents/coral'}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test Coral Agent
            </button>
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
