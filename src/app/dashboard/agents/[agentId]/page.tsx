import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/agents'
import { getUserProfile } from '@/lib/auth'
import AgentInterface from '@/components/agents/AgentInterface'

interface AgentPageProps {
  params: {
    agentId: string
  }
}

export default async function AgentPage({ params }: AgentPageProps) {
  const agent = getAgent(params.agentId)
  const userProfile = await getUserProfile()

  if (!agent) {
    notFound()
  }

  // Check if user can access this agent
  const availableAgents = userProfile?.subscription_tier === 'starter' 
    ? ['coral', 'mariner', 'pearl']
    : userProfile?.subscription_tier === 'professional'
    ? ['coral', 'mariner', 'pearl', 'morgan', 'tide', 'compass']
    : userProfile?.subscription_tier === 'enterprise'
    ? Object.keys(require('@/lib/agents').AGENTS)
    : []

  if (!availableAgents.includes(agent.id)) {
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

  return <AgentInterface agent={agent} userProfile={userProfile} />
}
