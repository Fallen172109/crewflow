import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUserAdmin, logAdminAction } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isUserAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get various statistics
    const stats = await Promise.allSettled([
      // Total users
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),

      // Admin users
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin'),

      // Active subscribers
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active'),

      // New users this month
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

      // New users this week
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Users by subscription tier
      supabase
        .from('users')
        .select('subscription_tier')
        .not('subscription_tier', 'is', null),

      // Users by subscription status
      supabase
        .from('users')
        .select('subscription_status')
        .not('subscription_status', 'is', null),

      // Recent user registrations (last 30 days)
      supabase
        .from('users')
        .select('created_at, email, subscription_tier')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Agent usage stats
      supabase
        .from('agent_usage')
        .select('agent_name, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Most active users (by agent usage)
      supabase
        .from('agent_usage')
        .select(`
          user_id,
          users!inner(email)
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    // Process results
    const [
      totalUsersResult,
      adminUsersResult,
      activeSubscribersResult,
      newUsersThisMonthResult,
      newUsersThisWeekResult,
      subscriptionTiersResult,
      subscriptionStatusResult,
      recentUsersResult,
      agentUsageResult,
      activeUsersResult
    ] = stats

    // Calculate subscription tier distribution
    let tierDistribution = { starter: 0, professional: 0, enterprise: 0 }
    if (subscriptionTiersResult.status === 'fulfilled' && subscriptionTiersResult.value.data) {
      subscriptionTiersResult.value.data.forEach((user: any) => {
        if (user.subscription_tier && tierDistribution.hasOwnProperty(user.subscription_tier)) {
          tierDistribution[user.subscription_tier as keyof typeof tierDistribution]++
        }
      })
    }

    // Calculate subscription status distribution
    let statusDistribution = { active: 0, inactive: 0, cancelled: 0, past_due: 0 }
    if (subscriptionStatusResult.status === 'fulfilled' && subscriptionStatusResult.value.data) {
      subscriptionStatusResult.value.data.forEach((user: any) => {
        if (user.subscription_status && statusDistribution.hasOwnProperty(user.subscription_status)) {
          statusDistribution[user.subscription_status as keyof typeof statusDistribution]++
        }
      })
    }

    // Calculate agent usage distribution
    let agentUsageDistribution: Record<string, number> = {}
    if (agentUsageResult.status === 'fulfilled' && agentUsageResult.value.data) {
      agentUsageResult.value.data.forEach((usage: any) => {
        agentUsageDistribution[usage.agent_name] = (agentUsageDistribution[usage.agent_name] || 0) + 1
      })
    }

    // Calculate most active users
    let userActivityCount: Record<string, { count: number, email: string }> = {}
    if (activeUsersResult.status === 'fulfilled' && activeUsersResult.value.data) {
      activeUsersResult.value.data.forEach((usage: any) => {
        const userId = usage.user_id
        const email = usage.users?.email || 'Unknown'
        if (!userActivityCount[userId]) {
          userActivityCount[userId] = { count: 0, email }
        }
        userActivityCount[userId].count++
      })
    }

    const mostActiveUsers = Object.entries(userActivityCount)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([userId, data]) => ({
        userId,
        email: data.email,
        activityCount: data.count
      }))

    const responseData = {
      overview: {
        totalUsers: totalUsersResult.status === 'fulfilled' ? (totalUsersResult.value.count || 0) : 0,
        adminUsers: adminUsersResult.status === 'fulfilled' ? (adminUsersResult.value.count || 0) : 0,
        activeSubscribers: activeSubscribersResult.status === 'fulfilled' ? (activeSubscribersResult.value.count || 0) : 0,
        newUsersThisMonth: newUsersThisMonthResult.status === 'fulfilled' ? (newUsersThisMonthResult.value.count || 0) : 0,
        newUsersThisWeek: newUsersThisWeekResult.status === 'fulfilled' ? (newUsersThisWeekResult.value.count || 0) : 0,
      },
      distributions: {
        subscriptionTiers: tierDistribution,
        subscriptionStatus: statusDistribution,
        agentUsage: agentUsageDistribution
      },
      recentUsers: recentUsersResult.status === 'fulfilled' ? (recentUsersResult.value.data || []) : [],
      mostActiveUsers,
      generatedAt: new Date().toISOString()
    }

    // Log admin action
    await logAdminAction(user.id, 'VIEW_SYSTEM_STATS', undefined, {
      statsRequested: Object.keys(responseData)
    }, request)

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error in admin stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
