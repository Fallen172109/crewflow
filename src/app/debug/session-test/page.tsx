'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'

export default function SessionTestPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [serverDebug, setServerDebug] = useState<any>(null)
  const { user, session } = useAuth()

  useEffect(() => {
    const runTests = async () => {
      try {
        // Client-side Supabase test
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { session: clientSession }, error: sessionError } = await supabase.auth.getSession()
        const { data: { user: clientUser }, error: userError } = await supabase.auth.getUser()

        // Get client-side cookies
        const cookies = document.cookie.split(';').map(cookie => {
          const [name, ...valueParts] = cookie.trim().split('=')
          return { name, value: valueParts.join('=') }
        })

        const supabaseCookies = cookies.filter(c => 
          c.name.includes('supabase') || 
          c.name.includes('sb-') ||
          c.name.includes('auth')
        )

        setDebugInfo({
          clientSide: {
            session: {
              exists: !!clientSession,
              hasUser: !!clientUser,
              userId: clientUser?.id,
              userEmail: clientUser?.email,
              expiresAt: clientSession?.expires_at,
              accessToken: clientSession?.access_token ? 'present' : 'missing',
              refreshToken: clientSession?.refresh_token ? 'present' : 'missing',
              sessionError: sessionError?.message,
              userError: userError?.message
            },
            cookies: {
              total: cookies.length,
              supabaseRelated: supabaseCookies.length,
              supabaseCookies: supabaseCookies.map(c => ({
                name: c.name,
                hasValue: !!c.value,
                valueLength: c.value?.length || 0
              })),
              allCookieNames: cookies.map(c => c.name)
            },
            authContext: {
              hasUser: !!user,
              hasSession: !!session,
              userId: user?.id,
              userEmail: user?.email
            }
          },
          domain: {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            port: window.location.port,
            origin: window.location.origin,
            isProduction: window.location.hostname === 'crewflow.ai',
            isWww: window.location.hostname.startsWith('www.')
          }
        })

        // Fetch server-side debug info
        const response = await fetch('/api/debug/session-cookies')
        if (response.ok) {
          const serverData = await response.json()
          setServerDebug(serverData)
        }

      } catch (error) {
        console.error('Debug test error:', error)
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    runTests()
  }, [user, session])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">🔍 Testing Supabase Session Cookies...</h1>
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Supabase Session Cookie Debug</h1>
        
        {/* Domain Info */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2 text-orange-400">🌐 Domain Information</h2>
          <pre className="text-sm overflow-x-auto">
            {JSON.stringify(debugInfo?.domain, null, 2)}
          </pre>
        </div>

        {/* Client-Side Debug */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2 text-orange-400">💻 Client-Side Debug</h2>
          <pre className="text-sm overflow-x-auto">
            {JSON.stringify(debugInfo?.clientSide, null, 2)}
          </pre>
        </div>

        {/* Server-Side Debug */}
        {serverDebug && (
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-orange-400">🖥️ Server-Side Debug</h2>
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(serverDebug, null, 2)}
            </pre>
          </div>
        )}

        {/* Status Summary */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-orange-400">📊 Status Summary</h2>
          <div className="space-y-2">
            <div className={`p-2 rounded ${debugInfo?.domain?.isProduction ? 'bg-green-900' : 'bg-yellow-900'}`}>
              <strong>Domain:</strong> {debugInfo?.domain?.isProduction ? '✅ Production (crewflow.ai)' : '⚠️ Not production'}
            </div>
            <div className={`p-2 rounded ${debugInfo?.clientSide?.session?.exists ? 'bg-green-900' : 'bg-red-900'}`}>
              <strong>Client Session:</strong> {debugInfo?.clientSide?.session?.exists ? '✅ Active' : '❌ Missing'}
            </div>
            <div className={`p-2 rounded ${serverDebug?.session?.exists ? 'bg-green-900' : 'bg-red-900'}`}>
              <strong>Server Session:</strong> {serverDebug?.session?.exists ? '✅ Active' : '❌ Missing'}
            </div>
            <div className={`p-2 rounded ${debugInfo?.clientSide?.cookies?.supabaseRelated > 0 ? 'bg-green-900' : 'bg-red-900'}`}>
              <strong>Supabase Cookies:</strong> {debugInfo?.clientSide?.cookies?.supabaseRelated || 0} found
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/dashboard" className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
