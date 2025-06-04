'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function CompleteAuthTestPage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('testpassword123')
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setTestResults(prev => [...prev, `[${timestamp}] ${type.toUpperCase()}: ${message}`])
  }

  const runCompleteTest = async () => {
    setIsRunning(true)
    setTestResults([])
    
    addResult('Starting comprehensive authentication test...')

    try {
      // Test 1: Check Supabase connection
      addResult('Testing Supabase connection...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        addResult(`Session check failed: ${sessionError.message}`, 'error')
      } else {
        addResult('Supabase connection successful', 'success')
        addResult(`Current session: ${session ? session.user.email : 'None'}`)
      }

      // Test 2: Test signup
      addResult('Testing signup...')
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signupError) {
        if (signupError.message.includes('already registered')) {
          addResult('User already exists (this is expected)', 'info')
        } else {
          addResult(`Signup failed: ${signupError.message}`, 'error')
        }
      } else {
        addResult('Signup successful', 'success')
        addResult(`User created: ${signupData.user?.email}`)
        addResult(`Session created: ${signupData.session ? 'Yes' : 'No'}`)
        addResult(`Email confirmed: ${signupData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
      }

      // Test 3: Test signin
      addResult('Testing signin...')
      const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signinError) {
        addResult(`Signin failed: ${signinError.message}`, 'error')
      } else {
        addResult('Signin successful', 'success')
        addResult(`User: ${signinData.user?.email}`)
        addResult(`Session: ${signinData.session ? 'Active' : 'None'}`)
        addResult(`Email confirmed: ${signinData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
      }

      // Test 4: Test database access
      addResult('Testing database access...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      if (userError) {
        addResult(`Database access failed: ${userError.message}`, 'error')
      } else {
        addResult('Database access successful', 'success')
        addResult(`Users table accessible: ${userData ? 'Yes' : 'No'}`)
      }

      // Test 5: Test auth state
      addResult('Testing auth state...')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        addResult(`Current user: ${user.email}`, 'success')
        addResult(`User ID: ${user.id}`)
        addResult(`Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
        addResult(`Created at: ${user.created_at}`)
      } else {
        addResult('No current user', 'info')
      }

      // Test 6: Test signout
      addResult('Testing signout...')
      const { error: signoutError } = await supabase.auth.signOut()
      
      if (signoutError) {
        addResult(`Signout failed: ${signoutError.message}`, 'error')
      } else {
        addResult('Signout successful', 'success')
      }

      addResult('All tests completed!', 'success')

    } catch (error) {
      addResult(`Unexpected error: ${error}`, 'error')
    } finally {
      setIsRunning(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-orange-500">
          🧪 Complete Authentication Test
        </h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Test Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Test Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Test Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                disabled={isRunning}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={runCompleteTest}
                disabled={isRunning}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-6 py-2 rounded transition-colors"
              >
                {isRunning ? 'Running Tests...' : 'Run Complete Test'}
              </button>
              
              <button
                onClick={clearResults}
                disabled={isRunning}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 px-4 py-2 rounded transition-colors"
              >
                Clear Results
              </button>
            </div>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-orange-400">Test Results</h2>
            <div className="space-y-1 font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    result.includes('SUCCESS') 
                      ? 'bg-green-900/30 text-green-300'
                      : result.includes('ERROR')
                      ? 'bg-red-900/30 text-red-300'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-400">
          <p>This test will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Check Supabase connection</li>
            <li>Test user signup</li>
            <li>Test user signin</li>
            <li>Test database access</li>
            <li>Check current auth state</li>
            <li>Test signout</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
