import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSubscriptionLimits } from '@/lib/auth'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

// GET /api/usage/current - Get current usage data for user
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with subscription info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const tier = userProfile.subscription_tier
    const limits = getSubscriptionLimits(tier)

    // Get current month usage by agent
    const { data: agentUsage, error: usageError } = await supabase
      .from('agent_usage')
      .select('agent_name, requests_used')
      .eq('user_id', user.id)
      .eq('month_year', currentMonth)

    if (usageError) {
      console.error('Error fetching agent usage:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }

    // Get detailed usage stats for the month
    const { data: detailedUsage, error: detailedError } = await supabase
      .from('agent_usage_detailed')
      .select('cost_usd, response_time_ms, success')
      .eq('user_id', user.id)
      .gte('timestamp', `${currentMonth}-01`)
      .lt('timestamp', getNextMonthStart(currentMonth))

    if (detailedError) {
      console.error('Error fetching detailed usage:', detailedError)
    }

    // Calculate totals
    const totalRequests = agentUsage?.reduce((sum, agent) => sum + (agent.requests_used || 0), 0) || 0
    const requestLimit = limits ? limits.requestsPerAgent * limits.totalAgents : 0
    const usagePercentage = requestLimit > 0 ? (totalRequests / requestLimit) * 100 : 0

    // Calculate overage
    const overage = Math.max(0, totalRequests - requestLimit)
    const overageCost = overage * 0.05 // $0.05 per additional request

    // Process agent usage data
    const agentUsageData = limits?.agents.map(agentId => {
      const usage = agentUsage?.find(u => u.agent_name === agentId)
      const requests = usage?.requests_used || 0
      const agentLimit = limits.requestsPerAgent
      const percentage = agentLimit > 0 ? (requests / agentLimit) * 100 : 0

      return {
        agentId,
        agentName: getAgentDisplayName(agentId),
        requests,
        limit: agentLimit,
        percentage
      }
    }) || []

    // Calculate monthly stats
    const monthlyStats = {
      totalRequests,
      totalCost: detailedUsage?.reduce((sum, record) => sum + (record.cost_usd || 0), 0) || 0,
      successRate: detailedUsage?.length > 0 
        ? (detailedUsage.filter(r => r.success).length / detailedUsage.length) * 100 
        : 100,
      averageResponseTime: detailedUsage?.length > 0
        ? detailedUsage.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / detailedUsage.length
        : 0
    }

    // Calculate days until reset
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const usageData = {
      currentUsage: totalRequests,
      limit: requestLimit,
      percentage: usagePercentage,
      tier: tier as 'starter' | 'professional' | 'enterprise' | null,
      agentUsage: agentUsageData,
      monthlyStats,
      daysUntilReset,
      overage,
      overageCost
    }

    return NextResponse.json({ usage: usageData })

  } catch (error) {
    console.error('Error in GET /api/usage/current:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to get next month start date
function getNextMonthStart(currentMonth: string): string {
  const [year, month] = currentMonth.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
}

// Helper function to get agent display names
function getAgentDisplayName(agentId: string): string {
  const displayNames: Record<string, string> = {
    'coral': 'Coral',
    'mariner': 'Mariner', 
    'pearl': 'Pearl',
    'morgan': 'Morgan',
    'tide': 'Tide',
    'compass': 'Compass',
    'flint': 'Flint',
    'drake': 'Drake',
    'sage': 'Sage',
    'anchor': 'Anchor',
    'splash': 'Splash'
  }
  
  return displayNames[agentId] || agentId.charAt(0).toUpperCase() + agentId.slice(1)
}

// POST /api/usage/current - Update usage (for testing/admin purposes)
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { targetUserId, agentName, requestsToAdd } = body

    if (!targetUserId || !agentName || !requestsToAdd) {
      return NextResponse.json({ 
        error: 'targetUserId, agentName, and requestsToAdd are required' 
      }, { status: 400 })
    }

    const currentMonth = new Date().toISOString().slice(0, 7)

    // Update or insert usage record
    const { error } = await supabase.rpc('increment_agent_usage', {
      p_user_id: targetUserId,
      p_agent_name: agentName,
      p_month_year: currentMonth,
      p_requests_to_add: requestsToAdd
    })

    if (error) {
      console.error('Error updating usage:', error)
      return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Added ${requestsToAdd} requests to ${agentName} for user ${targetUserId}` 
    })

  } catch (error) {
    console.error('Error in POST /api/usage/current:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/usage/current - Reset usage (for testing/admin purposes)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    const agentName = searchParams.get('agentName')

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
    }

    const currentMonth = new Date().toISOString().slice(0, 7)

    let query = supabase
      .from('agent_usage')
      .delete()
      .eq('user_id', targetUserId)
      .eq('month_year', currentMonth)

    if (agentName) {
      query = query.eq('agent_name', agentName)
    }

    const { error } = await query

    if (error) {
      console.error('Error resetting usage:', error)
      return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Reset usage for user ${targetUserId}${agentName ? ` (${agentName})` : ''}` 
    })

  } catch (error) {
    console.error('Error in DELETE /api/usage/current:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
