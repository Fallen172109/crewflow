import { requireAdminAuth, getSystemAnalytics } from '@/lib/admin-auth'
import { AdminOverviewCards } from '@/components/admin/AdminOverviewCards'
import { AdminRecentActivity } from '@/components/admin/AdminRecentActivity'
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth'

export default async function AdminDashboard() {
  const adminUser = await requireAdminAuth()
  const analytics = await getSystemAnalytics(adminUser.profile.id)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {adminUser.profile.email}. Here's what's happening with CrewFlow.
        </p>
      </div>

      {/* Overview Cards */}
      <AdminOverviewCards analytics={analytics} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <AdminRecentActivity analytics={analytics} />
        
        {/* System Health */}
        <AdminSystemHealth />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/users"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-sm font-semibold">👥</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-500">View and manage user accounts</p>
            </div>
          </a>

          <a
            href="/admin/analytics"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-sm font-semibold">📊</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-500">Detailed platform analytics</p>
            </div>
          </a>

          <a
            href="/admin/system"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-sm font-semibold">⚙️</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">System Settings</p>
              <p className="text-sm text-gray-500">Configure platform settings</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
