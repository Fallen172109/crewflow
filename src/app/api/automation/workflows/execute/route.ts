import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST /api/automation/workflows/execute - Execute workflow
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, triggerData = {}, testMode = false } = body

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
    }

    // Get workflow details
    const { data: workflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (!workflow.enabled && !testMode) {
      return NextResponse.json({ error: 'Workflow is disabled' }, { status: 400 })
    }

    // Check concurrent execution limit
    const { data: runningExecutions } = await supabase
      .from('workflow_executions')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('status', 'running')

    if ((runningExecutions?.length || 0) >= workflow.max_concurrent_runs) {
      return NextResponse.json({ 
        error: 'Maximum concurrent executions reached',
        limit: workflow.max_concurrent_runs,
        current: runningExecutions?.length || 0
      }, { status: 429 })
    }

    // Create execution record
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const { data: execution, error: createError } = await supabase
      .from('workflow_executions')
      .insert({
        id: executionId,
        workflow_id: workflowId,
        user_id: user.id,
        status: 'running',
        trigger_data: triggerData,
        total_steps: workflow.steps.length,
        current_step: 0,
        completed_steps: 0,
        step_results: [],
        execution_logs: []
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating execution:', createError)
      return NextResponse.json({ error: 'Failed to create execution' }, { status: 500 })
    }

    // Execute workflow asynchronously
    executeWorkflowAsync(executionId, workflow, triggerData, testMode)

    return NextResponse.json({ 
      success: true, 
      executionId,
      message: 'Workflow execution started',
      status: 'running'
    })

  } catch (error) {
    console.error('Error in POST /api/automation/workflows/execute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/automation/workflows/execute - Get execution status
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const executionId = searchParams.get('executionId')
    const workflowId = searchParams.get('workflowId')

    if (!executionId && !workflowId) {
      return NextResponse.json({ error: 'executionId or workflowId is required' }, { status: 400 })
    }

    let query = supabase
      .from('workflow_executions')
      .select('*')
      .eq('user_id', user.id)

    if (executionId) {
      query = query.eq('id', executionId)
    } else if (workflowId) {
      query = query.eq('workflow_id', workflowId).order('started_at', { ascending: false }).limit(10)
    }

    const { data: executions, error } = await query

    if (error) {
      console.error('Error fetching executions:', error)
      return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 })
    }

    if (executionId) {
      const execution = executions?.[0]
      if (!execution) {
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
      }

      return NextResponse.json({
        execution: {
          id: execution.id,
          workflowId: execution.workflow_id,
          status: execution.status,
          triggerData: execution.trigger_data,
          currentStep: execution.current_step,
          completedSteps: execution.completed_steps,
          totalSteps: execution.total_steps,
          stepResults: execution.step_results,
          finalResult: execution.final_result,
          errorMessage: execution.error_message,
          executionLogs: execution.execution_logs,
          resourcesConsumed: execution.resources_consumed,
          startedAt: execution.started_at,
          completedAt: execution.completed_at,
          duration: execution.duration
        }
      })
    } else {
      return NextResponse.json({
        executions: executions?.map(exec => ({
          id: exec.id,
          status: exec.status,
          startedAt: exec.started_at,
          completedAt: exec.completed_at,
          duration: exec.duration,
          currentStep: exec.current_step,
          totalSteps: exec.total_steps,
          errorMessage: exec.error_message
        })) || []
      })
    }

  } catch (error) {
    console.error('Error in GET /api/automation/workflows/execute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Async workflow execution function
async function executeWorkflowAsync(
  executionId: string, 
  workflow: any, 
  triggerData: any, 
  testMode: boolean
) {
  const supabase = createSupabaseServerClient()
  
  try {
    console.log(`🚀 Starting workflow execution: ${executionId}`)
    
    const executionLogs: string[] = []
    const stepResults: any[] = []
    const resourcesConsumed = {
      apiCalls: 0,
      cost: 0,
      processingTime: 0,
      agentsInvolved: []
    }

    executionLogs.push(`Workflow execution started at ${new Date().toISOString()}`)
    executionLogs.push(`Trigger data: ${JSON.stringify(triggerData)}`)

    // Execute each step
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      
      try {
        executionLogs.push(`Starting step ${i + 1}: ${step.type}`)
        
        // Update current step
        await supabase
          .from('workflow_executions')
          .update({ 
            current_step: i + 1,
            execution_logs: executionLogs
          })
          .eq('id', executionId)

        // Execute step
        const stepResult = await executeWorkflowStep(step, triggerData, stepResults, testMode)
        
        stepResults.push({
          stepIndex: i,
          stepType: step.type,
          result: stepResult,
          executedAt: new Date().toISOString(),
          success: true
        })

        // Update resources consumed
        resourcesConsumed.apiCalls += stepResult.apiCalls || 0
        resourcesConsumed.cost += stepResult.cost || 0
        resourcesConsumed.processingTime += stepResult.processingTime || 0
        
        if (stepResult.agentId && !resourcesConsumed.agentsInvolved.includes(stepResult.agentId)) {
          resourcesConsumed.agentsInvolved.push(stepResult.agentId)
        }

        executionLogs.push(`Step ${i + 1} completed successfully`)

        // Update completed steps
        await supabase
          .from('workflow_executions')
          .update({ 
            completed_steps: i + 1,
            step_results: stepResults,
            execution_logs: executionLogs,
            resources_consumed: resourcesConsumed
          })
          .eq('id', executionId)

      } catch (stepError) {
        console.error(`Error in step ${i + 1}:`, stepError)
        
        stepResults.push({
          stepIndex: i,
          stepType: step.type,
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
          executedAt: new Date().toISOString(),
          success: false
        })

        executionLogs.push(`Step ${i + 1} failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`)

        // Check retry policy
        const retryPolicy = workflow.retry_policy || { maxRetries: 0 }
        if (retryPolicy.maxRetries > 0) {
          // Implement retry logic here
          executionLogs.push(`Retrying step ${i + 1}...`)
          // For now, just continue to next step
        }

        // For critical errors, stop execution
        if (step.config?.critical !== false) {
          throw stepError
        }
      }
    }

    // Mark execution as completed
    const completedAt = new Date()
    const duration = completedAt.getTime() - new Date(workflow.created_at).getTime()

    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
        duration,
        final_result: {
          success: true,
          stepsCompleted: stepResults.length,
          totalSteps: workflow.steps.length,
          resourcesConsumed
        },
        execution_logs: [...executionLogs, `Workflow completed successfully at ${completedAt.toISOString()}`]
      })
      .eq('id', executionId)

    // Update workflow statistics
    await supabase.rpc('update_workflow_stats', {
      workflow_id: workflow.id,
      success: true
    })

    console.log(`✅ Workflow execution completed: ${executionId}`)

  } catch (error) {
    console.error(`❌ Workflow execution failed: ${executionId}`, error)
    
    const completedAt = new Date()
    const duration = completedAt.getTime() - new Date(workflow.created_at).getTime()

    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: completedAt.toISOString(),
        duration,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_logs: [...executionLogs, `Workflow failed at ${completedAt.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`]
      })
      .eq('id', executionId)

    // Update workflow statistics
    await supabase.rpc('update_workflow_stats', {
      workflow_id: workflow.id,
      success: false
    })
  }
}

