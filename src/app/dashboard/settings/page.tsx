'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { user, userProfile, updatePassword, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  // Password change form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      })

      if (signInError) {
        setError('Current password is incorrect')
        setLoading(false)
        return
      }

      // Update password
      const { error } = await updatePassword(newPassword)

      if (error) {
        setError(error.message)
      } else {
        setMessage('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setLoading(true)
      try {
        // Note: Account deletion would typically be handled by a server-side function
        // For now, we'll just show a message
        setError('Account deletion is not yet implemented. Please contact support.')
      } catch (err) {
        setError('An error occurred while deleting your account')
      } finally {
        setLoading(false)
      }
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'billing', name: 'Billing', icon: '💳' },
    { id: 'danger', name: 'Danger Zone', icon: '⚠️' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        <p className="text-secondary-300 mt-1">
          Manage your account preferences and security settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-secondary-400 hover:text-secondary-300 hover:border-secondary-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-secondary-800 rounded-lg p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Profile Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg text-secondary-300 cursor-not-allowed"
                />
                <p className="text-xs text-secondary-400 mt-1">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Account Created
                </label>
                <input
                  type="text"
                  value={userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}
                  disabled
                  className="w-full px-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg text-secondary-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Subscription Tier
                </label>
                <input
                  type="text"
                  value={userProfile?.subscription_tier ? userProfile.subscription_tier.charAt(0).toUpperCase() + userProfile.subscription_tier.slice(1) : 'None'}
                  disabled
                  className="w-full px-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg text-secondary-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Subscription Status
                </label>
                <input
                  type="text"
                  value={userProfile?.subscription_status ? userProfile.subscription_status.charAt(0).toUpperCase() + userProfile.subscription_status.slice(1) : 'Inactive'}
                  disabled
                  className="w-full px-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg text-secondary-300 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Security Settings</h2>
            
            {message && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                <p className="text-green-200 text-sm">{message}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <h3 className="text-lg font-medium text-white">Change Password</h3>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Billing & Subscription</h2>
            <p className="text-secondary-300">
              Manage your subscription and billing information.
            </p>
            <div className="bg-secondary-700 rounded-lg p-4">
              <p className="text-secondary-300">
                Billing management is coming soon. For now, please contact support for billing inquiries.
              </p>
            </div>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>
            <p className="text-secondary-300">
              These actions are irreversible. Please proceed with caution.
            </p>
            
            <div className="border border-red-500/50 rounded-lg p-6 bg-red-500/10">
              <h3 className="text-lg font-medium text-red-400 mb-2">Delete Account</h3>
              <p className="text-secondary-300 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Processing...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
