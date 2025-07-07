// Autonomous Agent Action System
// Enables AI agents to execute real actions using OAuth tokens without user intervention

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createFacebookAPI, type FacebookPost } from '@/lib/integrations/facebook-business-api'
import { createShopifyAPI, type ShopifyProduct, type ShopifyOrder, type ShopifyCustomer } from '@/lib/integrations/shopify-admin-api'

export interface AutonomousAction {
  id: string
  userId: string
  agentId: string
  integrationId: string
  actionType: string
  actionData: any
  status: 'pending' | 'executing' | 'completed' | 'failed'
  scheduledFor?: Date
  executedAt?: Date
  result?: any
  error?: string
}

export interface ActionPermission {
  userId: string
  integrationId: string
  actionType: string
  enabled: boolean
  maxFrequency?: string // 'hourly', 'daily', 'weekly'
  restrictions?: any
}

export class AutonomousActionManager {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  // Check if user has granted permission for an autonomous action
  async hasPermission(integrationId: string, actionType: string): Promise<boolean> {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data } = await supabase
        .from('action_permissions')
        .select('enabled')
        .eq('user_id', this.userId)
        .eq('integration_id', integrationId)
        .eq('action_type', actionType)
        .single()

      return data?.enabled || false
    } catch {
      return false
    }
  }

  // Execute a Facebook post action autonomously
  async executeFacebookPost(pageId: string, post: FacebookPost, agentId: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission('facebook-business', 'create_post')
      if (!hasPermission) {
        throw new Error('User has not granted permission for autonomous posting')
      }

      // Check rate limits
      const canExecute = await this.checkRateLimit('facebook-business', 'create_post')
      if (!canExecute) {
        throw new Error('Rate limit exceeded for autonomous posting')
      }

      // Initialize Facebook API
      const facebookAPI = await createFacebookAPI(this.userId)
      if (!facebookAPI) {
        throw new Error('Facebook API not available - user needs to reconnect')
      }

      // Execute the action
      const result = await facebookAPI.createPost(pageId, post)

      // Log the action
      await this.logAction({
        agentId,
        integrationId: 'facebook-business',
        actionType: 'create_post',
        actionData: { pageId, post },
        status: 'completed',
        result
      })

      return {
        success: true,
        postId: result.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Log the failed action
      await this.logAction({
        agentId,
        integrationId: 'facebook-business',
        actionType: 'create_post',
        actionData: { pageId, post },
        status: 'failed',
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Execute a Facebook comment reply autonomously
  async executeFacebookReply(commentId: string, message: string, agentId: string): Promise<{ success: boolean; replyId?: string; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission('facebook-business', 'reply_comment')
      if (!hasPermission) {
        throw new Error('User has not granted permission for autonomous comment replies')
      }

      // Check rate limits
      const canExecute = await this.checkRateLimit('facebook-business', 'reply_comment')
      if (!canExecute) {
        throw new Error('Rate limit exceeded for autonomous comment replies')
      }

      // Initialize Facebook API
      const facebookAPI = await createFacebookAPI(this.userId)
      if (!facebookAPI) {
        throw new Error('Facebook API not available - user needs to reconnect')
      }

      // Execute the action
      const result = await facebookAPI.replyToComment(commentId, message)

      // Log the action
      await this.logAction({
        agentId,
        integrationId: 'facebook-business',
        actionType: 'reply_comment',
        actionData: { commentId, message },
        status: 'completed',
        result
      })

      return {
        success: true,
        replyId: result.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Log the failed action
      await this.logAction({
        agentId,
        integrationId: 'facebook-business',
        actionType: 'reply_comment',
        actionData: { commentId, message },
        status: 'failed',
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Execute Shopify product creation autonomously
  async executeShopifyProductCreate(product: Partial<ShopifyProduct>, agentId: string): Promise<{ success: boolean; productId?: number; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission('shopify', 'product_create')
      if (!hasPermission) {
        throw new Error('User has not granted permission for autonomous product creation')
      }

      // Check rate limits
      const canExecute = await this.checkRateLimit('shopify', 'product_create')
      if (!canExecute) {
        throw new Error('Rate limit exceeded for autonomous product creation')
      }

      // Initialize Shopify API
      const shopifyAPI = await createShopifyAPI(this.userId)
      if (!shopifyAPI) {
        throw new Error('Shopify API not available - user needs to reconnect')
      }

      // Create the product
      const createdProduct = await shopifyAPI.createProduct(product as ShopifyProduct)

      // Log the action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'product_create',
        actionData: product,
        status: 'completed',
        result: { productId: createdProduct.id, title: createdProduct.title }
      })

      return {
        success: true,
        productId: createdProduct.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log the failed action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'product_create',
        actionData: product,
        status: 'failed',
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Execute Shopify product update autonomously
  async executeShopifyProductUpdate(productId: number, updates: Partial<ShopifyProduct>, agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission('shopify', 'product_update')
      if (!hasPermission) {
        throw new Error('User has not granted permission for autonomous product updates')
      }

      // Check rate limits
      const canExecute = await this.checkRateLimit('shopify', 'product_update')
      if (!canExecute) {
        throw new Error('Rate limit exceeded for autonomous product updates')
      }

      // Initialize Shopify API
      const shopifyAPI = await createShopifyAPI(this.userId)
      if (!shopifyAPI) {
        throw new Error('Shopify API not available - user needs to reconnect')
      }

      // Update the product
      const updatedProduct = await shopifyAPI.updateProduct(productId, updates)

      // Log the action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'product_update',
        actionData: { productId, updates },
        status: 'completed',
        result: { productId: updatedProduct.id, title: updatedProduct.title }
      })

      return {
        success: true
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log the failed action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'product_update',
        actionData: { productId, updates },
        status: 'failed',
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Execute Shopify inventory update autonomously
  async executeShopifyInventoryUpdate(inventoryItemId: number, locationId: number, available: number, agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission('shopify', 'inventory_update')
      if (!hasPermission) {
        throw new Error('User has not granted permission for autonomous inventory updates')
      }

      // Check rate limits
      const canExecute = await this.checkRateLimit('shopify', 'inventory_update')
      if (!canExecute) {
        throw new Error('Rate limit exceeded for autonomous inventory updates')
      }

      // Initialize Shopify API
      const shopifyAPI = await createShopifyAPI(this.userId)
      if (!shopifyAPI) {
        throw new Error('Shopify API not available - user needs to reconnect')
      }

      // Update inventory
      const inventoryLevel = await shopifyAPI.updateInventoryLevel(inventoryItemId, locationId, available)

      // Log the action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'inventory_update',
        actionData: { inventoryItemId, locationId, available },
        status: 'completed',
        result: { inventoryItemId, available: inventoryLevel.available }
      })

      return {
        success: true
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log the failed action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'inventory_update',
        actionData: { inventoryItemId, locationId, available },
        status: 'failed',
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Execute Shopify order fulfillment autonomously
  async executeShopifyOrderFulfill(orderId: number, fulfillmentData: any, agentId: string): Promise<{ success: boolean; fulfillmentId?: number; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission('shopify', 'order_fulfill')
      if (!hasPermission) {
        throw new Error('User has not granted permission for autonomous order fulfillment')
      }

      // Check rate limits
      const canExecute = await this.checkRateLimit('shopify', 'order_fulfill')
      if (!canExecute) {
        throw new Error('Rate limit exceeded for autonomous order fulfillment')
      }

      // Initialize Shopify API
      const shopifyAPI = await createShopifyAPI(this.userId)
      if (!shopifyAPI) {
        throw new Error('Shopify API not available - user needs to reconnect')
      }

      // Create fulfillment
      const fulfillment = await shopifyAPI.createFulfillment(orderId, fulfillmentData)

      // Log the action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'order_fulfill',
        actionData: { orderId, fulfillmentData },
        status: 'completed',
        result: { fulfillmentId: fulfillment.id, orderId }
      })

      return {
        success: true,
        fulfillmentId: fulfillment.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log the failed action
      await this.logAction({
        agentId,
        integrationId: 'shopify',
        actionType: 'order_fulfill',
        actionData: { orderId, fulfillmentData },
        status: 'failed',
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Schedule an autonomous action for later execution
  async scheduleAction(
    agentId: string,
    integrationId: string,
    actionType: string,
    actionData: any,
    scheduledFor: Date
  ): Promise<{ success: boolean; actionId?: string; error?: string }> {
    try {
      const supabase = createSupabaseServerClient()

      const { data, error } = await supabase
        .from('autonomous_actions')
        .insert({
          user_id: this.userId,
          agent_id: agentId,
          integration_id: integrationId,
          action_type: actionType,
          action_data: actionData,
          status: 'pending',
          scheduled_for: scheduledFor.toISOString()
        })
        .select('id')
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        actionId: data.id
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Check rate limits for autonomous actions
  private async checkRateLimit(integrationId: string, actionType: string): Promise<boolean> {
    try {
      const supabase = createSupabaseServerClient()
      
      // Get user's rate limit settings
      const { data: permission } = await supabase
        .from('action_permissions')
        .select('max_frequency, restrictions')
        .eq('user_id', this.userId)
        .eq('integration_id', integrationId)
        .eq('action_type', actionType)
        .single()

      if (!permission?.max_frequency) {
        return true // No rate limit set
      }

      // Check recent actions based on frequency
      let timeWindow: Date
      switch (permission.max_frequency) {
        case 'hourly':
          timeWindow = new Date(Date.now() - 60 * 60 * 1000)
          break
        case 'daily':
          timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          timeWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          return true
      }

      const { count } = await supabase
        .from('agent_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId)
        .eq('integration_id', integrationId)
        .eq('action_type', actionType)
        .gte('created_at', timeWindow.toISOString())

      const maxActions = permission.restrictions?.maxActions || 10
      return (count || 0) < maxActions
    } catch {
      return false // Err on the side of caution
    }
  }

  // Log autonomous action for audit trail
  private async logAction(actionData: {
    agentId: string
    integrationId: string
    actionType: string
    actionData: any
    status: string
    result?: any
    error?: string
  }): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      
      await supabase.from('agent_actions').insert({
        user_id: this.userId,
        agent_id: actionData.agentId,
        integration_id: actionData.integrationId,
        action_type: actionData.actionType,
        action_description: `AI agent ${actionData.agentId} performed ${actionData.actionType}`,
        status: actionData.status,
        metadata: {
          autonomous: true,
          timestamp: new Date().toISOString(),
          actionData: actionData.actionData,
          result: actionData.result,
          error: actionData.error
        }
      })
    } catch (error) {
      console.error('Failed to log autonomous action:', error)
    }
  }

  // Get user's autonomous action history
  async getActionHistory(limit: number = 50): Promise<any[]> {
    try {
      const supabase = createSupabaseServerClient()
      
      const { data } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      return data || []
    } catch {
      return []
    }
  }
}

// Helper function to create autonomous action manager for a user
export function createAutonomousActionManager(userId: string): AutonomousActionManager {
  return new AutonomousActionManager(userId)
}

// Helper function to grant default permissions for new integrations
export async function grantDefaultPermissions(userId: string, integrationId: string): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()

    // Default permissions for Facebook Business
    if (integrationId === 'facebook-business') {
      const defaultPermissions = [
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'create_post',
          enabled: true,
          max_frequency: 'daily',
          restrictions: { maxActions: 5 }
        },
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'reply_comment',
          enabled: true,
          max_frequency: 'hourly',
          restrictions: { maxActions: 20 }
        }
      ]

      await supabase.from('action_permissions').upsert(defaultPermissions)
    }

    // Default permissions for Shopify
    if (integrationId === 'shopify') {
      const defaultPermissions = [
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'product_create',
          enabled: true,
          max_frequency: 'daily',
          restrictions: { maxActions: 10 }
        },
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'product_update',
          enabled: true,
          max_frequency: 'hourly',
          restrictions: { maxActions: 50 }
        },
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'inventory_update',
          enabled: true,
          max_frequency: 'hourly',
          restrictions: { maxActions: 100 }
        },
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'order_fulfill',
          enabled: true,
          max_frequency: 'hourly',
          restrictions: { maxActions: 25 }
        },
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'customer_create',
          enabled: true,
          max_frequency: 'daily',
          restrictions: { maxActions: 20 }
        },
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'price_update',
          enabled: false, // Requires explicit approval
          max_frequency: 'daily',
          restrictions: { maxActions: 5, requiresApproval: true }
        },
        {
          user_id: userId,
          integration_id: integrationId,
          action_type: 'bulk_operations',
          enabled: false, // Requires explicit approval
          max_frequency: 'daily',
          restrictions: { maxActions: 2, requiresApproval: true }
        }
      ]

      await supabase.from('action_permissions').upsert(defaultPermissions)
    }
  } catch (error) {
    console.error('Failed to grant default permissions:', error)
  }
}
