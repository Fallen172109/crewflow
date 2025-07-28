'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  Globe,
  Compass
} from 'lucide-react'

interface AnalyticsData {
  revenue: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down'
  }
  orders: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down'
  }
  customers: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down'
  }
  conversion_rate: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down'
  }
  average_order_value: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down'
  }
  top_products: Array<{
    id: number
    name: string
    revenue: number
    units_sold: number
    growth: number
  }>
  sales_by_day: Array<{
    date: string
    revenue: number
    orders: number
  }>
  customer_segments: Array<{
    segment: string
    count: number
    revenue: number
    percentage: number
  }>
  traffic_sources: Array<{
    source: string
    visitors: number
    conversions: number
    revenue: number
  }>
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    if (!selectedStore) {
      console.warn('No store selected')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // For now, show empty state since we don't have analytics API yet
      // TODO: Implement actual analytics API call when Shopify analytics integration is ready
      const emptyAnalytics: AnalyticsData = {
        revenue: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        orders: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        customers: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        conversion_rate: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        average_order_value: { current: 0, previous: 0, change: 0, trend: 'neutral' },
        top_products: [],
        sales_by_day: [],
        customer_segments: [],
        traffic_sources: []
      }

      setAnalytics(emptyAnalytics)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      setError(error instanceof Error ? error.message : 'Failed to load analytics')
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getChangeColor = (trend: 'up' | 'down') => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600'
  }

  const getChangeIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? ArrowUpRight : ArrowDownRight
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Charting navigation data...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
        <p className="text-gray-600">Analytics will appear here once you have store activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Compass className="w-8 h-8 text-orange-600" />
            <span>Navigation Charts</span>
          </h2>
          <p className="text-gray-600 mt-1">Track your maritime commerce performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.revenue.current)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {(() => {
              const ChangeIcon = getChangeIcon(analytics.revenue.trend)
              return (
                <div className={`flex items-center space-x-1 ${getChangeColor(analytics.revenue.trend)}`}>
                  <ChangeIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatPercentage(analytics.revenue.change)}</span>
                </div>
              )
            })()}
            <span className="text-sm text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Orders</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.orders.current.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {(() => {
              const ChangeIcon = getChangeIcon(analytics.orders.trend)
              return (
                <div className={`flex items-center space-x-1 ${getChangeColor(analytics.orders.trend)}`}>
                  <ChangeIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatPercentage(analytics.orders.change)}</span>
                </div>
              )
            })()}
            <span className="text-sm text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.customers.current.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {(() => {
              const ChangeIcon = getChangeIcon(analytics.customers.trend)
              return (
                <div className={`flex items-center space-x-1 ${getChangeColor(analytics.customers.trend)}`}>
                  <ChangeIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatPercentage(analytics.customers.change)}</span>
                </div>
              )
            })()}
            <span className="text-sm text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.conversion_rate.current}%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {(() => {
              const ChangeIcon = getChangeIcon(analytics.conversion_rate.trend)
              return (
                <div className={`flex items-center space-x-1 ${getChangeColor(analytics.conversion_rate.trend)}`}>
                  <ChangeIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatPercentage(analytics.conversion_rate.change)}</span>
                </div>
              )
            })()}
            <span className="text-sm text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.average_order_value.current)}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {(() => {
              const ChangeIcon = getChangeIcon(analytics.average_order_value.trend)
              return (
                <div className={`flex items-center space-x-1 ${getChangeColor(analytics.average_order_value.trend)}`}>
                  <ChangeIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{formatPercentage(analytics.average_order_value.change)}</span>
                </div>
              )
            })()}
            <span className="text-sm text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Cargo</h3>
            <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {analytics.top_products.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium text-orange-600">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.units_sold} units sold</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{formatCurrency(product.revenue)}</div>
                  <div className={`text-sm ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(product.growth)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Segments */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Crew Segments</h3>
            <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
              View Details
            </button>
          </div>
          <div className="space-y-4">
            {analytics.customer_segments.map((segment) => (
              <div key={segment.segment} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{segment.segment}</span>
                  <span className="text-sm text-gray-500">{segment.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${segment.percentage}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{segment.count} customers</span>
                  <span>{formatCurrency(segment.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
            <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
              View Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Visitors</th>
                  <th className="pb-3">Conversions</th>
                  <th className="pb-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                {analytics.traffic_sources.map((source) => (
                  <tr key={source.source} className="border-t border-gray-100">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{source.source}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-900">{source.visitors.toLocaleString()}</td>
                    <td className="py-3 text-gray-900">{source.conversions}</td>
                    <td className="py-3 text-gray-900">{formatCurrency(source.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
            <div className="flex items-center space-x-2">
              <button className={`px-3 py-1 text-sm rounded-lg ${selectedMetric === 'revenue' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                Revenue
              </button>
              <button className={`px-3 py-1 text-sm rounded-lg ${selectedMetric === 'orders' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                Orders
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {analytics.sales_by_day.map((day) => (
              <div key={day.date} className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedMetric === 'revenue' ? formatCurrency(day.revenue) : `${day.orders} orders`}
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ 
                        width: selectedMetric === 'revenue' 
                          ? `${(day.revenue / Math.max(...analytics.sales_by_day.map(d => d.revenue))) * 100}%`
                          : `${(day.orders / Math.max(...analytics.sales_by_day.map(d => d.orders))) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
