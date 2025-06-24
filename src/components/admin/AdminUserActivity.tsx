'use client'

import { AdminUser } from '@/lib/admin-auth'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  subscription_tier: string | null
  subscription_status: string | null
  suspended: boolean
  suspended_at: string | null
  suspended_by: string | null
  suspension_reason: string | null
  created_at: string
  updated_at: string
}

interface AdminUserActivityProps {
  user: User
  adminUser: AdminUser
}

export function AdminUserActivity({ user, adminUser }: AdminUserActivityProps) {
  // Mock activity data - in real implementation, fetch from database
  const activities = [
    {
      id: '1',
      type: 'agent_usage',
      agent: 'coral',
      action: 'Chat interaction',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      details: 'Customer support query'
    },
    {
      id: '2',
      type: 'login',
      action: 'User login',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      details: 'Successful login from Chrome'
    },
    {
      id: '3',
      type: 'agent_usage',
      agent: 'mariner',
      action: 'Preset action',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      details: 'Campaign analysis'
    }
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'agent_usage':
        return '🤖'
      case 'login':
        return '🔐'
      case 'subscription':
        return '💳'
      default:
        return '📝'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'agent_usage':
        return 'bg-blue-100 text-blue-800'
      case 'login':
        return 'bg-green-100 text-green-800'
      case 'subscription':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <button className="text-sm font-medium text-orange-600 hover:text-orange-700">
            View All Activity
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm">{getActivityIcon(activity.type)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                      {activity.agent && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                          {activity.agent}
                        </span>
                      )}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-1">
                    {activity.details}
                  </p>
                  
                  <div className="mt-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getActivityColor(activity.type)}`}>
                      {activity.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-400 text-xl">📊</span>
            </div>
            <p className="text-sm text-gray-500">No recent activity found</p>
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Showing {activities.length} recent activities
            </span>
            <button className="font-medium text-orange-600 hover:text-orange-700">
              Export Activity Log
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
