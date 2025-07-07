// Emergency Stop Controls
// System for immediately halting all agent activities in case of emergencies

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface EmergencyState {
  id: string
  userId: string
  isActive: boolean
  activatedAt: Date
  activatedBy: string
  reason: string
  scope: 'all' | 'shopify' | 'specific_agent'
  affectedAgents: string[]
  deactivatedAt?: Date
  deactivatedBy?: string
  deactivationReason?: string
  actionsBlocked: number
  metadata: any
}

export interface EmergencyAction {
  type: 'stop_all' | 'stop_integration' | 'stop_agent' | 'pause_approvals' | 'block_high_risk'
  scope: string[]
  reason: string
  duration?: number // minutes, null for indefinite
  conditions?: any
}

// Activate emergency stop
export async function activateEmergencyStop(
  userId: string,
  action: EmergencyAction,
  activatedBy: string = 'user'
): Promise<{ success: boolean; emergencyId?: string; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    // Check if emergency stop is already active
    const { data: existingEmergency } = await supabase
      .from('emergency_states')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    if (existingEmergency) {
      return {
        success: false,
        error: 'Emergency stop is already active'
      }
    }
    
    // Create emergency state record
    const emergencyId = crypto.randomUUID()
    const emergencyState: EmergencyState = {
      id: emergencyId,
      userId,
      isActive: true,
      activatedAt: new Date(),
      activatedBy,
      reason: action.reason,
      scope: action.scope.length === 1 ? action.scope[0] as any : 'all',
      affectedAgents: action.scope,
      actionsBlocked: 0,
      metadata: {
        action_type: action.type,
        duration: action.duration,
        conditions: action.conditions
      }
    }
    
    const { error: insertError } = await supabase
      .from('emergency_states')
      .insert({
        id: emergencyId,
        user_id: userId,
        is_active: true,
        activated_at: emergencyState.activatedAt.toISOString(),
        activated_by: activatedBy,
        reason: action.reason,
        scope: emergencyState.scope,
        affected_agents: action.scope,
        actions_blocked: 0,
        metadata: emergencyState.metadata
      })
    
    if (insertError) {
      throw insertError
    }
    
    // Cancel all pending actions based on scope
    await cancelPendingActions(userId, action)
    
    // Pause all scheduled actions
    await pauseScheduledActions(userId, action)
    
    // Log the emergency activation
    await supabase.from('agent_actions').insert({
      user_id: userId,
      agent_id: 'system',
      integration_id: 'emergency_control',
      action_type: 'emergency_stop_activated',
      action_description: `Emergency stop activated: ${action.reason}`,
      status: 'completed',
      metadata: {
        emergency_id: emergencyId,
        action_type: action.type,
        scope: action.scope,
        activated_by: activatedBy
      }
    })
    
    // Send notifications
    await sendEmergencyNotification(userId, 'activated', emergencyState)
    
    return {
      success: true,
      emergencyId
    }
  } catch (error) {
    console.error('Error activating emergency stop:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Deactivate emergency stop
export async function deactivateEmergencyStop(
  userId: string,
  emergencyId: string,
  deactivatedBy: string = 'user',
  reason: string = 'Manual deactivation'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    // Get the emergency state
    const { data: emergency, error: fetchError } = await supabase
      .from('emergency_states')
      .select('*')
      .eq('id', emergencyId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    if (fetchError || !emergency) {
      return {
        success: false,
        error: 'Emergency state not found or already deactivated'
      }
    }
    
    // Update emergency state
    const { error: updateError } = await supabase
      .from('emergency_states')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: deactivatedBy,
        deactivation_reason: reason
      })
      .eq('id', emergencyId)
    
    if (updateError) {
      throw updateError
    }
    
    // Resume scheduled actions if applicable
    await resumeScheduledActions(userId, emergency)
    
    // Log the deactivation
    await supabase.from('agent_actions').insert({
      user_id: userId,
      agent_id: 'system',
      integration_id: 'emergency_control',
      action_type: 'emergency_stop_deactivated',
      action_description: `Emergency stop deactivated: ${reason}`,
      status: 'completed',
      metadata: {
        emergency_id: emergencyId,
        deactivated_by: deactivatedBy,
        duration_minutes: Math.floor((new Date().getTime() - new Date(emergency.activated_at).getTime()) / (1000 * 60))
      }
    })
    
    // Send notifications
    await sendEmergencyNotification(userId, 'deactivated', emergency)
    
    return { success: true }
  } catch (error) {
    console.error('Error deactivating emergency stop:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Check if emergency stop is active for a user
export async function isEmergencyStopActive(
  userId: string,
  agentId?: string,
  integrationId?: string
): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data: emergencies } = await supabase
      .from('emergency_states')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (!emergencies || emergencies.length === 0) {
      return false
    }
    
    // Check if any emergency affects the current context
    for (const emergency of emergencies) {
      if (emergency.scope === 'all') {
        return true
      }
      
      if (agentId && emergency.affected_agents.includes(agentId)) {
        return true
      }
      
      if (integrationId && emergency.scope === integrationId) {
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking emergency stop status:', error)
    return false // Fail safe - don't block if we can't check
  }
}

// Get active emergency states for a user
export async function getActiveEmergencyStates(userId: string): Promise<EmergencyState[]> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from('emergency_states')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('activated_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      isActive: record.is_active,
      activatedAt: new Date(record.activated_at),
      activatedBy: record.activated_by,
      reason: record.reason,
      scope: record.scope,
      affectedAgents: record.affected_agents || [],
      deactivatedAt: record.deactivated_at ? new Date(record.deactivated_at) : undefined,
      deactivatedBy: record.deactivated_by,
      deactivationReason: record.deactivation_reason,
      actionsBlocked: record.actions_blocked || 0,
      metadata: record.metadata || {}
    }))
  } catch (error) {
    console.error('Error getting emergency states:', error)
    return []
  }
}

