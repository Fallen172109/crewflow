// Auth Error Handler for Supabase
// Handles common authentication errors like invalid refresh tokens

import { supabase } from '@/lib/supabase/client'

export async function handleAuthError(error: any) {
  console.warn('Auth error detected:', error?.message || error)
  
  // Check if it's a refresh token error
  if (error?.message?.includes('Invalid Refresh Token') || 
      error?.message?.includes('Refresh Token Not Found')) {
    
    console.log('Clearing invalid session...')
    
    try {
      // Clear the invalid session
      await supabase.auth.signOut()
      
      // Clear any stored session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
      }
      
      console.log('Session cleared successfully')
      
      // Optionally redirect to login or refresh the page
      if (typeof window !== 'undefined') {
        // Only refresh if we're not already on the login page
        if (!window.location.pathname.includes('/auth/')) {
          window.location.reload()
        }
      }
      
    } catch (clearError) {
      console.error('Failed to clear session:', clearError)
    }
  }
}

// Wrapper for API calls that handles auth errors
export async function withAuthErrorHandling<T>(
  apiCall: () => Promise<T>
): Promise<T | null> {
  try {
    return await apiCall()
  } catch (error) {
    await handleAuthError(error)
    return null
  }
}
