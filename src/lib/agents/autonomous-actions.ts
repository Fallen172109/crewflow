// Autonomous Agent Action System
// Enables AI agents to execute real actions using OAuth tokens without user intervention

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createFacebookAPI, type FacebookPost } from '@/lib/integrations/facebook-business-api'

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
  } catch (error) {
    console.error('Failed to grant default permissions:', error)
  }
}
