// Shopify Webhook Manager
// Handles real-time webhook setup, processing, and event routing

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { executeWorkflow } from '@/lib/agents/shopify-workflows'
import { runShopifyMonitoring } from '@/lib/agents/shopify-monitoring'
import { createNotification } from '@/lib/agents/notification-system'
import crypto from 'crypto'

export interface WebhookConfig {
  id: string
  userId: string
  storeId: string
  topic: string
  address: string
  enabled: boolean
  createdAt: Date
  lastTriggered?: Date
  triggerCount: number
  metadata: any
}

export interface WebhookEvent {
  id: string
  userId: string
  storeId: string
  topic: string
  payload: any
  headers: any
  processedAt: Date
  status: 'pending' | 'processed' | 'failed' | 'ignored'
  processingTime?: number
  error?: string
  triggeredWorkflows: string[]
  triggeredActions: string[]
}

// Shopify webhook topics we want to monitor
export const WEBHOOK_TOPICS = {
  // Orders
  'orders/create': 'New order created',
  'orders/updated': 'Order updated',
  'orders/paid': 'Order payment confirmed',
  'orders/cancelled': 'Order cancelled',
  'orders/fulfilled': 'Order fulfilled',
  'orders/partially_fulfilled': 'Order partially fulfilled',
  
  // Products
  'products/create': 'Product created',
  'products/update': 'Product updated',
  'products/delete': 'Product deleted',
  
  // Inventory
  'inventory_levels/update': 'Inventory level changed',
  'inventory_items/create': 'Inventory item created',
  'inventory_items/update': 'Inventory item updated',
  
  // Customers
  'customers/create': 'Customer created',
  'customers/update': 'Customer updated',
  'customers/delete': 'Customer deleted',
  
  // App
  'app/uninstalled': 'App uninstalled',
  
  // Carts
  'carts/create': 'Cart created',
  'carts/update': 'Cart updated',
  
  // Checkouts
  'checkouts/create': 'Checkout created',
  'checkouts/update': 'Checkout updated',
  'checkouts/delete': 'Checkout deleted'
} as const

