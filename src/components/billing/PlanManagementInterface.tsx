'use client'

import { useState, useEffect } from 'react'
import { 
  Crown, 
  TrendingUp, 
  Users, 
  Zap, 
  Shield, 
  Calendar,
  CreditCard,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Download,
  RefreshCw,
  Settings,
  Star
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'
import UsageTrackingWidget from '@/components/usage/UsageTrackingWidget'
import PlanInfoCard from '@/components/usage/PlanInfoCard'
import { useUpgradeFlow } from '@/hooks/useUpgradeFlow'

interface PlanManagementInterfaceProps {
  userId: string
  currentTier: 'starter' | 'professional' | 'enterprise' | null
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | null
  billingPeriodEnd?: Date
  onPlanChange?: (newTier: string) => void
  className?: string
}

interface BillingHistory {
  id: string
  date: Date
  amount: number
  status: 'paid' | 'pending' | 'failed'
  description: string
  invoiceUrl?: string
}

export default function PlanManagementInterface({
  userId,
  currentTier,
  subscriptionStatus,
  billingPeriodEnd,
  onPlanChange,
  className = ''
}: PlanManagementInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'billing' | 'plans'>('overview')
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { initiateUpgrade, isUpgrading, upgradeError } = useUpgradeFlow({
    onSuccess: (tier) => {
      if (onPlanChange) {
        onPlanChange(tier)
      }
    }
  })

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchBillingHistory()
    }
  }, [activeTab])

  const fetchBillingHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/billing/history?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch billing history')
      }

      const data = await response.json()
      setBillingHistory(data.history || [])
    } catch (err) {
      console.error('Error fetching billing history:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch billing history')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: string) => {
    await initiateUpgrade(tier, 'plan_management')
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      // Refresh the page or update state
      window.location.reload()
    } catch (err) {
      console.error('Error canceling subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200'
      case 'trialing': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'past_due': return 'text-red-600 bg-red-50 border-red-200'
      case 'canceled': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'usage', name: 'Usage', icon: Zap },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'plans', name: 'Plans', icon: Crown }
  ]

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Crown className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Plan Management</h2>
              <p className="text-gray-600">Manage your subscription and billing</p>
            </div>
          </div>

          {subscriptionStatus && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(subscriptionStatus)}`}>
              {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="m-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PlanInfoCard
                currentTier={currentTier}
                onUpgrade={handleUpgrade}
                showUpgradeButton={subscriptionStatus === 'active'}
              />
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Subscription Details</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Plan</span>
                    <span className="font-medium text-gray-900">
                      {currentTier ? SUBSCRIPTION_TIERS[currentTier].name : 'Free'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium ${
                      subscriptionStatus === 'active' ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {subscriptionStatus?.charAt(0).toUpperCase() + subscriptionStatus?.slice(1) || 'Free'}
                    </span>
                  </div>
                  
                  {billingPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {subscriptionStatus === 'canceled' ? 'Access Until' : 'Next Billing'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {billingPeriodEnd.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {subscriptionStatus === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="w-full text-red-600 hover:text-red-700 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <UsageTrackingWidget
            userId={userId}
            showUpgradePrompt={subscriptionStatus === 'active'}
          />
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
              <button
                onClick={fetchBillingHistory}
                disabled={loading}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Loading billing history...</p>
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No billing history available</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.date.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.invoiceUrl ? (
                            <a
                              href={item.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h3>
              <p className="text-gray-600">Select the perfect plan for your maritime AI needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(SUBSCRIPTION_TIERS).map(([tier, config]) => {
                const isCurrentTier = currentTier === tier
                const tierIcons = { starter: '🚤', professional: '⛵', enterprise: '🚢' }
                
                return (
                  <motion.div
                    key={tier}
                    whileHover={{ scale: 1.02 }}
                    className={`relative border-2 rounded-lg p-6 ${
                      isCurrentTier
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tier === 'professional' && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>Most Popular</span>
                        </div>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className="text-3xl mb-2">{tierIcons[tier as keyof typeof tierIcons]}</div>
                      <h3 className="text-xl font-bold text-gray-900">{config.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">${config.price}</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{config.agents} AI Agents</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{config.requestsPerAgent.toLocaleString()} requests/agent</span>
                      </div>
                      {config.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                      {config.features.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{config.features.length - 3} more features
                        </div>
                      )}
                    </div>

                    {isCurrentTier ? (
                      <div className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-center font-medium">
                        Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(tier)}
                        disabled={isUpgrading}
                        className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                      >
                        {isUpgrading ? 'Processing...' : `Upgrade to ${config.name}`}
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>All plans include 30-day money-back guarantee • Cancel anytime</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
