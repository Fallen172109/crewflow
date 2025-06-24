'use client'

import { useAdmin } from '@/hooks/useAdmin'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { AdminUsersFilters } from '@/components/admin/AdminUsersFilters'
import { supabase } from '@/lib/supabase'

interface UserStats {
  totalUsers: number
  adminUsers: number
  activeSubscribers: number
  newUsersThisMonth: number
}

export default function AdminUsersPage() {
  const { isAdmin, loading, user } = useAdmin()
  const router = useRouter()
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    adminUsers: 0,
    activeSubscribers: 0,
    newUsersThisMonth: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, loading, router])

  useEffect(() => {
    if (isAdmin) {
      fetchUserStats()
    }
  }, [isAdmin])

  const fetchUserStats = async () => {
    try {
      setStatsLoading(true)

      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Get admin users
      const { count: adminUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')

      // Get active subscribers
      const { count: activeSubscribers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active')

      // Get new users this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: newUsersThisMonth } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())

      setStats({
        totalUsers: totalUsers || 0,
        adminUsers: adminUsers || 0,
        activeSubscribers: activeSubscribers || 0,
        newUsersThisMonth: newUsersThisMonth || 0
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-300">Loading users...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-secondary-300">You don't have permission to access user management.</p>
        </div>
      </div>
    )
  }

  const exportUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Create CSV content
      const headers = ['Email', 'Role', 'Subscription Tier', 'Subscription Status', 'Created At']
      const csvContent = [
        headers.join(','),
        ...users.map(user => [
          user.email,
          user.role,
          user.subscription_tier || 'Free',
          user.subscription_status || 'None',
          new Date(user.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crewflow-users-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting users:', error)
      alert('Failed to export users')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage CrewFlow user accounts, permissions, and subscriptions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportUsers}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors border border-gray-300 shadow-sm"
          >
            📊 Export Users
          </button>
          <button
            onClick={fetchUserStats}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors shadow-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Admin Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.adminUsers.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">🛡️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.activeSubscribers.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">💳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">New This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.newUsersThisMonth.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <span className="text-primary-600 text-xl">📈</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AdminUsersFilters />

      {/* Users Table */}
      <AdminUsersTable adminUser={user ? { user, profile: user } : undefined} />
    </div>
  )
}
