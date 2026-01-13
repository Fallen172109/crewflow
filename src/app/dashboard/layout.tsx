'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardNav from '@/components/dashboard/DashboardNav'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useAdmin } from '@/hooks/useAdmin'
import { ShopifyStoreProvider } from '@/contexts/ShopifyStoreContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const { isAdmin } = useAdmin()
  const router = useRouter()

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('Dashboard: No user found, redirecting to landing page')
      router.push('/')
    } else if (!loading && user) {
      console.log('Dashboard: User authenticated:', user.email)
    }
  }, [user, loading, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing CrewFlow...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <ShopifyStoreProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <DashboardNav />

        <div className="flex">
          {/* Sidebar - key forces re-render when admin status changes */}
          <DashboardSidebar key={`sidebar-${isAdmin}`} />

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </ShopifyStoreProvider>
  )
}
