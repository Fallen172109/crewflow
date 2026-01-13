import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

export interface TierLimits {
  agents: number
  requestsPerAgent: number
  stores: number
  features: string[]
  apiAccess: boolean
  prioritySupport: boolean
  customIntegrations: boolean
  whiteLabel: boolean
  auditLogs: boolean
  advancedAnalytics: boolean
}

export interface UsageData {
  currentRequests: number
  requestLimit: number
  currentAgents: number
  agentLimit: number
  currentStores: number
  storeLimit: number
  percentage: number
  overage: number
}

// Get tier limits configuration
export function getTierLimits(tier: string | null): TierLimits {
  const defaultLimits: TierLimits = {
    agents: 1,
    requestsPerAgent: 100,
    stores: 1,
    features: ['basic_chat'],
    apiAccess: false,
    prioritySupport: false,
    customIntegrations: false,
    whiteLabel: false,
    auditLogs: false,
    advancedAnalytics: false
  }

  if (!tier || !(tier in SUBSCRIPTION_TIERS)) {
    return defaultLimits
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]

  const tierLimits: Record<string, TierLimits> = {
    starter: {
      agents: 3,
      requestsPerAgent: 500,
      stores: 1,
      features: ['basic_chat', 'single_agent', 'basic_analytics', 'email_support'],
      apiAccess: false,
      prioritySupport: false,
      customIntegrations: false,
      whiteLabel: false,
      auditLogs: false,
      advancedAnalytics: false
    },
    professional: {
      agents: 6,
      requestsPerAgent: 750,
      stores: 3,
      features: [
        'basic_chat', 'multiple_agents', 'advanced_integrations', 
        'priority_support', 'custom_workflows', 'analytics_dashboard',
        'bulk_operations', 'scheduled_actions'
      ],
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: false,
      whiteLabel: false,
      auditLogs: true,
      advancedAnalytics: true
    },
    enterprise: {
      agents: -1, // unlimited
      requestsPerAgent: -1, // unlimited
      stores: -1, // unlimited
      features: [
        'basic_chat', 'unlimited_agents', 'white_label', 'api_access',
        'custom_integrations', 'dedicated_support', 'advanced_security',
        'audit_logs', 'advanced_analytics', 'custom_workflows',
        'bulk_operations', 'scheduled_actions', 'priority_queue'
      ],
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: true,
      whiteLabel: true,
      auditLogs: true,
      advancedAnalytics: true
    }
  }

  return tierLimits[tier] || defaultLimits
}

// Check if user has access to a specific feature
export function hasFeatureAccess(
  currentTier: string | null,
  feature: string
): boolean {
  const limits = getTierLimits(currentTier)
  return limits.features.includes(feature)
}

// Check if user can perform an action based on usage limits
export function canPerformAction(
  currentTier: string | null,
  usageData: UsageData,
  actionType: 'request' | 'agent' | 'store'
): {
  allowed: boolean
  reason?: string
  upgradeRequired?: string
} {
  const limits = getTierLimits(currentTier)

  switch (actionType) {
    case 'request':
      if (limits.requestsPerAgent === -1) {
        return { allowed: true }
      }
      
      if (usageData.currentRequests >= limits.requestsPerAgent) {
        return {
          allowed: false,
          reason: 'Monthly request limit exceeded',
          upgradeRequired: getRecommendedUpgrade(currentTier)
        }
      }
      return { allowed: true }

    case 'agent':
      if (limits.agents === -1) {
        return { allowed: true }
      }
      
      if (usageData.currentAgents >= limits.agents) {
        return {
          allowed: false,
          reason: 'Agent limit reached',
          upgradeRequired: getRecommendedUpgrade(currentTier)
        }
      }
      return { allowed: true }

    case 'store':
      if (limits.stores === -1) {
        return { allowed: true }
      }
      
      if (usageData.currentStores >= limits.stores) {
        return {
          allowed: false,
          reason: 'Store connection limit reached',
          upgradeRequired: getRecommendedUpgrade(currentTier)
        }
      }
      return { allowed: true }

    default:
      return { allowed: true }
  }
}

// Get recommended upgrade tier
export function getRecommendedUpgrade(currentTier: string | null): string {
  if (!currentTier || currentTier === 'starter') {
    return 'professional'
  }
  if (currentTier === 'professional') {
    return 'enterprise'
  }
  return 'enterprise'
}

