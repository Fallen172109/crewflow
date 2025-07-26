import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { autonomousScheduler } from '@/lib/automation/autonomous-scheduler'
import { getTierLimits } from '@/lib/tier-enforcement'

// GET /api/automation/autonomous - Get autonomous actions and templates
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeTemplates = searchParams.get('includeTemplates') === 'true'
    const includePending = searchParams.get('includePending') === 'true'
    const includeHistory = searchParams.get('includeHistory') === 'true'
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')

    const response: any = {}

    // Get action templates
    if (includeTemplates) {
      const templates = await autonomousScheduler.getActionTemplates()
      response.templates = agentId 
        ? templates.filter(t => t.agentId === agentId)
        : templates
    }

    // Get pending actions
    if (includePending) {
      const pendingActions = await autonomousScheduler.getPendingActions(user.id)
      response.pendingActions = agentId
        ? pendingActions.filter(a => a.agentId === agentId)
        : pendingActions
    }

    // Get action history
    if (includeHistory) {
      let query = supabase
        .from('autonomous_actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (agentId) {
        query = query.eq('agent_id', agentId)
      }
      if (status) {
        query = query.eq('status', status)
      }

      const { data: history, error: historyError } = await query

      if (historyError) {
        console.error('Error fetching action history:', historyError)
        response.history = []
      } else {
        response.history = history?.map(action => ({
          id: action.id,
          agentId: action.agent_id,
          actionType: action.action_type,
          status: action.status,
          priority: action.priority,
          approvalRequired: action.approval_required,
          approvalStatus: action.approval_status,
          createdAt: action.created_at,
          scheduledFor: action.scheduled_for,
          executedAt: action.executed_at,
          completedAt: action.completed_at,
          retryCount: action.retry_count,
          errorMessage: action.error_message,
          result: action.result
        })) || []
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/automation/autonomous:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/automation/autonomous - Schedule new autonomous action
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user's tier permissions
    const { data: userProfile } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const limits = getTierLimits(userProfile.subscription_tier)
    const hasAutonomousAccess = limits.features.includes('scheduled_actions')

    if (!hasAutonomousAccess) {
      return NextResponse.json({ 
        error: 'Autonomous actions require a higher tier subscription',
        requiredFeature: 'scheduled_actions',
        currentTier: userProfile.subscription_tier
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      agentId,
      actionType,
      actionData,
      triggerConditions = [],
      schedule = { type: 'immediate' },
      priority = 'medium',
      approvalRequired = false,
      dependencies = [],
      tags = [],
      maxRetries = 3
    } = body

    // Validate required fields
    if (!agentId || !actionType || !actionData) {
      return NextResponse.json({ 
        error: 'agentId, actionType, and actionData are required' 
      }, { status: 400 })
    }

    // Validate agent ID
    const validAgents = ['anchor', 'pearl', 'flint', 'splash', 'drake']
    if (!validAgents.includes(agentId)) {
      return NextResponse.json({ 
        error: `Invalid agentId. Must be one of: ${validAgents.join(', ')}` 
      }, { status: 400 })
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ 
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` 
      }, { status: 400 })
    }

    // Validate schedule type
    const validScheduleTypes = ['immediate', 'delayed', 'recurring', 'conditional']
    if (!validScheduleTypes.includes(schedule.type)) {
      return NextResponse.json({ 
        error: `Invalid schedule type. Must be one of: ${validScheduleTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Check autonomous action limits based on tier
    const { data: existingActions } = await supabase
      .from('autonomous_actions')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'scheduled', 'executing'])

    const actionLimit = userProfile.subscription_tier === 'enterprise' ? -1 : 
                       userProfile.subscription_tier === 'professional' ? 50 : 10

    if (actionLimit !== -1 && (existingActions?.length || 0) >= actionLimit) {
      return NextResponse.json({ 
        error: `Autonomous action limit reached. Your ${userProfile.subscription_tier} plan allows ${actionLimit} concurrent actions.`,
        currentCount: existingActions?.length || 0,
        limit: actionLimit
      }, { status: 403 })
    }

    // Schedule the autonomous action
    const actionId = await autonomousScheduler.scheduleAutonomousAction(
      user.id,
      agentId,
      actionType,
      actionData,
      {
        triggerConditions,
        schedule,
        priority,
        approvalRequired,
        dependencies,
        tags,
        maxRetries
      }
    )

    return NextResponse.json({ 
      success: true, 
      actionId,
      message: 'Autonomous action scheduled successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/automation/autonomous:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/automation/autonomous - Update autonomous action
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { actionId, action } = body

    if (!actionId) {
      return NextResponse.json({ error: 'actionId is required' }, { status: 400 })
    }

    // Verify action ownership
    const { data: existingAction, error: fetchError } = await supabase
      .from('autonomous_actions')
      .select('*')
      .eq('id', actionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // Only allow updates to pending or scheduled actions
    if (!['pending', 'scheduled'].includes(existingAction.status)) {
      return NextResponse.json({ 
        error: 'Can only update pending or scheduled actions' 
      }, { status: 400 })
    }

    if (action === 'cancel') {
      await autonomousScheduler.cancelAction(actionId)
      return NextResponse.json({ 
        success: true, 
        message: 'Action cancelled successfully' 
      })
    }

    if (action === 'trigger') {
      await autonomousScheduler.triggerManualAction(actionId)
      return NextResponse.json({ 
        success: true, 
        message: 'Action triggered manually' 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in PUT /api/automation/autonomous:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/automation/autonomous - Delete autonomous action
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const actionId = searchParams.get('actionId')

    if (!actionId) {
      return NextResponse.json({ error: 'actionId is required' }, { status: 400 })
    }

    // Verify action ownership
    const { data: existingAction, error: fetchError } = await supabase
      .from('autonomous_actions')
      .select('id, status')
      .eq('id', actionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // Don't allow deletion of executing actions
    if (existingAction.status === 'executing') {
      return NextResponse.json({ 
        error: 'Cannot delete executing action. Cancel it first.' 
      }, { status: 400 })
    }

    // Cancel if scheduled
    if (['pending', 'scheduled'].includes(existingAction.status)) {
      await autonomousScheduler.cancelAction(actionId)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('autonomous_actions')
      .delete()
      .eq('id', actionId)

    if (deleteError) {
      console.error('Error deleting autonomous action:', deleteError)
      return NextResponse.json({ error: 'Failed to delete action' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Action deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/automation/autonomous:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
