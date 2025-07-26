import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getTierLimits } from '@/lib/tier-enforcement'

export interface ScheduledTask {
  id: string
  userId: string
  agentId: string
  taskType: 'inventory_check' | 'price_optimization' | 'order_fulfillment' | 'marketing_automation' | 'data_sync' | 'custom'
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'
    cronExpression?: string
    timezone: string
  }
  config: {
    enabled: boolean
    priority: 'low' | 'medium' | 'high' | 'critical'
    maxRetries: number
    timeout: number
    conditions?: any
    parameters: any
  }
  metadata: {
    name: string
    description: string
    createdAt: Date
    updatedAt: Date
    lastRun?: Date
    nextRun?: Date
    runCount: number
    successCount: number
    failureCount: number
  }
}

export interface TaskExecution {
  id: string
  taskId: string
  userId: string
  agentId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  duration?: number
  result?: any
  error?: string
  logs: string[]
  resourcesUsed: {
    requests: number
    cost: number
    processingTime: number
  }
}

class AutomationScheduler {
  private static instance: AutomationScheduler
  private runningTasks: Map<string, NodeJS.Timeout> = new Map()
  private taskQueue: ScheduledTask[] = []
  private isProcessing = false

  static getInstance(): AutomationScheduler {
    if (!AutomationScheduler.instance) {
      AutomationScheduler.instance = new AutomationScheduler()
    }
    return AutomationScheduler.instance
  }

  async initialize() {
    console.log('🤖 Initializing CrewFlow Automation Scheduler...')
    await this.loadScheduledTasks()
    this.startTaskProcessor()
    console.log('✅ Automation Scheduler initialized successfully')
  }

