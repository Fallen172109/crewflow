// Permission Manager for Agent Actions
// Handles user permissions, role-based access control, and action authorization

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface UserPermission {
  userId: string
  resource: string
  action: string
  granted: boolean
  grantedBy?: string
  grantedAt: Date
  expiresAt?: Date
  conditions?: any
}

export interface RolePermission {
  role: string
  resource: string
  actions: string[]
  conditions?: any
}

export interface PermissionCheck {
  userId: string
  resource: string
  action: string
  context?: any
}

// Default role permissions
const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'user',
    resource: 'shopify',
    actions: ['read_products', 'read_orders', 'read_customers', 'read_analytics']
  },
  {
    role: 'user',
    resource: 'agents',
    actions: ['view_status', 'basic_commands']
  },
  {
    role: 'admin',
    resource: 'shopify',
    actions: ['*'] // All actions
  },
  {
    role: 'admin',
    resource: 'agents',
    actions: ['*'] // All actions
  },
  {
    role: 'admin',
    resource: 'system',
    actions: ['*'] // All actions
  }
]

// Check if user has permission for a specific action
export async function hasPermission(
  userId: string,
  resource: string,
  action: string,
  context?: any
): Promise<boolean> {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get user's role and permissions
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('role, permissions')
      .eq('user_id', userId)
      .single()
    
    if (error || !userProfile) {
      // Default to basic user permissions if no profile found
      return checkDefaultPermissions('user', resource, action)
    }
    
    // Check explicit permissions first
    if (userProfile.permissions && userProfile.permissions[resource]) {
      const resourcePermissions = userProfile.permissions[resource]
      if (resourcePermissions[action] !== undefined) {
        return resourcePermissions[action]
      }
    }
    
    // Check role-based permissions
    const role = userProfile.role || 'user'
    return checkRolePermissions(role, resource, action)
    
  } catch (error) {
    console.error('Error checking permissions:', error)
    return false // Fail secure
  }
}

// Check role-based permissions
function checkRolePermissions(role: string, resource: string, action: string): boolean {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS.filter(rp => rp.role === role)
  
  for (const permission of rolePermissions) {
    if (permission.resource === resource) {
      // Check for wildcard permission
      if (permission.actions.includes('*')) {
        return true
      }
      
      // Check for specific action
      if (permission.actions.includes(action)) {
        return true
      }
    }
  }
  
  return false
}

// Check default permissions for basic users
function checkDefaultPermissions(role: string, resource: string, action: string): boolean {
  // Basic read permissions for all users
  const readActions = ['read_products', 'read_orders', 'read_customers', 'read_analytics', 'view_status']
  
  if (readActions.includes(action)) {
    return true
  }
  
  return false
}

// Grant permission to a user
export async function grantPermission(
  userId: string,
  resource: string,
  action: string,
  grantedBy: string,
  expiresAt?: Date,
  conditions?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient()
    
    const permission: UserPermission = {
      userId,
      resource,
      action,
      granted: true,
      grantedBy,
      grantedAt: new Date(),
      expiresAt,
      conditions
    }
    
    const { error } = await supabase.from('user_permissions').upsert({
      user_id: userId,
      resource,
      action,
      granted: true,
      granted_by: grantedBy,
      granted_at: permission.grantedAt.toISOString(),
      expires_at: expiresAt?.toISOString(),
      conditions
    })
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Revoke permission from a user
export async function revokePermission(
  userId: string,
  resource: string,
  action: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { error } = await supabase
      .from('user_permissions')
      .update({ granted: false })
      .eq('user_id', userId)
      .eq('resource', resource)
      .eq('action', action)
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get all permissions for a user
export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('granted', true)
    
    if (error) {
      throw error
    }
    
    return (data || []).map(record => ({
      userId: record.user_id,
      resource: record.resource,
      action: record.action,
      granted: record.granted,
      grantedBy: record.granted_by,
      grantedAt: new Date(record.granted_at),
      expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
      conditions: record.conditions
    }))
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

// Check multiple permissions at once
export async function checkPermissions(
  userId: string,
  checks: PermissionCheck[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}
  
  for (const check of checks) {
    const key = `${check.resource}:${check.action}`
    results[key] = await hasPermission(
      userId,
      check.resource,
      check.action,
      check.context
    )
  }
  
  return results
}

// Update user role
export async function updateUserRole(
  userId: string,
  newRole: string,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        role: newRole,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Clean up expired permissions
export async function cleanupExpiredPermissions(): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()
    
    await supabase
      .from('user_permissions')
      .update({ granted: false })
      .lt('expires_at', new Date().toISOString())
      .eq('granted', true)
  } catch (error) {
    console.error('Error cleaning up expired permissions:', error)
  }
}

// Permission middleware for API routes
export function requirePermission(resource: string, action: string) {
  return async (userId: string): Promise<boolean> => {
    return await hasPermission(userId, resource, action)
  }
}

// Shopify-specific permission helpers
export const ShopifyPermissions = {
  canReadProducts: (userId: string) => hasPermission(userId, 'shopify', 'read_products'),
  canWriteProducts: (userId: string) => hasPermission(userId, 'shopify', 'write_products'),
  canReadOrders: (userId: string) => hasPermission(userId, 'shopify', 'read_orders'),
  canWriteOrders: (userId: string) => hasPermission(userId, 'shopify', 'write_orders'),
  canReadCustomers: (userId: string) => hasPermission(userId, 'shopify', 'read_customers'),
  canWriteCustomers: (userId: string) => hasPermission(userId, 'shopify', 'write_customers'),
  canReadAnalytics: (userId: string) => hasPermission(userId, 'shopify', 'read_analytics'),
  canManageInventory: (userId: string) => hasPermission(userId, 'shopify', 'manage_inventory'),
  canManageWebhooks: (userId: string) => hasPermission(userId, 'shopify', 'manage_webhooks')
}

// Agent-specific permission helpers
export const AgentPermissions = {
  canControlAgent: (userId: string, agentId: string) => 
    hasPermission(userId, 'agents', `control_${agentId}`),
  canViewAgentStatus: (userId: string) => hasPermission(userId, 'agents', 'view_status'),
  canConfigureAgent: (userId: string, agentId: string) => 
    hasPermission(userId, 'agents', `configure_${agentId}`),
  canApproveActions: (userId: string) => hasPermission(userId, 'agents', 'approve_actions'),
  canEmergencyStop: (userId: string) => hasPermission(userId, 'agents', 'emergency_stop')
}