// Execute individual workflow step
async function executeWorkflowStep(
  step: any, 
  triggerData: any, 
  previousResults: any[], 
  testMode: boolean
): Promise<any> {
  const startTime = Date.now()
  
  // Simulate step execution based on type
  switch (step.type) {
    case 'trigger':
      return {
        success: true,
        data: triggerData,
        processingTime: Date.now() - startTime,
        apiCalls: 0,
        cost: 0
      }

    case 'action':
      // Simulate API call or action execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500))
      
      return {
        success: true,
        actionType: step.config?.actionType || 'unknown',
        result: `Action ${step.config?.actionType || 'executed'} successfully`,
        processingTime: Date.now() - startTime,
        apiCalls: 1,
        cost: 0.01,
        agentId: step.config?.agentId
      }

    case 'condition':
      // Evaluate condition
      const conditionResult = Math.random() > 0.2 // 80% success rate
      
      return {
        success: true,
        conditionMet: conditionResult,
        condition: step.config?.condition || 'default',
        processingTime: Date.now() - startTime,
        apiCalls: 0,
        cost: 0
      }

    case 'delay':
      // Implement delay
      const delayMs = step.config?.delay || 1000
      if (!testMode) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
      
      return {
        success: true,
        delayMs: testMode ? 0 : delayMs,
        processingTime: Date.now() - startTime,
        apiCalls: 0,
        cost: 0
      }

    case 'agent':
      // Simulate agent collaboration
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000))
      
      return {
        success: true,
        agentId: step.config?.agentId || 'unknown',
        task: step.config?.task || 'Generic task',
        result: `Agent ${step.config?.agentId || 'unknown'} completed task successfully`,
        processingTime: Date.now() - startTime,
        apiCalls: 2,
        cost: 0.05
      }

    default:
      throw new Error(`Unknown step type: ${step.type}`)
  }
}
