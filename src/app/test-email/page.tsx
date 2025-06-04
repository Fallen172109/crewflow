'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const testEmailSending = async () => {
    if (!email) {
      setError('Please enter an email address')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setDebugInfo(null)

    try {
      console.log('🔍 Starting email test...')
      console.log('Email:', email)
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

      // Test signup to trigger confirmation email
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      console.log('📧 Signup response:', { data, error: signupError })

      setDebugInfo({
        timestamp: new Date().toISOString(),
        email,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        signupData: data,
        signupError: signupError,
        userCreated: !!data?.user,
        userId: data?.user?.id,
        emailConfirmed: data?.user?.email_confirmed_at,
        sessionCreated: !!data?.session
      })

      if (signupError) {
        console.error('❌ Signup error:', signupError)
        if (signupError.message.includes('already registered')) {
          setError('Email already registered. Try a different email or check if you received the confirmation email.')
        } else {
          setError(`Signup error: ${signupError.message}`)
        }
      } else {
        console.log('✅ Signup successful, user created:', data?.user?.id)
        setResult(`✅ Test email sent successfully to ${email}! Check your inbox (and spam folder) for the CrewFlow confirmation email.`)
      }
    } catch (err) {
      console.error('💥 Unexpected error:', err)
      setError(`Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testMagicLink = async () => {
    if (!email) {
      setError('Please enter an email address')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (magicLinkError) {
        setError(`Magic link error: ${magicLinkError.message}`)
      } else {
        setResult(`✅ Magic link sent successfully to ${email}! Check your inbox for the login link.`)
      }
    } catch (err) {
      setError(`Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testResendDirect = async () => {
    if (!email) {
      setError('Please enter an email address')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🔍 Testing Resend API directly...')

      const response = await fetch('/api/test-resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      console.log('📧 Direct Resend test response:', data)

      if (data.success) {
        setResult(`✅ Direct Resend API test successful! Email sent to ${email}. Email ID: ${data.emailId}`)
      } else {
        setError(`❌ Direct Resend API failed: ${data.error}. Details: ${JSON.stringify(data.details)}`)
      }
    } catch (err) {
      console.error('💥 Direct Resend test error:', err)
      setError(`Unexpected error testing Resend API: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-500 mb-4">
              📧 CrewFlow Email Test
            </h1>
            <p className="text-gray-300 text-lg">
              Test the email confirmation system to verify SMTP configuration
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Test Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={testEmailSending}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {loading ? '🔄 Sending...' : '📧 Test Signup Email'}
                </button>

                <button
                  onClick={testMagicLink}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {loading ? '🔄 Sending...' : '🔗 Test Magic Link'}
                </button>

                <button
                  onClick={testResendDirect}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {loading ? '🔄 Sending...' : '🚀 Test Resend Direct'}
                </button>
              </div>

              {result && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                  <p className="text-green-200">{result}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {debugInfo && (
                <div className="bg-gray-500/20 border border-gray-500/50 rounded-lg p-6">
                  <h3 className="text-gray-300 font-semibold mb-3">🔍 Debug Information:</h3>
                  <div className="text-gray-200 text-sm space-y-2">
                    <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
                    <div><strong>Email:</strong> {debugInfo.email}</div>
                    <div><strong>Supabase URL:</strong> {debugInfo.supabaseUrl}</div>
                    <div><strong>User Created:</strong> {debugInfo.userCreated ? '✅ Yes' : '❌ No'}</div>
                    <div><strong>User ID:</strong> {debugInfo.userId || 'None'}</div>
                    <div><strong>Email Confirmed:</strong> {debugInfo.emailConfirmed ? '✅ Yes' : '❌ No'}</div>
                    <div><strong>Session Created:</strong> {debugInfo.sessionCreated ? '✅ Yes' : '❌ No'}</div>
                    {debugInfo.signupError && (
                      <div><strong>Error:</strong> <span className="text-red-300">{debugInfo.signupError.message}</span></div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-blue-300 font-semibold mb-3">📋 What to Check:</h3>
                <ul className="text-blue-200 text-sm space-y-2 list-disc list-inside">
                  <li>Email arrives in inbox (check spam folder too)</li>
                  <li>Email has CrewFlow branding with orange/black theme</li>
                  <li>Subject line includes "🚢 Welcome to CrewFlow"</li>
                  <li>Confirmation button works and redirects properly</li>
                  <li>Email content is properly formatted (not plain text)</li>
                </ul>
              </div>

              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6">
                <h3 className="text-yellow-300 font-semibold mb-3">⚠️ If No Email Arrives:</h3>
                <ul className="text-yellow-200 text-sm space-y-2 list-disc list-inside">
                  <li>SMTP password might not be configured correctly</li>
                  <li>Gmail App Password might be invalid or expired</li>
                  <li>Check Supabase Auth logs for error messages</li>
                  <li>Verify 2-Factor Authentication is enabled on Gmail</li>
                  <li>Consider switching to Resend for better reliability</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href="/auth/signup"
              className="text-orange-400 hover:text-orange-300 underline"
            >
              ← Back to Signup Page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
