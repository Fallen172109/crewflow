'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  subscription_tier: string | null
  subscription_status: string | null
  created_at: string
  updated_at: string
}

interface PlanChangeModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  adminUserId: string
  onSuccess: (updatedUser: User) => void
}

const SUBSCRIPTION_TIERS = [
  { value: 'free', label: '⚓ Free', description: 'Basic access' },
  { value: 'starter', label: '🚤 Starter', description: 'Enhanced features' },
  { value: 'professional', label: '⛵ Professional', description: 'Advanced tools' },
  { value: 'enterprise', label: '🚢 Enterprise', description: 'Full access' }
]

const SUBSCRIPTION_STATUSES = [
  { value: 'none', label: 'None', description: 'No active subscription' },
  { value: 'active', label: '✅ Active', description: 'Subscription is active' },
  { value: 'inactive', label: '⏸️ Inactive', description: 'Subscription is paused' },
  { value: 'cancelled', label: '❌ Cancelled', description: 'Subscription cancelled' },
  { value: 'past_due', label: '⚠️ Past Due', description: 'Payment overdue' }
]

export function PlanChangeModal({ isOpen, onClose, user, adminUserId, onSuccess }: PlanChangeModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setSelectedTier(user.subscription_tier || 'free')
      setSelectedStatus(user.subscription_status || 'none')
      setError(null)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Update user subscription
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          subscription_tier: selectedTier === 'free' ? null : selectedTier,
          subscription_status: selectedStatus === 'none' ? null : selectedStatus
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Log admin action
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: adminUserId,
          action: 'UPDATE_USER_SUBSCRIPTION',
          target_user_id: user.id,
          details: { 
            old_tier: user.subscription_tier, 
            new_tier: selectedTier === 'free' ? null : selectedTier,
            old_status: user.subscription_status,
            new_status: selectedStatus === 'none' ? null : selectedStatus
          }
        })

      // Create updated user object
      const updatedUser: User = {
        ...user,
        subscription_tier: selectedTier === 'free' ? null : selectedTier,
        subscription_status: selectedStatus === 'none' ? null : selectedStatus
      }

      onSuccess(updatedUser)
      onClose()
    } catch (err) {
      console.error('Error updating subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to update subscription')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-secondary-800 rounded-xl border border-secondary-700 p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Change User Plan</h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-secondary-700 rounded-lg border border-secondary-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
              <span className="text-primary-400 font-semibold">
                {user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user.email}</p>
              <p className="text-secondary-400 text-sm">ID: {user.id.slice(0, 8)}...</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subscription Tier */}
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              Subscription Tier
            </label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              {SUBSCRIPTION_TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label} - {tier.description}
                </option>
              ))}
            </select>
          </div>

          {/* Subscription Status */}
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              Subscription Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              {SUBSCRIPTION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label} - {status.description}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary-700 hover:bg-secondary-600 text-white rounded-lg transition-colors border border-secondary-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
