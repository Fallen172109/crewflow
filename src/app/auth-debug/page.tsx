'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export default function AuthDebugPage() {
  const { user, session, loading, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (log: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${log}`])
  }

  useEffect(() => {
    addLog(`Auth state - User: ${user?.email || 'None'}, Loading: ${loading}`)
  }, [user, loading])

  const testSignUp = async () => {
    if (!email || !password) {
      setMessage('Please enter email and password')
      return
    }

    addLog('Starting signup...')
    const result = await signUp(email, password)
    
    if (result.error) {
      addLog(`Signup error: ${result.error.message}`)
      setMessage(`Signup error: ${result.error.message}`)
    } else {
      addLog('Signup successful - check email for confirmation')
      setMessage('Signup successful! Check your email for confirmation.')
    }
  }

  const testSignIn = async () => {
    if (!email || !password) {
      setMessage('Please enter email and password')
      return
    }

    addLog('Starting signin...')
    const result = await signIn(email, password)
    
    if (result.error) {
      addLog(`Signin error: ${result.error.message}`)
      setMessage(`Signin error: ${result.error.message}`)
    } else {
      addLog('Signin successful')
      setMessage('Signin successful!')
    }
  }

  const testSignOut = async () => {
    addLog('Starting signout...')
    await signOut()
    addLog('Signout completed')
    setMessage('Signed out')
  }

  const testDirectSupabase = async () => {
    addLog('Testing direct Supabase connection...')
    
    try {
      const { data, error } = await supabase.auth.getSession()
      addLog(`Direct session check - User: ${data.session?.user?.email || 'None'}`)
      
      if (error) {
        addLog(`Direct session error: ${error.message}`)
      }
    } catch (err) {
      addLog(`Direct connection error: ${err}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-orange-500">
          🔧 CrewFlow Authentication Debug
        </h1>

        {/* Current State */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Current State</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>User: {user?.email || 'None'}</div>
            <div>User ID: {user?.id || 'None'}</div>
            <div>Email Confirmed: {user?.email_confirmed_at ? 'Yes' : 'No'}</div>
            <div>Session: {session ? 'Active' : 'None'}</div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Test Controls</h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={testSignUp}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
              >
                Test Signup
              </button>
              <button
                onClick={testSignIn}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                Test Signin
              </button>
              <button
                onClick={testSignOut}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
              >
                Test Signout
              </button>
              <button
                onClick={testDirectSupabase}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
              >
                Test Direct
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded">
              {message}
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Debug Logs</h2>
          <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-300">
                {log}
              </div>
            ))}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-4 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
          >
            Clear Logs
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex gap-4">
          <a href="/auth/login" className="text-orange-400 hover:text-orange-300">
            → Login Page
          </a>
          <a href="/auth/signup" className="text-orange-400 hover:text-orange-300">
            → Signup Page
          </a>
          <a href="/dashboard" className="text-orange-400 hover:text-orange-300">
            → Dashboard
          </a>
          <a href="/test-supabase" className="text-orange-400 hover:text-orange-300">
            → Supabase Test
          </a>
        </div>
      </div>
    </div>
  )
}
