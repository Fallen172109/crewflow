import { createSupabaseServerClient } from '@/lib/supabase/server'
import { collaborationManager } from './collaboration'
import { automationScheduler } from './scheduler'

export interface AutonomousAction {
  id: string
  userId: string
  agentId: string
  actionType: string
  actionData: any
  triggerConditions: TriggerCondition[]
  schedule: {
    type: 'immediate' | 'delayed' | 'recurring' | 'conditional'
    delay?: number // milliseconds
    cronExpression?: string
    conditions?: any
  }
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled'
  approvalRequired: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  metadata: {
    createdAt: Date
    scheduledFor?: Date
    executedAt?: Date
    completedAt?: Date
    retryCount: number
    maxRetries: number
    dependencies: string[]
    tags: string[]
  }
}

export interface TriggerCondition {
  type: 'data_threshold' | 'time_based' | 'event_based' | 'dependency_complete' | 'manual'
  config: any
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_equals'
  value: any
  field?: string
}

export interface ActionTemplate {
  id: string
  name: string
  description: string
  agentId: string
  actionType: string
  defaultConfig: any
  requiredPermissions: string[]
  estimatedDuration: number
  riskLevel: 'low' | 'medium' | 'high'
  category: string
}

class AutonomousActionScheduler {
  private static instance: AutonomousActionScheduler
  private pendingActions: Map<string, AutonomousAction> = new Map()
  private scheduledActions: Map<string, NodeJS.Timeout> = new Map()
  private actionTemplates: Map<string, ActionTemplate> = new Map()
  private isProcessing = false

  static getInstance(): AutonomousActionScheduler {
    if (!AutonomousActionScheduler.instance) {
      AutonomousActionScheduler.instance = new AutonomousActionScheduler()
    }
    return AutonomousActionScheduler.instance
  }

  async initialize() {
    console.log('🤖 Initializing Autonomous Action Scheduler...')
    await this.loadActionTemplates()
    await this.loadPendingActions()
    this.startActionProcessor()
    this.startTriggerMonitor()
    console.log('✅ Autonomous Action Scheduler initialized')
  }

  private async loadActionTemplates() {
    // Define action templates for different agents
    const templates: ActionTemplate[] = [
      // Anchor (Shopify Management) Templates
      {
        id: 'anchor_inventory_restock',
        name: 'Automatic Inventory Restock',
        description: 'Automatically reorder products when inventory falls below threshold',
        agentId: 'anchor',
        actionType: 'inventory_management',
        defaultConfig: {
          threshold: 10,
          reorderQuantity: 50,
          supplierPreference: 'primary'
        },
        requiredPermissions: ['inventory_write', 'purchase_orders'],
        estimatedDuration: 300000, // 5 minutes
        riskLevel: 'medium',
        category: 'inventory'
      },
      {
        id: 'anchor_price_update',
        name: 'Dynamic Price Adjustment',
        description: 'Adjust product prices based on market conditions and inventory levels',
        agentId: 'anchor',
        actionType: 'price_optimization',
        defaultConfig: {
          maxIncrease: 0.15,
          maxDecrease: 0.10,
          considerCompetitors: true
        },
        requiredPermissions: ['product_write', 'pricing'],
        estimatedDuration: 180000, // 3 minutes
        riskLevel: 'high',
        category: 'pricing'
      },
      
      // Pearl (Analytics) Templates
      {
        id: 'pearl_performance_report',
        name: 'Automated Performance Report',
        description: 'Generate and send weekly performance reports',
        agentId: 'pearl',
        actionType: 'report_generation',
        defaultConfig: {
          reportType: 'weekly_summary',
          includeCharts: true,
          recipients: ['admin']
        },
        requiredPermissions: ['analytics_read', 'email_send'],
        estimatedDuration: 120000, // 2 minutes
        riskLevel: 'low',
        category: 'reporting'
      },
      
      // Flint (Marketing) Templates
      {
        id: 'flint_campaign_optimization',
        name: 'Campaign Performance Optimization',
        description: 'Automatically adjust marketing campaigns based on performance metrics',
        agentId: 'flint',
        actionType: 'marketing_optimization',
        defaultConfig: {
          budgetAdjustmentThreshold: 0.20,
          pauseUnderperforming: true,
          boostHighPerforming: true
        },
        requiredPermissions: ['marketing_write', 'budget_management'],
        estimatedDuration: 240000, // 4 minutes
        riskLevel: 'medium',
        category: 'marketing'
      },
      
      // Splash (Customer Service) Templates
      {
        id: 'splash_ticket_routing',
        name: 'Intelligent Ticket Routing',
        description: 'Automatically route support tickets to appropriate team members',
        agentId: 'splash',
        actionType: 'ticket_management',
        defaultConfig: {
          priorityThreshold: 'medium',
          autoAssign: true,
          escalationRules: true
        },
        requiredPermissions: ['support_write', 'team_management'],
        estimatedDuration: 60000, // 1 minute
        riskLevel: 'low',
        category: 'support'
      },
      
      // Drake (Financial) Templates
      {
        id: 'drake_expense_analysis',
        name: 'Expense Anomaly Detection',
        description: 'Monitor and flag unusual expense patterns',
        agentId: 'drake',
        actionType: 'financial_monitoring',
        defaultConfig: {
          anomalyThreshold: 2.5,
          alertThreshold: 1000,
          categories: ['all']
        },
        requiredPermissions: ['financial_read', 'alerts'],
        estimatedDuration: 180000, // 3 minutes
        riskLevel: 'low',
        category: 'finance'
      }
    ]

    for (const template of templates) {
      this.actionTemplates.set(template.id, template)
    }

    console.log(`📋 Loaded ${templates.length} action templates`)
  }

