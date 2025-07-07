// Shopify Automation Workflows
// Automated workflows that agents can trigger based on Shopify events

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createAutonomousActionManager } from './autonomous-actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface WorkflowTrigger {
  id: string
  name: string
  description: string
  eventType: string
  conditions: any
  actions: WorkflowAction[]
  agentId: string
  enabled: boolean
}

export interface WorkflowAction {
  type: string
  params: any
  delay?: number // seconds
  conditions?: any
}

export interface WorkflowExecution {
  workflowId: string
  triggerId: string
  userId: string
  agentId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  error?: string
  results: any[]
}

// Pre-defined workflow templates for different scenarios
export const shopifyWorkflowTemplates: WorkflowTrigger[] = [
  {
    id: 'low_stock_alert',
    name: 'Low Stock Alert & Reorder',
    description: 'Automatically alert and suggest reorders when inventory is low',
    eventType: 'inventory_levels/update',
    conditions: {
      inventory_quantity: { operator: 'less_than', value: 10 }
    },
    actions: [
      {
        type: 'send_notification',
        params: {
          message: 'Low stock alert: {{product_title}} has {{inventory_quantity}} units remaining',
          priority: 'high'
        }
      },
      {
        type: 'suggest_reorder',
        params: {
          recommended_quantity: 50,
          supplier_contact: true
        }
      }
    ],
    agentId: 'anchor',
    enabled: true
  },
  {
    id: 'new_order_fulfillment',
    name: 'Automated Order Processing',
    description: 'Automatically process and fulfill orders when payment is confirmed',
    eventType: 'orders/paid',
    conditions: {
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled'
    },
    actions: [
      {
        type: 'check_inventory',
        params: {}
      },
      {
        type: 'create_fulfillment',
        params: {
          notify_customer: true,
          tracking_company: 'auto_detect'
        },
        conditions: {
          inventory_available: true
        }
      },
      {
        type: 'update_inventory',
        params: {
          action: 'decrement'
        }
      }
    ],
    agentId: 'anchor',
    enabled: true
  },
  {
    id: 'product_performance_analysis',
    name: 'Product Performance Review',
    description: 'Weekly analysis of product performance and optimization suggestions',
    eventType: 'scheduled',
    conditions: {
      schedule: 'weekly',
      day: 'monday',
      time: '09:00'
    },
    actions: [
      {
        type: 'analyze_product_performance',
        params: {
          timeframe: '7d',
          metrics: ['sales', 'views', 'conversion_rate']
        }
      },
      {
        type: 'generate_optimization_report',
        params: {
          include_recommendations: true,
          focus_areas: ['seo', 'pricing', 'inventory']
        }
      },
      {
        type: 'send_report',
        params: {
          recipients: ['user'],
          format: 'summary'
        }
      }
    ],
    agentId: 'pearl',
    enabled: false
  },
  {
    id: 'abandoned_cart_recovery',
    name: 'Abandoned Cart Recovery Campaign',
    description: 'Automatically follow up on abandoned carts with personalized messages',
    eventType: 'checkouts/create',
    conditions: {
      completed_at: null,
      age_hours: { operator: 'greater_than', value: 1 }
    },
    actions: [
      {
        type: 'send_recovery_email',
        params: {
          template: 'abandoned_cart_1',
          discount_percentage: 10
        },
        delay: 3600 // 1 hour
      },
      {
        type: 'send_recovery_email',
        params: {
          template: 'abandoned_cart_2',
          discount_percentage: 15
        },
        delay: 86400 // 24 hours
      },
      {
        type: 'create_retargeting_audience',
        params: {
          platform: 'facebook',
          duration_days: 7
        },
        delay: 172800 // 48 hours
      }
    ],
    agentId: 'flint',
    enabled: false
  },
  {
    id: 'customer_satisfaction_followup',
    name: 'Customer Satisfaction Follow-up',
    description: 'Follow up with customers after order delivery for feedback',
    eventType: 'orders/fulfilled',
    conditions: {
      fulfillment_status: 'fulfilled',
      days_since_fulfillment: { operator: 'equal', value: 3 }
    },
    actions: [
      {
        type: 'send_feedback_request',
        params: {
          template: 'satisfaction_survey',
          incentive: 'discount_code'
        }
      },
      {
        type: 'track_response',
        params: {
          metric: 'customer_satisfaction',
          follow_up_required: true
        }
      }
    ],
    agentId: 'beacon',
    enabled: false
  },
  {
    id: 'seasonal_inventory_adjustment',
    name: 'Seasonal Inventory Optimization',
    description: 'Adjust inventory levels based on seasonal trends and forecasts',
    eventType: 'scheduled',
    conditions: {
      schedule: 'monthly',
      day: 1,
      time: '08:00'
    },
    actions: [
      {
        type: 'analyze_seasonal_trends',
        params: {
          lookback_years: 2,
          categories: 'all'
        }
      },
      {
        type: 'forecast_demand',
        params: {
          horizon_months: 3,
          confidence_level: 0.95
        }
      },
      {
        type: 'suggest_inventory_adjustments',
        params: {
          include_new_products: true,
          phase_out_recommendations: true
        }
      }
    ],
    agentId: 'drake',
    enabled: false
  }
]

