'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { AdminUser } from '@/lib/admin-auth'
import { supabase } from '@/lib/supabase'
import { PlanChangeModal } from './PlanChangeModal'
import { BulkPlanChangeModal } from './BulkPlanChangeModal'

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

interface AdminUsersTableProps {
  users?: User[]
  adminUser?: AdminUser
}

export function AdminUsersTable({ users: propUsers, adminUser }: AdminUsersTableProps) {
  const [users, setUsers] = useState<User[]>(propUsers || [])
  const [loading, setLoading] = useState(!propUsers)
  const [error, setError] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [sortField, setSortField] = useState<keyof User>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')
  const [planChangeModal, setPlanChangeModal] = useState<{
    isOpen: boolean
    user: User | null
  }>({ isOpen: false, user: null })
  const [bulkPlanChangeModal, setBulkPlanChangeModal] = useState(false)

  // Fetch users if not provided as props
  useEffect(() => {
    if (!propUsers) {
      fetchUsers()
    }
  }, [propUsers])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/users')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  // Filter and search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue === null) return 1
    if (bValue === null) return -1

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // User management functions
  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          updates: { role: newRole },
          action: 'UPDATE_ROLE'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user role')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ))

      alert('User role updated successfully')
    } catch (err) {
      console.error('Error updating user role:', err)
      alert(err instanceof Error ? err.message : 'Failed to update user role')
    }
  }

  const suspendUser = async (userId: string) => {
    const reason = prompt('Please provide a reason for suspension:')
    if (!reason) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to suspend user')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, suspended: true, suspended_at: new Date().toISOString(), suspension_reason: reason } : user
      ))

      alert('User suspended successfully')
    } catch (err) {
      console.error('Error suspending user:', err)
      alert(err instanceof Error ? err.message : 'Failed to suspend user')
    }
  }

  const unsuspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unsuspend this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsuspend user')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, suspended: false, suspended_at: null, suspension_reason: null } : user
      ))

      alert('User unsuspended successfully')
    } catch (err) {
      console.error('Error unsuspending user:', err)
      alert(err instanceof Error ? err.message : 'Failed to unsuspend user')
    }
  }

  // Plan management functions
  const openPlanChangeModal = (user: User) => {
    setPlanChangeModal({ isOpen: true, user })
  }

  const closePlanChangeModal = () => {
    setPlanChangeModal({ isOpen: false, user: null })
  }

  const handlePlanChangeSuccess = (updatedUser: User) => {
    // Update local state
    setUsers(prev => prev.map(user =>
      user.id === updatedUser.id ? updatedUser : user
    ))
  }

  const bulkChangePlans = async (userIds: string[], tier: string, status: string) => {
    if (!adminUser) return

    try {
      // Update all selected users via API
      const updatePromises = userIds.map(userId =>
        fetch('/api/admin/users', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            updates: {
              subscription_tier: tier === 'free' ? null : tier,
              subscription_status: status === 'none' ? null : status
            },
            action: 'BULK_UPDATE_SUBSCRIPTION'
          })
        })
      )

      const responses = await Promise.all(updatePromises)

      // Check if all requests were successful
      const failedUpdates = responses.filter(response => !response.ok)
      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} users`)
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        userIds.includes(user.id) ? {
          ...user,
          subscription_tier: tier === 'free' ? null : tier,
          subscription_status: status === 'none' ? null : status
        } : user
      ))

      setSelectedUsers([])
      alert(`Successfully updated ${userIds.length} user(s)`)
    } catch (err) {
      console.error('Error bulk updating subscriptions:', err)
      alert(err instanceof Error ? err.message : 'Failed to update user subscriptions')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSubscriptionBadge = (tier: string | null, status: string | null) => {
    if (!tier || !status) {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300">⚓ Free</span>
    }

    const tierColors = {
      starter: 'bg-blue-50 text-blue-700 border-blue-200',
      professional: 'bg-purple-50 text-purple-700 border-purple-200',
      enterprise: 'bg-orange-50 text-orange-700 border-orange-200'
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

    const statusIcons = {
      active: '✅',
      inactive: '⏸️',
      cancelled: '❌',
      past_due: '⚠️'
    }

    return (
      <div className="flex flex-col space-y-1">
        <span className={`px-2 py-1 text-xs font-medium rounded border ${tierColors[tier as keyof typeof tierColors] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
          {tierIcons[tier as keyof typeof tierIcons] || '⚓'} {tier}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded border ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
          {statusIcons[status as keyof typeof statusIcons] || '❓'} {status}
        </span>
      </div>
    )
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <span className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded border border-red-200">
        🛡️ Admin
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300">
        👤 User
      </span>
    )
  }

  const getSuspensionBadge = (suspended: boolean) => {
    return suspended ? (
      <span className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded border border-red-200">
        🚫 Suspended
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded border border-green-200">
        ✅ Active
      </span>
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Table Header Actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${sortedUsers.length} users`}
            </span>
            {selectedUsers.length > 0 && (
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                  Send Email
                </button>
                <button
                  onClick={() => setBulkPlanChangeModal(true)}
                  className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                >
                  Change Plans
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to suspend selected users?')) {
                      selectedUsers.forEach(userId => suspendUser(userId))
                      setSelectedUsers([])
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                >
                  Suspend
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'user' | 'admin')}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
            <input
              type="search"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-4 p-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === sortedUsers.length && sortedUsers.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 bg-white"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                User
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('role')}
              >
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="w-4 p-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 bg-white"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getRoleBadge(user.role)}
                    {user.role === 'user' && (
                      <button
                        onClick={() => {
                          if (confirm(`Promote ${user.email} to admin?`)) {
                            updateUserRole(user.id, 'admin')
                          }
                        }}
                        className="text-xs text-orange-600 hover:text-orange-700"
                      >
                        Promote
                      </button>
                    )}
                    {user.role === 'admin' && adminUser?.user.id !== user.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Demote ${user.email} to user?`)) {
                            updateUserRole(user.id, 'user')
                          }
                        }}
                        className="text-xs text-yellow-600 hover:text-yellow-700"
                      >
                        Demote
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSubscriptionBadge(user.subscription_tier, user.subscription_status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSuspensionBadge(user.suspended)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => openPlanChangeModal(user)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Plan
                    </button>
                    {user.suspended ? (
                      <button
                        onClick={() => unsuspendUser(user.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        Unsuspend
                      </button>
                    ) : (
                      <button
                        onClick={() => suspendUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedUsers.length === 0 && (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-500 text-xl">👥</span>
          </div>
          <p className="text-sm text-gray-600">
            {searchTerm || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
          </p>
          {(searchTerm || roleFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setRoleFilter('all')
              }}
              className="mt-2 text-sm text-orange-600 hover:text-orange-700"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Plan Change Modal */}
      <PlanChangeModal
        isOpen={planChangeModal.isOpen}
        onClose={closePlanChangeModal}
        user={planChangeModal.user}
        adminUserId={adminUser?.user.id || ''}
        onSuccess={handlePlanChangeSuccess}
      />

      {/* Bulk Plan Change Modal */}
      <BulkPlanChangeModal
        isOpen={bulkPlanChangeModal}
        onClose={() => setBulkPlanChangeModal(false)}
        selectedUserCount={selectedUsers.length}
        onConfirm={(tier, status) => bulkChangePlans(selectedUsers, tier, status)}
      />
    </div>
  )
}

// Default export for easier importing
export default AdminUsersTable
