'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Store,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  Crown,
  ArrowRight,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface StoreMetric {
  storeId: string
  storeName: string
  shopDomain: string
  currency: string
  isPrimary: boolean
  isActive: boolean
  syncStatus: string
  revenue: number
  orders: number
  customers: number
  products: number
  conversionRate: number
  averageOrderValue: number
  period: string
}

interface CrossStoreInsight {
  type: 'performance_comparison' | 'inventory_optimization' | 'customer_overlap' | 'pricing_analysis'
  title: string
  description: string
  stores: string[]
  data: any
  recommendations: string[]
  impact: 'high' | 'medium' | 'low'
}

interface MultiStoreData {
  metrics: StoreMetric[]
  insights: CrossStoreInsight[]
  stores: Array<{
    id: string
    name: string
    domain: string
    currency: string
    isPrimary: boolean
    isActive: boolean
  }>
  summary: {
    totalRevenue: number
    totalOrders: number
    totalCustomers: number
    totalProducts: number
    storeCount: number
    activeStoreCount: number
    topPerformer: {
      id: string
      name: string
      revenue: number
    } | null
    averageOrderValue: number
    currencies: string[]
  }
}

const impactColors = {
  high: 'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  low: 'bg-blue-50 border-blue-200 text-blue-800'
}

const impactIcons = {
  high: '!',
  medium: '~',
  low: 'i'
}

export default function MultiStoreAnalyticsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<MultiStoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, timeRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/multi-store?timeRange=${timeRange}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching multi-store analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading multi-store analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data || data.summary.storeCount === 0) {
    return (
      <div className="text-center py-12">
        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Stores Connected</h2>
        <p className="text-gray-600 mb-6">
          Connect your Shopify stores to see cross-store analytics and insights.
        </p>
        <Link
          href="/dashboard/shopify"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Connect Store
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Store Analytics</h1>
          <p className="text-gray-600 mt-1">
            Compare performance across {data.summary.storeCount} connected store{data.summary.storeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalRevenue)}
              </p>
              <p className="text-green-700 text-sm mt-1">
                Across all stores
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalOrders.toLocaleString()}
              </p>
              <p className="text-blue-700 text-sm mt-1">
                AOV: {formatCurrency(data.summary.averageOrderValue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Connected Stores</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.storeCount}
              </p>
              <p className="text-purple-700 text-sm mt-1">
                {data.summary.activeStoreCount} active
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Top Performer</p>
              <p className="text-lg font-bold text-gray-900 truncate max-w-[150px]">
                {data.summary.topPerformer?.name || 'N/A'}
              </p>
              {data.summary.topPerformer && (
                <p className="text-yellow-700 text-sm mt-1">
                  {formatCurrency(data.summary.topPerformer.revenue)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Store Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Store Performance Comparison</h2>
          <p className="text-gray-600 text-sm mt-1">Revenue and metrics breakdown by store</p>
        </div>

        {data.metrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AOV
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.metrics.map((metric, index) => {
                  const revenueShare = data.summary.totalRevenue > 0
                    ? (metric.revenue / data.summary.totalRevenue) * 100
                    : 0

                  return (
                    <tr key={metric.storeId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {index === 0 && data.metrics.length > 1 ? (
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Crown className="w-4 h-4 text-yellow-600" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <Store className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 flex items-center">
                              {metric.storeName}
                              {metric.isPrimary && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                  Primary
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{metric.shopDomain}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(metric.revenue, metric.currency)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <p className="text-sm text-gray-900">{metric.orders.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <p className="text-sm text-gray-900">
                          {formatCurrency(metric.averageOrderValue, metric.currency)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <p className="text-sm text-gray-900">{metric.products.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <p className="text-sm text-gray-900">{metric.customers.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <div className="w-full max-w-[100px]">
                            <div className="flex items-center">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${revenueShare}%` }}
                                />
                              </div>
                              <span className="ml-2 text-xs text-gray-600">
                                {revenueShare.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No metrics available yet</p>
            <p className="text-gray-400 text-sm">Store data will appear after syncing</p>
          </div>
        )}
      </div>

      {/* AI Insights */}
      {data.insights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.insights.map((insight, index) => (
              <div
                key={index}
                className={`rounded-xl border p-6 ${impactColors[insight.impact]}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {insight.impact === 'high' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : insight.impact === 'medium' ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-xs font-semibold uppercase">
                      {insight.impact} Impact
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold mb-2">{insight.title}</h3>
                <p className="text-sm opacity-90 mb-4">{insight.description}</p>

                {insight.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase opacity-70">Recommendations:</p>
                    <ul className="text-sm space-y-1">
                      {insight.recommendations.map((rec, recIndex) => (
                        <li key={recIndex} className="flex items-start gap-2">
                          <span className="opacity-50">-</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Store Notice */}
      {data.summary.storeCount === 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Connect More Stores for Insights</h3>
              <p className="text-blue-700 text-sm mt-1">
                Connect additional Shopify stores to unlock cross-store comparison insights,
                performance benchmarking, and optimization recommendations.
              </p>
              <Link
                href="/dashboard/shopify"
                className="inline-flex items-center mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Add another store
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
