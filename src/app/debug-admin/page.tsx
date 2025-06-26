'use client'

import { useAuth } from '@/lib/auth-context'
import { useAdmin } from '@/hooks/useAdmin'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function DebugAdminPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [dbTest, setDbTest] = useState<any>(null)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    testDatabase()
  }, [])

  const testDatabase = async () => {
    try {
      // Test basic database connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        setDbError(error.message)
      } else {
        setDbTest('Database connection successful')
      }
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Unknown database error')
    }
  }

  const promoteToAdmin = async () => {
    if (!user?.email) {
      alert('No user email found')
      return
    }

    try {
      const { data, error } = await supabase
        .rpc('promote_to_admin', { user_email: user.email })

      if (error) {
        alert(`Error promoting to admin: ${error.message}`)
      } else {
        alert('Successfully promoted to admin! Refreshing in 2 seconds...')
        // Give time for the alert to be seen, then refresh
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const forceRefresh = () => {
    // Clear any cached data and reload
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔍 Admin Debug Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Authentication Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔐 Authentication Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Auth Loading:</span>
                <span className={authLoading ? "text-yellow-600" : "text-green-600"}>
                  {authLoading ? "Loading..." : "Complete"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User Signed In:</span>
                <span className={user ? "text-green-600" : "text-red-600"}>
                  {user ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-300">User Email:</span>
                <span className="text-white">{user?.email || "Not available"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-300">User Profile:</span>
                <span className={userProfile ? "text-green-400" : "text-red-400"}>
                  {userProfile ? "Loaded" : "Not loaded"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-300">Profile Role:</span>
                <span className="text-white">{userProfile?.role || "Not available"}</span>
              </div>
            </div>
          </div>

          {/* Admin Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🛡️ Admin Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Admin Loading:</span>
                <span className={adminLoading ? "text-yellow-600" : "text-green-600"}>
                  {adminLoading ? "Loading..." : "Complete"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Is Admin:</span>
                <span className={isAdmin ? "text-green-600" : "text-red-600"}>
                  {isAdmin ? "Yes" : "No"}
                </span>
              </div>
              <div className="mt-4">
                {!isAdmin && user?.email && (
                  <button
                    onClick={promoteToAdmin}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    🚀 Promote to Admin
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🗄️ Database Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <span className={dbTest ? "text-green-600" : "text-red-600"}>
                  {dbTest || "Failed"}
                </span>
              </div>
              {dbError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{dbError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                🏠 Go to Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/admin/users'}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                👥 Try Admin Users Page
              </button>
              <button
                onClick={forceRefresh}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                🔄 Force Refresh
              </button>
              {isAdmin && (
                <button
                  onClick={() => window.location.href = '/dashboard/admin/users'}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  ✅ Access Admin Users (You're Admin!)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Raw Data */}
        <div className="mt-8 bg-secondary-800 rounded-xl border border-secondary-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Raw Data</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">User Object:</h3>
              <pre className="bg-secondary-900 p-4 rounded-lg text-secondary-300 text-sm overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">User Profile:</h3>
              <pre className="bg-secondary-900 p-4 rounded-lg text-secondary-300 text-sm overflow-auto">
                {JSON.stringify(userProfile, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
