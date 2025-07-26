'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UpgradeFlowOptions {
  onSuccess?: (tier: string) => void
  onError?: (error: string) => void
  redirectAfterUpgrade?: boolean
}

export function useUpgradeFlow(options: UpgradeFlowOptions = {}) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const router = useRouter()

  const { onSuccess, onError, redirectAfterUpgrade = true } = options

  const initiateUpgrade = useCallback(async (
    targetTier: string,
    reason?: string,
    metadata?: any
  ) => {
    try {
      setIsUpgrading(true)
      setUpgradeError(null)

      // Track upgrade attempt
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'upgrade_initiated',
          properties: {
            target_tier: targetTier,
            reason,
            metadata
          }
        })
      })

      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: targetTier,
          reason,
          metadata
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url, sessionId } = await response.json()

      if (!url) {
        throw new Error('No checkout URL received')
      }

      // Store upgrade context for post-checkout handling
      localStorage.setItem('upgrade_context', JSON.stringify({
        sessionId,
        targetTier,
        reason,
        timestamp: Date.now()
      }))

      // Redirect to Stripe Checkout
      window.location.href = url

    } catch (error) {
      console.error('Upgrade initiation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upgrade failed'
      setUpgradeError(errorMessage)
      
      if (onError) {
        onError(errorMessage)
      }

      // Track upgrade failure
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'upgrade_failed',
          properties: {
            target_tier: targetTier,
            error: errorMessage,
            reason
          }
        })
      })
    } finally {
      setIsUpgrading(false)
    }
  }, [onError])

  const handleUpgradeSuccess = useCallback(async (tier: string) => {
    try {
      // Track successful upgrade
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'upgrade_completed',
          properties: {
            new_tier: tier,
            timestamp: Date.now()
          }
        })
      })

      // Clear upgrade context
      localStorage.removeItem('upgrade_context')

      if (onSuccess) {
        onSuccess(tier)
      }

      if (redirectAfterUpgrade) {
        router.push('/dashboard?upgraded=true')
      }
    } catch (error) {
      console.error('Error handling upgrade success:', error)
    }
  }, [onSuccess, redirectAfterUpgrade, router])

  const checkUpgradeStatus = useCallback(async () => {
    try {
      const upgradeContext = localStorage.getItem('upgrade_context')
      if (!upgradeContext) return null

      const context = JSON.parse(upgradeContext)
      
      // Check if upgrade context is too old (more than 1 hour)
      if (Date.now() - context.timestamp > 3600000) {
        localStorage.removeItem('upgrade_context')
        return null
      }

      // Verify upgrade status with backend
      const response = await fetch(`/api/stripe/verify-upgrade?sessionId=${context.sessionId}`)
      
      if (!response.ok) {
        return null
      }

      const { success, tier } = await response.json()
      
      if (success) {
        await handleUpgradeSuccess(tier)
        return { success: true, tier }
      }

      return null
    } catch (error) {
      console.error('Error checking upgrade status:', error)
      return null
    }
  }, [handleUpgradeSuccess])

  const getUpgradeUrl = useCallback(async (
    targetTier: string,
    reason?: string
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: targetTier,
          reason,
          mode: 'url_only'
        })
      })

      if (!response.ok) {
        return null
      }

      const { url } = await response.json()
      return url
    } catch (error) {
      console.error('Error getting upgrade URL:', error)
      return null
    }
  }, [])

  const cancelUpgrade = useCallback(() => {
    localStorage.removeItem('upgrade_context')
    setIsUpgrading(false)
    setUpgradeError(null)
  }, [])

  return {
    // State
    isUpgrading,
    upgradeError,

    // Actions
    initiateUpgrade,
    handleUpgradeSuccess,
    checkUpgradeStatus,
    getUpgradeUrl,
    cancelUpgrade,

    // Utilities
    clearError: () => setUpgradeError(null)
  }
}

// Hook for checking tier limits
export function useTierLimits(currentTier: string | null) {
  const checkLimit = useCallback((
    limitType: 'agents' | 'requests' | 'stores' | 'features',
    currentUsage: number,
    requestedAction?: string
  ) => {
    // Get tier limits from SUBSCRIPTION_TIERS or default limits
    const getTierLimits = (tier: string | null) => {
      if (!tier) {
        return { agents: 1, requestsPerAgent: 100, stores: 1, features: ['basic'] }
      }
      
      // This would normally come from SUBSCRIPTION_TIERS
      const limits = {
        starter: { agents: 3, requestsPerAgent: 500, stores: 1, features: ['basic', 'analytics'] },
        professional: { agents: 6, requestsPerAgent: 750, stores: 3, features: ['basic', 'analytics', 'integrations'] },
        enterprise: { agents: -1, requestsPerAgent: -1, stores: -1, features: ['all'] }
      }
      
      return limits[tier as keyof typeof limits] || limits.starter
    }

    const limits = getTierLimits(currentTier)
    
    switch (limitType) {
      case 'agents':
        return {
          allowed: limits.agents === -1 || currentUsage < limits.agents,
          limit: limits.agents,
          current: currentUsage,
          remaining: limits.agents === -1 ? -1 : Math.max(0, limits.agents - currentUsage)
        }
      
      case 'requests':
        return {
          allowed: limits.requestsPerAgent === -1 || currentUsage < limits.requestsPerAgent,
          limit: limits.requestsPerAgent,
          current: currentUsage,
          remaining: limits.requestsPerAgent === -1 ? -1 : Math.max(0, limits.requestsPerAgent - currentUsage)
        }
      
      case 'stores':
        return {
          allowed: limits.stores === -1 || currentUsage < limits.stores,
          limit: limits.stores,
          current: currentUsage,
          remaining: limits.stores === -1 ? -1 : Math.max(0, limits.stores - currentUsage)
        }
      
      case 'features':
        const hasFeature = limits.features.includes('all') || 
                          (requestedAction && limits.features.includes(requestedAction))
        return {
          allowed: hasFeature,
          limit: limits.features,
          current: requestedAction,
          remaining: hasFeature ? 1 : 0
        }
      
      default:
        return { allowed: true, limit: -1, current: 0, remaining: -1 }
    }
  }, [currentTier])

  const getUpgradeRecommendation = useCallback((
    limitType: 'agents' | 'requests' | 'stores' | 'features',
    currentUsage: number
  ) => {
    if (!currentTier || currentTier === 'starter') {
      return 'professional'
    }
    if (currentTier === 'professional') {
      return 'enterprise'
    }
    return null
  }, [currentTier])

  return {
    checkLimit,
    getUpgradeRecommendation
  }
}
