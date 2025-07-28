import { createSupabaseServerClientWithCookies } from './supabase/server'
import { redirect } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  role: 'user' | 'admin'
  subscription_tier: 'starter' | 'professional' | 'enterprise' | null
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClientWithCookies()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      // Don't log auth session missing errors as they're expected when not logged in
      if (error.message !== 'Auth session missing!') {
        console.error('Error getting user:', error)
      }
      return null
    }

    return user
  } catch (error: any) {
    // Don't log auth session missing errors as they're expected when not logged in
    if (error?.message !== 'Auth session missing!') {
      console.error('Error in getUser:', error)
    }
    return null
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClientWithCookies()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // Don't log auth session missing errors as they're expected when not logged in
      if (authError?.message !== 'Auth session missing!') {
        console.error('Error getting user for profile:', authError)
      }
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error getting user profile:', profileError)
      return null
    }

    return profile
  } catch (error: any) {
    // Don't log auth session missing errors as they're expected when not logged in
    if (error?.message !== 'Auth session missing!') {
      console.error('Error in getUserProfile:', error)
    }
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()

  if (!user) {
    redirect('/')
  }

  return user
}

// API route version that throws instead of redirecting
export async function requireAuthAPI(): Promise<User> {
  const user = await getUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

export async function requireSubscription(): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/')
  }

  if (!profile.subscription_tier || profile.subscription_status !== 'active') {
    redirect('/pricing')
  }

  return profile
}

export function getSubscriptionLimits(tier: string | null) {
  const limits = {
    starter: {
      agents: ['coral', 'mariner', 'pearl'],
      requestsPerAgent: 500,
      totalAgents: 3
    },
    professional: {
      agents: ['coral', 'mariner', 'pearl', 'morgan', 'tide', 'compass'],
      requestsPerAgent: 750,
      totalAgents: 6
    },
    enterprise: {
      agents: ['coral', 'mariner', 'pearl', 'morgan', 'tide', 'compass', 'flint', 'drake', 'sage', 'anchor'],
      requestsPerAgent: 1000,
      totalAgents: 10
    }
  }
  
  return limits[tier as keyof typeof limits] || null
}

export function canAccessAgent(userTier: string | null, agentName: string): boolean {
  // Enterprise tier gets access to all agents
  if (userTier === 'enterprise') return true

  const limits = getSubscriptionLimits(userTier)
  if (!limits) return false

  return limits.agents.includes(agentName.toLowerCase())
}

// Admin-specific functions
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/')
  }

  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return profile
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'admin' || false
}

export async function getAdminProfile(): Promise<UserProfile | null> {
  const profile = await getUserProfile()
  return profile?.role === 'admin' ? profile : null
}

// Admin utility functions
export function hasAdminAccess(userProfile: UserProfile | null): boolean {
  return userProfile?.role === 'admin' || false
}

export function canAccessAdminFeature(userProfile: UserProfile | null, feature: string): boolean {
  if (!hasAdminAccess(userProfile)) return false

  // All admin features are available to admin users
  // You can add feature-specific restrictions here if needed
  return true
}

export async function signOut() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
