'use client'

import { useState } from 'react'
import { 
  Crown, 
  Check, 
  ArrowRight, 
  Zap, 
  Users, 
  Shield, 
  Headphones,
  BarChart3,
  Settings,
  Star
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface PlanInfoCardProps {
  currentTier: 'starter' | 'professional' | 'enterprise' | null
  onUpgrade?: (tier: string) => void
  showUpgradeButton?: boolean
  className?: string
}

export default function PlanInfoCard({ 
  currentTier, 
  onUpgrade, 
  showUpgradeButton = true,
  className = '' 
}: PlanInfoCardProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const getTierConfig = (tier: string | null) => {
    if (!tier || !(tier in SUBSCRIPTION_TIERS)) {
      return {
        name: 'Free',
        price: 0,
        agents: 1,
        requestsPerAgent: 100,
        features: [
          '1 AI Agent (Pearl)',
          '100 requests/month',
          'Basic chat interface',
          'Community support'
        ]
      }
    }
    return SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]
  }

  const currentConfig = getTierConfig(currentTier)
  
  const tierIcons = {
    free: '⚓',
    starter: '🚤',
    professional: '⛵',
    enterprise: '🚢'
  }

  const tierColors = {
    free: 'from-gray-400 to-gray-600',
    starter: 'from-blue-400 to-blue-600',
    professional: 'from-purple-400 to-purple-600',
    enterprise: 'from-orange-400 to-orange-600'
  }

  const getNextTier = () => {
    if (!currentTier || currentTier === 'starter') return 'professional'
    if (currentTier === 'professional') return 'enterprise'
    return null
  }

  const nextTier = getNextTier()
  const nextTierConfig = nextTier ? SUBSCRIPTION_TIERS[nextTier as keyof typeof SUBSCRIPTION_TIERS] : null

  const handleUpgrade = (tier: string) => {
    if (onUpgrade) {
      onUpgrade(tier)
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Current Plan Header */}
      <div className={`bg-gradient-to-r ${tierColors[currentTier || 'free']} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">
              {tierIcons[currentTier || 'free']}
            </div>
            <div>
              <h3 className="text-xl font-bold">{currentConfig.name} Plan</h3>
              <p className="text-white/80">
                ${currentConfig.price}/month
              </p>
            </div>
          </div>
          
          {currentTier && (
            <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Current</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Plan Features */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Your Plan Includes:</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{currentConfig.agents} AI Agents</div>
              <div className="text-sm text-gray-600">Maritime crew members</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {currentConfig.requestsPerAgent.toLocaleString()} Requests
              </div>
              <div className="text-sm text-gray-600">Per agent/month</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Analytics</div>
              <div className="text-sm text-gray-600">
                {currentTier === 'enterprise' ? 'Advanced' : currentTier === 'professional' ? 'Standard' : 'Basic'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Headphones className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Support</div>
              <div className="text-sm text-gray-600">
                {currentTier === 'enterprise' ? '24/7 Priority' : currentTier === 'professional' ? 'Priority' : 'Email'}
              </div>
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2 mb-6">
          {currentConfig.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Upgrade Section */}
        {nextTierConfig && showUpgradeButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-gray-200 pt-6"
          >
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{tierIcons[nextTier as keyof typeof tierIcons]}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Upgrade to {nextTierConfig.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Get {nextTierConfig.agents} agents, {nextTierConfig.requestsPerAgent.toLocaleString()} requests per agent, and more features.
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-gray-900">
                      ${nextTierConfig.price}/month
                    </div>
                    <button
                      onClick={() => handleUpgrade(nextTier!)}
                      className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <span>Upgrade Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>
                  +{nextTierConfig.agents - currentConfig.agents} more agents
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Zap className="w-4 h-4 text-green-500" />
                <span>
                  +{(nextTierConfig.requestsPerAgent - currentConfig.requestsPerAgent).toLocaleString()} requests/agent
                </span>
              </div>
              {nextTier === 'professional' && (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Settings className="w-4 h-4 text-blue-500" />
                    <span>Advanced integrations</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    <span>Analytics dashboard</span>
                  </div>
                </>
              )}
              {nextTier === 'enterprise' && (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Shield className="w-4 h-4 text-red-500" />
                    <span>Premium integrations</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Crown className="w-4 h-4 text-orange-500" />
                    <span>White-label options</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Enterprise Message */}
        {currentTier === 'enterprise' && (
          <div className="border-t border-gray-200 pt-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🚢</div>
              <h4 className="font-semibold text-gray-900 mb-2">
                You're on the Enterprise Plan!
              </h4>
              <p className="text-sm text-gray-600">
                You have access to all features and the full maritime fleet.
              </p>
            </div>
          </div>
        )}

        {/* Plan Comparison Link */}
        <div className="border-t border-gray-200 pt-4 mt-6">
          <div className="text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Compare All Plans →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
