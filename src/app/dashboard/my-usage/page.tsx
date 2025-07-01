'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { calculateTokenCost } from '@/lib/ai-cost-calculator'
import RealUsageTest from '@/components/dashboard/RealUsageTest'
import { supabase } from '@/lib/supabase'

export default function MyUsagePage() {
  const { user, loading } = useAuth()
  const [usageData, setUsageData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/signin'
      return
    }

    if (user) {
      loadUsageData()
    }
  }, [user, loading])

  const loadUsageData = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_usage_detailed')
        .select('*')
        .eq('user_id', user!.id)
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) throw error
      setUsageData(data || [])
    } catch (error) {
      console.error('Error loading usage data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading usage data...</p>
        </div>
      </div>
    )
  }

  // Calculate totals
  const totalCost = usageData.reduce((sum, record) => sum + parseFloat(record.cost_usd || '0'), 0)
  const totalTokens = usageData.reduce((sum, record) => sum + (record.input_tokens || 0) + (record.output_tokens || 0), 0)
  const totalRequests = usageData.length

  // Get usage by agent
  const usageByAgent = usageData.reduce((acc, record) => {
    const agent = record.agent_name
    if (!acc[agent]) {
      acc[agent] = {
        requests: 0,
        cost: 0,
        tokens: 0
      }
    }
    acc[agent].requests += 1
    acc[agent].cost += parseFloat(record.cost_usd || '0')
    acc[agent].tokens += (record.input_tokens || 0) + (record.output_tokens || 0)
    return acc
  }, {} as Record<string, { requests: number; cost: number; tokens: number }>)

  // Get usage by provider with enhanced statistics
  const usageByProvider = usageData.reduce((acc, record) => {
    const provider = record.provider
    if (!acc[provider]) {
      acc[provider] = {
        requests: 0,
        cost: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        avgResponseTime: 0,
        successRate: 0,
        successfulRequests: 0
      }
    }
    acc[provider].requests += 1
    acc[provider].cost += parseFloat(record.cost_usd || '0')
    acc[provider].tokens += (record.input_tokens || 0) + (record.output_tokens || 0)
    acc[provider].inputTokens += (record.input_tokens || 0)
    acc[provider].outputTokens += (record.output_tokens || 0)
    acc[provider].avgResponseTime += (record.response_time_ms || 0)
    if (record.success) {
      acc[provider].successfulRequests += 1
    }
    return acc
  }, {} as Record<string, {
    requests: number;
    cost: number;
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    avgResponseTime: number;
    successRate: number;
    successfulRequests: number;
  }>) || {}

  // Calculate averages and percentages for providers
  Object.keys(usageByProvider).forEach(provider => {
    const data = usageByProvider[provider]
    data.avgResponseTime = data.requests > 0 ? Math.round(data.avgResponseTime / data.requests) : 0
    data.successRate = data.requests > 0 ? Math.round((data.successfulRequests / data.requests) * 100) : 0
  })

  // Find most expensive provider
  const mostExpensiveProvider = Object.entries(usageByProvider)
    .sort(([,a], [,b]) => b.cost - a.cost)[0]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">My AI Usage</h1>
        <p className="text-gray-600 mt-1">
          Track your personal AI agent usage, costs, and token consumption
        </p>
        {totalCost > 0 ? (
          <div className="mt-3 flex items-center space-x-4 text-sm">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              💰 Total Spent: ${totalCost.toFixed(4)}
            </span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              🔢 {totalTokens.toLocaleString()} tokens used
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              📊 {totalRequests} requests made
            </span>
            {mostExpensiveProvider && (
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                🏆 Most used: {mostExpensiveProvider[0]} (${mostExpensiveProvider[1].cost.toFixed(4)})
              </span>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
              💡 No usage data yet - start using AI agents to see real costs and analytics
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalCost.toFixed(4)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tokens</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalTokens.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">🔢</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRequests.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Providers Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(usageByProvider).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">🔗</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost by Provider - Highlighted Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-2">💰</span>
          Total Cost by AI Provider
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(usageByProvider)
            .sort(([,a], [,b]) => b.cost - a.cost) // Sort by cost descending
            .map(([provider, stats]) => {
              const costPercentage = totalCost > 0 ? (stats.cost / totalCost) * 100 : 0
              return (
                <div key={provider} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 capitalize flex items-center">
                      {provider === 'openai' && '🤖'}
                      {provider === 'anthropic' && '🧠'}
                      {provider === 'perplexity' && '🔍'}
                      {provider === 'google' && '🌐'}
                      <span className="ml-2">{provider}</span>
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {costPercentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Cost:</span>
                      <span className="font-semibold text-lg text-green-600">
                        ${stats.cost.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Requests:</span>
                      <span className="font-medium">{stats.requests.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Tokens:</span>
                      <span className="font-medium">{stats.tokens.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Avg Response:</span>
                      <span className="font-medium">{stats.avgResponseTime}ms</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className={`font-medium ${stats.successRate >= 95 ? 'text-green-600' : stats.successRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {stats.successRate}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Cost/Request:</span>
                      <span className="font-medium text-blue-600">
                        ${(stats.cost / stats.requests).toFixed(6)}
                      </span>
                    </div>
                  </div>

                  {/* Cost percentage bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${costPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {Object.keys(usageByProvider).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-6xl mb-4 block">🚀</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Real Usage Data Yet</h3>
            <p className="text-gray-600 mb-4">Start using AI agents to see real cost breakdowns by provider.</p>
            <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
              <h4 className="font-medium text-blue-900 mb-2">How to Generate Real Data:</h4>
              <div className="text-sm text-blue-700 space-y-1 text-left">
                <p>• Use the <strong>Coral agent</strong> (customer support) - ✅ Real tracking enabled</p>
                <p>• Chat with agents in the dashboard</p>
                <p>• Use preset actions</p>
                <p>• Real token usage and costs will be tracked automatically</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage by Agent */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage by Agent</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost/Request
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(usageByAgent).map(([agent, stats]) => (
                <tr key={agent}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {agent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${stats.cost.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(stats.cost / stats.requests).toFixed(6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Usage by Provider */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Usage by AI Provider</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost/Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(usageByProvider).map(([provider, stats]) => (
                <tr key={provider}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                    {provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${stats.cost.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(stats.cost / stats.requests).toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`font-medium ${stats.successRate >= 95 ? 'text-green-600' : stats.successRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stats.successRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Usage Test Component */}
      <RealUsageTest />

      {/* Recent Usage Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Usage Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Input Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageData?.slice(0, 20).map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.agent_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {record.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.message_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.input_tokens?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.output_tokens?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${parseFloat(record.cost_usd || '0').toFixed(6)}
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