  private async loadScheduledTasks() {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data: tasks, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false })

      if (error) {
        console.error('Error loading scheduled tasks:', error)
        return
      }

      for (const task of tasks || []) {
        await this.scheduleTask(this.transformDbTask(task))
      }

      console.log(`📅 Loaded ${tasks?.length || 0} scheduled tasks`)
    } catch (error) {
      console.error('Error initializing scheduler:', error)
    }
  }

  private transformDbTask(dbTask: any): ScheduledTask {
    return {
      id: dbTask.id,
      userId: dbTask.user_id,
      agentId: dbTask.agent_id,
      taskType: dbTask.task_type,
      schedule: {
        frequency: dbTask.frequency,
        cronExpression: dbTask.cron_expression,
        timezone: dbTask.timezone || 'UTC'
      },
      config: {
        enabled: dbTask.enabled,
        priority: dbTask.priority,
        maxRetries: dbTask.max_retries || 3,
        timeout: dbTask.timeout || 300000, // 5 minutes
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
        runCount: dbTask.run_count || 0,
        successCount: dbTask.success_count || 0,
        failureCount: dbTask.failure_count || 0
      }
    }
  }

  async scheduleTask(task: ScheduledTask): Promise<void> {
    try {
      // Check if user has permission to run automated tasks
      const canRun = await this.checkTaskPermissions(task.userId, task.taskType)
      if (!canRun) {
        console.log(`❌ Task ${task.id} skipped - insufficient permissions`)
        return
      }

      // Calculate next run time
      const nextRun = this.calculateNextRun(task.schedule)
      const delay = nextRun.getTime() - Date.now()

      if (delay > 0) {
        const timeout = setTimeout(async () => {
          await this.executeTask(task)
          // Reschedule for next run
          await this.scheduleTask(task)
        }, delay)

        this.runningTasks.set(task.id, timeout)
        
        // Update next run time in database
        await this.updateTaskNextRun(task.id, nextRun)
        
        console.log(`⏰ Scheduled task ${task.metadata.name} to run at ${nextRun.toISOString()}`)
      }
    } catch (error) {
      console.error(`Error scheduling task ${task.id}:`, error)
    }
  }

  private calculateNextRun(schedule: ScheduledTask['schedule']): Date {
    const now = new Date()
    
    switch (schedule.frequency) {
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
        if (schedule.cronExpression) {
          // TODO: Implement cron expression parsing
          return new Date(now.getTime() + 60 * 60 * 1000) // Default to 1 hour
        }
        return new Date(now.getTime() + 60 * 60 * 1000)
      default:
        return new Date(now.getTime() + 60 * 60 * 1000)
    }
  }

  private async checkTaskPermissions(userId: string, taskType: string): Promise<boolean> {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data: user, error } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status')
        .eq('id', userId)
        .single()

      if (error || !user) {
        return false
      }

      const limits = getTierLimits(user.subscription_tier)
      
      // Check if user's tier supports automation
      const automationFeatures = ['scheduled_actions', 'bulk_operations', 'custom_workflows']
      const hasAutomationAccess = automationFeatures.some(feature => 
        limits.features.includes(feature)
      )

      return hasAutomationAccess && user.subscription_status === 'active'
    } catch (error) {
      console.error('Error checking task permissions:', error)
      return false
    }
  }

  private async executeTask(task: ScheduledTask): Promise<TaskExecution> {
    const execution: TaskExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: task.id,
      userId: task.userId,
      agentId: task.agentId,
      status: 'running',
      startedAt: new Date(),
      logs: [],
      resourcesUsed: {
        requests: 0,
        cost: 0,
        processingTime: 0
      }
    }

    try {
      console.log(`🚀 Executing task: ${task.metadata.name}`)
      execution.logs.push(`Task execution started at ${execution.startedAt.toISOString()}`)

      // Save execution record
      await this.saveExecution(execution)

      // Execute the actual task based on type
      const result = await this.runTaskByType(task, execution)
      
      execution.status = 'completed'
      execution.completedAt = new Date()
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime()
      execution.result = result
      execution.logs.push(`Task completed successfully in ${execution.duration}ms`)

      // Update task statistics
      await this.updateTaskStats(task.id, true)
      
      console.log(`✅ Task ${task.metadata.name} completed successfully`)

    } catch (error) {
      execution.status = 'failed'
      execution.completedAt = new Date()
      execution.duration = execution.completedAt!.getTime() - execution.startedAt.getTime()
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.logs.push(`Task failed: ${execution.error}`)

      // Update task statistics
      await this.updateTaskStats(task.id, false)
      
      console.error(`❌ Task ${task.metadata.name} failed:`, error)
    } finally {
      // Save final execution state
      await this.saveExecution(execution)
    }

    return execution
  }

  private async runTaskByType(task: ScheduledTask, execution: TaskExecution): Promise<any> {
    switch (task.taskType) {
      case 'inventory_check':
        return await this.runInventoryCheck(task, execution)
      case 'price_optimization':
        return await this.runPriceOptimization(task, execution)
      case 'order_fulfillment':
        return await this.runOrderFulfillment(task, execution)
      case 'marketing_automation':
        return await this.runMarketingAutomation(task, execution)
      case 'data_sync':
        return await this.runDataSync(task, execution)
      case 'custom':
        return await this.runCustomTask(task, execution)
      default:
        throw new Error(`Unknown task type: ${task.taskType}`)
    }
  }

  private async runInventoryCheck(task: ScheduledTask, execution: TaskExecution): Promise<any> {
    execution.logs.push('Starting inventory check...')
    
    // Get user's Shopify stores
    const stores = await this.getUserStores(task.userId)
    const results = []

    for (const store of stores) {
      execution.logs.push(`Checking inventory for store: ${store.name}`)
      
      // Fetch products with low inventory
      const lowStockProducts = await this.checkLowStock(store, task.config.parameters)
      
      if (lowStockProducts.length > 0) {
        execution.logs.push(`Found ${lowStockProducts.length} low stock products`)
        
        // Create notifications or trigger actions
        await this.createInventoryAlerts(task.userId, store.id, lowStockProducts)
        
        results.push({
          storeId: store.id,
          storeName: store.name,
          lowStockProducts: lowStockProducts.length,
          products: lowStockProducts
        })
      }
    }

    execution.resourcesUsed.requests += stores.length * 2 // Estimate API calls
    execution.resourcesUsed.cost += stores.length * 0.01 // Estimate cost

    return { checkedStores: stores.length, alerts: results }
  }

  private async runPriceOptimization(task: ScheduledTask, execution: TaskExecution): Promise<any> {
    execution.logs.push('Starting price optimization analysis...')
    
    const stores = await this.getUserStores(task.userId)
    const results = []

    for (const store of stores) {
      execution.logs.push(`Analyzing prices for store: ${store.name}`)
      
      // Analyze product performance and suggest price changes
      const priceRecommendations = await this.analyzePricing(store, task.config.parameters)
      
      if (priceRecommendations.length > 0) {
        execution.logs.push(`Generated ${priceRecommendations.length} price recommendations`)
        
        // Create approval requests for price changes
        await this.createPriceChangeRequests(task.userId, task.agentId, store.id, priceRecommendations)
        
        results.push({
          storeId: store.id,
          storeName: store.name,
          recommendations: priceRecommendations.length,
          details: priceRecommendations
        })
      }
    }

    execution.resourcesUsed.requests += stores.length * 5 // More complex analysis
    execution.resourcesUsed.cost += stores.length * 0.05

    return { analyzedStores: stores.length, recommendations: results }
  }

  private async runOrderFulfillment(task: ScheduledTask, execution: TaskExecution): Promise<any> {
    execution.logs.push('Checking for unfulfilled orders...')
    
    const stores = await this.getUserStores(task.userId)
    const results = []

    for (const store of stores) {
      execution.logs.push(`Checking orders for store: ${store.name}`)
      
      // Get unfulfilled orders
      const unfulfilled = await this.getUnfulfilledOrders(store)
      
      if (unfulfilled.length > 0) {
        execution.logs.push(`Found ${unfulfilled.length} unfulfilled orders`)
        
        // Create fulfillment suggestions
        await this.createFulfillmentSuggestions(task.userId, task.agentId, store.id, unfulfilled)
        
        results.push({
          storeId: store.id,
          storeName: store.name,
          unfulfilledOrders: unfulfilled.length,
          orders: unfulfilled
        })
      }
    }

    execution.resourcesUsed.requests += stores.length * 3
    execution.resourcesUsed.cost += stores.length * 0.02

    return { checkedStores: stores.length, fulfillmentSuggestions: results }
  }

  private async runMarketingAutomation(task: ScheduledTask, execution: TaskExecution): Promise<any> {
    execution.logs.push('Running marketing automation...')
    
    // This would integrate with marketing tools and campaigns
    // For now, return a placeholder
    return { campaignsCreated: 0, emailsSent: 0 }
  }

  private async runDataSync(task: ScheduledTask, execution: TaskExecution): Promise<any> {
    execution.logs.push('Syncing data across integrations...')
    
    // This would sync data between different platforms
    // For now, return a placeholder
    return { recordsSynced: 0, errors: 0 }
  }

  private async runCustomTask(task: ScheduledTask, execution: TaskExecution): Promise<any> {
    execution.logs.push('Running custom automation task...')
    
    // This would execute user-defined custom workflows
    // For now, return a placeholder
    return { customActionsExecuted: 0 }
  }

  // Helper methods (these would be implemented with actual Shopify API calls)
  private async getUserStores(userId: string): Promise<any[]> {
    const supabase = createSupabaseServerClient()
    const { data: stores } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    return stores || []
  }

  private async checkLowStock(store: any, parameters: any): Promise<any[]> {
    // Implement Shopify API call to check inventory
    return []
  }

  private async analyzePricing(store: any, parameters: any): Promise<any[]> {
    // Implement pricing analysis logic
    return []
  }

  private async getUnfulfilledOrders(store: any): Promise<any[]> {
    // Implement Shopify API call to get unfulfilled orders
    return []
  }

  private async createInventoryAlerts(userId: string, storeId: string, products: any[]): Promise<void> {
    // Create notifications for low stock
  }

  private async createPriceChangeRequests(userId: string, agentId: string, storeId: string, recommendations: any[]): Promise<void> {
    // Create approval requests for price changes
  }

  private async createFulfillmentSuggestions(userId: string, agentId: string, storeId: string, orders: any[]): Promise<void> {
    // Create fulfillment suggestions
  }

  private async updateTaskNextRun(taskId: string, nextRun: Date): Promise<void> {
    const supabase = createSupabaseServerClient()
    await supabase
      .from('scheduled_tasks')
      .update({ next_run: nextRun.toISOString() })
      .eq('id', taskId)
  }

  private async updateTaskStats(taskId: string, success: boolean): Promise<void> {
    const supabase = createSupabaseServerClient()
    
    if (success) {
      await supabase.rpc('increment_task_success', { task_id: taskId })
    } else {
      await supabase.rpc('increment_task_failure', { task_id: taskId })
    }
    
    await supabase
      .from('scheduled_tasks')
      .update({ last_run: new Date().toISOString() })
      .eq('id', taskId)
  }

  private async saveExecution(execution: TaskExecution): Promise<void> {
    const supabase = createSupabaseServerClient()
    
    await supabase
      .from('task_executions')
      .upsert({
        id: execution.id,
        task_id: execution.taskId,
        user_id: execution.userId,
        agent_id: execution.agentId,
        status: execution.status,
        started_at: execution.startedAt.toISOString(),
        completed_at: execution.completedAt?.toISOString(),
        duration: execution.duration,
        result: execution.result,
        error: execution.error,
        logs: execution.logs,
        resources_used: execution.resourcesUsed
      })
  }

  private startTaskProcessor(): void {
    // Process task queue every minute
    setInterval(() => {
      if (!this.isProcessing && this.taskQueue.length > 0) {
        this.processTaskQueue()
      }
    }, 60000)
  }

  private async processTaskQueue(): Promise<void> {
    this.isProcessing = true
    
    try {
      while (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()
        if (task) {
          await this.executeTask(task)
        }
      }
    } catch (error) {
      console.error('Error processing task queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  async addTask(task: ScheduledTask): Promise<void> {
    await this.scheduleTask(task)
  }

  async removeTask(taskId: string): Promise<void> {
    const timeout = this.runningTasks.get(taskId)
    if (timeout) {
      clearTimeout(timeout)
      this.runningTasks.delete(taskId)
    }
  }

  async pauseTask(taskId: string): Promise<void> {
    await this.removeTask(taskId)
    
    const supabase = createSupabaseServerClient()
    await supabase
      .from('scheduled_tasks')
      .update({ enabled: false })
      .eq('id', taskId)
  }

  async resumeTask(taskId: string): Promise<void> {
    const supabase = createSupabaseServerClient()
    
    const { data: task } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (task) {
      await supabase
        .from('scheduled_tasks')
        .update({ enabled: true })
        .eq('id', taskId)
      
      await this.scheduleTask(this.transformDbTask(task))
    }
  }

  getRunningTasks(): string[] {
    return Array.from(this.runningTasks.keys())
  }

  async getTaskStatus(taskId: string): Promise<any> {
    const supabase = createSupabaseServerClient()
    
    const { data: task } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    const { data: executions } = await supabase
      .from('task_executions')
      .select('*')
      .eq('task_id', taskId)
      .order('started_at', { ascending: false })
      .limit(5)

    return {
      task,
      recentExecutions: executions,
      isRunning: this.runningTasks.has(taskId)
    }
  }
}

// Export singleton instance
export const automationScheduler = AutomationScheduler.getInstance()

// Initialize scheduler when module is imported
if (typeof window === 'undefined') { // Server-side only
  automationScheduler.initialize().catch(console.error)
}
