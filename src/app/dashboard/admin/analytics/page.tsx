'use client'

import { useAdmin } from '@/hooks/useAdmin'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminAnalyticsMetrics from '@/components/admin/AdminAnalyticsMetrics'
import AdminAnalyticsCharts from '@/components/admin/AdminAnalyticsCharts'
import AdminAnalyticsAgents from '@/components/admin/AdminAnalyticsAgents'

export default function AdminAnalyticsPage() {
  const { isAdmin, loading } = useAdmin()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-300">Loading analytics...</p>
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
          <p className="text-secondary-300">You don't have permission to access system analytics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Analytics</h1>
          <p className="text-secondary-300 mt-1">
            Comprehensive analytics and insights across all CrewFlow users
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select className="px-3 py-2 bg-secondary-700 text-white rounded-lg border border-secondary-600">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <AdminAnalyticsMetrics />

      {/* Charts */}
      <AdminAnalyticsCharts />

      {/* Agent Performance */}
      <AdminAnalyticsAgents />
    </div>
  )
}
