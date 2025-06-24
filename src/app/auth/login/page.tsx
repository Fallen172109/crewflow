'use client'

import { useState, useEffect } from 'react'
import { useAuth, useRedirectIfAuthenticated } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debug: Log error state changes
  useEffect(() => {
    console.log('Error state changed to:', error)
  }, [error])
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect if already authenticated
  useRedirectIfAuthenticated()

  // Check for errors from URL params
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous states
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields')
      setIsSubmitting(false)
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      setIsSubmitting(false)
      return
    }

    try {
      const { error } = await signIn(email, password)

      if (error) {
        // Debug: Log the actual error message to console
        console.log('Login error:', error.message, error)

        // Provide user-friendly error messages based on specific error types
        let errorMessage = 'Invalid email or password. Please check your credentials and try again.'

        if (error.message.toLowerCase().includes('email') && error.message.toLowerCase().includes('confirm')) {
          errorMessage = '⚠️ Your email address has not been confirmed yet. Please check your email inbox (and spam folder) for the confirmation link. If you need a new confirmation email, please sign up again with the same email address.'
        } else if (error.message.toLowerCase().includes('too many')) {
          errorMessage = 'Too many login attempts. Please wait a moment before trying again.'
        } else if (error.message.toLowerCase().includes('signup') && error.message.toLowerCase().includes('disabled')) {
          errorMessage = 'Account registration is currently disabled. Please contact support.'
        } else if (error.message.toLowerCase().includes('email') && error.message.toLowerCase().includes('invalid')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (error.message.toLowerCase().includes('invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        }

        // Log the error for debugging
        console.log('Processed login error:', error.message)
        console.log('Setting error state to:', errorMessage)

        // Set error immediately
        setError(errorMessage)
        setIsSubmitting(false)
      } else {
        // Show success message with manual navigation option
        setSuccess('🎉 Welcome back! You can now access your dashboard.')
        setIsSubmitting(false)
        // NO AUTOMATIC REDIRECT - User will manually navigate
      }
    } catch (err) {
      console.log('Unexpected error during login:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-ocean-wave opacity-5"></div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">CrewFlow</h1>
          </div>
          <p className="text-gray-600">Navigate your business with AI automation</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Welcome Back</h2>

          {/* Processing indicator */}
          {isSubmitting && !error && !success && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-primary-700 text-sm font-medium">Signing you in...</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 text-sm font-medium mb-3">{success}</p>
              <button
                onClick={() => {
                  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
                  router.push(redirectTo)
                }}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>Go to Dashboard</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}



          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="captain@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary-500 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600">
                  Remember me
                </label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Set Sail</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              New to CrewFlow?{' '}
              <Link href="/auth/signup" className="text-primary-500 hover:text-primary-600 font-medium">
                Join the crew
              </Link>
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm mb-4">Trusted by maritime businesses worldwide</p>
          <div className="flex justify-center space-x-6 text-gray-500">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">10 AI Agents</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Smart Automation</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">Enterprise Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
