'use client'

import { useState } from 'react'
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

interface AdminUserProfileProps {
  user: User
  adminUser: AdminUser
}

export function AdminUserProfile({ user, adminUser }: AdminUserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState('')
  const [editData, setEditData] = useState({
    role: user.role,
    subscription_tier: user.subscription_tier,
    subscription_status: user.subscription_status
  })

  const handleSave = async () => {
    // TODO: Implement user update API call
    console.log('Saving user changes:', editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      role: user.role,
      subscription_tier: user.subscription_tier,
      subscription_status: user.subscription_status
    })
    setIsEditing(false)
  }

  const handleSuspendUser = async () => {
    if (!suspensionReason.trim()) {
      alert('Please provide a reason for suspension')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: suspensionReason.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to suspend user')
      }

      alert('User suspended successfully')
      window.location.reload() // Refresh to show updated data
    } catch (error) {
      console.error('Error suspending user:', error)
      alert(error instanceof Error ? error.message : 'Failed to suspend user')
    } finally {
      setIsLoading(false)
      setShowSuspendDialog(false)
      setSuspensionReason('')
    }
  }

  const handleUnsuspendUser = async () => {
    if (!confirm('Are you sure you want to unsuspend this user?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsuspend user')
      }

      alert('User unsuspended successfully')
      window.location.reload() // Refresh to show updated data
    } catch (error) {
      console.error('Error unsuspending user:', error)
      alert(error instanceof Error ? error.message : 'Failed to unsuspend user')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium text-green-600 hover:text-green-700"
            >
              Edit
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm font-medium text-white bg-green-500 rounded hover:bg-green-600"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* User Avatar and Basic Info */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-xl font-semibold">
              {user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{user.email}</h3>
            <p className="text-sm text-gray-500">User ID: {user.id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-4">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            {isEditing ? (
              <select
                value={editData.role}
                onChange={(e) => setEditData(prev => ({ ...prev, role: e.target.value as 'user' | 'admin' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  user.role === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.role === 'admin' ? 'Administrator' : 'User'}
                </span>
              </div>
            )}
          </div>

          {/* Subscription Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Tier
            </label>
            {isEditing ? (
              <select
                value={editData.subscription_tier || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, subscription_tier: e.target.value || null }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            ) : (
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  user.subscription_tier === 'enterprise' ? 'bg-green-100 text-green-800' :
                  user.subscription_tier === 'professional' ? 'bg-purple-100 text-purple-800' :
                  user.subscription_tier === 'starter' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.subscription_tier ? 
                    user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1) : 
                    'Free'
                  }
                </span>
              </div>
            )}
          </div>

          {/* Subscription Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Status
            </label>
            {isEditing ? (
              <select
                value={editData.subscription_status || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, subscription_status: e.target.value || null }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">None</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="cancelled">Cancelled</option>
                <option value="past_due">Past Due</option>
              </select>
            ) : (
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  user.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                  user.subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                  user.subscription_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.subscription_status ? 
                    user.subscription_status.charAt(0).toUpperCase() + user.subscription_status.slice(1) : 
                    'None'
                  }
                </span>
              </div>
            )}
          </div>

          {/* Suspension Status */}
          {user.suspended && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-red-900 mb-3">Suspension Status</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    <span className="text-sm font-medium text-red-800">Account Suspended</span>
                  </div>
                  {user.suspended_at && (
                    <div className="text-xs text-red-600">
                      Suspended: {formatDate(user.suspended_at)}
                    </div>
                  )}
                  {user.suspension_reason && (
                    <div className="text-xs text-red-600">
                      Reason: {user.suspension_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Dates */}
          <div className="pt-4 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900">{formatDate(user.created_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Updated:</span>
                <span className="text-gray-900">{formatDate(user.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        {!isEditing && (
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-red-900 mb-3">Danger Zone</h4>
            <div className="space-y-2">
              {user.suspended ? (
                <button
                  onClick={handleUnsuspendUser}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Unsuspend Account'}
                </button>
              ) : (
                <button
                  onClick={() => setShowSuspendDialog(true)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Suspend Account'}
                </button>
              )}
              <button className="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100">
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspension Dialog */}
      {showSuspendDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Suspend User Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to suspend <strong>{user.email}</strong>?
              This will prevent them from accessing their account.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for suspension <span className="text-red-500">*</span>
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter the reason for suspending this account..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSuspendDialog(false)
                  setSuspensionReason('')
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendUser}
                disabled={isLoading || !suspensionReason.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
