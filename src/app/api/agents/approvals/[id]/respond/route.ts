import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { processApprovalResponse } from '@/lib/agents/approval-workflow'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = params.id
    const body = await request.json()
    const { approved, reason, modifiedParams } = body

    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'approved field is required and must be boolean' }, { status: 400 })
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
      return NextResponse.json({ error: 'Approval request not found or already processed' }, { status: 404 })
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
      reason: reason || (approved ? 'Approved by user' : 'Rejected by user'),
      modifiedParams
    }

    const result = await processApprovalResponse(requestId, response)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to process approval' }, { status: 500 })
    }

    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: approved ? 'Action approved and will be executed' : 'Action rejected',
      executed: approved,
      requestId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in POST /api/agents/approvals/[id]/respond:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
