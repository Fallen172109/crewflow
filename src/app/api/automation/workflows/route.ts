import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getTierLimits } from '@/lib/tier-enforcement'

// GET /api/automation/workflows - Get user's workflows
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const enabled = searchParams.get('enabled')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('automation_workflows')
      .select(`
        *,
        workflow_executions!inner(
          id,
          status,
          started_at,
          completed_at,
          duration
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    if (enabled !== null) {
      query = query.eq('enabled', enabled === 'true')
    }

    const { data: workflows, error } = await query

    if (error) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }

    // Transform data for frontend
    const transformedWorkflows = workflows?.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      enabled: workflow.enabled,
      version: workflow.version,
      triggerConfig: workflow.trigger_config,
      steps: workflow.steps,
      config: {
        maxConcurrentRuns: workflow.max_concurrent_runs,
        timeout: workflow.timeout,
        retryPolicy: workflow.retry_policy
      },
      stats: {
        totalRuns: workflow.total_runs,
        successfulRuns: workflow.successful_runs,
        failedRuns: workflow.failed_runs,
        successRate: workflow.total_runs > 0 ? (workflow.successful_runs / workflow.total_runs) * 100 : 0,
        lastRunAt: workflow.last_run_at ? new Date(workflow.last_run_at) : null
      },
      timing: {
        createdAt: new Date(workflow.created_at),
        updatedAt: new Date(workflow.updated_at)
      },
      recentExecutions: workflow.workflow_executions?.slice(0, 5) || []
    })) || []

    return NextResponse.json({ 
      workflows: transformedWorkflows,
      total: transformedWorkflows.length
    })

  } catch (error) {
    console.error('Error in GET /api/automation/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/automation/workflows - Create new workflow
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
    const hasWorkflowAccess = limits.features.includes('custom_workflows')

    if (!hasWorkflowAccess) {
      return NextResponse.json({ 
        error: 'Custom workflows require a higher tier subscription',
        requiredFeature: 'custom_workflows',
        currentTier: userProfile.subscription_tier
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category = 'custom',
      triggerConfig,
      steps,
      enabled = false,
      maxConcurrentRuns = 1,
      timeout = 600000,
      retryPolicy = {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    } = body

    // Validate required fields
    if (!name || !triggerConfig || !steps || !Array.isArray(steps)) {
      return NextResponse.json({ 
        error: 'name, triggerConfig, and steps (array) are required' 
      }, { status: 400 })
    }

    // Validate steps structure
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (!step.type || !step.config) {
        return NextResponse.json({ 
          error: `Step ${i + 1} must have type and config properties` 
        }, { status: 400 })
      }
    }

    // Check workflow limits based on tier
    const { data: existingWorkflows } = await supabase
      .from('automation_workflows')
      .select('id')
      .eq('user_id', user.id)

    const workflowLimit = userProfile.subscription_tier === 'enterprise' ? -1 : 
                         userProfile.subscription_tier === 'professional' ? 20 : 5

    if (workflowLimit !== -1 && (existingWorkflows?.length || 0) >= workflowLimit) {
      return NextResponse.json({ 
        error: `Workflow limit reached. Your ${userProfile.subscription_tier} plan allows ${workflowLimit} workflows.`,
        currentCount: existingWorkflows?.length || 0,
        limit: workflowLimit
      }, { status: 403 })
    }

    // Create workflow in database
    const { data: workflow, error: createError } = await supabase
      .from('automation_workflows')
      .insert({
        user_id: user.id,
        name,
        description,
        category,
        trigger_config: triggerConfig,
        steps,
        enabled,
        max_concurrent_runs: maxConcurrentRuns,
        timeout,
        retry_policy: retryPolicy
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating workflow:', createError)
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        enabled: workflow.enabled,
        createdAt: new Date(workflow.created_at)
      }
    })

  } catch (error) {
    console.error('Error in POST /api/automation/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/automation/workflows/[id] - Update workflow
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, ...updates } = body

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
    }

    // Verify workflow ownership
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Map frontend fields to database fields
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled
    if (updates.triggerConfig !== undefined) updateData.trigger_config = updates.triggerConfig
    if (updates.steps !== undefined) updateData.steps = updates.steps
    if (updates.maxConcurrentRuns !== undefined) updateData.max_concurrent_runs = updates.maxConcurrentRuns
    if (updates.timeout !== undefined) updateData.timeout = updates.timeout
    if (updates.retryPolicy !== undefined) updateData.retry_policy = updates.retryPolicy

    // Increment version if steps or trigger changed
    if (updates.steps !== undefined || updates.triggerConfig !== undefined) {
      updateData.version = existingWorkflow.version + 1
    }

    // Update workflow in database
    const { error: updateError } = await supabase
      .from('automation_workflows')
      .update(updateData)
      .eq('id', workflowId)

    if (updateError) {
      console.error('Error updating workflow:', updateError)
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/automation/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/automation/workflows/[id] - Delete workflow
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
    }

    // Verify workflow ownership
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('id, enabled')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Don't allow deletion of enabled workflows
    if (existingWorkflow.enabled) {
      return NextResponse.json({ 
        error: 'Cannot delete enabled workflow. Disable it first.' 
      }, { status: 400 })
    }

    // Delete from database (this will cascade delete executions)
    const { error: deleteError } = await supabase
      .from('automation_workflows')
      .delete()
      .eq('id', workflowId)

    if (deleteError) {
      console.error('Error deleting workflow:', deleteError)
      return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/automation/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