// Calculate usage percentage for a specific limit type
export function calculateUsagePercentage(
  current: number,
  limit: number
): number {
  if (limit === -1) return 0 // unlimited
  if (limit === 0) return 100
  return Math.min((current / limit) * 100, 100)
}

// Get usage status based on percentage
export function getUsageStatus(percentage: number): {
  status: 'normal' | 'warning' | 'critical' | 'exceeded'
  color: string
  message: string
} {
  if (percentage >= 100) {
    return {
      status: 'exceeded',
      color: 'red',
      message: 'Limit exceeded'
    }
  }
  
  if (percentage >= 90) {
    return {
      status: 'critical',
      color: 'red',
      message: 'Critical usage level'
    }
  }
  
  if (percentage >= 75) {
    return {
      status: 'warning',
      color: 'green',
      message: 'Approaching limit'
    }
  }
  
  return {
    status: 'normal',
    color: 'green',
    message: 'Normal usage'
  }
}

// Tier enforcement decorator for API routes
export function withTierEnforcement(
  requiredFeature: string,
  options: {
    blockOnExceeded?: boolean
    allowOverage?: boolean
    trackUsage?: boolean
  } = {}
) {
  return function (handler: Function) {
    return async function enforcedHandler(request: any, context: any) {
      try {
        // Get user from request (this would be implemented based on your auth system)
        const user = await getUserFromRequest(request)
        
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check feature access
        if (!hasFeatureAccess(user.subscription_tier, requiredFeature)) {
          return new Response(JSON.stringify({ 
            error: 'Feature not available in your plan',
            requiredFeature,
            currentTier: user.subscription_tier,
            upgradeRequired: getRecommendedUpgrade(user.subscription_tier)
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Check usage limits if tracking is enabled
        if (options.trackUsage) {
          const usageData = await getUserUsageData(user.id)
          const actionCheck = canPerformAction(user.subscription_tier, usageData, 'request')
          
          if (!actionCheck.allowed && options.blockOnExceeded) {
            return new Response(JSON.stringify({
              error: actionCheck.reason,
              usage: usageData,
              upgradeRequired: actionCheck.upgradeRequired
            }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }

        // Call the original handler
        return await handler(request, context)
      } catch (error) {
        console.error('Tier enforcement error:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
}

// Helper functions (these would be implemented based on your specific setup)
async function getUserFromRequest(request: any): Promise<any> {
  // Implementation depends on your auth system
  // This is a placeholder
  return null
}

async function getUserUsageData(userId: string): Promise<UsageData> {
  // Implementation depends on your database setup
  // This is a placeholder
  return {
    currentRequests: 0,
    requestLimit: 100,
    currentAgents: 0,
    agentLimit: 1,
    currentStores: 0,
    storeLimit: 1,
    percentage: 0,
    overage: 0
  }
}

// Tier comparison utilities
export function compareTiers(
  tier1: string | null,
  tier2: string | null
): number {
  const tierOrder = { starter: 1, professional: 2, enterprise: 3 }
  const t1 = tierOrder[tier1 as keyof typeof tierOrder] || 0
  const t2 = tierOrder[tier2 as keyof typeof tierOrder] || 0
  return t1 - t2
}

export function isUpgrade(
  currentTier: string | null,
  targetTier: string | null
): boolean {
  return compareTiers(currentTier, targetTier) < 0
}

export function isDowngrade(
  currentTier: string | null,
  targetTier: string | null
): boolean {
  return compareTiers(currentTier, targetTier) > 0
}

// Feature availability matrix
export const FEATURE_MATRIX = {
  'basic_chat': ['starter', 'professional', 'enterprise'],
  'multiple_agents': ['professional', 'enterprise'],
  'unlimited_agents': ['enterprise'],
  'advanced_integrations': ['professional', 'enterprise'],
  'custom_integrations': ['enterprise'],
  'white_label': ['enterprise'],
  'api_access': ['professional', 'enterprise'],
  'priority_support': ['professional', 'enterprise'],
  'dedicated_support': ['enterprise'],
  'audit_logs': ['professional', 'enterprise'],
  'advanced_analytics': ['professional', 'enterprise'],
  'custom_workflows': ['professional', 'enterprise'],
  'bulk_operations': ['professional', 'enterprise'],
  'scheduled_actions': ['professional', 'enterprise'],
  'priority_queue': ['enterprise']
} as const

export type FeatureName = keyof typeof FEATURE_MATRIX
