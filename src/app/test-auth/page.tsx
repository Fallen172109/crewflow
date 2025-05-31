'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function TestAuthPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<any>({})

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        setUserProfile(profile)

        // Test database functions
        const { data: usageTest, error: usageError } = await supabase
          .rpc('increment_agent_usage', {
            p_user_id: user.id,
            p_agent_name: 'coral'
          })

        setTestResults({
          userAuth: !userError,
          userProfile: !profileError,
          usageFunction: !usageError,
          usageCount: usageTest
        })
      }
    } catch (error) {
      console.error('Test error:', error)
    } finally {
      setLoading(false)
    }
  }

  const testSignup = async () => {
    const testEmail = `test-${Date.now()}@example.com`
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123'
    })
    
    alert(error ? `Error: ${error.message}` : `Signup successful! Check email: ${testEmail}`)
  }

  const testSignout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setTestResults({})
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <div className="text-white">Loading authentication test...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🧪 CrewFlow Authentication Test</h1>
        
        {/* User Status */}
        <div className="bg-secondary-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Authentication Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-secondary-300">User Authenticated:</p>
              <p className={`font-bold ${user ? 'text-green-400' : 'text-red-400'}`}>
                {user ? '✅ Yes' : '❌ No'}
              </p>
            </div>
            <div>
              <p className="text-secondary-300">User Email:</p>
              <p className="text-white">{user?.email || 'Not logged in'}</p>
            </div>
          </div>
        </div>

        {/* User Profile */}
        {user && (
          <div className="bg-secondary-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">User Profile</h2>
            <div className="bg-secondary-700 rounded p-4">
              <pre className="text-secondary-300 text-sm overflow-auto">
                {JSON.stringify(userProfile, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Test Results */}
        <div className="bg-secondary-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Database Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-secondary-300">User Auth:</p>
              <p className={`font-bold ${testResults.userAuth ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.userAuth ? '✅ Working' : '❌ Failed'}
              </p>
            </div>
            <div>
              <p className="text-secondary-300">User Profile:</p>
              <p className={`font-bold ${testResults.userProfile ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.userProfile ? '✅ Working' : '❌ Failed'}
              </p>
            </div>
            <div>
              <p className="text-secondary-300">Usage Function:</p>
              <p className={`font-bold ${testResults.usageFunction ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.usageFunction ? '✅ Working' : '❌ Failed'}
              </p>
            </div>
          </div>
          {testResults.usageCount && (
            <div className="mt-4">
              <p className="text-secondary-300">Usage Count: <span className="text-white">{testResults.usageCount}</span></p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-secondary-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Test Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testSignup}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Test Signup
            </button>
            
            {user ? (
              <button
                onClick={testSignout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <a
                href="/auth/login"
                className="bg-maritime-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Login
              </a>
            )}
            
            <a
              href="/dashboard"
              className="bg-maritime-teal hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Go to Dashboard
            </a>
            
            <button
              onClick={checkUser}
              className="bg-secondary-600 hover:bg-secondary-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Tests
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-secondary-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">Setup Instructions</h2>
          <div className="text-secondary-300 space-y-2">
            <p>1. ✅ Update .env.local with your Supabase credentials</p>
            <p>2. ✅ Execute database/schema.sql in Supabase SQL Editor</p>
            <p>3. ✅ Configure authentication settings in Supabase Dashboard</p>
            <p>4. 🧪 Test signup/login flow</p>
            <p>5. 🧪 Verify user profile creation</p>
            <p>6. 🧪 Test agent usage tracking</p>
          </div>
        </div>
      </div>
    </div>
  )
}
