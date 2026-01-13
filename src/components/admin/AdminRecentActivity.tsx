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
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300">⚓ Free</span>
    }

    const colors = {
      starter: 'bg-blue-50 text-blue-700 border-blue-200',
      professional: 'bg-purple-50 text-purple-700 border-purple-200',
      enterprise: 'bg-green-50 text-green-700 border-green-200'
    }

    const statusColors = {
      active: 'bg-green-50 text-green-700 border-green-200',
      inactive: 'bg-gray-100 text-gray-600 border-gray-300',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
      past_due: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }

    const tierIcons = {
      starter: '🚤',
      professional: '⛵',
      enterprise: '🚢'
    }

    return (
      <div className="flex space-x-1">
        <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
          {tierIcons[tier as keyof typeof tierIcons] || '⚓'} {tier}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded border ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
          {status}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">👥 Recent Users</h2>
          <Link
            href="/dashboard/admin/users"
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            View all users →
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {recentUsers.length > 0 ? (
          recentUsers.map((user: any, index: number) => (
            <div key={user.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getSubscriptionBadge(user.subscription_tier, user.subscription_status)}
                  <Link
                    href={`/dashboard/admin/users/${user.id}`}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-500 text-xl">👥</span>
            </div>
            <p className="text-sm text-gray-600">No recent users found</p>
          </div>
        )}
      </div>

      {recentUsers.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {Math.min(recentUsers.length, 10)} of {recentUsers.length} recent users
            </span>
            <Link
              href="/dashboard/admin/users"
              className="font-medium text-green-600 hover:text-green-700"
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
