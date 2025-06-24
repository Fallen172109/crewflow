'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

export function useAdmin() {
  const { user, userProfile } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('useAdmin: Checking admin status', {
      hasUser: !!user,
      hasProfile: !!userProfile,
      profileRole: userProfile?.role,
      profileEmail: userProfile?.email,
      profileObject: userProfile
    })

    if (userProfile) {
      const adminStatus = userProfile.role === 'admin'
      console.log('useAdmin: Setting admin status to:', adminStatus)
      setIsAdmin(adminStatus)
      setLoading(false)
    } else if (user && !userProfile) {
      // Still loading profile
      console.log('useAdmin: User exists but no profile, still loading')
      setLoading(true)
    } else {
      // No user
      console.log('useAdmin: No user, setting admin to false')
      setIsAdmin(false)
      setLoading(false)
    }
  }, [user, userProfile])

  return {
    isAdmin,
    loading,
    user,
    profile: userProfile
  }
}
