import { requireAdminAuth } from '@/lib/admin-auth'
import { getUsageRecords, getUsageSummary } from '@/lib/usage-analytics'
import { calculateTokenCost, formatCost } from '@/lib/ai-cost-calculator'

export default async function UsageAnalyticsTestPage() {
  const adminUser = await requireAdminAuth()
  
  // Test the analytics functions
  const testResults = []
  
  try {
    // Test 1: Get usage records
    const { records, totalCount } = await getUsageRecords({}, 10, 0)
    testResults.push({
      test: 'Get Usage Records',
      status: 'PASS',
      result: `Found ${totalCount} total records, showing ${records.length}`
    })
  } catch (error) {
    testResults.push({
      test: 'Get Usage Records',
      status: 'FAIL',
      result: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  try {
    // Test 2: Get usage summary
    const summary = await getUsageSummary({})
    testResults.push({
      test: 'Get Usage Summary',
      status: 'PASS',
      result: `Total requests: ${summary.totalRequests}, Total cost: ${formatCost(summary.totalCostUsd)}`
    })
  } catch (error) {
    testResults.push({
      test: 'Get Usage Summary',
      status: 'FAIL',
      result: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  try {
    // Test 3: Cost calculation
    const cost = calculateTokenCost('openai', 'gpt-4o-mini', {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150
    })
    testResults.push({
      test: 'Cost Calculation',
      status: 'PASS',
      result: `100 input + 50 output tokens = ${formatCost(cost.totalCost)}`
    })
  } catch (error) {
    testResults.push({
      test: 'Cost Calculation',
      status: 'FAIL',
      result: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  try {
    // Test 4: Filtered records
    const { records: filteredRecords } = await getUsageRecords({
      framework: 'hybrid'
    }, 10, 0)
    testResults.push({
      test: 'Filtered Records (hybrid framework)',
      status: 'PASS',
      result: `Found ${filteredRecords.length} hybrid framework records`
    })
  } catch (error) {
    testResults.push({
      test: 'Filtered Records',
      status: 'FAIL',
      result: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Usage Analytics Test</h1>
        <p className="text-gray-600 mt-1">
          Testing the AI usage analytics system functionality.
        </p>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {testResults.map((test, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                  test.status === 'PASS' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">{test.test}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      test.status === 'PASS' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{test.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {testResults.filter(t => t.status === 'PASS').length}
              </div>
              <div className="text-sm text-gray-600">Tests Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {testResults.filter(t => t.status === 'FAIL').length}
              </div>
              <div className="text-sm text-gray-600">Tests Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((testResults.filter(t => t.status === 'PASS').length / testResults.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-4">
        <a
          href="/admin/usage-analytics"
          className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          📊 View Analytics Dashboard
        </a>
        <a
          href="/admin"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          🏠 Back to Admin Dashboard
        </a>
      </div>
    </div>
  )
}
