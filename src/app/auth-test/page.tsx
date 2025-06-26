'use client'

import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function AuthTestPage() {
  const { user, userProfile, loading, session } = useAuth()
  const [testResult, setTestResult] = useState<any>(null)

  const testAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      setTestResult({ session, error, timestamp: new Date().toISOString() })
    } catch (err) {
      setTestResult({ error: err, timestamp: new Date().toISOString() })
    }
  }

  const signInTest = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'legendofcause200@gmail.com',
        password: 'test123' // Replace with actual password
      })
      setTestResult({ signInData: data, signInError: error, timestamp: new Date().toISOString() })
    } catch (err) {
      setTestResult({ signInError: err, timestamp: new Date().toISOString() })
    }
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Authentication Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth Context State */}
          <div className="bg-secondary-800 rounded-lg p-6 border border-secondary-700">
            <h2 className="text-xl font-semibold text-white mb-4">Auth Context State</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-secondary-400">Loading: </span>
                <span className="text-white">{loading ? 'true' : 'false'}</span>
              </div>
              <div>
                <span className="text-secondary-400">User: </span>
                <span className="text-white">{user ? user.email : 'null'}</span>
              </div>
              <div>
                <span className="text-secondary-400">User ID: </span>
                <span className="text-white">{user?.id || 'null'}</span>
              </div>
              <div>
                <span className="text-secondary-400">Email Confirmed: </span>
                <span className="text-white">{user?.email_confirmed_at ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-secondary-400">Profile: </span>
                <span className="text-white">{userProfile ? 'Loaded' : 'null'}</span>
              </div>
              <div>
                <span className="text-secondary-400">Session: </span>
                <span className="text-white">{session ? 'Active' : 'null'}</span>
              </div>
            </div>
          </div>

          {/* Test Actions */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Actions</h2>
            <div className="space-y-4">
              <button
                onClick={testAuth}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Current Session
              </button>
              <button
                onClick={signInTest}
                className="w-full bg-maritime-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="mt-6 bg-secondary-800 rounded-lg p-6 border border-secondary-700">
            <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
            <pre className="text-sm text-secondary-300 overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Raw User Data */}
        <div className="mt-6 bg-secondary-800 rounded-lg p-6 border border-secondary-700">
          <h2 className="text-xl font-semibold text-white mb-4">Raw User Data</h2>
          <pre className="text-sm text-secondary-300 overflow-auto">
            {JSON.stringify({ user, userProfile, session }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
