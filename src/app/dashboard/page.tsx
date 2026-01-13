'use client'

import { useAuth } from '@/lib/auth-context'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

// Interface for dashboard metrics
interface DashboardMetrics {
  totalRevenue: number
  revenueGrowth: number
  totalOrders: number
  ordersGrowth: number
  totalProducts: number
  lowStockCount: number
  pendingOrders: number
}

// Interface for recent orders
interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

// Helper function to format currency
const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Helper function to format time ago
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

// Get status badge styling
const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'fulfilled':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'refunded':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-blue-100 text-blue-700 border-blue-200'
  }
}

export default function DashboardPage() {
  const { userProfile, user } = useAuth()
  const { selectedStore, stores, isLoading: storesLoading } = useShopifyStore()
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    ordersGrowth: 0,
    totalProducts: 0,
    lowStockCount: 0,
    pendingOrders: 0
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch store data when store is selected
  useEffect(() => {
    if (selectedStore?.id) {
      fetchStoreMetrics()
    } else {
      setLoading(false)
    }
  }, [selectedStore?.id])

  const fetchStoreMetrics = async () => {
    if (!selectedStore?.id) return
    setLoading(true)

    try {
      // Fetch store analytics from API
      const response = await fetch(`/api/shopify/stores/${selectedStore.id}/analytics`)

      if (response.ok) {
        const data = await response.json()
        setDashboardMetrics({
          totalRevenue: data.totalRevenue || 0,
          revenueGrowth: data.revenueGrowth || 0,
          totalOrders: data.totalOrders || 0,
          ordersGrowth: data.ordersGrowth || 0,
          totalProducts: data.totalProducts || 0,
          lowStockCount: data.lowStockCount || 0,
          pendingOrders: data.pendingOrders || 0
        })
        setRecentOrders(data.recentOrders || [])
      }
    } catch (error) {
      console.error('Error fetching store metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  // If no stores connected, show connection prompt
  if (!storesLoading && stores.length === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Store Overview</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Let's set up your Shopify store.
            </p>
          </div>
        </div>

        {/* Connect Store CTA */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Shopify Store</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your Shopify store to start managing products, orders, and inventory with AI-powered automation.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Connect Store
          </Link>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Management</h3>
            <p className="text-gray-600 text-sm">
              Create, edit, and manage products with AI-powered descriptions and image optimization.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Processing</h3>
            <p className="text-gray-600 text-sm">
              Streamline order fulfillment with automated workflows and real-time tracking.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
            <p className="text-gray-600 text-sm">
              Get actionable insights with AI-powered analytics and performance recommendations.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Store Overview</h1>
          <p className="text-gray-600 mt-1">
            {selectedStore ? `Managing: ${selectedStore.storeName || selectedStore.shopDomain}` : 'Select a store to view metrics'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/shopify"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>AI Assistant</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              {loading ? (
                <div className="w-24 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardMetrics.totalRevenue, selectedStore?.currency || 'USD')}
                  </p>
                  {dashboardMetrics.revenueGrowth !== 0 && (
                    <p className={`text-sm mt-1 ${dashboardMetrics.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardMetrics.revenueGrowth > 0 ? '↗' : '↘'} {Math.abs(dashboardMetrics.revenueGrowth)}% vs last month
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.totalOrders}</p>
                  {dashboardMetrics.pendingOrders > 0 && (
                    <p className="text-sm mt-1 text-yellow-600">
                      {dashboardMetrics.pendingOrders} pending
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.totalProducts}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Low Stock Alerts</p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{dashboardMetrics.lowStockCount}</p>
                  {dashboardMetrics.lowStockCount > 0 && (
                    <Link href="/dashboard/inventory" className="text-sm mt-1 text-green-600 hover:text-green-700">
                      View inventory →
                    </Link>
                  )}
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/dashboard/products"
          className="flex items-center space-x-3 bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-green-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Add Product</p>
            <p className="text-sm text-gray-500">Create a new listing</p>
          </div>
        </Link>

        <Link
          href="/dashboard/orders"
          className="flex items-center space-x-3 bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-green-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">View Orders</p>
            <p className="text-sm text-gray-500">Manage fulfillment</p>
          </div>
        </Link>

        <Link
          href="/dashboard/inventory"
          className="flex items-center space-x-3 bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-green-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Check Stock</p>
            <p className="text-sm text-gray-500">Monitor inventory</p>
          </div>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="flex items-center space-x-3 bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-green-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">View Analytics</p>
            <p className="text-sm text-gray-500">See performance</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-green-500 hover:text-green-600 text-sm font-medium"
          >
            View all orders →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-3">
                  <div className="w-10 h-10 bg-gray-200 animate-pulse rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-gray-200 animate-pulse rounded"></div>
                    <div className="w-1/4 h-3 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.order_number}</p>
                      <p className="text-sm text-gray-500">{order.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(order.total, selectedStore?.currency || 'USD')}
                      </p>
                      <p className="text-sm text-gray-500">{formatTimeAgo(order.created_at)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-gray-500">No recent orders</p>
              <p className="text-gray-400 text-sm mt-1">Orders will appear here once you start receiving them</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Need help managing your store?</h3>
            <p className="text-gray-600 text-sm mt-1">
              Ask the AI Assistant to create products, analyze sales, update inventory, and more.
            </p>
          </div>
          <Link
            href="/dashboard/shopify"
            className="flex-shrink-0 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            Chat with AI
          </Link>
        </div>
      </div>
    </div>
  )
}
