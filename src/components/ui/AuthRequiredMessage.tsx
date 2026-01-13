'use client'

import { AlertCircle, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface AuthRequiredMessageProps {
  message?: string
  showLoginButton?: boolean
  onLoginClick?: () => void
  className?: string
}

export default function AuthRequiredMessage({
  message = "Authentication required to upload files.",
  showLoginButton = true,
  onLoginClick,
  className = ""
}: AuthRequiredMessageProps) {
  const { user, loading } = useAuth()
  const isAuthenticated = !!user && !loading

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick()
    } else {
      // Default behavior: redirect to login
      window.location.href = '/auth/login'
    }
  }

  // Don't show if user is authenticated
  if (isAuthenticated) {
    return null
  }

  // Show loading state while checking
  if (loading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-sm">Checking authentication...</span>
      </div>
    )
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-green-800 mb-2">
            {message}
          </p>
          {showLoginButton && (
            <button
              onClick={handleLoginClick}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
