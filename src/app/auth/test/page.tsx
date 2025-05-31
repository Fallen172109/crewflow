'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

export default function AuthTestPage() {
  const { user, session, userProfile, loading, signOut } = useAuth()
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const runTests = () => {
    const results = {
      userExists: !!user,
      userEmail: user?.email || 'No email',
      userEmailConfirmed: user?.email_confirmed_at ? 'Yes' : 'No',
      sessionExists: !!session,
      sessionValid: session?.expires_at ? new Date(session.expires_at * 1000) > new Date() : false,
      profileExists: !!userProfile,
      profileTier: userProfile?.subscription_tier || 'No tier',
      timestamp: new Date().toISOString()
    }
    setTestResults(results)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <div className="text-white">Loading authentication test...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-6">Authentication Test Page</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* User Info */}
            <div className="bg-white/5 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4">User Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-300">Authenticated:</span>
                  <span className={user ? 'text-green-400' : 'text-red-400'}>
                    {user ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-300">Email:</span>
                  <span className="text-white">{user?.email || 'Not logged in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-300">Email Confirmed:</span>
                  <span className={user?.email_confirmed_at ? 'text-green-400' : 'text-yellow-400'}>
                    {user?.email_confirmed_at ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-300">User ID:</span>
                  <span className="text-white text-xs">{user?.id || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-white/5 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Session Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-300">Session Active:</span>
                  <span className={session ? 'text-green-400' : 'text-red-400'}>
                    {session ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-300">Access Token:</span>
                  <span className="text-white text-xs">
                    {session?.access_token ? `${session.access_token.substring(0, 20)}...` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-300">Expires At:</span>
                  <span className="text-white text-xs">
                    {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="bg-white/5 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-300">Profile Loaded:</span>
                  <span className={userProfile ? 'text-green-400' : 'text-red-400'}>
                    {userProfile ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-300">Subscription Tier:</span>
                  <span className="text-white">{userProfile?.subscription_tier || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-300">Subscription Status:</span>
                  <span className="text-white">{userProfile?.subscription_status || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-white/5 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
              <button
                onClick={runTests}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg mb-4 transition-colors"
              >
                Run Tests
              </button>
              {Object.keys(testResults).length > 0 && (
                <div className="space-y-1 text-xs">
                  {Object.entries(testResults).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-secondary-300">{key}:</span>
                      <span className="text-white">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/login"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Login
            </Link>
            <Link
              href="/auth/signup"
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Signup
            </Link>
            {user && (
              <button
                onClick={signOut}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            )}
            <Link
              href="/dashboard"
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>

          {/* Raw Data */}
          <div className="mt-8 bg-black/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Raw Auth Data</h3>
            <pre className="text-xs text-secondary-300 overflow-auto">
              {JSON.stringify({ user, session, userProfile }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
