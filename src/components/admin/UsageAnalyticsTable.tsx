'use client'

import { UsageRecord } from '@/lib/usage-analytics'
import { formatCost } from '@/lib/ai-cost-calculator'

interface UsageAnalyticsTableProps {
  records: UsageRecord[]
}

export function UsageAnalyticsTable({ records }: UsageAnalyticsTableProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getFrameworkColor = (framework: string) => {
    switch (framework.toLowerCase()) {
      case 'langchain':
        return 'bg-blue-100 text-blue-800'
      case 'perplexity':
        return 'bg-purple-100 text-purple-800'
      case 'autogen':
        return 'bg-green-100 text-green-800'
      case 'hybrid':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'bg-emerald-100 text-emerald-800'
      case 'anthropic':
        return 'bg-indigo-100 text-indigo-800'
      case 'perplexity':
        return 'bg-purple-100 text-purple-800'
      case 'google':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'chat':
        return '💬'
      case 'preset_action':
        return '⚡'
      case 'tool_execution':
        return '🔧'
      default:
        return '❓'
    }
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No usage data found</h3>
        <p className="text-gray-500">
          Try adjusting your filters or check back later when there's more activity.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Agent
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Framework
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tokens
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cost
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Response Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatTimestamp(record.timestamp)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {record.user_email}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {record.agent_name}
                </div>
                <div className="text-xs text-gray-500">
                  {record.agent_id}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFrameworkColor(record.framework)}`}>
                  {record.framework}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProviderColor(record.provider)}`}>
                  {record.provider}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    {getMessageTypeIcon(record.message_type)}
                  </span>
                  <span className="text-xs text-gray-600 capitalize">
                    {record.message_type.replace('_', ' ')}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {record.total_tokens.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {record.input_tokens}↗ {record.output_tokens}↘
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCost(record.cost_usd)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.response_time_ms.toLocaleString()}ms
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {record.success ? (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    ✅ Success
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    ❌ Failed
                  </span>
                )}
                {record.error_message && (
                  <div className="text-xs text-red-600 mt-1 truncate max-w-xs" title={record.error_message}>
                    {record.error_message}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Compact version for smaller displays
export function UsageAnalyticsTableCompact({ records }: UsageAnalyticsTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-2">📊</div>
        <p className="text-gray-500 text-sm">No usage data found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-900">
              {record.agent_name}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimestamp(record.timestamp)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">User:</span>
              <div className="font-medium">{record.user_email}</div>
            </div>
            <div>
              <span className="text-gray-500">Framework:</span>
              <div className="font-medium capitalize">{record.framework}</div>
            </div>
            <div>
              <span className="text-gray-500">Tokens:</span>
              <div className="font-medium">{record.total_tokens.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-500">Cost:</span>
              <div className="font-medium">{formatCost(record.cost_usd)}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProviderColor(record.provider)}`}>
                {record.provider}
              </span>
              <span className="text-xs text-gray-500">
                {record.response_time_ms}ms
              </span>
            </div>
            <div>
              {record.success ? (
                <span className="text-green-600 text-xs">✅ Success</span>
              ) : (
                <span className="text-red-600 text-xs">❌ Failed</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
