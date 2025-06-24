import { requireAdminAuth, getSystemAnalytics } from '@/lib/admin-auth'
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts'
import { AdminAnalyticsMetrics } from '@/components/admin/AdminAnalyticsMetrics'
import { AdminAnalyticsAgents } from '@/components/admin/AdminAnalyticsAgents'

export default async function AdminAnalyticsPage() {
  const adminUser = await requireAdminAuth()
  const analytics = await getSystemAnalytics(adminUser.profile.id)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive platform analytics and performance metrics.
            </p>
          </div>
          <div className="flex space-x-3">
            <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <AdminAnalyticsMetrics analytics={analytics} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminAnalyticsCharts analytics={analytics} />
        <AdminAnalyticsAgents analytics={analytics} />
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Active Users</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm font-semibold">U{i}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">user{i}@example.com</p>
                      <p className="text-xs text-gray-500">Enterprise Plan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{150 - i * 20} requests</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Metrics</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Recurring Revenue</span>
                <span className="text-lg font-bold text-gray-900">$12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Annual Recurring Revenue</span>
                <span className="text-lg font-bold text-gray-900">$149,400</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Revenue Per User</span>
                <span className="text-lg font-bold text-gray-900">$58.50</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Churn Rate</span>
                <span className="text-lg font-bold text-red-600">2.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Customer Lifetime Value</span>
                <span className="text-lg font-bold text-gray-900">$2,540</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">System Performance</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">145ms</div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">1.2M</div>
              <div className="text-sm text-gray-600">API Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">0.02%</div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
