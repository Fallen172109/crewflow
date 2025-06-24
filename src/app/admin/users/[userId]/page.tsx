import { requireAdminAuth, getUserById } from '@/lib/admin-auth'
import { AdminUserProfile } from '@/components/admin/AdminUserProfile'
import { AdminUserActivity } from '@/components/admin/AdminUserActivity'
import { AdminUserSubscription } from '@/components/admin/AdminUserSubscription'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface AdminUserDetailPageProps {
  params: {
    userId: string
  }
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const adminUser = await requireAdminAuth()
  const user = await getUserById(adminUser.profile.id, params.userId)

  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/users"
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back to Users
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.email}</h1>
              <p className="text-gray-600 mt-1">
                User ID: {user.id}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Send Email
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">
              Edit User
            </button>
          </div>
        </div>
      </div>

      {/* User Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-sm">📅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Member Since</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-sm">💳</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Subscription</p>
              <p className="text-lg font-bold text-gray-900">
                {user.subscription_tier ? 
                  `${user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)}` : 
                  'Free'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              user.suspended ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              <span className={`text-sm ${
                user.suspended ? 'text-red-600' : 'text-orange-600'
              }`}>
                {user.suspended ? '🚫' : '🔧'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-bold text-gray-900">
                {user.suspended ? 'Suspended' : (user.role === 'admin' ? 'Administrator' : 'User')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile */}
        <div className="lg:col-span-1">
          <AdminUserProfile user={user} adminUser={adminUser} />
        </div>

        {/* User Activity & Subscription */}
        <div className="lg:col-span-2 space-y-6">
          <AdminUserSubscription user={user} adminUser={adminUser} />
          <AdminUserActivity user={user} adminUser={adminUser} />
        </div>
      </div>
    </div>
  )
}
