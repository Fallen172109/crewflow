'use client'

import { useAuth } from '@/lib/auth-context'
import { AGENTS, getAgentsForTier } from '@/lib/agents'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

// Helper function to get framework badge styling
const getFrameworkBadge = (framework: string) => {
  switch (framework) {
    case 'langchain':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'autogen':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'perplexity':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'hybrid':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

// Interface for dashboard metrics
interface DashboardMetrics {
  requestsToday: number
  requestsGrowth: number
  tasksCompleted: number
  timeSaved: string
  recentActivity: Array<{
    id: string
    agent_name: string
    message_type: string
    timestamp: string
    success: boolean
  }>
}

// Helper function to format time ago
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

// Helper function to format action text based on message type
const formatActionText = (messageType: string, success: boolean): string => {
  const baseActions = {
    'chat': 'had a conversation',
    'preset_action': 'executed a preset action',
    'tool_execution': 'used a tool'
  }

  const action = baseActions[messageType as keyof typeof baseActions] || 'performed an action'
  return success ? action : `attempted to ${action.replace('had', 'have').replace('executed', 'execute').replace('used', 'use')}`
}

export default function DashboardPage() {
  const { userProfile, user } = useAuth()
  // Show all agents for admin users or enterprise users
  const isAdmin = userProfile?.role === 'admin'
  const isEnterprise = userProfile?.subscription_tier === 'enterprise'
  const isDebugUser = userProfile?.email === 'borzeckikamil7@gmail.com'
  const availableAgents = (isAdmin || isEnterprise || isDebugUser) ? Object.values(AGENTS) : getAgentsForTier(userProfile?.subscription_tier)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    requestsToday: 0,
    requestsGrowth: 0,
    tasksCompleted: 0,
    timeSaved: '0h',
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  // Debug logging
  console.log('Dashboard: User Profile:', {
    email: userProfile?.email,
    role: userProfile?.role,
    tier: userProfile?.subscription_tier,
    status: userProfile?.subscription_status,
    isAdmin,
    isEnterprise,
    isDebugUser,
    availableAgentsCount: availableAgents.length,
    allAgentsCount: Object.values(AGENTS).length
  })

  // Fetch real dashboard metrics
  const fetchDashboardMetrics = async () => {
    if (!user?.id) return

    try {
      const supabase = createSupabaseClient()

      // Get today's date for filtering
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

      // Fetch today's requests
      const { data: todayRequests, error: todayError } = await supabase
        .from('agent_usage_detailed')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', todayStart.toISOString())
        .lt('timestamp', new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString())

      if (todayError) {
        console.error('Error fetching today requests:', todayError)
      }

      // Fetch yesterday's requests for growth calculation
      const { data: yesterdayRequests, error: yesterdayError } = await supabase
        .from('agent_usage_detailed')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', yesterdayStart.toISOString())
        .lt('timestamp', todayStart.toISOString())

      if (yesterdayError) {
        console.error('Error fetching yesterday requests:', yesterdayError)
      }

      // Fetch recent activity (last 10 records)
      const { data: recentActivity, error: activityError } = await supabase
        .from('agent_usage_detailed')
        .select('id, agent_name, message_type, timestamp, success')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(10)

      if (activityError) {
        console.error('Error fetching recent activity:', activityError)
      }

      // Calculate metrics
      const todayCount = todayRequests?.length || 0
      const yesterdayCount = yesterdayRequests?.length || 0
      const growth = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : 0

      // Calculate successful tasks (successful requests)
      const successfulTasks = todayRequests?.filter(req => req.success).length || 0

      // Calculate estimated time saved (rough estimate: 5 minutes per successful task)
      const minutesSaved = successfulTasks * 5
      const hoursSaved = Math.floor(minutesSaved / 60)
      const remainingMinutes = minutesSaved % 60
      const timeSaved = hoursSaved > 0 ? `${hoursSaved}h ${remainingMinutes}m` : `${remainingMinutes}m`

      setDashboardMetrics({
        requestsToday: todayCount,
        requestsGrowth: Math.round(growth),
        tasksCompleted: successfulTasks,
        timeSaved,
        recentActivity: recentActivity || []
      })
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check for email confirmation success
  useEffect(() => {
    // Check URL parameters using window.location instead of useSearchParams
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const confirmed = urlParams.get('confirmed')
      if (confirmed === 'true') {
        setShowConfirmation(true)
        // Auto-hide after 5 seconds
        setTimeout(() => setShowConfirmation(false), 5000)
      }
    }
  }, [])

  // Fetch dashboard data when user is available
  useEffect(() => {
    if (user?.id) {
      fetchDashboardMetrics()
    }
  }, [user?.id])

  return (
    <div className="space-y-8">
      {/* Email Confirmation Success Message */}
      {showConfirmation && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-green-200 font-semibold">🎉 Welcome aboard, Captain!</p>
              <p className="text-green-300 text-sm">Your email has been confirmed and your account is now active.</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmation(false)}
            className="text-green-300 hover:text-green-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Command Center</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, Captain. Your AI crew is ready for orders.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white rounded-lg px-4 py-2 border border-gray-200 shadow-sm">
            <span className="text-sm text-gray-600">Current Plan: </span>
            <span className="text-primary-500 font-semibold capitalize">
              {userProfile?.subscription_tier || 'Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">{availableAgents.length}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Requests Today</p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.requestsToday}</p>
                  {dashboardMetrics.requestsGrowth !== 0 && (
                    <p className={`text-sm mt-1 ${dashboardMetrics.requestsGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardMetrics.requestsGrowth > 0 ? '↗' : '↘'} {Math.abs(dashboardMetrics.requestsGrowth)}% from yesterday
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Tasks Completed</p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.tasksCompleted}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Time Saved</p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.timeSaved}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agents Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your AI Crew</h2>
          <Link
            href="/pricing"
            className="text-primary-500 hover:text-primary-600 text-sm font-medium"
          >
            Upgrade to access more agents →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableAgents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-500/50 transition-all duration-300 group shadow-sm hover:shadow-md"
            >
              <div className="flex items-start space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{agent.title}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {agent.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded border ${getFrameworkBadge(agent.framework)}`}>
                      {agent.framework}
                    </span>
                    <span className="text-xs text-gray-500">
                      {agent.presetActions.length} actions
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-500">Online</span>
                  </div>
                </div>

                {/* Integration Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {agent.integrations.length > 0 && (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-gray-500">
                          {agent.integrations.length} integrations
                        </span>
                      </>
                    )}
                    {agent.requiresApiConnection && (
                      <>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-xs text-gray-500">API required</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    ${agent.costPerRequest}/req
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4 p-3">
                    <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-3/4 h-4 bg-gray-200 animate-pulse rounded"></div>
                      <div className="w-1/4 h-3 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardMetrics.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {dashboardMetrics.recentActivity.map((activity) => {
                  // Get agent info from AGENTS config
                  const agent = Object.values(AGENTS).find(a => a.name.toLowerCase() === activity.agent_name.toLowerCase())
                  const agentColor = agent?.color || '#6b7280'
                  const agentName = activity.agent_name

                  // Format timestamp
                  const timeAgo = formatTimeAgo(activity.timestamp)

                  // Format action based on message type
                  const actionText = formatActionText(activity.message_type, activity.success)

                  return (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: agentColor }}
                      >
                        {agentName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 text-sm">
                          <span className="font-semibold">{agentName}</span> {actionText}
                          {!activity.success && (
                            <span className="ml-2 text-red-500 text-xs">(Failed)</span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">{timeAgo}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No recent activity</p>
                <p className="text-gray-400 text-xs mt-1">Start using your AI agents to see activity here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
