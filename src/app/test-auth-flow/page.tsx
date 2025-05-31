'use client'

import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function TestAuthFlowPage() {
  const { user, userProfile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-white">Loading authentication state...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🧪 Authentication Flow Test</h1>
        
        {/* Authentication Status */}
        <div className="bg-secondary-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Authentication Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-secondary-300">Status: </span>
              <span className={`font-semibold ${user ? 'text-green-400' : 'text-red-400'}`}>
                {user ? '✅ Authenticated' : '❌ Not Authenticated'}
              </span>
            </div>
            
            <div>
              <span className="text-secondary-300">User ID: </span>
              <span className="text-white font-mono text-sm">
                {user?.id || 'N/A'}
              </span>
            </div>
            
            <div>
              <span className="text-secondary-300">Email: </span>
              <span className="text-white">
                {user?.email || 'N/A'}
              </span>
            </div>
            
            <div>
              <span className="text-secondary-300">Email Verified: </span>
              <span className={`font-semibold ${user?.email_confirmed_at ? 'text-green-400' : 'text-yellow-400'}`}>
                {user?.email_confirmed_at ? '✅ Verified' : '⚠️ Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* User Profile */}
        {userProfile && (
          <div className="bg-secondary-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">User Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-secondary-300">Subscription Tier: </span>
                <span className="text-primary-400 font-semibold capitalize">
                  {userProfile.subscription_tier || 'None'}
                </span>
              </div>
              
              <div>
                <span className="text-secondary-300">Subscription Status: </span>
                <span className={`font-semibold capitalize ${
                  userProfile.subscription_status === 'active' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {userProfile.subscription_status || 'Inactive'}
                </span>
              </div>
              
              <div>
                <span className="text-secondary-300">Account Created: </span>
                <span className="text-white">
                  {new Date(userProfile.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div>
                <span className="text-secondary-300">Last Updated: </span>
                <span className="text-white">
                  {new Date(userProfile.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Test Actions */}
        <div className="bg-secondary-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!user ? (
              <>
                <Link
                  href="/auth/login"
                  className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
                >
                  🔑 Test Login
                </Link>
                
                <Link
                  href="/auth/signup"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
                >
                  📝 Test Signup
                </Link>
                
                <Link
                  href="/auth/forgot-password"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
                >
                  🔄 Test Password Reset
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
                >
                  🏠 Go to Dashboard
                </Link>
                
                <Link
                  href="/dashboard/settings"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
                >
                  ⚙️ Account Settings
                </Link>
                
                <button
                  onClick={signOut}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  🚪 Test Logout
                </button>
              </>
            )}
          </div>
        </div>

        {/* Protected Route Test */}
        <div className="bg-secondary-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Protected Route Test</h2>
          <p className="text-secondary-300 mb-4">
            Try accessing protected routes to test middleware protection:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/dashboard"
              className="bg-secondary-700 hover:bg-secondary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center border border-secondary-600"
            >
              🛡️ /dashboard (Protected)
            </Link>
            
            <Link
              href="/dashboard/settings"
              className="bg-secondary-700 hover:bg-secondary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center border border-secondary-600"
            >
              🛡️ /dashboard/settings (Protected)
            </Link>
          </div>
        </div>

        {/* Session Information */}
        {user && (
          <div className="bg-secondary-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Session Information</h2>
            
            <div className="bg-secondary-700 rounded p-4 overflow-auto">
              <pre className="text-secondary-300 text-sm">
                {JSON.stringify(
                  {
                    user: {
                      id: user.id,
                      email: user.email,
                      email_confirmed_at: user.email_confirmed_at,
                      created_at: user.created_at,
                      updated_at: user.updated_at,
                    },
                    profile: userProfile
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-primary-400 hover:text-primary-300 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
