import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET /api/agents/logs - Get action logs for user
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const integrationId = searchParams.get('integrationId')
    const actionType = searchParams.get('actionType')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'executed_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('agent_actions')
      .select('*')
      .eq('user_id', user.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit)

    // Apply filters
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (integrationId) {
      query = query.eq('integration_id', integrationId)
    }

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (dateFrom) {
      query = query.gte('executed_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('executed_at', dateTo)
    }

    if (search) {
      query = query.ilike('action_description', `%${search}%`)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching action logs:', error)
      return NextResponse.json({ error: 'Failed to fetch action logs' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedLogs = logs?.map(log => ({
      id: log.id,
      userId: log.user_id,
      agentId: log.agent_id,
      agentName: log.agent_name || log.agent_id,
      integrationId: log.integration_id,
      actionType: log.action_type,
      actionDescription: log.action_description,
      status: log.status,
      executedAt: new Date(log.executed_at),
      duration: log.duration_ms || 0,
      metadata: log.metadata || {},
      error: log.error_message,
      affectedItems: log.affected_items || 0,
      cost: log.cost_usd
    })) || []

    return NextResponse.json({ logs: transformedLogs })

  } catch (error) {
    console.error('Error in GET /api/agents/logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agents/logs - Create new action log entry
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      agentId,
      agentName,
      integrationId,
      actionType,
      actionDescription,
      status = 'pending',
      duration = 0,
      metadata = {},
      error: errorMessage,
      affectedItems = 0,
      cost
    } = body

    if (!agentId || !actionType || !actionDescription) {
      return NextResponse.json({ 
        error: 'agentId, actionType, and actionDescription are required' 
      }, { status: 400 })
    }

    // Insert action log
    const { data: log, error } = await supabase
      .from('agent_actions')
      .insert({
        user_id: user.id,
        agent_id: agentId,
        agent_name: agentName || agentId,
        integration_id: integrationId,
        action_type: actionType,
        action_description: actionDescription,
        status,
        executed_at: new Date().toISOString(),
        duration_ms: duration,
        metadata,
        error_message: errorMessage,
        affected_items: affectedItems,
        cost_usd: cost
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating action log:', error)
      return NextResponse.json({ error: 'Failed to create action log' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      log: {
        id: log.id,
        userId: log.user_id,
        agentId: log.agent_id,
        agentName: log.agent_name,
        integrationId: log.integration_id,
        actionType: log.action_type,
        actionDescription: log.action_description,
        status: log.status,
        executedAt: new Date(log.executed_at),
        duration: log.duration_ms,
        metadata: log.metadata,
        error: log.error_message,
        affectedItems: log.affected_items,
        cost: log.cost_usd
      }
    })

  } catch (error) {
    console.error('Error in POST /api/agents/logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/agents/logs/[id] - Update action log status
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { logId, status, duration, error: errorMessage, metadata, cost } = body

    if (!logId || !status) {
      return NextResponse.json({ 
        error: 'logId and status are required' 
      }, { status: 400 })
    }

    // Update the log
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (duration !== undefined) updateData.duration_ms = duration
    if (errorMessage !== undefined) updateData.error_message = errorMessage
    if (metadata !== undefined) updateData.metadata = metadata
    if (cost !== undefined) updateData.cost_usd = cost

    const { error } = await supabase
      .from('agent_actions')
      .update(updateData)
      .eq('id', logId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating action log:', error)
      return NextResponse.json({ error: 'Failed to update action log' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Action log updated successfully' })

  } catch (error) {
    console.error('Error in PUT /api/agents/logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/agents/logs - Delete action logs (bulk or single)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const logId = searchParams.get('logId')
    const olderThan = searchParams.get('olderThan') // ISO date string
    const agentId = searchParams.get('agentId')

    let query = supabase
      .from('agent_actions')
      .delete()
      .eq('user_id', user.id)

    if (logId) {
      // Delete specific log
      query = query.eq('id', logId)
    } else if (olderThan) {
      // Delete logs older than specified date
      query = query.lt('executed_at', olderThan)
      
      if (agentId) {
        query = query.eq('agent_id', agentId)
      }
    } else {
      return NextResponse.json({ 
        error: 'Either logId or olderThan parameter is required' 
      }, { status: 400 })
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting action logs:', error)
      return NextResponse.json({ error: 'Failed to delete action logs' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Action logs deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/agents/logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
