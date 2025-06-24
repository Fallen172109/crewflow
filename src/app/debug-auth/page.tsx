'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugAuthPage() {
  const [authState, setAuthState] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        setAuthState({
          session: session ? {
            access_token: session.access_token ? 'Present' : 'Missing',
            refresh_token: session.refresh_token ? 'Present' : 'Missing',
            expires_at: session.expires_at,
            user_id: session.user?.id,
            user_email: session.user?.email
          } : null,
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          } : null,
          sessionError: sessionError?.message,
          userError: userError?.message
        })

        // If we have a user, try to get their profile
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          setUserProfile({
            profile,
            profileError: profileError?.message
          })
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setAuthState({ error: error.message })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="p-8">Loading auth state...</div>
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Auth State:</h2>
          <pre className="text-sm bg-slate-700 p-3 rounded overflow-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">User Profile:</h2>
          <pre className="text-sm bg-slate-700 p-3 rounded overflow-auto">
            {JSON.stringify(userProfile, null, 2)}
          </pre>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test API Call:</h2>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/admin/users')
                const data = await response.json()
                console.log('API Response:', response.status, data)
                alert(`API Response: ${response.status} - ${JSON.stringify(data)}`)
              } catch (error) {
                console.error('API Error:', error)
                alert(`API Error: ${error.message}`)
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Test Admin API
          </button>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Actions:</h2>
          <div className="space-x-2">
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.href = '/admin'}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded"
            >
              Go to Admin
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.reload()
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