// Get emergency history for a user
export async function getEmergencyHistory(
  userId: string,
  limit: number = 50
): Promise<EmergencyState[]> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from('emergency_states')
      .select('*')
      .eq('user_id', userId)
      .order('activated_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      throw error
    }
    
    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      isActive: record.is_active,
      activatedAt: new Date(record.activated_at),
      activatedBy: record.activated_by,
      reason: record.reason,
      scope: record.scope,
      affectedAgents: record.affected_agents || [],
      deactivatedAt: record.deactivated_at ? new Date(record.deactivated_at) : undefined,
      deactivatedBy: record.deactivated_by,
      deactivationReason: record.deactivation_reason,
      actionsBlocked: record.actions_blocked || 0,
      metadata: record.metadata || {}
    }))
  } catch (error) {
    console.error('Error getting emergency history:', error)
    return []
  }
}

// Cancel pending actions based on emergency scope
async function cancelPendingActions(userId: string, action: EmergencyAction): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    let query = supabase
      .from('approval_requests')
      .update({ status: 'cancelled', cancellation_reason: `Emergency stop: ${action.reason}` })
      .eq('user_id', userId)
      .eq('status', 'pending')
    
    // Apply scope filters
    if (action.type === 'stop_agent' && action.scope.length > 0) {
      query = query.in('agent_id', action.scope)
    } else if (action.type === 'stop_integration' && action.scope.length > 0) {
      query = query.in('integration_id', action.scope)
    }
    
    await query
  } catch (error) {
    console.error('Error cancelling pending actions:', error)
  }
}

// Pause scheduled actions
async function pauseScheduledActions(userId: string, action: EmergencyAction): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    let query = supabase
      .from('autonomous_actions')
      .update({ status: 'paused', pause_reason: `Emergency stop: ${action.reason}` })
      .eq('user_id', userId)
      .eq('status', 'pending')
    
    // Apply scope filters
    if (action.type === 'stop_agent' && action.scope.length > 0) {
      query = query.in('agent_id', action.scope)
    } else if (action.type === 'stop_integration' && action.scope.length > 0) {
      query = query.in('integration_id', action.scope)
    }
    
    await query
  } catch (error) {
    console.error('Error pausing scheduled actions:', error)
  }
}