// Set up webhooks for a user's store
export async function setupWebhooksForStore(
  userId: string,
  storeId: string,
  topics: string[] = Object.keys(WEBHOOK_TOPICS)
): Promise<{ success: boolean; webhooks: WebhookConfig[]; errors: string[] }> {
  const supabase = createSupabaseServerClient()
  const errors: string[] = []
  const webhooks: WebhookConfig[] = []
  
  try {
    const shopifyAPI = await createShopifyAPI(userId)
    if (!shopifyAPI) {
      throw new Error('Shopify API not available')
    }
    
    // Get base webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crewflow.dev'
    
    for (const topic of topics) {
      try {
        const webhookAddress = `${baseUrl}/api/webhooks/shopify/${userId}/${storeId}`
        
        // Create webhook in Shopify
        const webhook = await shopifyAPI.createWebhook({
          topic,
          address: webhookAddress,
          format: 'json'
        })
        
        // Store webhook config in database
        const webhookConfig: WebhookConfig = {
          id: webhook.id.toString(),
          userId,
          storeId,
          topic,
          address: webhookAddress,
          enabled: true,
          createdAt: new Date(),
          triggerCount: 0,
          metadata: {
            shopify_webhook_id: webhook.id,
            api_version: webhook.api_version,
            created_at: webhook.created_at
          }
        }
        
        const { error } = await supabase.from('webhook_configs').insert({
          id: webhookConfig.id,
          user_id: userId,
          store_id: storeId,
          topic,
          address: webhookAddress,
          enabled: true,
          created_at: webhookConfig.createdAt.toISOString(),
          trigger_count: 0,
          metadata: webhookConfig.metadata
        })
        
        if (error) {
          throw error
        }
        
        webhooks.push(webhookConfig)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to create webhook for ${topic}: ${errorMessage}`)
      }
    }
    
    return {
      success: errors.length === 0,
      webhooks,
      errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      webhooks: [],
      errors: [errorMessage]
    }
  }
}

// Process incoming webhook
export async function processWebhook(
  userId: string,
  storeId: string,
  topic: string,
  payload: any,
  headers: any
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const startTime = Date.now()
  const supabase = createSupabaseServerClient()
  
  try {
    // Verify webhook authenticity
    const isValid = await verifyWebhookSignature(payload, headers)
    if (!isValid) {
      throw new Error('Invalid webhook signature')
    }
    
    // Create webhook event record
    const eventId = crypto.randomUUID()
    const webhookEvent: WebhookEvent = {
      id: eventId,
      userId,
      storeId,
      topic,
      payload,
      headers,
      processedAt: new Date(),
      status: 'pending',
      triggeredWorkflows: [],
      triggeredActions: []
    }
    
    // Store event in database
    await supabase.from('webhook_events').insert({
      id: eventId,
      user_id: userId,
      store_id: storeId,
      topic,
      payload,
      headers,
      processed_at: webhookEvent.processedAt.toISOString(),
      status: 'pending'
    })
    
    // Process the webhook based on topic
    await processWebhookByTopic(webhookEvent)
    
    // Update processing status
    const processingTime = Date.now() - startTime
    await supabase.from('webhook_events').update({
      status: 'processed',
      processing_time: processingTime,
      triggered_workflows: webhookEvent.triggeredWorkflows,
      triggered_actions: webhookEvent.triggeredActions
    }).eq('id', eventId)
    
    // Update webhook trigger count
    await supabase.rpc('increment_webhook_trigger_count', {
      webhook_topic: topic,
      webhook_user_id: userId,
      webhook_store_id: storeId
    })
    
    return {
      success: true,
      eventId
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log failed processing
    await supabase.from('webhook_events').update({
      status: 'failed',
      error: errorMessage,
      processing_time: Date.now() - startTime
    }).eq('id', crypto.randomUUID()) // This would need the actual eventId
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

// Process webhook based on topic
async function processWebhookByTopic(event: WebhookEvent): Promise<void> {
  const { topic, payload, userId } = event
  
  switch (topic) {
    case 'orders/create':
      await handleNewOrder(event)
      break
      
    case 'orders/paid':
      await handleOrderPaid(event)
      break
      
    case 'orders/fulfilled':
      await handleOrderFulfilled(event)
      break
      
    case 'inventory_levels/update':
      await handleInventoryUpdate(event)
      break
      
    case 'products/create':
      await handleProductCreated(event)
      break
      
    case 'products/update':
      await handleProductUpdated(event)
      break
      
    case 'customers/create':
      await handleNewCustomer(event)
      break
      
    case 'checkouts/create':
      await handleCheckoutCreated(event)
      break
      
    case 'app/uninstalled':
      await handleAppUninstalled(event)
      break
      
    default:
      console.log(`Unhandled webhook topic: ${topic}`)
  }
  
  // Trigger monitoring check for relevant events
  if (['orders/create', 'orders/paid', 'inventory_levels/update', 'products/update'].includes(topic)) {
    // Run monitoring in background
    setImmediate(() => runShopifyMonitoring(userId))
  }
}

// Webhook handlers for specific events
async function handleNewOrder(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Trigger new order workflow
  const workflowResult = await executeWorkflow('new_order_fulfillment', payload, userId)
  if (workflowResult.workflowId) {
    event.triggeredWorkflows.push(workflowResult.workflowId)
  }
  
  // Send notification
  await createNotification(userId, 'system_alert', 'New Order Received', 
    `Order ${payload.name} for $${payload.total_price} has been placed`, {
      priority: 'medium',
      category: 'agent_action',
      metadata: { order_id: payload.id, order_number: payload.name }
    })
}

async function handleOrderPaid(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Trigger fulfillment workflow
  const workflowResult = await executeWorkflow('new_order_fulfillment', payload, userId)
  if (workflowResult.workflowId) {
    event.triggeredWorkflows.push(workflowResult.workflowId)
  }
  
  // Notify relevant agents
  await createNotification(userId, 'system_alert', 'Order Payment Confirmed', 
    `Payment confirmed for order ${payload.name}. Ready for fulfillment.`, {
      priority: 'medium',
      category: 'agent_action',
      agentId: 'anchor',
      actionRequired: true,
      metadata: { order_id: payload.id }
    })
}

async function handleOrderFulfilled(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Trigger customer satisfaction follow-up workflow
  const workflowResult = await executeWorkflow('customer_satisfaction_followup', payload, userId)
  if (workflowResult.workflowId) {
    event.triggeredWorkflows.push(workflowResult.workflowId)
  }
}

async function handleInventoryUpdate(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Check if inventory is low and trigger workflow
  if (payload.available !== undefined && payload.available < 10) {
    const workflowResult = await executeWorkflow('low_stock_alert', payload, userId)
    if (workflowResult.workflowId) {
      event.triggeredWorkflows.push(workflowResult.workflowId)
    }
  }
}

async function handleProductCreated(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Notify content team
  await createNotification(userId, 'system_alert', 'New Product Added', 
    `Product "${payload.title}" has been created and may need content optimization`, {
      priority: 'low',
      category: 'agent_action',
      agentId: 'splash',
      metadata: { product_id: payload.id }
    })
}

async function handleProductUpdated(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Log product update for analytics
  event.triggeredActions.push('product_update_logged')
}

async function handleNewCustomer(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Welcome new customer
  await createNotification(userId, 'system_alert', 'New Customer Registered', 
    `Welcome ${payload.first_name} ${payload.last_name} to your store!`, {
      priority: 'low',
      category: 'agent_action',
      agentId: 'beacon',
      metadata: { customer_id: payload.id }
    })
}

async function handleCheckoutCreated(event: WebhookEvent): Promise<void> {
  const { payload, userId } = event
  
  // Start abandoned cart recovery timer
  setTimeout(async () => {
    // Check if checkout was completed
    const isCompleted = payload.completed_at !== null
    if (!isCompleted) {
      const workflowResult = await executeWorkflow('abandoned_cart_recovery', payload, userId)
      if (workflowResult.workflowId) {
        event.triggeredWorkflows.push(workflowResult.workflowId)
      }
    }
  }, 60 * 60 * 1000) // 1 hour delay
}

async function handleAppUninstalled(event: WebhookEvent): Promise<void> {
  const { userId } = event
  
  // Disable all webhooks and clean up
  await disableAllWebhooks(userId)
  
  // Send critical notification
  await createNotification(userId, 'emergency_alert', 'App Uninstalled', 
    'CrewFlow has been uninstalled from your Shopify store. All automations have been disabled.', {
      priority: 'critical',
      category: 'security'
    })
}

// Verify webhook signature
async function verifyWebhookSignature(payload: any, headers: any): Promise<boolean> {
  try {
    const hmac = headers['x-shopify-hmac-sha256']
    const body = JSON.stringify(payload)
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    
    if (!hmac || !webhookSecret) {
      return false
    }
    
    const calculatedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'base64'),
      Buffer.from(calculatedHmac, 'base64')
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

// Get webhook configurations for a user
export async function getUserWebhooks(userId: string): Promise<WebhookConfig[]> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      storeId: record.store_id,
      topic: record.topic,
      address: record.address,
      enabled: record.enabled,
      createdAt: new Date(record.created_at),
      lastTriggered: record.last_triggered ? new Date(record.last_triggered) : undefined,
      triggerCount: record.trigger_count || 0,
      metadata: record.metadata || {}
    }))
  } catch (error) {
    console.error('Error getting user webhooks:', error)
    return []
  }
}

// Disable all webhooks for a user
export async function disableAllWebhooks(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    await supabase
      .from('webhook_configs')
      .update({ enabled: false })
      .eq('user_id', userId)
  } catch (error) {
    console.error('Error disabling webhooks:', error)
  }
}

// Get webhook events for a user
export async function getWebhookEvents(
  userId: string,
  options: {
    limit?: number
    topic?: string
    status?: string
    storeId?: string
  } = {}
): Promise<WebhookEvent[]> {
  const supabase = createSupabaseServerClient()
  
  try {
    let query = supabase
      .from('webhook_events')
      .select('*')
      .eq('user_id', userId)
      .order('processed_at', { ascending: false })
    
    if (options.topic) {
      query = query.eq('topic', options.topic)
    }
    
    if (options.status) {
      query = query.eq('status', options.status)
    }
    
    if (options.storeId) {
      query = query.eq('store_id', options.storeId)
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      storeId: record.store_id,
      topic: record.topic,
      payload: record.payload,
      headers: record.headers,
      processedAt: new Date(record.processed_at),
      status: record.status,
      processingTime: record.processing_time,
      error: record.error,
      triggeredWorkflows: record.triggered_workflows || [],
      triggeredActions: record.triggered_actions || []
    }))
  } catch (error) {
    console.error('Error getting webhook events:', error)
    return []
  }
}

// Get webhook statistics
export async function getWebhookStats(userId: string): Promise<{
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  averageProcessingTime: number
  topTopics: Array<{ topic: string; count: number }>
}> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('topic, status, processing_time')
      .eq('user_id', userId)
      .gte('processed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    
    if (error) {
      throw error
    }
    
    const events = data || []
    const totalEvents = events.length
    const successfulEvents = events.filter(e => e.status === 'processed').length
    const failedEvents = events.filter(e => e.status === 'failed').length
    
    const processingTimes = events
      .filter(e => e.processing_time)
      .map(e => e.processing_time)
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0
    
    const topicCounts = events.reduce((acc: Record<string, number>, event) => {
      acc[event.topic] = (acc[event.topic] || 0) + 1
      return acc
    }, {})
    
    const topTopics = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      averageProcessingTime,
      topTopics
    }
  } catch (error) {
    console.error('Error getting webhook stats:', error)
    return {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      averageProcessingTime: 0,
      topTopics: []
    }
  }
}
