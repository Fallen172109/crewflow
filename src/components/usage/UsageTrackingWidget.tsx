'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Crown, 
  Zap,
  Calendar,
  DollarSign,
  Users,
  Activity,
  ArrowUp,
  Info
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface UsageData {
  currentUsage: number
  limit: number
  percentage: number
  tier: 'starter' | 'professional' | 'enterprise' | null
  agentUsage: Array<{
    agentId: string
    agentName: string
    requests: number
    limit: number
    percentage: number
  }>
  monthlyStats: {
    totalRequests: number
    totalCost: number
    successRate: number
    averageResponseTime: number
  }
  daysUntilReset: number
  overage: number
  overageCost: number
}

interface UsageTrackingWidgetProps {
  userId: string
  compact?: boolean
  showUpgradePrompt?: boolean
  className?: string
}

export default function UsageTrackingWidget({ 
  userId, 
  compact = false, 
  showUpgradePrompt = true,
  className = '' 
}: UsageTrackingWidgetProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsageData()
  }, [userId])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/usage/current?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch usage data: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setUsageData(data.usage)
    } catch (err) {
      console.error('Error fetching usage data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data')
    } finally {
      setLoading(false)
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50 border-red-200'
    if (percentage >= 75) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTierInfo = (tier: string | null) => {
    if (!tier || !(tier in SUBSCRIPTION_TIERS)) {
      return { name: 'Free', icon: '⚓', color: 'text-gray-600' }
    }
    
    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
    const icons = { starter: '🚤', professional: '⛵', enterprise: '🚢' }
    const colors = { 
      starter: 'text-blue-600', 
      professional: 'text-purple-600', 
      enterprise: 'text-orange-600' 
    }
    
    return {
      name: tierConfig.name,
      icon: icons[tier as keyof typeof icons],
      color: colors[tier as keyof typeof colors]
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error || !usageData) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-800 text-sm">{error || 'Failed to load usage data'}</span>
        </div>
      </div>
    )
  }

  const tierInfo = getTierInfo(usageData.tier)
  const isNearLimit = usageData.percentage >= 75
  const isOverLimit = usageData.percentage >= 100

  if (compact) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Usage</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${getUsageColor(usageData.percentage)}`}>
            {usageData.percentage.toFixed(0)}%
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{usageData.currentUsage.toLocaleString()} requests</span>
            <span>{usageData.limit.toLocaleString()} limit</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(usageData.percentage)}`}
              style={{ width: `${Math.min(usageData.percentage, 100)}%` }}
            />
          </div>
        </div>

        {isNearLimit && showUpgradePrompt && (
          <div className="mt-2 text-xs text-orange-600">
            {isOverLimit ? 'Limit exceeded!' : 'Approaching limit'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Usage Overview</h3>
            <p className="text-sm text-gray-600">Current month usage and limits</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-lg">{tierInfo.icon}</span>
          <span className={`font-medium ${tierInfo.color}`}>{tierInfo.name}</span>
        </div>
      </div>

      {/* Overall Usage */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Total Requests</span>
          <span className={`text-sm px-2 py-1 rounded-full border ${getUsageColor(usageData.percentage)}`}>
            {usageData.percentage.toFixed(1)}% used
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <motion.div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(usageData.percentage)}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usageData.percentage, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>{usageData.currentUsage.toLocaleString()} requests used</span>
          <span>{usageData.limit.toLocaleString()} limit</span>
        </div>

        {usageData.overage > 0 && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Overage: {usageData.overage.toLocaleString()} requests
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              Additional cost: ${usageData.overageCost.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Agent Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Agent Usage</h4>
        <div className="space-y-3">
          {usageData.agentUsage.map((agent) => (
            <div key={agent.agentId} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">
                    {agent.agentName[0]}
                  </span>
                </div>
                <span className="text-sm text-gray-900">{agent.agentName}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressBarColor(agent.percentage)}`}
                    style={{ width: `${Math.min(agent.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-16 text-right">
                  {agent.requests}/{agent.limit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
            <Activity className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {usageData.monthlyStats.totalRequests.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Total Requests</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            ${usageData.monthlyStats.totalCost.toFixed(2)}
          </div>
          <div className="text-xs text-gray-600">Total Cost</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {usageData.monthlyStats.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Success Rate</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-2">
            <Zap className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {usageData.monthlyStats.averageResponseTime.toFixed(0)}ms
          </div>
          <div className="text-xs text-gray-600">Avg Response</div>
        </div>
      </div>

      {/* Reset Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4" />
          <span>Resets in {usageData.daysUntilReset} days</span>
        </div>
        <button 
          onClick={fetchUsageData}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Upgrade Prompt */}
      {isNearLimit && showUpgradePrompt && usageData.tier !== 'enterprise' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <div className="p-1 bg-orange-200 rounded-full">
              <Crown className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-orange-900">
                {isOverLimit ? 'Usage Limit Exceeded' : 'Approaching Usage Limit'}
              </h4>
              <p className="text-xs text-orange-700 mt-1">
                {isOverLimit 
                  ? 'Upgrade now to avoid service interruption and additional overage charges.'
                  : 'Upgrade to get more requests and unlock additional features.'
                }
              </p>
              <div className="flex items-center space-x-2 mt-3">
                <button className="text-xs bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors">
                  Upgrade Plan
                </button>
                <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                  View Plans
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
