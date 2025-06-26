import { requireAdminAuth } from '@/lib/admin-auth'
import { getUsageRecords, getUsageSummary } from '@/lib/usage-analytics'
import { UsageAnalyticsTable } from '@/components/admin/UsageAnalyticsTable'
import { UsageAnalyticsSummary } from '@/components/admin/UsageAnalyticsSummary'
import { UsageAnalyticsFilters } from '@/components/admin/UsageAnalyticsFilters'
import { Suspense } from 'react'

interface SearchParams {
  startDate?: string
  endDate?: string
  userId?: string
  agentId?: string
  framework?: string
  provider?: string
  messageType?: string
  page?: string
  limit?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function UsageAnalyticsPage({ searchParams }: Props) {
  const adminUser = await requireAdminAuth()

  // Await search parameters
  const params = await searchParams

  // Parse search parameters
  const filters = {
    startDate: params.startDate,
    endDate: params.endDate,
    userId: params.userId,
    agentId: params.agentId,
    framework: params.framework,
    provider: params.provider,
    messageType: params.messageType
  }

  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '50')
  const offset = (page - 1) * limit

  // Fetch data
  const [usageData, summaryData] = await Promise.all([
    getUsageRecords(filters, limit, offset),
    getUsageSummary(filters)
  ])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Usage Analytics</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive monitoring of AI agent usage, costs, and performance across all users.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              📊 Generate Report
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Usage Summary Cards */}
      <UsageAnalyticsSummary summary={summaryData} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Filter Usage Data</h2>
          <p className="text-sm text-gray-600 mt-1">
            Filter and search through AI usage records to find specific data.
          </p>
        </div>
        <div className="p-6">
          <Suspense fallback={<div>Loading filters...</div>}>
            <UsageAnalyticsFilters currentFilters={filters} />
          </Suspense>
        </div>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Usage Records</h2>
              <p className="text-sm text-gray-600 mt-1">
                Showing {usageData.records.length} of {usageData.totalCount.toLocaleString()} records
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Page {page} of {Math.ceil(usageData.totalCount / limit)}
              </div>
              <div className="flex space-x-2">
                {page > 1 && (
                  <a
                    href={`/admin/usage-analytics?${new URLSearchParams({
                      ...searchParams,
                      page: (page - 1).toString()
                    }).toString()}`}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Previous
                  </a>
                )}
                {page < Math.ceil(usageData.totalCount / limit) && (
                  <a
                    href={`/admin/usage-analytics?${new URLSearchParams({
                      ...searchParams,
                      page: (page + 1).toString()
                    }).toString()}`}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <UsageAnalyticsTable records={usageData.records} />
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Provider */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Cost by Provider</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(summaryData.costByProvider)
                .sort(([,a], [,b]) => b - a)
                .map(([provider, cost]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {provider}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        ${cost.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {((cost / summaryData.totalCostUsd) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Usage by Framework */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Usage by Framework</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(summaryData.usageByFramework)
                .sort(([,a], [,b]) => b - a)
                .map(([framework, requests]) => (
                  <div key={framework} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {framework}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {requests.toLocaleString()} requests
                      </div>
                      <div className="text-xs text-gray-500">
                        {((requests / summaryData.totalRequests) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Top Users by Usage</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summaryData.topUsersByUsage.slice(0, 10).map((user, index) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 text-sm font-semibold">
                          {index + 1}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${user.cost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