  private async loadPendingActions() {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data: actions, error } = await supabase
        .from('autonomous_actions')
        .select('*')
        .in('status', ['pending', 'scheduled'])
        .order('priority', { ascending: false })

      if (error) {
        console.error('Error loading pending actions:', error)
        return
      }

      for (const action of actions || []) {
        const autonomousAction = this.transformDbAction(action)
        this.pendingActions.set(autonomousAction.id, autonomousAction)
        
        // Schedule if needed
        if (autonomousAction.status === 'scheduled' && autonomousAction.metadata.scheduledFor) {
          await this.scheduleAction(autonomousAction)
        }
      }

      console.log(`⏰ Loaded ${this.pendingActions.size} pending actions`)
    } catch (error) {
      console.error('Error loading pending actions:', error)
    }
  }

  private transformDbAction(dbAction: any): AutonomousAction {
    return {
      id: dbAction.id,
      userId: dbAction.user_id,
      agentId: dbAction.agent_id,
      actionType: dbAction.action_type,
      actionData: dbAction.action_data,
      triggerConditions: dbAction.trigger_conditions || [],
      schedule: dbAction.schedule || { type: 'immediate' },
      priority: dbAction.priority,
      status: dbAction.status,
      approvalRequired: dbAction.approval_required,
      approvalStatus: dbAction.approval_status,
      metadata: {
        createdAt: new Date(dbAction.created_at),
        scheduledFor: dbAction.scheduled_for ? new Date(dbAction.scheduled_for) : undefined,
        executedAt: dbAction.executed_at ? new Date(dbAction.executed_at) : undefined,
        completedAt: dbAction.completed_at ? new Date(dbAction.completed_at) : undefined,
        retryCount: dbAction.retry_count || 0,
        maxRetries: dbAction.max_retries || 3,
        dependencies: dbAction.dependencies || [],
        tags: dbAction.tags || []
      }
    }
  }

  async scheduleAutonomousAction(
    userId: string,
    agentId: string,
    actionType: string,
    actionData: any,
    options: {
      triggerConditions?: TriggerCondition[]
      schedule?: AutonomousAction['schedule']
      priority?: AutonomousAction['priority']
      approvalRequired?: boolean
      dependencies?: string[]
      tags?: string[]
      maxRetries?: number
    } = {}
  ): Promise<string> {
    try {
      const actionId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const action: AutonomousAction = {
        id: actionId,
        userId,
        agentId,
        actionType,
        actionData,
        triggerConditions: options.triggerConditions || [],
        schedule: options.schedule || { type: 'immediate' },
        priority: options.priority || 'medium',
        status: 'pending',
        approvalRequired: options.approvalRequired || false,
        metadata: {
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: options.maxRetries || 3,
          dependencies: options.dependencies || [],
          tags: options.tags || []
        }
      }

      // Save to database
      const supabase = createSupabaseServerClient()
      await supabase
        .from('autonomous_actions')
        .insert({
          id: action.id,
          user_id: action.userId,
          agent_id: action.agentId,
          action_type: action.actionType,
          action_data: action.actionData,
          trigger_conditions: action.triggerConditions,
          schedule: action.schedule,
          priority: action.priority,
          status: action.status,
          approval_required: action.approvalRequired,
          max_retries: action.metadata.maxRetries,
          dependencies: action.metadata.dependencies,
          tags: action.metadata.tags,
          created_at: action.metadata.createdAt.toISOString()
        })

      // Add to pending actions
      this.pendingActions.set(actionId, action)

      // Process immediately or schedule
      if (action.schedule.type === 'immediate') {
        await this.processAction(action)
      } else {
        await this.scheduleAction(action)
      }

      console.log(`📅 Scheduled autonomous action: ${actionId} for agent ${agentId}`)
      return actionId

    } catch (error) {
      console.error('Error scheduling autonomous action:', error)
      throw error
    }
  }

  private async scheduleAction(action: AutonomousAction): Promise<void> {
    let scheduledTime: Date

    switch (action.schedule.type) {
      case 'delayed':
        scheduledTime = new Date(Date.now() + (action.schedule.delay || 0))
        break
      
      case 'recurring':
        // For recurring actions, schedule the next occurrence
        scheduledTime = this.calculateNextRecurrence(action.schedule.cronExpression || '0 0 * * *')
        break
      
      case 'conditional':
        // For conditional actions, check conditions periodically
        scheduledTime = new Date(Date.now() + 60000) // Check every minute
        break
      
      default:
        scheduledTime = new Date()
    }

    action.metadata.scheduledFor = scheduledTime
    action.status = 'scheduled'

    // Update database
    const supabase = createSupabaseServerClient()
    await supabase
      .from('autonomous_actions')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledTime.toISOString()
      })
      .eq('id', action.id)

    // Set timeout
    const delay = scheduledTime.getTime() - Date.now()
    if (delay > 0) {
      const timeout = setTimeout(async () => {
        await this.processAction(action)
        this.scheduledActions.delete(action.id)
      }, delay)

      this.scheduledActions.set(action.id, timeout)
    }
  }

  private calculateNextRecurrence(cronExpression: string): Date {
    // Simple cron parsing - in production, use a proper cron library
    const now = new Date()
    return new Date(now.getTime() + 60 * 60 * 1000) // Default to 1 hour
  }

  private async processAction(action: AutonomousAction): Promise<void> {
    try {
      console.log(`🚀 Processing autonomous action: ${action.id}`)

      // Check dependencies
      if (action.metadata.dependencies.length > 0) {
        const dependenciesMet = await this.checkDependencies(action.metadata.dependencies)
        if (!dependenciesMet) {
          console.log(`⏸️ Action ${action.id} waiting for dependencies`)
          return
        }
      }

      // Check trigger conditions
      if (action.triggerConditions.length > 0) {
        const conditionsMet = await this.evaluateTriggerConditions(action.triggerConditions)
        if (!conditionsMet) {
          console.log(`⏸️ Action ${action.id} conditions not met`)
          
          // Reschedule for conditional actions
          if (action.schedule.type === 'conditional') {
            setTimeout(() => this.processAction(action), 60000) // Check again in 1 minute
          }
          return
        }
      }

      // Check approval requirements
      if (action.approvalRequired && action.approvalStatus !== 'approved') {
        await this.requestApproval(action)
        return
      }

      // Execute the action
      action.status = 'executing'
      action.metadata.executedAt = new Date()

      // Update database
      const supabase = createSupabaseServerClient()
      await supabase
        .from('autonomous_actions')
        .update({
          status: 'executing',
          executed_at: action.metadata.executedAt.toISOString()
        })
        .eq('id', action.id)

      // Execute based on action type
      const result = await this.executeAction(action)

      // Mark as completed
      action.status = 'completed'
      action.metadata.completedAt = new Date()

      await supabase
        .from('autonomous_actions')
        .update({
          status: 'completed',
          completed_at: action.metadata.completedAt.toISOString(),
          result: result
        })
        .eq('id', action.id)

      // Remove from pending actions
      this.pendingActions.delete(action.id)

      // Schedule next occurrence for recurring actions
      if (action.schedule.type === 'recurring') {
        await this.scheduleNextRecurrence(action)
      }

      console.log(`✅ Autonomous action completed: ${action.id}`)

    } catch (error) {
      console.error(`❌ Error processing action ${action.id}:`, error)
      await this.handleActionFailure(action, error)
    }
  }

  private async executeAction(action: AutonomousAction): Promise<any> {
    // Get action template for configuration
    const template = Array.from(this.actionTemplates.values())
      .find(t => t.agentId === action.agentId && t.actionType === action.actionType)

    if (!template) {
      throw new Error(`No template found for action type: ${action.actionType}`)
    }

    // Execute based on action type
    switch (action.actionType) {
      case 'inventory_management':
        return await this.executeInventoryAction(action, template)
      
      case 'price_optimization':
        return await this.executePricingAction(action, template)
      
      case 'report_generation':
        return await this.executeReportAction(action, template)
      
      case 'marketing_optimization':
        return await this.executeMarketingAction(action, template)
      
      case 'ticket_management':
        return await this.executeTicketAction(action, template)
      
      case 'financial_monitoring':
        return await this.executeFinancialAction(action, template)
      
      default:
        // For unknown action types, delegate to appropriate agent
        return await this.delegateToAgent(action, template)
    }
  }

  private async executeInventoryAction(action: AutonomousAction, template: ActionTemplate): Promise<any> {
    // Simulate inventory management action
    console.log(`📦 Executing inventory action for ${action.agentId}`)
    
    // This would integrate with actual Shopify API
    return {
      actionType: 'inventory_restock',
      productsProcessed: Math.floor(Math.random() * 50) + 10,
      ordersCreated: Math.floor(Math.random() * 5) + 1,
      totalCost: Math.random() * 1000 + 500,
      executedAt: new Date().toISOString()
    }
  }

  private async executePricingAction(action: AutonomousAction, template: ActionTemplate): Promise<any> {
    // Simulate price optimization
    console.log(`💰 Executing pricing action for ${action.agentId}`)
    
    return {
      actionType: 'price_optimization',
      productsUpdated: Math.floor(Math.random() * 20) + 5,
      averageAdjustment: (Math.random() * 0.2 - 0.1).toFixed(3), // -10% to +10%
      estimatedRevenueImpact: Math.random() * 500 + 100,
      executedAt: new Date().toISOString()
    }
  }

  private async executeReportAction(action: AutonomousAction, template: ActionTemplate): Promise<any> {
    // Simulate report generation
    console.log(`📊 Executing report action for ${action.agentId}`)
    
    return {
      actionType: 'report_generation',
      reportType: action.actionData.reportType || 'weekly_summary',
      dataPoints: Math.floor(Math.random() * 1000) + 500,
      recipientsSent: action.actionData.recipients?.length || 1,
      executedAt: new Date().toISOString()
    }
  }

  private async executeMarketingAction(action: AutonomousAction, template: ActionTemplate): Promise<any> {
    // Simulate marketing optimization
    console.log(`📢 Executing marketing action for ${action.agentId}`)
    
    return {
      actionType: 'marketing_optimization',
      campaignsOptimized: Math.floor(Math.random() * 10) + 3,
      budgetAdjusted: Math.random() * 200 + 50,
      performanceImprovement: (Math.random() * 0.3 + 0.1).toFixed(3), // 10-40% improvement
      executedAt: new Date().toISOString()
    }
  }

  private async executeTicketAction(action: AutonomousAction, template: ActionTemplate): Promise<any> {
    // Simulate ticket management
    console.log(`🎫 Executing ticket action for ${action.agentId}`)
    
    return {
      actionType: 'ticket_management',
      ticketsProcessed: Math.floor(Math.random() * 30) + 10,
      averageResponseTime: Math.floor(Math.random() * 60) + 15, // 15-75 minutes
      satisfactionScore: (Math.random() * 2 + 3).toFixed(1), // 3.0-5.0
      executedAt: new Date().toISOString()
    }
  }

  private async executeFinancialAction(action: AutonomousAction, template: ActionTemplate): Promise<any> {
    // Simulate financial monitoring
    console.log(`💳 Executing financial action for ${action.agentId}`)
    
    return {
      actionType: 'financial_monitoring',
      transactionsAnalyzed: Math.floor(Math.random() * 500) + 200,
      anomaliesDetected: Math.floor(Math.random() * 5),
      alertsGenerated: Math.floor(Math.random() * 3),
      executedAt: new Date().toISOString()
    }
  }

  private async delegateToAgent(action: AutonomousAction, template: ActionTemplate): Promise<any> {
    // Use collaboration manager to delegate to appropriate agent
    const collaborationId = await collaborationManager.requestCollaboration(
      action.userId,
      'autonomous_scheduler',
      {
        taskType: action.actionType,
        description: `Autonomous action: ${template.name}`,
        data: action.actionData,
        priority: action.priority,
        requiredCapabilities: [action.actionType],
        context: {
          autonomousActionId: action.id,
          template: template.id
        }
      }
    )

    return {
      actionType: 'agent_delegation',
      collaborationId,
      delegatedTo: action.agentId,
      executedAt: new Date().toISOString()
    }
  }

  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    // Check if all dependency actions are completed
    const supabase = createSupabaseServerClient()
    
    const { data: dependentActions, error } = await supabase
      .from('autonomous_actions')
      .select('id, status')
      .in('id', dependencies)

    if (error) {
      console.error('Error checking dependencies:', error)
      return false
    }

    return dependentActions?.every(action => action.status === 'completed') || false
  }

  private async evaluateTriggerConditions(conditions: TriggerCondition[]): Promise<boolean> {
    // Evaluate all trigger conditions
    for (const condition of conditions) {
      const conditionMet = await this.evaluateCondition(condition)
      if (!conditionMet) {
        return false
      }
    }
    return true
  }

  private async evaluateCondition(condition: TriggerCondition): Promise<boolean> {
    // This would integrate with actual data sources
    // For now, simulate condition evaluation
    
    switch (condition.type) {
      case 'data_threshold':
        // Simulate data threshold check
        const currentValue = Math.random() * 100
        return this.compareValues(currentValue, condition.value, condition.operator)
      
      case 'time_based':
        // Check time-based conditions
        const now = new Date()
        const targetTime = new Date(condition.value)
        return now >= targetTime
      
      case 'event_based':
        // Check for specific events
        return Math.random() > 0.7 // 30% chance event occurred
      
      case 'dependency_complete':
        // Check if dependency is complete
        return await this.checkDependencies([condition.value])
      
      case 'manual':
        // Manual triggers are always false until manually triggered
        return false
      
      default:
        return false
    }
  }

  private compareValues(current: any, target: any, operator: string): boolean {
    switch (operator) {
      case 'equals': return current === target
      case 'greater_than': return current > target
      case 'less_than': return current < target
      case 'not_equals': return current !== target
      case 'contains': return String(current).includes(String(target))
      default: return false
    }
  }

  private async requestApproval(action: AutonomousAction): Promise<void> {
    // Create approval request
    const supabase = createSupabaseServerClient()
    
    await supabase
      .from('approval_requests')
      .insert({
        user_id: action.userId,
        agent_id: action.agentId,
        action_type: 'autonomous_action',
        action_data: {
          actionId: action.id,
          actionType: action.actionType,
          description: `Autonomous action: ${action.actionType}`,
          data: action.actionData
        },
        risk_level: this.calculateRiskLevel(action),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })

    // Update action status
    action.approvalStatus = 'pending'
    await supabase
      .from('autonomous_actions')
      .update({ approval_status: 'pending' })
      .eq('id', action.id)

    console.log(`📋 Approval requested for autonomous action: ${action.id}`)
  }

  private calculateRiskLevel(action: AutonomousAction): 'low' | 'medium' | 'high' {
    const template = this.actionTemplates.get(`${action.agentId}_${action.actionType}`)
    return template?.riskLevel || 'medium'
  }

  private async handleActionFailure(action: AutonomousAction, error: any): Promise<void> {
    action.metadata.retryCount++
    
    if (action.metadata.retryCount < action.metadata.maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, action.metadata.retryCount) * 1000 // 2^n seconds
      
      setTimeout(() => {
        this.processAction(action)
      }, delay)
      
      console.log(`🔄 Retrying action ${action.id} in ${delay}ms (attempt ${action.metadata.retryCount + 1}/${action.metadata.maxRetries})`)
    } else {
      // Mark as failed
      action.status = 'failed'
      action.metadata.completedAt = new Date()

      const supabase = createSupabaseServerClient()
      await supabase
        .from('autonomous_actions')
        .update({
          status: 'failed',
          completed_at: action.metadata.completedAt.toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: action.metadata.retryCount
        })
        .eq('id', action.id)

      this.pendingActions.delete(action.id)
      console.log(`❌ Action ${action.id} failed after ${action.metadata.retryCount} retries`)
    }
  }

  private async scheduleNextRecurrence(action: AutonomousAction): Promise<void> {
    // Create new action for next recurrence
    const nextAction: AutonomousAction = {
      ...action,
      id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      metadata: {
        ...action.metadata,
        createdAt: new Date(),
        scheduledFor: undefined,
        executedAt: undefined,
        completedAt: undefined,
        retryCount: 0
      }
    }

    await this.scheduleAction(nextAction)
  }

  private startActionProcessor(): void {
    // Process pending actions every 30 seconds
    setInterval(() => {
      if (!this.isProcessing) {
        this.processActionQueue()
      }
    }, 30000)
  }

  private startTriggerMonitor(): void {
    // Monitor trigger conditions every minute
    setInterval(() => {
      this.monitorTriggerConditions()
    }, 60000)
  }

  private async processActionQueue(): Promise<void> {
    this.isProcessing = true
    
    try {
      const pendingActions = Array.from(this.pendingActions.values())
        .filter(action => action.status === 'pending')
        .sort((a, b) => {
          // Sort by priority and creation time
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          const aPriority = priorityOrder[a.priority]
          const bPriority = priorityOrder[b.priority]
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority
          }
          
          return a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime()
        })

      for (const action of pendingActions.slice(0, 5)) { // Process up to 5 actions at once
        await this.processAction(action)
      }
    } catch (error) {
      console.error('Error processing action queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async monitorTriggerConditions(): Promise<void> {
    const conditionalActions = Array.from(this.pendingActions.values())
      .filter(action => 
        action.status === 'scheduled' && 
        action.schedule.type === 'conditional'
      )

    for (const action of conditionalActions) {
      try {
        const conditionsMet = await this.evaluateTriggerConditions(action.triggerConditions)
        if (conditionsMet) {
          await this.processAction(action)
        }
      } catch (error) {
        console.error(`Error monitoring conditions for action ${action.id}:`, error)
      }
    }
  }

  // Public API methods
  async getActionTemplates(): Promise<ActionTemplate[]> {
    return Array.from(this.actionTemplates.values())
  }

  async getPendingActions(userId: string): Promise<AutonomousAction[]> {
    return Array.from(this.pendingActions.values())
      .filter(action => action.userId === userId)
  }

  async cancelAction(actionId: string): Promise<void> {
    const action = this.pendingActions.get(actionId)
    if (!action) {
      throw new Error('Action not found')
    }

    // Cancel scheduled timeout
    const timeout = this.scheduledActions.get(actionId)
    if (timeout) {
      clearTimeout(timeout)
      this.scheduledActions.delete(actionId)
    }

    // Update status
    action.status = 'cancelled'
    action.metadata.completedAt = new Date()

    // Update database
    const supabase = createSupabaseServerClient()
    await supabase
      .from('autonomous_actions')
      .update({
        status: 'cancelled',
        completed_at: action.metadata.completedAt.toISOString()
      })
      .eq('id', actionId)

    // Remove from pending
    this.pendingActions.delete(actionId)

    console.log(`🚫 Cancelled autonomous action: ${actionId}`)
  }

  async getActionStatus(actionId: string): Promise<AutonomousAction | null> {
    return this.pendingActions.get(actionId) || null
  }

  async triggerManualAction(actionId: string): Promise<void> {
    const action = this.pendingActions.get(actionId)
    if (!action) {
      throw new Error('Action not found')
    }

    // Process immediately
    await this.processAction(action)
  }
}

// Export singleton instance
export const autonomousScheduler = AutonomousActionScheduler.getInstance()

// Initialize scheduler when module is imported
if (typeof window === 'undefined') { // Server-side only
  autonomousScheduler.initialize().catch(console.error)
}
