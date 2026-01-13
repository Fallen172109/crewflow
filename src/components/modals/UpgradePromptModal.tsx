'use client'

import { useState } from 'react'
import { 
  X, 
  Crown, 
  Zap, 
  Users, 
  ArrowRight, 
  Check, 
  AlertTriangle,
  TrendingUp,
  Shield,
  Star,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface UpgradePromptModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier: 'starter' | 'professional' | 'enterprise' | null
  reason: 'usage_limit' | 'agent_limit' | 'feature_limit' | 'store_limit'
  onUpgrade: (tier: string) => void
  blockedFeature?: string
  usageData?: {
    current: number
    limit: number
    percentage: number
  }
}

const reasonMessages = {
  usage_limit: {
    title: 'Monthly Usage Limit Reached',
    description: 'You\'ve reached your monthly request limit. Upgrade to continue using your AI agents.',
    icon: AlertTriangle,
    color: 'text-red-600'
  },
  agent_limit: {
    title: 'Agent Limit Reached',
    description: 'You\'ve reached the maximum number of agents for your plan. Upgrade to access more agents.',
    icon: Users,
    color: 'text-blue-600'
  },
  feature_limit: {
    title: 'Premium Feature Required',
    description: 'This feature is available in higher tier plans. Upgrade to unlock advanced capabilities.',
    icon: Crown,
    color: 'text-purple-600'
  },
  store_limit: {
    title: 'Store Connection Limit',
    description: 'You\'ve reached the maximum number of connected stores. Upgrade to connect more stores.',
    icon: Shield,
    color: 'text-green-600'
  }
}

export default function UpgradePromptModal({
  isOpen,
  onClose,
  currentTier,
  reason,
  onUpgrade,
  blockedFeature,
  usageData
}: UpgradePromptModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const reasonConfig = reasonMessages[reason]
  const ReasonIcon = reasonConfig.icon

  const getRecommendedTier = () => {
    if (!currentTier || currentTier === 'starter') return 'professional'
    if (currentTier === 'professional') return 'enterprise'
    return 'enterprise'
  }

  const recommendedTier = getRecommendedTier()
  const availableTiers = Object.entries(SUBSCRIPTION_TIERS).filter(([tier]) => {
    if (!currentTier) return true
    const tierOrder = { starter: 1, professional: 2, enterprise: 3 }
    return tierOrder[tier as keyof typeof tierOrder] > tierOrder[currentTier]
  })

  const handleUpgrade = async (tier: string) => {
    try {
      setLoading(true)
      await onUpgrade(tier)
      onClose()
    } catch (error) {
      console.error('Upgrade failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierIcon = (tier: string) => {
    const icons = { starter: '🚤', professional: '⛵', enterprise: '🚢' }
    return icons[tier as keyof typeof icons] || '⚓'
  }

  const getTierColor = (tier: string) => {
    const colors = {
      starter: 'from-blue-400 to-blue-600',
      professional: 'from-purple-400 to-purple-600',
      enterprise: 'from-green-400 to-green-600'
    }
    return colors[tier as keyof typeof colors] || 'from-gray-400 to-gray-600'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${reasonConfig.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                <ReasonIcon className={`w-6 h-6 ${reasonConfig.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {reasonConfig.title}
                </h2>
                <p className="text-gray-600">{reasonConfig.description}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Usage Stats (if applicable) */}
            {usageData && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-800">Current Usage</span>
                  <span className="text-sm font-bold text-red-800">
                    {usageData.percentage.toFixed(0)}% used
                  </span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(usageData.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-red-700">
                  <span>{usageData.current.toLocaleString()} requests used</span>
                  <span>{usageData.limit.toLocaleString()} limit</span>
                </div>
              </div>
            )}

            {/* Blocked Feature */}
            {blockedFeature && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    Feature Blocked: {blockedFeature}
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  This feature requires a higher tier subscription to access.
                </p>
              </div>
            )}

            {/* Recommended Plan */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Star className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-gray-900">Recommended for You</span>
              </div>
              
              <div className={`bg-gradient-to-r ${getTierColor(recommendedTier)} rounded-lg p-6 text-white mb-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{getTierIcon(recommendedTier)}</div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {SUBSCRIPTION_TIERS[recommendedTier as keyof typeof SUBSCRIPTION_TIERS].name}
                      </h3>
                      <p className="text-white/80">
                        ${SUBSCRIPTION_TIERS[recommendedTier as keyof typeof SUBSCRIPTION_TIERS].price}/month
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleUpgrade(recommendedTier)}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Upgrade Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* All Available Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTiers.map(([tier, config]) => (
                <motion.div
                  key={tier}
                  whileHover={{ scale: 1.02 }}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTier === tier
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTier(tier)}
                >
                  <div className="text-center mb-4">
                    <div className="text-2xl mb-2">{getTierIcon(tier)}</div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${config.price}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>{config.agents} AI Agents</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Zap className="w-4 h-4 text-gray-500" />
                      <span>{config.requestsPerAgent.toLocaleString()} requests/agent</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      <span>
                        {tier === 'enterprise' ? 'Advanced' : tier === 'professional' ? 'Standard' : 'Basic'} Analytics
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    {config.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {config.features.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{config.features.length - 3} more features
                      </div>
                    )}
                  </div>

                  {tier === recommendedTier && (
                    <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full text-center">
                      Recommended
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <p>✨ Upgrade now and unlock your full potential</p>
              <p className="text-xs mt-1">Cancel anytime • 30-day money-back guarantee</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Maybe Later
              </button>

              {selectedTier && (
                <button
                  onClick={() => handleUpgrade(selectedTier)}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    Upgrade to {SUBSCRIPTION_TIERS[selectedTier as keyof typeof SUBSCRIPTION_TIERS]?.name}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
