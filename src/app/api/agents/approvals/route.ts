import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { processApprovalResponse } from '@/lib/agents/approval-workflow'

// GET /api/agents/approvals - Get pending approval requests for user
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    let query = supabase
      .from('approval_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', status)
      .order('requested_at', { ascending: false })
      .limit(limit)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: approvals, error } = await query

    if (error) {
      console.error('Error fetching approvals:', error)
      return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedApprovals = approvals?.map(approval => ({
      id: approval.id,
      userId: approval.user_id,
      agentId: approval.agent_id,
      integrationId: approval.integration_id,
      actionType: approval.action_type,
      actionDescription: approval.action_description,
      actionData: approval.action_data,
      riskLevel: approval.risk_level,
      requestedAt: new Date(approval.requested_at),
      expiresAt: new Date(approval.expires_at),
      status: approval.status,
      estimatedImpact: approval.estimated_impact,
      context: approval.context || {}
    })) || []

    return NextResponse.json({ approvals: transformedApprovals })

  } catch (error) {
    console.error('Error in GET /api/agents/approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agents/approvals/[id]/respond - Respond to approval request
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, approved, reason, modifiedParams } = body

    if (!requestId || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the approval request belongs to the user
    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !approvalRequest) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 })
    }

    // Check if request has expired
    const now = new Date()
    const expiresAt = new Date(approvalRequest.expires_at)
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('approval_requests')
        .update({ status: 'expired' })
        .eq('id', requestId)
      
      return NextResponse.json({ error: 'Approval request has expired' }, { status: 400 })
    }

    // Process the approval response
    const response = {
      approved,
      reason,
      modifiedParams
    }

    const result = await processApprovalResponse(requestId, response)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: approved ? 'Action approved and executed' : 'Action rejected',
      executed: approved
    })

  } catch (error) {
    console.error('Error in POST /api/agents/approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/agents/approvals/[id] - Cancel pending approval request
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('id')

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    // Verify the approval request belongs to the user and is pending
    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('id')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !approvalRequest) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 })
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('approval_requests')
      .update({ 
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        response_reason: 'Cancelled by user'
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error cancelling approval:', updateError)
      return NextResponse.json({ error: 'Failed to cancel approval' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Approval request cancelled' })

  } catch (error) {
    console.error('Error in DELETE /api/agents/approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