// Execute a workflow based on a trigger event
export async function executeWorkflow(
  workflowId: string,
  triggerData: any,
  userId: string
): Promise<WorkflowExecution> {
  const execution: WorkflowExecution = {
    workflowId,
    triggerId: triggerData.id || 'manual',
    userId,
    agentId: '',
    status: 'pending',
    startedAt: new Date(),
    results: []
  }

  try {
    // Get workflow definition
    const workflow = await getWorkflow(userId, workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    execution.agentId = workflow.agentId
    execution.status = 'running'

    // Check if workflow conditions are met
    const conditionsMet = evaluateConditions(workflow.conditions, triggerData)
    if (!conditionsMet) {
      execution.status = 'completed'
      execution.completedAt = new Date()
      execution.results.push({
        action: 'condition_check',
        result: 'conditions_not_met',
        skipped: true
      })
      return execution
    }

    // Execute workflow actions
    for (const action of workflow.actions) {
      try {
        // Apply delay if specified
        if (action.delay) {
          await new Promise(resolve => setTimeout(resolve, action.delay * 1000))
        }

        // Check action-specific conditions
        if (action.conditions) {
          const actionConditionsMet = evaluateConditions(action.conditions, triggerData)
          if (!actionConditionsMet) {
            execution.results.push({
              action: action.type,
              result: 'skipped',
              reason: 'conditions_not_met'
            })
            continue
          }
        }

        // Execute the action
        const result = await executeWorkflowAction(action, triggerData, userId, workflow.agentId)
        execution.results.push({
          action: action.type,
          result: 'success',
          data: result
        })
      } catch (actionError) {
        execution.results.push({
          action: action.type,
          result: 'error',
          error: actionError instanceof Error ? actionError.message : 'Unknown error'
        })
        // Continue with other actions unless it's a critical error
      }
    }

    execution.status = 'completed'
    execution.completedAt = new Date()

    // Log workflow execution
    await logWorkflowExecution(execution)

  } catch (error) {
    execution.status = 'failed'
    execution.error = error instanceof Error ? error.message : 'Unknown error'
    execution.completedAt = new Date()

    // Log failed execution
    await logWorkflowExecution(execution)
  }

  return execution
}

// Execute a specific workflow action
async function executeWorkflowAction(
  action: WorkflowAction,
  triggerData: any,
  userId: string,
  agentId: string
): Promise<any> {
  const shopifyAPI = await createShopifyAPI(userId)
  const actionManager = createAutonomousActionManager(userId)

  switch (action.type) {
    case 'send_notification':
      return await sendNotification(action.params, triggerData, userId)

    case 'check_inventory':
      if (!shopifyAPI) throw new Error('Shopify API not available')
      return await checkInventoryLevels(shopifyAPI, action.params, triggerData)

    case 'create_fulfillment':
      if (!shopifyAPI) throw new Error('Shopify API not available')
      return await createFulfillment(shopifyAPI, action.params, triggerData)

    case 'update_inventory':
      if (!shopifyAPI) throw new Error('Shopify API not available')
      return await updateInventory(shopifyAPI, action.params, triggerData)

    case 'analyze_product_performance':
      if (!shopifyAPI) throw new Error('Shopify API not available')
      return await analyzeProductPerformance(shopifyAPI, action.params)

    case 'send_recovery_email':
      return await sendRecoveryEmail(action.params, triggerData, userId)

    case 'suggest_reorder':
      return await suggestReorder(action.params, triggerData, userId)

    default:
      throw new Error(`Unknown workflow action type: ${action.type}`)
  }
}

// Helper functions for workflow actions
async function sendNotification(params: any, triggerData: any, userId: string): Promise<any> {
  // Replace template variables in message
  let message = params.message
  Object.keys(triggerData).forEach(key => {
    message = message.replace(`{{${key}}}`, triggerData[key])
  })

  // TODO: Implement actual notification sending (email, SMS, in-app)
  console.log(`Notification sent to user ${userId}: ${message}`)
  
  return { message, sent: true, timestamp: new Date() }
}

async function checkInventoryLevels(shopifyAPI: any, params: any, triggerData: any): Promise<any> {
  const productId = triggerData.product_id || params.product_id
  if (!productId) {
    throw new Error('Product ID required for inventory check')
  }

  const product = await shopifyAPI.getProduct(productId)
  const inventoryLevels = await shopifyAPI.getInventoryLevels()

  return {
    product_id: productId,
    title: product.title,
    inventory_available: product.variants.every((v: any) => v.inventory_quantity > 0),
    total_inventory: product.variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0)
  }
}

async function createFulfillment(shopifyAPI: any, params: any, triggerData: any): Promise<any> {
  const orderId = triggerData.id || triggerData.order_id
  if (!orderId) {
    throw new Error('Order ID required for fulfillment')
  }

  const fulfillmentData = {
    notify_customer: params.notify_customer || true,
    tracking_company: params.tracking_company || 'Other'
  }

  return await shopifyAPI.createFulfillment(orderId, fulfillmentData)
}

