'use client'

import { useAdmin } from '@/hooks/useAdmin'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  role: 'user' | 'admin'
  subscription_tier: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

interface UserActivity {
  id: string
  agent_name: string
  action_type: string
  created_at: string
  details?: any
}

interface AuditLog {
  id: string
  admin_id: string
  action: string
  details: any
  created_at: string
  admin_email?: string
}

export default function AdminUserDetailPage() {
  const { isAdmin, loading: adminLoading, user: adminUser } = useAdmin()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserProfile | null>(null)
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'audit'>('profile')

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, adminLoading, router])

  useEffect(() => {
    if (isAdmin && userId) {
      fetchUserData()
    }
  }, [isAdmin, userId])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) throw userError
      setUser(userData)

      // Fetch user activity
      const { data: activityData, error: activityError } = await supabase
        .from('agent_usage')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (activityError) {
        console.error('Error fetching activity:', activityError)
      } else {
        setUserActivity(activityData || [])
      }

      // Fetch audit logs for this user
      const { data: auditData, error: auditError } = await supabase
        .from('admin_audit_log')
        .select(`
          *,
          admin:admin_id(email)
        `)
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (auditError) {
        console.error('Error fetching audit logs:', auditError)
      } else {
        setAuditLogs(auditData || [])
      }

    } catch (err) {
      console.error('Error fetching user data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (newRole: 'user' | 'admin') => {
    if (!user || !adminUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: adminUser.id,
          action: `UPDATE_USER_ROLE_${newRole.toUpperCase()}`,
          target_user_id: userId,
          details: { old_role: user.role, new_role: newRole }
        })

      setUser({ ...user, role: newRole })
      fetchUserData() // Refresh audit logs
    } catch (err) {
      console.error('Error updating user role:', err)
      alert('Failed to update user role')
    }
  }

  const updateSubscription = async (tier: string, status: string) => {
    if (!user || !adminUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_tier: tier === 'free' ? null : tier,
          subscription_status: status === 'none' ? null : status
        })
        .eq('id', userId)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: adminUser.id,
          action: 'UPDATE_USER_SUBSCRIPTION',
          target_user_id: userId,
          details: { 
            old_tier: user.subscription_tier, 
            new_tier: tier,
            old_status: user.subscription_status,
            new_status: status
          }
        })

      setUser({ 
        ...user, 
        subscription_tier: tier === 'free' ? null : tier,
        subscription_status: status === 'none' ? null : status
      })
      fetchUserData() // Refresh audit logs
    } catch (err) {
      console.error('Error updating subscription:', err)
      alert('Failed to update subscription')
    }
  }

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-300">Loading user details...</p>
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

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center text-secondary-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Users
          </Link>
        </div>

        <div className="bg-red-900/20 border border-red-900/30 rounded-xl p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-red-400">Error loading user</h3>
              <p className="text-red-300 mt-1">{error || 'User not found'}</p>
            </div>
          </div>
          <button
            onClick={fetchUserData}
            className="mt-4 px-4 py-2 bg-red-900/30 hover:bg-red-900/40 text-red-300 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <span className="px-3 py-1 text-sm font-medium bg-red-900/20 text-red-400 rounded-full border border-red-900/30">
        🛡️ Admin
      </span>
    ) : (
      <span className="px-3 py-1 text-sm font-medium bg-secondary-700 text-secondary-300 rounded-full border border-secondary-600">
        👤 User
      </span>
    )
  }

  const getSubscriptionBadge = (tier: string | null, status: string | null) => {
    if (!tier || !status) {
      return <span className="px-3 py-1 text-sm font-medium bg-secondary-700 text-secondary-300 rounded-full border border-secondary-600">⚓ Free</span>
    }

    const tierColors = {
      starter: 'bg-blue-900/20 text-blue-400 border-blue-900/30',
      professional: 'bg-purple-900/20 text-purple-400 border-purple-900/30',
      enterprise: 'bg-primary-900/20 text-primary-400 border-primary-900/30'
    }

    const tierIcons = {
      starter: '🚤',
      professional: '⛵',
      enterprise: '🚢'
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${tierColors[tier as keyof typeof tierColors] || 'bg-secondary-700 text-secondary-300 border-secondary-600'}`}>
        {tierIcons[tier as keyof typeof tierIcons] || '⚓'} {tier} ({status})
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center text-secondary-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Users
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">User Details</h1>
            <p className="text-secondary-300 mt-1">Manage user account and permissions</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchUserData}
            className="px-4 py-2 bg-secondary-700 hover:bg-secondary-600 text-white rounded-lg transition-colors border border-secondary-600"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-2xl font-bold">
                {user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.email}</h2>
              <p className="text-gray-600">ID: {user.id}</p>
              <div className="flex items-center space-x-3 mt-2">
                {getRoleBadge(user.role)}
                {getSubscriptionBadge(user.subscription_tier, user.subscription_status)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-secondary-400 text-sm">Joined</p>
            <p className="text-white font-medium">{formatDate(user.created_at)}</p>
            <p className="text-secondary-400 text-sm mt-2">Last Updated</p>
            <p className="text-white font-medium">{formatDate(user.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-secondary-800 rounded-xl border border-secondary-700">
        <div className="border-b border-secondary-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', name: 'Profile Management', icon: '👤' },
              { id: 'activity', name: 'Activity History', icon: '📊' },
              { id: 'audit', name: 'Audit Log', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-secondary-400 hover:text-secondary-300'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Role Management */}
              <div className="bg-secondary-700 rounded-lg p-4 border border-secondary-600">
                <h3 className="text-lg font-semibold text-white mb-4">🛡️ Role Management</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-secondary-300">Current Role: {getRoleBadge(user.role)}</p>
                    <p className="text-secondary-400 text-sm mt-1">
                      {user.role === 'admin' ? 'Full system access and user management' : 'Standard user access'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {user.role === 'user' && (
                      <button
                        onClick={() => {
                          if (confirm(`Promote ${user.email} to admin? This will give them full system access.`)) {
                            updateUserRole('admin')
                          }
                        }}
                        className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors border border-red-900/30"
                      >
                        Promote to Admin
                      </button>
                    )}
                    {user.role === 'admin' && adminUser?.id !== user.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Demote ${user.email} to user? This will remove their admin access.`)) {
                            updateUserRole('user')
                          }
                        }}
                        className="px-4 py-2 bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400 rounded-lg transition-colors border border-yellow-900/30"
                      >
                        Demote to User
                      </button>
                    )}
                    {user.role === 'admin' && adminUser?.id === user.id && (
                      <p className="text-secondary-400 text-sm italic">Cannot modify your own role</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscription Management */}
              <div className="bg-secondary-700 rounded-lg p-4 border border-secondary-600">
                <h3 className="text-lg font-semibold text-white mb-4">💳 Subscription Management</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-secondary-300 mb-2">Current Plan: {getSubscriptionBadge(user.subscription_tier, user.subscription_status)}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-300 mb-2">Subscription Tier</label>
                        <select
                          defaultValue={user.subscription_tier || 'free'}
                          onChange={(e) => {
                            const newTier = e.target.value
                            const currentStatus = user.subscription_status || 'none'
                            updateSubscription(newTier, currentStatus)
                          }}
                          className="w-full px-3 py-2 bg-secondary-600 border border-secondary-500 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="free">⚓ Free</option>
                          <option value="starter">🚤 Starter</option>
                          <option value="professional">⛵ Professional</option>
                          <option value="enterprise">🚢 Enterprise</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-300 mb-2">Subscription Status</label>
                        <select
                          defaultValue={user.subscription_status || 'none'}
                          onChange={(e) => {
                            const newStatus = e.target.value
                            const currentTier = user.subscription_tier || 'free'
                            updateSubscription(currentTier, newStatus)
                          }}
                          className="w-full px-3 py-2 bg-secondary-600 border border-secondary-500 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="none">None</option>
                          <option value="active">✅ Active</option>
                          <option value="inactive">⏸️ Inactive</option>
                          <option value="cancelled">❌ Cancelled</option>
                          <option value="past_due">⚠️ Past Due</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {user.stripe_customer_id && (
                    <div className="pt-4 border-t border-secondary-600">
                      <p className="text-secondary-400 text-sm">Stripe Customer ID: {user.stripe_customer_id}</p>
                      {user.stripe_subscription_id && (
                        <p className="text-secondary-400 text-sm">Stripe Subscription ID: {user.stripe_subscription_id}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-900/10 rounded-lg p-4 border border-red-900/30">
                <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Danger Zone</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-300 font-medium">Suspend User Account</p>
                      <p className="text-red-400 text-sm">Temporarily disable user access</p>
                    </div>
                    <button className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors border border-red-900/30">
                      Suspend Account
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-300 font-medium">Delete User Account</p>
                      <p className="text-red-400 text-sm">Permanently remove user and all data</p>
                    </div>
                    <button className="px-4 py-2 bg-red-900/30 hover:bg-red-900/40 text-red-300 rounded-lg transition-colors border border-red-900/40">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">📊 Recent Activity</h3>
              {userActivity.length > 0 ? (
                <div className="space-y-3">
                  {userActivity.map((activity) => (
                    <div key={activity.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900 font-medium">🤖 {activity.agent_name}</p>
                          <p className="text-gray-600 text-sm">{activity.action_type}</p>
                        </div>
                        <p className="text-gray-600 text-sm">{formatDate(activity.created_at)}</p>
                      </div>
                      {activity.details && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                          <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-secondary-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-secondary-400 text-xl">📊</span>
                  </div>
                  <p className="text-secondary-400">No activity found for this user</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">📋 Admin Actions</h3>
              {auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900 font-medium">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-gray-600 text-sm">
                            By: {log.admin_email || 'Unknown Admin'}
                          </p>
                        </div>
                        <p className="text-gray-600 text-sm">{formatDate(log.created_at)}</p>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-secondary-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-secondary-400 text-xl">📋</span>
                  </div>
                  <p className="text-secondary-400">No admin actions recorded for this user</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
