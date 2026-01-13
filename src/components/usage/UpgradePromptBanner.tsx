'use client'

import { useState } from 'react'
import { 
  Crown, 
  X, 
  ArrowRight, 
  AlertTriangle, 
  TrendingUp,
  Zap,
  Users,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface UpgradePromptBannerProps {
  currentTier: 'starter' | 'professional' | 'enterprise' | null
  reason: 'usage_warning' | 'usage_exceeded' | 'feature_blocked' | 'agent_limit'
  usagePercentage?: number
  onUpgrade: (tier: string) => void
  onDismiss?: () => void
  className?: string
  compact?: boolean
}

const bannerConfig = {
  usage_warning: {
    title: 'Approaching Usage Limit',
    description: 'You\'re using {percentage}% of your monthly requests.',
    icon: AlertTriangle,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    iconColor: 'text-yellow-600'
  },
  usage_exceeded: {
    title: 'Usage Limit Exceeded',
    description: 'You\'ve exceeded your monthly request limit.',
    icon: AlertTriangle,
    color: 'bg-red-50 border-red-200 text-red-800',
    iconColor: 'text-red-600'
  },
  feature_blocked: {
    title: 'Premium Feature',
    description: 'This feature requires a higher tier plan.',
    icon: Crown,
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    iconColor: 'text-purple-600'
  },
  agent_limit: {
    title: 'Agent Limit Reached',
    description: 'Upgrade to access more AI agents.',
    icon: Users,
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    iconColor: 'text-blue-600'
  }
}

export default function UpgradePromptBanner({
  currentTier,
  reason,
  usagePercentage,
  onUpgrade,
  onDismiss,
  className = '',
  compact = false
}: UpgradePromptBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const config = bannerConfig[reason]
  const BannerIcon = config.icon

  const getRecommendedTier = () => {
    if (!currentTier || currentTier === 'starter') return 'professional'
    if (currentTier === 'professional') return 'enterprise'
    return 'enterprise'
  }

  const recommendedTier = getRecommendedTier()
  const tierConfig = SUBSCRIPTION_TIERS[recommendedTier as keyof typeof SUBSCRIPTION_TIERS]

  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) {
      onDismiss()
    }
  }

  const handleUpgrade = () => {
    onUpgrade(recommendedTier)
  }

  const formatDescription = (description: string) => {
    return description.replace('{percentage}', usagePercentage?.toFixed(0) || '0')
  }

  if (dismissed) return null

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`border rounded-lg p-3 ${config.color} ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BannerIcon className={`w-4 h-4 ${config.iconColor}`} />
            <span className="text-sm font-medium">{config.title}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpgrade}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors"
            >
              Upgrade
            </button>
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className={`p-1 hover:bg-black/10 rounded ${config.iconColor}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`border rounded-lg p-4 ${config.color} ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-white/50`}>
              <BannerIcon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{config.title}</h3>
              <p className="text-sm opacity-90 mb-3">
                {formatDescription(config.description)}
              </p>
              
              {/* Upgrade Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-white/30 rounded">
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="text-xs">
                    {tierConfig.agents} AI Agents
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-white/30 rounded">
                    <Zap className="w-3 h-3" />
                  </div>
                  <span className="text-xs">
                    {tierConfig.requestsPerAgent.toLocaleString()} requests/agent
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-white/30 rounded">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <span className="text-xs">
                    Advanced features
                  </span>
                </div>
              </div>
              
              {/* CTA */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleUpgrade}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to {tierConfig.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <div className="text-sm">
                  <span className="font-semibold">${tierConfig.price}/month</span>
                  <span className="opacity-75 ml-1">• Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
          
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className={`p-1 hover:bg-black/10 rounded ${config.iconColor}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for managing upgrade prompts
export function useUpgradePrompts(currentTier: string | null, usageData?: any) {
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set())

  const shouldShowPrompt = (reason: string) => {
    if (dismissedPrompts.has(reason)) return false
    
    switch (reason) {
      case 'usage_warning':
        return usageData?.percentage >= 75 && usageData?.percentage < 100
      case 'usage_exceeded':
        return usageData?.percentage >= 100
      case 'feature_blocked':
        return true // Always show when feature is blocked
      case 'agent_limit':
        return true // Always show when agent limit is reached
      default:
        return false
    }
  }

  const dismissPrompt = (reason: string) => {
    setDismissedPrompts(prev => new Set(prev).add(reason))
  }

  const resetPrompts = () => {
    setDismissedPrompts(new Set())
  }

  return {
    shouldShowPrompt,
    dismissPrompt,
    resetPrompts
  }
}
