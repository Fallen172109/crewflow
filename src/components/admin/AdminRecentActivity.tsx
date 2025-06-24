'use client'

import Link from 'next/link'

interface AdminRecentActivityProps {
  analytics: any
}

export function AdminRecentActivity({ analytics }: AdminRecentActivityProps) {
  const recentUsers = analytics?.recentUsers || []

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSubscriptionBadge = (tier: string | null, status: string | null) => {
    if (!tier || !status) {
      return <span className="px-2 py-1 text-xs font-medium bg-secondary-700 text-secondary-300 rounded border border-secondary-600">⚓ Free</span>
    }

    const colors = {
      starter: 'bg-blue-900/20 text-blue-400 border-blue-900/30',
      professional: 'bg-purple-900/20 text-purple-400 border-purple-900/30',
      enterprise: 'bg-primary-900/20 text-primary-400 border-primary-900/30'
    }

    const statusColors = {
      active: 'bg-green-900/20 text-green-400 border-green-900/30',
      inactive: 'bg-secondary-700 text-secondary-400 border-secondary-600',
      cancelled: 'bg-red-900/20 text-red-400 border-red-900/30',
      past_due: 'bg-yellow-900/20 text-yellow-400 border-yellow-900/30'
    }

    const tierIcons = {
      starter: '🚤',
      professional: '⛵',
      enterprise: '🚢'
    }

    return (
      <div className="flex space-x-1">
        <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[tier as keyof typeof colors] || 'bg-secondary-700 text-secondary-300 border-secondary-600'}`}>
          {tierIcons[tier as keyof typeof tierIcons] || '⚓'} {tier}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded border ${statusColors[status as keyof typeof statusColors] || 'bg-secondary-700 text-secondary-300 border-secondary-600'}`}>
          {status}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-secondary-800 rounded-xl border border-secondary-700">
      <div className="p-6 border-b border-secondary-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">👥 Recent Users</h2>
          <Link
            href="/dashboard/admin/users"
            className="text-sm font-medium text-primary-400 hover:text-primary-300"
          >
            View all users →
          </Link>
        </div>
      </div>

      <div className="divide-y divide-secondary-700">
        {recentUsers.length > 0 ? (
          recentUsers.map((user: any, index: number) => (
            <div key={user.id} className="p-4 hover:bg-secondary-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                    <span className="text-primary-400 text-sm font-semibold">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.email}</p>
                    <p className="text-xs text-secondary-400">
                      Joined {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getSubscriptionBadge(user.subscription_tier, user.subscription_status)}
                  <Link
                    href={`/dashboard/admin/users/${user.id}`}
                    className="text-xs text-secondary-400 hover:text-secondary-300"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-secondary-700 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-secondary-400 text-xl">👥</span>
            </div>
            <p className="text-sm text-secondary-400">No recent users found</p>
          </div>
        )}
      </div>

      {recentUsers.length > 0 && (
        <div className="p-4 bg-secondary-700 border-t border-secondary-600">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary-400">
              Showing {Math.min(recentUsers.length, 10)} of {recentUsers.length} recent users
            </span>
            <Link
              href="/dashboard/admin/users"
              className="font-medium text-primary-400 hover:text-primary-300"
            >
              Manage all users
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// Default export for easier importing
export default AdminRecentActivity
