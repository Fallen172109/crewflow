import { createSupabaseServerClient } from './supabase'
import { redirect } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  subscription_tier: 'starter' | 'professional' | 'enterprise' | null
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due' | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export async function getUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error in getUser:', error)
    return null
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
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
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return user
}

export async function requireSubscription(): Promise<UserProfile> {
  const profile = await getUserProfile()
  
  if (!profile) {
    redirect('/auth/login')
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
  const limits = getSubscriptionLimits(userTier)
  if (!limits) return false
  
  return limits.agents.includes(agentName.toLowerCase())
}

export async function signOut() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
