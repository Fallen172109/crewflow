import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { collaborationManager } from '@/lib/automation/collaboration'

// GET /api/automation/collaboration - Get collaboration history and stats
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
    const includeStats = searchParams.get('includeStats') === 'true'
    const includeCapabilities = searchParams.get('includeCapabilities') === 'true'
    const includeActive = searchParams.get('includeActive') === 'true'

    const response: any = {}

    // Get collaboration history
    const history = await collaborationManager.getCollaborationHistory(user.id, agentId || undefined)
    response.history = history

    // Get collaboration statistics
    if (includeStats) {
      const stats = await collaborationManager.getCollaborationStats(user.id)
      response.stats = stats
    }

    // Get agent capabilities
    if (includeCapabilities) {
      const capabilities = collaborationManager.getAgentCapabilities()
      response.capabilities = capabilities
    }

    // Get active collaborations
    if (includeActive) {
      const activeCollaborations = collaborationManager.getActiveCollaborations()
        .filter(collab => collab.userId === user.id)
      response.activeCollaborations = activeCollaborations
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/automation/collaboration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/automation/collaboration - Request new collaboration
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
      initiatingAgentId,
      taskType,
      description,
      data = {},
      priority = 'medium',
      requiredCapabilities = [],
      deadline,
      context = {}
    } = body

    // Validate required fields
    if (!initiatingAgentId || !taskType || !description) {
      return NextResponse.json({ 
        error: 'initiatingAgentId, taskType, and description are required' 
      }, { status: 400 })
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ 
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` 
      }, { status: 400 })
    }

    // Create collaboration request
    const collaborationRequest = {
      taskType,
      description,
      data,
      priority,
      requiredCapabilities,
      deadline: deadline ? new Date(deadline) : undefined,
      context
    }

    // Request collaboration
    const collaborationId = await collaborationManager.requestCollaboration(
      user.id,
      initiatingAgentId,
      collaborationRequest
    )

    return NextResponse.json({ 
      success: true, 
      collaborationId,
      message: 'Collaboration request created successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/automation/collaboration:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/automation/collaboration - Respond to collaboration request
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { collaborationId, response, feedback } = body

    // Validate required fields
    if (!collaborationId || !response) {
      return NextResponse.json({ 
        error: 'collaborationId and response are required' 
      }, { status: 400 })
    }

    // Validate response
    const validResponses = ['accept', 'reject']
    if (!validResponses.includes(response)) {
      return NextResponse.json({ 
        error: `Invalid response. Must be one of: ${validResponses.join(', ')}` 
      }, { status: 400 })
    }

    // Verify collaboration exists and user has permission
    const { data: collaboration, error: fetchError } = await supabase
      .from('agent_collaborations')
      .select('*')
      .eq('id', collaborationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !collaboration) {
      return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })
    }

    if (collaboration.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Collaboration has already been responded to' 
      }, { status: 400 })
    }

    // Respond to collaboration
    await collaborationManager.respondToCollaboration(collaborationId, response, feedback)

    return NextResponse.json({ 
      success: true, 
      message: `Collaboration ${response}ed successfully`
    })

  } catch (error) {
    console.error('Error in PUT /api/automation/collaboration:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/automation/collaboration - Cancel collaboration request
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const collaborationId = searchParams.get('collaborationId')

    if (!collaborationId) {
      return NextResponse.json({ error: 'collaborationId is required' }, { status: 400 })
    }

    // Verify collaboration exists and user has permission
    const { data: collaboration, error: fetchError } = await supabase
      .from('agent_collaborations')
      .select('*')
      .eq('id', collaborationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !collaboration) {
      return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })
    }

    // Only allow cancellation of pending or accepted collaborations
    if (!['pending', 'accepted'].includes(collaboration.status)) {
      return NextResponse.json({
        error: 'Can only cancel pending or accepted collaborations'
      }, { status: 400 })
    }

    // Update collaboration status to cancelled
    const { error: updateError } = await supabase
      .from('agent_collaborations')
      .update({
        status: 'rejected',
        completed_at: new Date().toISOString(),
        feedback: 'Cancelled by user'
      })
      .eq('id', collaborationId)

    if (updateError) {
      console.error('Error cancelling collaboration:', updateError)
      return NextResponse.json({ error: 'Failed to cancel collaboration' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Collaboration cancelled successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/automation/collaboration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
