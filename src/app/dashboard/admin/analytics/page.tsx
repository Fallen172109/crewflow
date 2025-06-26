'use client'

import { useAdmin } from '@/hooks/useAdmin'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminAnalyticsPage() {
  const { isAdmin, loading } = useAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard')
    } else if (!loading && isAdmin) {
      // Redirect to the new usage analytics page
      router.push('/admin/usage-analytics')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-300">Redirecting to analytics...</p>
        </div>
      </div>
    )
  }

  // This component will redirect, so we don't need to render anything else
  return null
}
