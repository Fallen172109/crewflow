'use client'

import { ReactNode, useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Zap, 
  Crown, 
  Clock, 
  TrendingUp,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import UpgradePromptModal from '@/components/modals/UpgradePromptModal'
import UpgradePromptBanner from '@/components/usage/UpgradePromptBanner'

interface UsageLimitEnforcerProps {
  children: ReactNode
  userId: string
  agentId?: string
  actionType?: string
  currentTier: 'starter' | 'professional' | 'enterprise' | null
  onUpgrade?: (tier: string) => void
  blockWhenExceeded?: boolean
  showWarningAt?: number // percentage
  className?: string
}

interface UsageData {
  current: number
  limit: number
  percentage: number
  resetDate: Date
  overage: number
  overageCost: number
}

export default function UsageLimitEnforcer({
  children,
  userId,
  agentId,
  actionType,
  currentTier,
  onUpgrade,
  blockWhenExceeded = true,
  showWarningAt = 80,
  className = ''
}: UsageLimitEnforcerProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [actionBlocked, setActionBlocked] = useState(false)

  useEffect(() => {
    fetchUsageData()
  }, [userId, agentId])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({ userId })
      if (agentId) params.append('agentId', agentId)

      const response = await fetch(`/api/usage/current?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }

      const data = await response.json()
      
      if (data.usage) {
        const usage = data.usage
        setUsageData({
          current: usage.currentUsage,
          limit: usage.limit,
          percentage: usage.percentage,
          resetDate: new Date(Date.now() + usage.daysUntilReset * 24 * 60 * 60 * 1000),
          overage: usage.overage,
          overageCost: usage.overageCost
        })
      }
    } catch (error) {
      console.error('Error fetching usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActionAttempt = async () => {
    if (!usageData) return true

    // Check if action would exceed limits
    if (usageData.percentage >= 100 && blockWhenExceeded) {
      setActionBlocked(true)
      setShowUpgradeModal(true)
      return false
    }

    // Track the action attempt
    try {
      await fetch('/api/usage/track-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          agentId,
          actionType,
          timestamp: new Date().toISOString()
        })
      })

      // Refresh usage data after action
      setTimeout(fetchUsageData, 1000)
    } catch (error) {
      console.error('Error tracking action:', error)
    }

    return true
  }

  const handleUpgrade = async (tier: string) => {
    if (onUpgrade) {
      await onUpgrade(tier)
    }
    setShowUpgradeModal(false)
    setActionBlocked(false)
    // Refresh usage data after upgrade
    setTimeout(fetchUsageData, 2000)
  }

  const isNearLimit = usageData && usageData.percentage >= showWarningAt
  const isOverLimit = usageData && usageData.percentage >= 100
  const shouldShowWarning = isNearLimit && !isOverLimit

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        {children}
        <div className="absolute top-2 right-2">
          <div className="bg-white rounded-full p-2 shadow-sm">
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Usage Warning Banner */}
      {shouldShowWarning && (
        <div className="mb-4">
          <UpgradePromptBanner
            currentTier={currentTier}
            reason="usage_warning"
            usagePercentage={usageData?.percentage}
            onUpgrade={handleUpgrade}
            compact
          />
        </div>
      )}

      {/* Main Content */}
      <div 
        onClick={handleActionAttempt}
        className={isOverLimit && blockWhenExceeded ? 'pointer-events-none' : ''}
      >
        {children}
      </div>

      {/* Usage Exceeded Overlay */}
      {isOverLimit && blockWhenExceeded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-red-50/90 backdrop-blur-sm rounded-lg flex items-center justify-center border-2 border-red-200"
        >
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Usage Limit Exceeded
            </h3>
            
            <p className="text-sm text-red-700 mb-4">
              You've used {usageData?.current.toLocaleString()} of {usageData?.limit.toLocaleString()} requests this month.
            </p>

            {usageData?.overage > 0 && (
              <div className="bg-red-100 rounded-lg p-3 mb-4">
                <div className="text-sm text-red-800">
                  <div className="font-medium">Overage: {usageData.overage.toLocaleString()} requests</div>
                  <div>Additional cost: ${usageData.overageCost.toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-2 text-xs text-red-600 mb-4">
              <Clock className="w-3 h-3" />
              <span>Resets on {usageData?.resetDate.toLocaleDateString()}</span>
            </div>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Upgrade Plan
            </button>
          </div>
        </motion.div>
      )}

      {/* Usage Stats Indicator */}
      {usageData && !isOverLimit && (
        <div className="absolute top-2 right-2">
          <div className={`bg-white rounded-full p-2 shadow-sm border-2 ${
            isNearLimit ? 'border-orange-200' : 'border-gray-200'
          }`}>
            <div className="relative">
              <Zap className={`w-4 h-4 ${
                isNearLimit ? 'text-orange-600' : 'text-gray-400'
              }`} />
              {isNearLimit && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradePromptModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false)
            setActionBlocked(false)
          }}
          currentTier={currentTier}
          reason="usage_limit"
          onUpgrade={handleUpgrade}
          usageData={usageData ? {
            current: usageData.current,
            limit: usageData.limit,
            percentage: usageData.percentage
          } : undefined}
        />
      )}
    </div>
  )
}

// Hook for usage enforcement
export function useUsageEnforcement(
  userId: string,
  currentTier: string | null
) {
  const [usageData, setUsageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageData()
  }, [userId])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/usage/current?userId=${userId}`)
      const data = await response.json()
      setUsageData(data.usage)
    } catch (error) {
      console.error('Error fetching usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const canPerformAction = (actionType?: string) => {
    if (!usageData) return true
    
    // Check overall usage limit
    if (usageData.percentage >= 100) {
      return false
    }

    // Check agent-specific limits if applicable
    if (actionType && usageData.agentUsage) {
      const agentData = usageData.agentUsage.find((agent: any) => 
        agent.agentId === actionType
      )
      if (agentData && agentData.percentage >= 100) {
        return false
      }
    }

    return true
  }

  const getUsageStatus = () => {
    if (!usageData) return 'unknown'
    
    if (usageData.percentage >= 100) return 'exceeded'
    if (usageData.percentage >= 90) return 'critical'
    if (usageData.percentage >= 75) return 'warning'
    return 'normal'
  }

  const getRemainingRequests = () => {
    if (!usageData) return 0
    return Math.max(0, usageData.limit - usageData.current)
  }

  const getDaysUntilReset = () => {
    if (!usageData) return 0
    return usageData.daysUntilReset || 0
  }

  return {
    usageData,
    loading,
    canPerformAction,
    getUsageStatus,
    getRemainingRequests,
    getDaysUntilReset,
    refreshUsage: fetchUsageData
  }
}
