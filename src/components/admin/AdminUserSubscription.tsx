'use client'

import { AdminUser } from '@/lib/admin-auth'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  subscription_tier: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  suspended: boolean
  suspended_at: string | null
  suspended_by: string | null
  suspension_reason: string | null
  created_at: string
  updated_at: string
}

interface AdminUserSubscriptionProps {
  user: User
  adminUser: AdminUser
}

export function AdminUserSubscription({ user, adminUser }: AdminUserSubscriptionProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Subscription Details</h2>
      </div>

      <div className="p-6">
        {user.subscription_tier ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Plan
                </label>
                <span className={`px-3 py-2 text-sm font-medium rounded-lg ${
                  user.subscription_tier === 'enterprise' ? 'bg-green-100 text-green-800' :
                  user.subscription_tier === 'professional' ? 'bg-purple-100 text-purple-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span className={`px-3 py-2 text-sm font-medium rounded-lg ${
                  user.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                  user.subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                  user.subscription_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.subscription_status?.charAt(0).toUpperCase() + user.subscription_status?.slice(1)}
                </span>
              </div>
            </div>

            {user.stripe_customer_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Customer ID
                </label>
                <p className="text-sm text-gray-900 font-mono">{user.stripe_customer_id}</p>
              </div>
            )}

            {user.stripe_subscription_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Subscription ID
                </label>
                <p className="text-sm text-gray-900 font-mono">{user.stripe_subscription_id}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  View Billing History
                </button>
                <button className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200">
                  Manage Subscription
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-400 text-xl">💳</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">User is on the free plan</p>
            <button className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600">
              Upgrade User
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
