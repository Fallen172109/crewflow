import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSubscriptionLimits } from '@/lib/auth'

// POST /api/usage/track-action - Track and validate user action against limits
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, agentId, actionType, timestamp, metadata = {} } = body

    // Validate that the user can only track their own actions (unless admin)
    if (userId !== user.id) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Can only track your own actions' }, { status: 403 })
      }
    }

    // Get user's subscription tier and limits
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const limits = getSubscriptionLimits(targetUser.subscription_tier)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

    // Get current usage for this month
    const { data: currentUsage, error: usageError } = await supabase
      .from('agent_usage')
      .select('requests_used')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .eq('agent_name', agentId || 'general')
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching current usage:', usageError)
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 })
    }

    const currentRequests = currentUsage?.requests_used || 0
    const requestLimit = limits ? limits.requestsPerAgent : 100

    // Check if action would exceed limits
    if (currentRequests >= requestLimit) {
      return NextResponse.json({ 
        error: 'Usage limit exceeded',
        allowed: false,
        current: currentRequests,
        limit: requestLimit,
        overage: currentRequests - requestLimit + 1
      }, { status: 429 })
    }

    // Track the action in detailed usage table
    const { error: trackError } = await supabase
      .from('agent_usage_detailed')
      .insert({
        user_id: userId,
        agent_id: agentId || 'general',
        action_type: actionType || 'request',
        timestamp: timestamp || new Date().toISOString(),
        cost_usd: calculateActionCost(actionType, targetUser.subscription_tier),
        metadata,
        success: true
      })

    if (trackError) {
      console.error('Error tracking detailed usage:', trackError)
      // Don't fail the request if detailed tracking fails
    }

    // Update monthly usage counter
    const { error: updateError } = await supabase.rpc('increment_agent_usage', {
      p_user_id: userId,
      p_agent_name: agentId || 'general',
      p_month_year: currentMonth,
      p_requests_to_add: 1
    })

    if (updateError) {
      console.error('Error updating usage counter:', updateError)
      return NextResponse.json({ error: 'Failed to update usage counter' }, { status: 500 })
    }

    // Calculate new usage stats
    const newUsage = currentRequests + 1
    const usagePercentage = (newUsage / requestLimit) * 100

    return NextResponse.json({
      success: true,
      allowed: true,
      usage: {
        current: newUsage,
        limit: requestLimit,
        percentage: usagePercentage,
        remaining: Math.max(0, requestLimit - newUsage)
      },
      warnings: usagePercentage >= 80 ? ['Approaching usage limit'] : []
    })

  } catch (error) {
    console.error('Error in POST /api/usage/track-action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/usage/track-action - Check if action is allowed without tracking
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id
    const agentId = searchParams.get('agentId')
    const actionType = searchParams.get('actionType')

    // Validate that the user can only check their own limits (unless admin)
    if (userId !== user.id) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Can only check your own limits' }, { status: 403 })
      }
    }

    // Get user's subscription tier and limits
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const limits = getSubscriptionLimits(targetUser.subscription_tier)
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Get current usage for this month
    const { data: currentUsage, error: usageError } = await supabase
      .from('agent_usage')
      .select('requests_used')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .eq('agent_name', agentId || 'general')
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching current usage:', usageError)
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 })
    }

    const currentRequests = currentUsage?.requests_used || 0
    const requestLimit = limits ? limits.requestsPerAgent : 100
    const usagePercentage = (currentRequests / requestLimit) * 100

    const allowed = currentRequests < requestLimit
    const warnings = []

    if (usagePercentage >= 90) {
      warnings.push('Critical: Usage limit almost reached')
    } else if (usagePercentage >= 75) {
      warnings.push('Warning: Approaching usage limit')
    }

    return NextResponse.json({
      allowed,
      usage: {
        current: currentRequests,
        limit: requestLimit,
        percentage: usagePercentage,
        remaining: Math.max(0, requestLimit - currentRequests)
      },
      warnings,
      tier: targetUser.subscription_tier,
      actionCost: calculateActionCost(actionType, targetUser.subscription_tier)
    })

  } catch (error) {
    console.error('Error in GET /api/usage/track-action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate action cost
function calculateActionCost(actionType: string | null, tier: string | null): number {
  // Base costs per action type (in USD)
  const baseCosts: Record<string, number> = {
    'chat_message': 0.001,
    'image_generation': 0.02,
    'file_analysis': 0.005,
    'api_call': 0.002,
    'data_sync': 0.003,
    'automation': 0.01
  }

  // Tier multipliers (enterprise gets better rates)
  const tierMultipliers: Record<string, number> = {
    'starter': 1.0,
    'professional': 0.8,
    'enterprise': 0.6
  }

  const baseCost = baseCosts[actionType || 'chat_message'] || 0.001
  const multiplier = tierMultipliers[tier || 'starter'] || 1.0

  return baseCost * multiplier
}

// PUT /api/usage/track-action - Bulk update usage (admin only)
export async function PUT(request: NextRequest) {
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
    const { updates } = body

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 })
    }

    const results = []

    for (const update of updates) {
      const { userId, agentId, requestsToAdd, monthYear } = update

      if (!userId || !agentId || !requestsToAdd) {
        results.push({ 
          userId, 
          agentId, 
          success: false, 
          error: 'Missing required fields' 
        })
        continue
      }

      try {
        const { error } = await supabase.rpc('increment_agent_usage', {
          p_user_id: userId,
          p_agent_name: agentId,
          p_month_year: monthYear || new Date().toISOString().slice(0, 7),
          p_requests_to_add: requestsToAdd
        })

        if (error) {
          results.push({ 
            userId, 
            agentId, 
            success: false, 
            error: error.message 
          })
        } else {
          results.push({ 
            userId, 
            agentId, 
            success: true, 
            requestsAdded: requestsToAdd 
          })
        }
      } catch (err) {
        results.push({ 
          userId, 
          agentId, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      processed: updates.length,
      successful: results.filter(r => r.success).length
    })

  } catch (error) {
    console.error('Error in PUT /api/usage/track-action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