// Resume scheduled actions after emergency deactivation
async function resumeScheduledActions(userId: string, emergency: any): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    let query = supabase
      .from('autonomous_actions')
      .update({ status: 'pending', pause_reason: null })
      .eq('user_id', userId)
      .eq('status', 'paused')
      .like('pause_reason', `Emergency stop:%`)
    
    // Apply scope filters based on original emergency
    if (emergency.scope !== 'all') {
      if (emergency.affected_agents && emergency.affected_agents.length > 0) {
        query = query.in('agent_id', emergency.affected_agents)
      } else {
        query = query.eq('integration_id', emergency.scope)
      }
    }
    
    await query
  } catch (error) {
    console.error('Error resuming scheduled actions:', error)
  }
}

// Send emergency notifications
async function sendEmergencyNotification(
  userId: string,
  type: 'activated' | 'deactivated',
  emergency: any
): Promise<void> {
  try {
    // TODO: Implement actual notification sending (email, SMS, push)
    console.log(`Emergency ${type} notification sent to user ${userId}:`, emergency.reason)
  } catch (error) {
    console.error('Error sending emergency notification:', error)
  }
}

// Increment blocked actions counter
export async function incrementBlockedActions(emergencyId: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    await supabase.rpc('increment_blocked_actions', { emergency_id: emergencyId })
  } catch (error) {
    console.error('Error incrementing blocked actions:', error)
  }
}

// Check if action should be blocked by emergency controls
export async function shouldBlockAction(
  userId: string,
  agentId: string,
  integrationId: string,
  actionType: string,
  riskLevel: string
): Promise<{ blocked: boolean; reason?: string; emergencyId?: string }> {
  try {
    // Check for active emergency stops
    const emergencies = await getActiveEmergencyStates(userId)
    
    for (const emergency of emergencies) {
      let shouldBlock = false
      let reason = emergency.reason
      
      // Check scope-based blocking
      if (emergency.scope === 'all') {
        shouldBlock = true
      } else if (emergency.scope === integrationId) {
        shouldBlock = true
      } else if (emergency.affectedAgents.includes(agentId)) {
        shouldBlock = true
      }
      
      // Check condition-based blocking
      if (!shouldBlock && emergency.metadata.conditions) {
        const conditions = emergency.metadata.conditions
        
        if (conditions.block_high_risk && (riskLevel === 'high' || riskLevel === 'critical')) {
          shouldBlock = true
          reason = 'High-risk actions blocked during emergency'
        }
        
        if (conditions.block_action_types && conditions.block_action_types.includes(actionType)) {
          shouldBlock = true
          reason = `Action type ${actionType} blocked during emergency`
        }
      }
      
      if (shouldBlock) {
        // Increment blocked actions counter
        await incrementBlockedActions(emergency.id)
        
        return {
          blocked: true,
          reason,
          emergencyId: emergency.id
        }
      }
    }
    
    return { blocked: false }
  } catch (error) {
    console.error('Error checking if action should be blocked:', error)
    return { blocked: false } // Fail safe - don't block if we can't check
  }
}

// Auto-deactivate expired emergency stops
export async function cleanupExpiredEmergencyStops(): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    // Get emergency stops with duration that have expired
    const { data: expiredEmergencies } = await supabase
      .from('emergency_states')
      .select('*')
      .eq('is_active', true)
      .not('metadata->duration', 'is', null)
    
    for (const emergency of expiredEmergencies || []) {
      const duration = emergency.metadata?.duration
      if (duration) {
        const expiryTime = new Date(emergency.activated_at).getTime() + (duration * 60 * 1000)
        if (Date.now() > expiryTime) {
          await deactivateEmergencyStop(
            emergency.user_id,
            emergency.id,
            'system',
            'Automatic deactivation - duration expired'
          )
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired emergency stops:', error)
  }
}
