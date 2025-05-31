'use client'

import { useEffect, useState } from 'react'
import { testSupabaseConnection, getSupabaseInfo } from '@/lib/test-supabase'
import { supabase } from '@/lib/supabase'

export default function TestSupabasePage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [supabaseInfo, setSupabaseInfo] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    setSupabaseInfo(getSupabaseInfo())

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const runTests = async () => {
    setIsLoading(true)
    setTestResults([])
    
    // Capture console logs
    const originalLog = console.log
    const originalError = console.error
    const logs: string[] = []
    
    console.log = (...args) => {
      logs.push(args.join(' '))
      originalLog(...args)
    }
    
    console.error = (...args) => {
      logs.push(`ERROR: ${args.join(' ')}`)
      originalError(...args)
    }
    
    try {
      await testSupabaseConnection()
    } catch (error) {
      logs.push(`UNEXPECTED ERROR: ${error}`)
    }
    
    // Restore console
    console.log = originalLog
    console.error = originalError
    
    setTestResults(logs)
    setIsLoading(false)
  }

  const signInWithEmail = async () => {
    if (!email) return

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/test-supabase`
      }
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Check your email for the login link!')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-orange-500">
          🚢 CrewFlow Supabase Connection Test
        </h1>

        {/* Authentication Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Authentication</h2>
          {user ? (
            <div className="space-y-4">
              <div className="text-green-400">
                ✅ Signed in as: {user.email}
              </div>
              <button
                onClick={signOut}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-yellow-400">
                ⚠️ Sign in to test database functions
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                />
                <button
                  onClick={signInWithEmail}
                  disabled={!email}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
                >
                  Send Magic Link
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Supabase Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Project Information</h2>
          {supabaseInfo && (
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-gray-400">URL:</span> {supabaseInfo.url}
              </div>
              <div>
                <span className="text-gray-400">Project ID:</span> {supabaseInfo.projectId}
              </div>
              <div>
                <span className="text-gray-400">Anon Key:</span> 
                <span className={supabaseInfo.hasAnonKey ? 'text-green-400' : 'text-red-400'}>
                  {supabaseInfo.hasAnonKey ? ' ✓ Configured' : ' ✗ Missing'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Service Key:</span> 
                <span className={supabaseInfo.hasServiceKey ? 'text-green-400' : 'text-red-400'}>
                  {supabaseInfo.hasServiceKey ? ' ✓ Configured' : ' ✗ Missing'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Test Button */}
        <button
          onClick={runTests}
          disabled={isLoading}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors mb-6"
        >
          {isLoading ? '🔄 Running Tests...' : '🧪 Run Connection Tests'}
        </button>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-orange-400">Test Results</h2>
            <div className="space-y-2 font-mono text-sm">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    result.includes('✅') 
                      ? 'bg-green-900/30 text-green-300'
                      : result.includes('❌') || result.includes('ERROR')
                      ? 'bg-red-900/30 text-red-300'
                      : result.includes('⚠️')
                      ? 'bg-yellow-900/30 text-yellow-300'
                      : result.includes('🎉')
                      ? 'bg-blue-900/30 text-blue-300'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">What This Tests</h2>
          <ul className="space-y-2 text-gray-300">
            <li>• Basic Supabase connection</li>
            <li>• Database table accessibility</li>
            <li>• Custom function availability</li>
            <li>• Environment variable configuration</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