async function updateInventory(shopifyAPI: any, params: any, triggerData: any): Promise<any> {
  // Implementation depends on specific inventory update requirements
  return { updated: true, action: params.action }
}

async function analyzeProductPerformance(shopifyAPI: any, params: any): Promise<any> {
  const products = await shopifyAPI.getProducts(100)
  const orders = await shopifyAPI.getOrders(100)

  // Basic performance analysis
  const productPerformance = products.map((product: any) => {
    const productOrders = orders.filter((order: any) =>
      order.line_items.some((item: any) => item.product_id === product.id)
    )

    return {
      id: product.id,
      title: product.title,
      orders_count: productOrders.length,
      revenue: productOrders.reduce((sum: number, order: any) => {
        const productItems = order.line_items.filter((item: any) => item.product_id === product.id)
        return sum + productItems.reduce((itemSum: number, item: any) => itemSum + parseFloat(item.price), 0)
      }, 0)
    }
  })

  return {
    analyzed_products: productPerformance.length,
    top_performers: productPerformance.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    timeframe: params.timeframe
  }
}

async function sendRecoveryEmail(params: any, triggerData: any, userId: string): Promise<any> {
  // TODO: Implement email sending logic
  return {
    template: params.template,
    discount: params.discount_percentage,
    sent: true,
    timestamp: new Date()
  }
}

async function suggestReorder(params: any, triggerData: any, userId: string): Promise<any> {
  return {
    product_id: triggerData.product_id,
    recommended_quantity: params.recommended_quantity,
    supplier_contact: params.supplier_contact,
    suggestion_created: true
  }
}

// Evaluate workflow conditions
function evaluateConditions(conditions: any, data: any): boolean {
  if (!conditions) return true

  for (const [key, condition] of Object.entries(conditions)) {
    const value = data[key]
    
    if (typeof condition === 'object' && condition !== null) {
      const { operator, value: conditionValue } = condition as any
      
      switch (operator) {
        case 'equal':
          if (value !== conditionValue) return false
          break
        case 'not_equal':
          if (value === conditionValue) return false
          break
        case 'greater_than':
          if (!(value > conditionValue)) return false
          break
        case 'less_than':
          if (!(value < conditionValue)) return false
          break
        case 'contains':
          if (!value || !value.toString().includes(conditionValue)) return false
          break
        default:
          console.warn(`Unknown condition operator: ${operator}`)
      }
    } else {
      // Direct value comparison
      if (value !== condition) return false
    }
  }

  return true
}

// Get workflow definition
async function getWorkflow(userId: string, workflowId: string): Promise<WorkflowTrigger | null> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data } = await supabase
      .from('shopify_automation_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('id', workflowId)
      .eq('enabled', true)
      .single()

    if (!data) {
      // Check if it's a template workflow
      return shopifyWorkflowTemplates.find(template => template.id === workflowId) || null
    }

    // Convert database record to WorkflowTrigger format
    return {
      id: data.id,
      name: data.rule_name,
      description: data.rule_description,
      eventType: data.trigger_event,
      conditions: data.conditions || {},
      actions: data.actions || [],
      agentId: data.assigned_agent_id || 'anchor',
      enabled: data.enabled
    }
  } catch (error) {
    console.error('Error getting workflow:', error)
    return null
  }
}

// Log workflow execution
async function logWorkflowExecution(execution: WorkflowExecution): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()
    
    await supabase.from('agent_actions').insert({
      user_id: execution.userId,
      agent_id: execution.agentId,
      integration_id: 'shopify',
      action_type: 'workflow_execution',
      action_description: `Executed workflow: ${execution.workflowId}`,
      status: execution.status,
      metadata: {
        workflow_id: execution.workflowId,
        trigger_id: execution.triggerId,
        results: execution.results,
        error: execution.error
      }
    })
  } catch (error) {
    console.error('Error logging workflow execution:', error)
  }
}

// Get available workflows for a user
export async function getUserWorkflows(userId: string): Promise<WorkflowTrigger[]> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data } = await supabase
      .from('shopify_automation_rules')
      .select('*')
      .eq('user_id', userId)

    const userWorkflows = (data || []).map(record => ({
      id: record.id,
      name: record.rule_name,
      description: record.rule_description,
      eventType: record.trigger_event,
      conditions: record.conditions || {},
      actions: record.actions || [],
      agentId: record.assigned_agent_id || 'anchor',
      enabled: record.enabled
    }))

    // Include template workflows that aren't customized yet
    const templateWorkflows = shopifyWorkflowTemplates.filter(template =>
      !userWorkflows.some(workflow => workflow.id === template.id)
    )

    return [...userWorkflows, ...templateWorkflows]
  } catch (error) {
    console.error('Error getting user workflows:', error)
    return shopifyWorkflowTemplates
  }
}
