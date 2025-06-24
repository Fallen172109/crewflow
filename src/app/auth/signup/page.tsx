'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [justSignedUp, setJustSignedUp] = useState(false)
  const { signUp, loading, user } = useAuth()

  // NO AUTOMATIC REDIRECTS - Let users read the success message
  // Users will manually navigate using the "Go to Sign In" button

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword)
    setPasswordStrength(checkPasswordStrength(newPassword))
  }

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return { text: 'Weak', color: 'text-red-600' }
      case 2:
      case 3:
        return { text: 'Medium', color: 'text-yellow-600' }
      case 4:
      case 5:
        return { text: 'Strong', color: 'text-green-600' }
      default:
        return { text: '', color: '' }
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      setIsSubmitting(false)
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      setIsSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setIsSubmitting(false)
      return
    }

    if (passwordStrength < 2) {
      setError('Please choose a stronger password')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await signUp(email, password)

      if (result.error) {
        // Log the actual error message to help debug
        console.log('Signup error:', result.error.message)

        // Provide user-friendly error messages
        switch (result.error.message) {
          case 'User already registered':
            setError('An account with this email already exists. Please sign in instead.')
            break
          case 'Email rate limit exceeded':
            setError('Too many signup attempts. Please wait a moment before trying again.')
            break
          case 'Password should be at least 6 characters':
            setError('Password must be at least 6 characters long.')
            break
          case 'Invalid email':
            setError('Please enter a valid email address.')
            break
          case 'signup_disabled':
            setError('Account registration is currently disabled. Please contact support.')
            break
          case 'email_address_invalid':
            setError('Please enter a valid email address.')
            break
          case 'password_too_short':
            setError('Password must be at least 6 characters long.')
            break
          case 'weak_password':
            setError('Please choose a stronger password with uppercase, lowercase, numbers, and symbols.')
            break
          default:
            // Handle other common Supabase auth errors
            if (result.error.message.toLowerCase().includes('already') ||
                result.error.message.toLowerCase().includes('exists') ||
                result.error.message.toLowerCase().includes('registered')) {
              setError('An account with this email already exists. Please sign in instead.')
            } else if (result.error.message.toLowerCase().includes('email') &&
                       result.error.message.toLowerCase().includes('invalid')) {
              setError('Please enter a valid email address.')
            } else if (result.error.message.toLowerCase().includes('password')) {
              setError('There was an issue with your password. Please choose a stronger password.')
            } else if (result.error.message.toLowerCase().includes('rate limit')) {
              setError('Too many attempts. Please wait a moment before trying again.')
            } else {
              // Show the actual error message for debugging, but make it user-friendly
              console.error('Unhandled signup error:', result.error.message)
              setError(`Signup failed: ${result.error.message}`)
            }
        }
        setIsSubmitting(false)
      } else {
        // Success - Show confirmation screen immediately
        console.log('✅ Signup successful! Showing success screen...')
        console.log('Signup result:', result)

        // Show success screen immediately - NO REDIRECTS OR SIGN OUTS
        console.log('Setting success state to true - user should see confirmation screen')
        setJustSignedUp(true)
        setSuccess(true)
        setIsSubmitting(false)

        // Log to help debug any redirect issues
        console.log('Success screen should now be visible. No automatic redirects or sign outs.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (success) {
    console.log('🎉 Rendering success screen - this should be visible to the user')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-ocean-wave opacity-5"></div>

        <div className="relative w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">🎉 Welcome to CrewFlow!</h2>
            <p className="text-gray-600 mb-6 text-lg">
              We've sent a confirmation email to<br />
              <strong className="text-gray-900 text-xl">{email}</strong>
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <p className="text-green-700 text-lg font-medium">✅ Confirmation email sent!</p>
              <p className="text-green-600 text-sm mt-2">Please check your email and click the confirmation link to activate your account.</p>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
              <h3 className="text-primary-700 font-semibold mb-3 text-lg">📧 Next Steps:</h3>
              <ol className="text-gray-600 text-base space-y-2 list-decimal list-inside text-left">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the "Confirm Your Account" link in the email</li>
                <li>Return here to sign in with your credentials</li>
              </ol>
            </div>
            <div className="space-y-4">
              <Link
                href="/auth/login"
                className="w-full inline-flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
              >
                <span>Go to Sign In Page</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <button
                onClick={() => {
                  console.log('User clicked "try again" - resetting form')
                  setSuccess(false)
                  setJustSignedUp(false)
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Create Another Account
              </button>
              <p className="text-center text-sm text-gray-500">
                Didn't receive the email? Check your spam folder first.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
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
          <p className="text-gray-600">Join the maritime automation revolution</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Join the Crew</h2>





          {/* Processing indicator */}
          {isSubmitting && !error && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-primary-700 text-sm font-medium">Creating your account...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
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
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={getPasswordStrengthText(passwordStrength).color}>
                      {getPasswordStrengthText(passwordStrength).text}
                    </span>
                  </div>
                  <div className="mt-1 flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= passwordStrength
                            ? passwordStrength <= 2
                              ? 'bg-red-400'
                              : passwordStrength <= 3
                              ? 'bg-yellow-400'
                              : 'bg-green-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Use 8+ characters with uppercase, lowercase, numbers & symbols
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {(loading || isSubmitting) ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
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
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary-500 hover:text-primary-600 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-primary-500 hover:text-primary-600">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary-500 hover:text-primary-600">Privacy Policy</Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm mb-4">Start with 3 powerful AI agents</p>
          <div className="flex justify-center space-x-6 text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">C</span>
              </div>
              <span className="text-xs">Coral Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">M</span>
              </div>
              <span className="text-xs">Mariner Marketing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">P</span>
              </div>
              <span className="text-xs">Pearl Content</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
