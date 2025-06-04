'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  subscription_tier: 'starter' | 'professional' | 'enterprise' | null
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  signingOut: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; user?: any; session?: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(false)
  const lastProfileFetch = useRef<number>(0)
  const router = useRouter()

  // Fetch user profile from database with retry logic
  const fetchUserProfile = useCallback(async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      // Prevent multiple concurrent profile fetches
      if (fetchingProfile && retryCount === 0) {
        console.log('Profile fetch already in progress, skipping')
        return null
      }

      // Prevent too frequent profile fetches (minimum 5 seconds between attempts)
      const now = Date.now()
      if (retryCount === 0 && now - lastProfileFetch.current < 5000) {
        console.log('Profile fetch too recent, skipping')
        return null
      }

      if (retryCount === 0) {
        setFetchingProfile(true)
        lastProfileFetch.current = now
      }

      console.log('Fetching user profile for:', userId, retryCount > 0 ? `(retry ${retryCount})` : '')

      // Don't fetch profile if we're signing out
      if (signingOut) {
        console.log('Skipping profile fetch - signing out')
        return null
      }

      // First check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No session available for profile fetch')
        return null
      }

      // Add timeout to prevent hanging - increased to 15 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 15000) // 15 second timeout
      })

      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      const result = await Promise.race([fetchPromise, timeoutPromise])
      const { data, error } = result

      if (error) {
        // Only log non-timeout database errors
        if (error.code !== 'PGRST116') {
          console.error('Database error fetching user profile:', error)
        }
        // If the profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('User profile not found, creating new profile')
          return await createUserProfile(userId, session.user.email || '')
        }
        return null
      }

      console.log('User profile fetched successfully:', data?.email)
      return data
    } catch (error) {
      // Handle timeout errors with retry logic
      if (error instanceof Error && error.message === 'Profile fetch timeout') {
        if (retryCount < 2) {
          console.log(`Profile fetch timed out, retrying (attempt ${retryCount + 1}/3)`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
          return fetchUserProfile(userId, retryCount + 1)
        } else {
          console.warn('Profile fetch failed after 3 attempts, continuing without profile')
          return null
        }
      }

      // Log other unexpected errors
      console.error('Unexpected error in fetchUserProfile:', error)
      return null
    } finally {
      // Always reset fetching state when done (only for initial call, not retries)
      if (retryCount === 0) {
        setFetchingProfile(false)
      }
    }
  }, [signingOut, fetchingProfile])

  // Create user profile if it doesn't exist
  const createUserProfile = useCallback(async (userId: string, email: string): Promise<UserProfile | null> => {
    try {
      console.log('Creating user profile for:', email)

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          subscription_tier: 'free',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        // Return a fallback profile if creation fails
        return {
          id: userId,
          email: email,
          subscription_tier: 'free',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      console.log('User profile created successfully:', data?.email)
      return data
    } catch (error) {
      console.error('Error in createUserProfile:', error)
      // Return a fallback profile if creation fails
      return {
        id: userId,
        email: email,
        subscription_tier: 'free',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }, [])

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    if (user && !signingOut) {
      const profile = await fetchUserProfile(user.id)
      if (!signingOut) {
        setUserProfile(profile)
      }
    }
  }, [user, fetchUserProfile, signingOut])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')

        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          if (mounted) {
            setSession(null)
            setUser(null)
            setUserProfile(null)
            setLoading(false)
          }
          return
        }

        console.log('Initial session:', initialSession?.user?.email || 'No user')

        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)

          if (initialSession?.user) {
            // Always try to fetch user profile, regardless of email confirmation
            // This allows the app to work even if email confirmation is pending
            fetchUserProfile(initialSession.user.id)
              .then(profile => {
                if (mounted) {
                  setUserProfile(profile)
                }
              })
              .catch(profileError => {
                console.log('Profile fetch failed (this is normal for new users):', profileError?.message)
                if (mounted) {
                  setUserProfile(null)
                }
              })
          } else {
            setUserProfile(null)
          }

          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setSession(null)
          setUser(null)
          setUserProfile(null)
          setLoading(false)
        }
      }
    }

    // Initialize immediately
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user?.email)

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Only fetch profile for confirmed users and if not signing out
          if (session.user.email_confirmed_at && !signingOut) {
            // Fetch user profile asynchronously (don't await to prevent hanging)
            fetchUserProfile(session.user.id)
              .then(profile => {
                if (mounted && !signingOut) {
                  setUserProfile(profile)
                }
              })
              .catch(profileError => {
                // Only log non-timeout errors to reduce console noise
                if (profileError?.message !== 'Profile fetch timeout') {
                  console.error('Error fetching profile in auth change:', profileError)
                }
                if (mounted && !signingOut) {
                  setUserProfile(null)
                }
              })
          } else {
            console.log('User email not confirmed or signing out, skipping profile fetch')
            setUserProfile(null)
          }
        } else {
          // Clear profile when user signs out
          setUserProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Remove all dependencies since we're using the singleton supabase client

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: result.error }
    } finally {
      setLoading(false)
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string) => {
    setLoading(true)
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      return {
        error: result.error,
        user: result.data?.user,
        session: result.data?.session
      }
    } catch (error) {
      return { error: error as any }
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    console.log('Starting sign out process...')
    setSigningOut(true)
    setLoading(true)
    try {
      // Clear state immediately to prevent any profile fetching
      setUser(null)
      setUserProfile(null)
      setSession(null)

      // Sign out from Supabase
      await supabase.auth.signOut()

      console.log('Sign out successful, redirecting to landing page...')
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
      setSigningOut(false)
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error: result.error }
  }

  // Update password function
  const updatePassword = async (password: string) => {
    const result = await supabase.auth.updateUser({ password })
    return { error: result.error }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    signingOut,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }

  // Don't show loading screen - let pages handle their own loading states
  // This prevents the auth context from blocking navigation

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom hooks for common auth operations
export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  return { user, loading }
}

export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Be much more conservative about redirects
    // Only redirect if user is confirmed AND we're on a login page specifically
    if (!loading && user && user.email_confirmed_at) {
      const currentPath = window.location.pathname

      // Only redirect from login page, not signup page
      if (currentPath === '/auth/login') {
        const currentUrl = new URL(window.location.href)
        const hasConfirmedParam = currentUrl.searchParams.has('confirmed')

        if (!hasConfirmedParam) {
          console.log('Redirecting authenticated user from login page to dashboard')
          router.push(redirectTo)
        }
      }
    }
  }, [user, loading, router, redirectTo])

  return { user, loading }
}
