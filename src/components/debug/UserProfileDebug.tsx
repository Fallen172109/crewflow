'use client'

import { useAuth } from '@/lib/auth-context'
import { useAdmin } from '@/hooks/useAdmin'

export default function UserProfileDebug() {
  const { user, profile, refreshProfile } = useAuth()
  const { isAdmin } = useAdmin()

  if (!user) return null

  return (
    <div className="fixed bottom-4 right-4 bg-secondary-800 border border-secondary-600 rounded-lg p-4 text-xs max-w-sm z-50">
      <h3 className="text-white font-bold mb-2">🐛 Debug Info</h3>
      <div className="space-y-1 text-secondary-300">
        <div><strong>User ID:</strong> {user.id}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Email Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</div>
        <div><strong>Profile Loaded:</strong> {profile ? 'Yes' : 'No'}</div>
        {profile && (
          <>
            <div><strong>Profile Role:</strong> {profile.role || 'null'}</div>
            <div><strong>Subscription:</strong> {profile.subscription_tier || 'null'}</div>
            <div><strong>Subscription Status:</strong> {profile.subscription_status || 'null'}</div>
            <div><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</div>
          </>
        )}
        <button
          onClick={refreshProfile}
          className="mt-2 px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700"
        >
          🔄 Refresh Profile
        </button>
      </div>
    </div>
  )
}
