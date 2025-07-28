import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export interface StorePermissionCheck {
  storeId: string
  userId: string
  permission: string
  agentId?: string
}

export interface StoreValidationResult {
  allowed: boolean
  reason?: string
  storeData?: any
}

/**
 * Validates if a user has permission to perform an action on a specific store
 */
export async function validateStorePermission({
  storeId,
  userId,
  permission,
  agentId
}: StorePermissionCheck): Promise<StoreValidationResult> {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Get store data with permissions
    const { data: store, error } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    if (error || !store) {
      return {
        allowed: false,
        reason: 'Store not found or access denied'
      }
    }

    // Check if store is active
    if (!store.is_active) {
      return {
        allowed: false,
        reason: 'Store is inactive',
        storeData: store
      }
    }

    // Check store-level permission
    const storePermissions = store.permissions || {}
    if (!storePermissions[permission]) {
      return {
        allowed: false,
        reason: `Permission '${permission}' is disabled for this store`,
        storeData: store
      }
    }

    // If agent is specified, check agent access
    if (agentId) {
      const agentAccess = store.agent_access || {}
      const agentConfig = agentAccess[agentId]

      if (!agentConfig || !agentConfig.enabled) {
        return {
          allowed: false,
          reason: `Agent '${agentId}' is not enabled for this store`,
          storeData: store
        }
      }

      // Check if agent has the required permission
      const agentPermissions = agentConfig.permissions || []
      const permissionMapping = getPermissionToCapabilityMapping()
      const requiredCapability = permissionMapping[permission]

      if (requiredCapability && !agentPermissions.includes(requiredCapability)) {
        return {
          allowed: false,
          reason: `Agent '${agentId}' does not have capability '${requiredCapability}' for this store`,
          storeData: store
        }
      }
    }

    return {
      allowed: true,
      storeData: store
    }

  } catch (error) {
    console.error('Error validating store permission:', error)
    return {
      allowed: false,
      reason: 'Internal error during permission validation'
    }
  }
}

/**
 * Middleware function to validate store permissions in API routes
 */
export async function withStorePermission(
  storeId: string,
  userId: string,
  permission: string,
  agentId?: string
) {
  const validation = await validateStorePermission({
    storeId,
    userId,
    permission,
    agentId
  })

  if (!validation.allowed) {
    throw new Error(validation.reason || 'Permission denied')
  }

  return validation.storeData
}

/**
 * Maps Shopify permissions to agent capabilities
 */
function getPermissionToCapabilityMapping(): Record<string, string> {
  return {
    'read_products': 'product_research',
    'write_products': 'product_optimization',
    'read_orders': 'order_tracking',
    'write_orders': 'order_fulfillment',
    'read_customers': 'customer_behavior_analysis',
    'write_customers': 'customer_service',
    'read_analytics': 'market_analysis',
    'read_inventory': 'inventory_management',
    'write_inventory': 'inventory_management',
    'read_fulfillments': 'order_fulfillment',
    'write_fulfillments': 'order_fulfillment'
  }
}

/**
 * Validates multiple permissions at once
 */
export async function validateMultipleStorePermissions(
  storeId: string,
  userId: string,
  permissions: string[],
  agentId?: string
): Promise<{ [permission: string]: StoreValidationResult }> {
  const results: { [permission: string]: StoreValidationResult } = {}

  for (const permission of permissions) {
    results[permission] = await validateStorePermission({
      storeId,
      userId,
      permission,
      agentId
    })
  }

  return results
}

/**
 * Helper to check if any of the required permissions are allowed
 */
export async function hasAnyStorePermission(
  storeId: string,
  userId: string,
  permissions: string[],
  agentId?: string
): Promise<boolean> {
  const results = await validateMultipleStorePermissions(storeId, userId, permissions, agentId)
  return Object.values(results).some(result => result.allowed)
}

/**
 * Helper to check if all required permissions are allowed
 */
export async function hasAllStorePermissions(
  storeId: string,
  userId: string,
  permissions: string[],
  agentId?: string
): Promise<boolean> {
  const results = await validateMultipleStorePermissions(storeId, userId, permissions, agentId)
  return Object.values(results).every(result => result.allowed)
}

/**
 * Get detailed permission status for a store
 */
export async function getStorePermissionStatus(
  storeId: string,
  userId: string,
  agentId?: string
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    const { data: store, error } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    if (error || !store) {
      return {
        storeFound: false,
        isActive: false,
        permissions: {},
        agentAccess: {},
        error: 'Store not found or access denied'
      }
    }

    const agentAccess = agentId ? store.agent_access?.[agentId] : null

    return {
      storeFound: true,
      isActive: store.is_active,
      permissions: store.permissions || {},
      agentAccess: agentAccess || null,
      storeData: store
    }
  } catch (error) {
    console.error('Error getting store permission status:', error)
    return {
      storeFound: false,
      isActive: false,
      permissions: {},
      agentAccess: {},
      error: 'Internal error'
    }
  }
}

/**
 * Log permission check for audit purposes
 */
export async function logPermissionCheck(
  storeId: string,
  userId: string,
  permission: string,
  allowed: boolean,
  reason?: string,
  agentId?: string
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    await supabase.from('permission_audit_log').insert({
      user_id: userId,
      store_id: storeId,
      permission,
      agent_id: agentId,
      allowed,
      reason,
      checked_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error logging permission check:', error)
    // Don't throw - logging failures shouldn't break the main flow
  }
}
