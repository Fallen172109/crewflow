'use client'

import { useState } from 'react'

interface BulkPlanChangeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedUserCount: number
  onConfirm: (tier: string, status: string) => void
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

export function BulkPlanChangeModal({ isOpen, onClose, selectedUserCount, onConfirm }: BulkPlanChangeModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>('free')
  const [selectedStatus, setSelectedStatus] = useState<string>('none')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(selectedTier, selectedStatus)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-secondary-800 rounded-xl border border-secondary-700 p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Bulk Change Plans</h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-900/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-yellow-400 font-medium text-sm">Bulk Operation Warning</p>
              <p className="text-yellow-300 text-sm mt-1">
                This will change the subscription plan for <strong>{selectedUserCount}</strong> selected user(s). 
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subscription Tier */}
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              New Subscription Tier
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
              New Subscription Status
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

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary-700 hover:bg-secondary-600 text-white rounded-lg transition-colors border border-secondary-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              Update {selectedUserCount} User(s)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
