'use client'

import { ReactNode, useState } from 'react'
import { 
  Lock, 
  Crown, 
  AlertTriangle, 
  Users, 
  Zap, 
  Shield, 
  ArrowRight,
  X,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'
import UpgradePromptModal from '@/components/modals/UpgradePromptModal'

interface TierGateProps {
  children: ReactNode
  requiredTier: 'starter' | 'professional' | 'enterprise'
  currentTier: 'starter' | 'professional' | 'enterprise' | null
  feature: string
  fallback?: ReactNode
  showUpgradePrompt?: boolean
  blockType?: 'overlay' | 'replace' | 'disable'
  reason?: string
  className?: string
}

const tierHierarchy = {
  starter: 1,
  professional: 2,
  enterprise: 3
}

export default function TierGate({
  children,
  requiredTier,
  currentTier,
  feature,
  fallback,
  showUpgradePrompt = true,
  blockType = 'overlay',
  reason,
  className = ''
}: TierGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const hasAccess = () => {
    if (!currentTier) return false
    return tierHierarchy[currentTier] >= tierHierarchy[requiredTier]
  }

  const handleUpgrade = async (tier: string) => {
    // This would integrate with your upgrade flow
    console.log('Upgrading to:', tier)
    setShowUpgradeModal(false)
  }

  if (hasAccess()) {
    return <>{children}</>
  }

  const requiredTierConfig = SUBSCRIPTION_TIERS[requiredTier]
  const tierIcons = { starter: '🚤', professional: '⛵', enterprise: '🚢' }

  // Replace mode - show fallback or blocking message instead of children
  if (blockType === 'replace') {
    return (
      <div className={className}>
        {fallback || (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">{tierIcons[requiredTier]}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {requiredTierConfig.name} Feature
            </h3>
            <p className="text-gray-600 mb-4">
              {reason || `This feature requires a ${requiredTierConfig.name} subscription.`}
            </p>
            {showUpgradePrompt && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Crown className="w-4 h-4" />
                <span>Upgrade to {requiredTierConfig.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        {showUpgradeModal && (
          <UpgradePromptModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            currentTier={currentTier}
            reason="feature_limit"
            onUpgrade={handleUpgrade}
            blockedFeature={feature}
          />
        )}
      </div>
    )
  }

  // Disable mode - render children but disabled
  if (blockType === 'disable') {
    return (
      <div className={`relative ${className}`}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-4">
            <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 mb-2">
              {requiredTierConfig.name} Required
            </p>
            {showUpgradePrompt && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-xs bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        {showUpgradeModal && (
          <UpgradePromptModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            currentTier={currentTier}
            reason="feature_limit"
            onUpgrade={handleUpgrade}
            blockedFeature={feature}
          />
        )}
      </div>
    )
  }

  // Overlay mode (default) - show children with overlay
  return (
    <div className={`relative ${className}`}>
      {children}
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4 text-center"
        >
          <div className="text-3xl mb-3">{tierIcons[requiredTier]}</div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {requiredTierConfig.name} Feature
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            {reason || `Upgrade to ${requiredTierConfig.name} to access ${feature}.`}
          </p>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mb-4">
            <Users className="w-3 h-3" />
            <span>{requiredTierConfig.agents} agents</span>
            <span>•</span>
            <Zap className="w-3 h-3" />
            <span>{requiredTierConfig.requestsPerAgent.toLocaleString()} requests</span>
          </div>
          
          {showUpgradePrompt && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              Upgrade to {requiredTierConfig.name}
            </button>
          )}
        </motion.div>
      </motion.div>

      {showUpgradeModal && (
        <UpgradePromptModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={currentTier}
          reason="feature_limit"
          onUpgrade={handleUpgrade}
          blockedFeature={feature}
        />
      )}
    </div>
  )
}

// Higher-order component for tier gating
export function withTierGate<P extends object>(
  Component: React.ComponentType<P>,
  requiredTier: 'starter' | 'professional' | 'enterprise',
  feature: string,
  options?: {
    fallback?: ReactNode
    blockType?: 'overlay' | 'replace' | 'disable'
    reason?: string
  }
) {
  return function TierGatedComponent(props: P & { currentTier?: string | null }) {
    const { currentTier, ...componentProps } = props

    return (
      <TierGate
        requiredTier={requiredTier}
        currentTier={currentTier as any}
        feature={feature}
        fallback={options?.fallback}
        blockType={options?.blockType}
        reason={options?.reason}
      >
        <Component {...(componentProps as P)} />
      </TierGate>
    )
  }
}

// Hook for checking tier access
export function useTierAccess(currentTier: string | null) {
  const hasAccess = (requiredTier: 'starter' | 'professional' | 'enterprise') => {
    if (!currentTier) return false
    return tierHierarchy[currentTier as keyof typeof tierHierarchy] >= tierHierarchy[requiredTier]
  }

  const getRequiredTier = (feature: string): 'starter' | 'professional' | 'enterprise' => {
    // Define feature-to-tier mapping
    const featureTiers: Record<string, 'starter' | 'professional' | 'enterprise'> = {
      // Basic features (Starter)
      'basic_chat': 'starter',
      'single_agent': 'starter',
      'basic_analytics': 'starter',
      
      // Professional features
      'multiple_agents': 'professional',
      'advanced_integrations': 'professional',
      'priority_support': 'professional',
      'custom_workflows': 'professional',
      'analytics_dashboard': 'professional',
      'bulk_operations': 'professional',
      
      // Enterprise features
      'unlimited_agents': 'enterprise',
      'white_label': 'enterprise',
      'api_access': 'enterprise',
      'custom_integrations': 'enterprise',
      'dedicated_support': 'enterprise',
      'advanced_security': 'enterprise',
      'audit_logs': 'enterprise'
    }

    return featureTiers[feature] || 'enterprise'
  }

  const canUseFeature = (feature: string) => {
    const requiredTier = getRequiredTier(feature)
    return hasAccess(requiredTier)
  }

  const getUpgradeMessage = (feature: string) => {
    const requiredTier = getRequiredTier(feature)
    const tierConfig = SUBSCRIPTION_TIERS[requiredTier]
    
    return {
      title: `${tierConfig.name} Feature`,
      message: `Upgrade to ${tierConfig.name} to access ${feature}`,
      requiredTier,
      price: tierConfig.price
    }
  }

  return {
    hasAccess,
    canUseFeature,
    getRequiredTier,
    getUpgradeMessage,
    currentTier
  }
}
