import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { automationScheduler } from '@/lib/automation/scheduler'
import { getTierLimits } from '@/lib/tier-enforcement'

// GET /api/automation/tasks - Get user's scheduled tasks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskType = searchParams.get('taskType')
    const agentId = searchParams.get('agentId')
    const enabled = searchParams.get('enabled')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('scheduled_tasks')
      .select(`
        *,
        task_executions!inner(
          id,
          status,
          started_at,
          completed_at,
          duration,
          error
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (taskType) {
      query = query.eq('task_type', taskType)
    }
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }
    if (enabled !== null) {
      query = query.eq('enabled', enabled === 'true')
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching scheduled tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Transform data for frontend
    const transformedTasks = tasks?.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      taskType: task.task_type,
      agentId: task.agent_id,
      schedule: {
        frequency: task.frequency,
        cronExpression: task.cron_expression,
        timezone: task.timezone
      },
      config: {
        enabled: task.enabled,
        priority: task.priority,
        maxRetries: task.max_retries,
        timeout: task.timeout,
        parameters: task.parameters,
        conditions: task.conditions
      },
      stats: {
        runCount: task.run_count,
        successCount: task.success_count,
        failureCount: task.failure_count,
        successRate: task.run_count > 0 ? (task.success_count / task.run_count) * 100 : 0
      },
      timing: {
        lastRun: task.last_run ? new Date(task.last_run) : null,
        nextRun: task.next_run ? new Date(task.next_run) : null,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at)
      },
      recentExecutions: task.task_executions?.slice(0, 5) || []
    })) || []

    return NextResponse.json({ 
      tasks: transformedTasks,
      total: transformedTasks.length
    })

  } catch (error) {
    console.error('Error in GET /api/automation/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/automation/tasks - Create new scheduled task
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
    const hasAutomationAccess = limits.features.includes('scheduled_actions')

    if (!hasAutomationAccess) {
      return NextResponse.json({ 
        error: 'Scheduled automation requires a higher tier subscription',
        requiredFeature: 'scheduled_actions',
        currentTier: userProfile.subscription_tier
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      taskType,
      agentId,
      frequency,
      cronExpression,
      timezone = 'UTC',
      priority = 'medium',
      maxRetries = 3,
      timeout = 300000,
      parameters = {},
      conditions = {},
      enabled = true
    } = body

    // Validate required fields
    if (!name || !taskType || !agentId || !frequency) {
      return NextResponse.json({ 
        error: 'name, taskType, agentId, and frequency are required' 
      }, { status: 400 })
    }

    // Validate task type
    const validTaskTypes = [
      'inventory_check', 'price_optimization', 'order_fulfillment',
      'marketing_automation', 'data_sync', 'custom'
    ]
    if (!validTaskTypes.includes(taskType)) {
      return NextResponse.json({ 
        error: `Invalid task type. Must be one of: ${validTaskTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Validate frequency
    const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly', 'custom']
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json({ 
        error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` 
      }, { status: 400 })
    }

    // Validate cron expression for custom frequency
    if (frequency === 'custom' && !cronExpression) {
      return NextResponse.json({ 
        error: 'cronExpression is required when frequency is custom' 
      }, { status: 400 })
    }

    // Check task limits based on tier
    const { data: existingTasks } = await supabase
      .from('scheduled_tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('enabled', true)

    const taskLimit = userProfile.subscription_tier === 'enterprise' ? -1 : 
                     userProfile.subscription_tier === 'professional' ? 10 : 3

    if (taskLimit !== -1 && (existingTasks?.length || 0) >= taskLimit) {
      return NextResponse.json({ 
        error: `Task limit reached. Your ${userProfile.subscription_tier} plan allows ${taskLimit} scheduled tasks.`,
        currentCount: existingTasks?.length || 0,
        limit: taskLimit
      }, { status: 403 })
    }

    // Calculate next run time
    const nextRun = calculateNextRun(frequency, cronExpression, timezone)

    // Create task in database
    const { data: task, error: createError } = await supabase
      .from('scheduled_tasks')
      .insert({
        user_id: user.id,
        name,
        description,
        task_type: taskType,
        agent_id: agentId,
        frequency,
        cron_expression: cronExpression,
        timezone,
        priority,
        max_retries: maxRetries,
        timeout,
        parameters,
        conditions,
        enabled,
        next_run: nextRun.toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating scheduled task:', createError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Add task to scheduler if enabled
    if (enabled) {
      const scheduledTask = {
        id: task.id,
        userId: user.id,
        agentId,
        taskType,
        schedule: {
          frequency,
          cronExpression,
          timezone
        },
        config: {
          enabled,
          priority,
          maxRetries,
          timeout,
          conditions,
          parameters
        },
        metadata: {
          name,
          description,
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at),
          nextRun,
          runCount: 0,
          successCount: 0,
          failureCount: 0
        }
      }

      await automationScheduler.addTask(scheduledTask)
    }

    return NextResponse.json({ 
      success: true, 
      task: {
        id: task.id,
        name: task.name,
        taskType: task.task_type,
        agentId: task.agent_id,
        enabled: task.enabled,
        nextRun,
        createdAt: new Date(task.created_at)
      }
    })

  } catch (error) {
    console.error('Error in POST /api/automation/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/automation/tasks/[id] - Update scheduled task
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, ...updates } = body

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    // Verify task ownership
    const { data: existingTask, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Map frontend fields to database fields
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled
    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.maxRetries !== undefined) updateData.max_retries = updates.maxRetries
    if (updates.timeout !== undefined) updateData.timeout = updates.timeout
    if (updates.parameters !== undefined) updateData.parameters = updates.parameters
    if (updates.conditions !== undefined) updateData.conditions = updates.conditions
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency
    if (updates.cronExpression !== undefined) updateData.cron_expression = updates.cronExpression
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone

    // Recalculate next run if schedule changed
    if (updates.frequency || updates.cronExpression || updates.timezone) {
      const nextRun = calculateNextRun(
        updates.frequency || existingTask.frequency,
        updates.cronExpression || existingTask.cron_expression,
        updates.timezone || existingTask.timezone
      )
      updateData.next_run = nextRun.toISOString()
    }

    // Update task in database
    const { error: updateError } = await supabase
      .from('scheduled_tasks')
      .update(updateData)
      .eq('id', taskId)

    if (updateError) {
      console.error('Error updating scheduled task:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // Update scheduler
    if (updates.enabled === false) {
      await automationScheduler.pauseTask(taskId)
    } else if (updates.enabled === true && !existingTask.enabled) {
      await automationScheduler.resumeTask(taskId)
    } else if (existingTask.enabled) {
      // Remove and re-add task with new configuration
      await automationScheduler.removeTask(taskId)
      
      // Fetch updated task data
      const { data: updatedTask } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (updatedTask) {
        const scheduledTask = transformDbTaskToScheduledTask(updatedTask)
        await automationScheduler.addTask(scheduledTask)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Task updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/automation/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/automation/tasks/[id] - Delete scheduled task
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    // Verify task ownership
    const { data: existingTask, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Remove from scheduler
    await automationScheduler.removeTask(taskId)

    // Delete from database (this will cascade delete executions)
    const { error: deleteError } = await supabase
      .from('scheduled_tasks')
      .delete()
      .eq('id', taskId)

    if (deleteError) {
      console.error('Error deleting scheduled task:', deleteError)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Task deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/automation/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function calculateNextRun(frequency: string, cronExpression?: string, timezone = 'UTC'): Date {
  const now = new Date()
  
  switch (frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000)
    case 'daily':
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return tomorrow
    case 'weekly':
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      nextWeek.setHours(0, 0, 0, 0)
      return nextWeek
    case 'monthly':
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      nextMonth.setHours(0, 0, 0, 0)
      return nextMonth
    case 'custom':
      if (cronExpression) {
        // TODO: Implement proper cron parsing
        return new Date(now.getTime() + 60 * 60 * 1000) // Default to 1 hour
      }
      return new Date(now.getTime() + 60 * 60 * 1000)
    default:
      return new Date(now.getTime() + 60 * 60 * 1000)
  }
}

function transformDbTaskToScheduledTask(dbTask: any): any {
  return {
    id: dbTask.id,
    userId: dbTask.user_id,
    agentId: dbTask.agent_id,
    taskType: dbTask.task_type,
    schedule: {
      frequency: dbTask.frequency,
      cronExpression: dbTask.cron_expression,
      timezone: dbTask.timezone
    },
    config: {
      enabled: dbTask.enabled,
      priority: dbTask.priority,
      maxRetries: dbTask.max_retries,
      timeout: dbTask.timeout,
      conditions: dbTask.conditions,
      parameters: dbTask.parameters
    },
    metadata: {
      name: dbTask.name,
      description: dbTask.description,
      createdAt: new Date(dbTask.created_at),
      updatedAt: new Date(dbTask.updated_at),
      lastRun: dbTask.last_run ? new Date(dbTask.last_run) : undefined,
      nextRun: dbTask.next_run ? new Date(dbTask.next_run) : undefined,
      runCount: dbTask.run_count,
      successCount: dbTask.success_count,
      failureCount: dbTask.failure_count
    }
  }
}
