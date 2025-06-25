'use client'

import { notFound } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAgent, canUserAccessAgent } from '@/lib/agents'
import { supabase } from '@/lib/supabase'
import AgentInterface from '@/components/agents/AgentInterface'

interface AgentPageProps {
  params: Promise<{
    agentId: string
  }>
}

interface UserProfile {
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

// Client-side admin access check
function hasAdminAccess(profile: UserProfile | null): boolean {
  return profile?.role === 'admin'
}

export default function AgentPage({ params }: AgentPageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState<any>(null)
  const [agentId, setAgentId] = useState<string | null>(null)

  useEffect(() => {
    // Unwrap the params Promise
    params.then((resolvedParams) => {
      const foundAgent = getAgent(resolvedParams.agentId)
      if (!foundAgent) {
        notFound()
      }
      setAgent(foundAgent)
      setAgentId(resolvedParams.agentId)
    })
  }, [params])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setLoading(false)
          return
        }

        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setProfile(profileData)
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  console.log('AgentPage: Agent ID:', agentId)
  console.log('AgentPage: User Profile:', profile?.email, 'role:', profile?.role, 'tier:', profile?.subscription_tier)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <p className="ml-3 text-gray-600">Loading agent access...</p>
      </div>
    )
  }

  // If no profile but we have an agent, show the agent anyway (for debugging)
  if (!profile && agent) {
    console.log('AgentPage: No profile loaded, but showing agent anyway for debugging')
    return <AgentInterface agent={agent} userProfile={null} />
  }

  if (!agent) {
    notFound()
  }

  // Check if user can access this agent (admin override or subscription check)
  const isAdmin = hasAdminAccess(profile)
  const hasEnterpriseAccess = profile?.subscription_tier === 'enterprise'
  const canAccess = isAdmin || hasEnterpriseAccess || canUserAccessAgent(profile?.subscription_tier, agent.id)

  console.log('AgentPage: DETAILED DEBUG', {
    agentId: agentId,
    agentName: agent?.name,
    profileLoaded: !!profile,
    profileEmail: profile?.email,
    profileRole: profile?.role,
    profileTier: profile?.subscription_tier,
    profileStatus: profile?.subscription_status,
    isAdmin: isAdmin,
    hasEnterpriseAccess: hasEnterpriseAccess,
    canAccess: canAccess,
    hasAdminAccessResult: hasAdminAccess(profile),
    canUserAccessAgentResult: canUserAccessAgent(profile?.subscription_tier, agent.id)
  })

  // TEMPORARY: Force access for debugging - REMOVE THIS LATER
  const forceAccess = profile?.email === 'borzeckikamil7@gmail.com'
  const finalCanAccess = canAccess || forceAccess

  console.log('AgentPage: FORCE ACCESS DEBUG', {
    forceAccess,
    finalCanAccess,
    userEmail: profile?.email
  })

  if (!finalCanAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Agent Not Available</h2>
          <p className="text-secondary-300 mb-4">
            {agent.name} is not included in your current subscription plan.
          </p>
          <a
            href="/pricing"
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    )
  }

  return <AgentInterface agent={agent} userProfile={profile} />
}
