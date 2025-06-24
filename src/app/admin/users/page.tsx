import { requireAdminAuth, getAllUsers } from '@/lib/admin-auth'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { AdminUsersFilters } from '@/components/admin/AdminUsersFilters'

export default async function AdminUsersPage() {
  const adminUser = await requireAdminAuth()
  const users = await getAllUsers(adminUser.profile.id)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">
              Manage user accounts, subscriptions, and access permissions.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Export Users
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">
              Send Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-sm">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-sm">💳</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">
                {users?.filter(u => u.subscription_status === 'active').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-sm">⭐</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Enterprise Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users?.filter(u => u.subscription_tier === 'enterprise').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-sm">🔧</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users?.filter(u => u.role === 'admin').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AdminUsersFilters />

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <AdminUsersTable users={users || []} adminUser={adminUser} />
      </div>
    </div>
  )
}
