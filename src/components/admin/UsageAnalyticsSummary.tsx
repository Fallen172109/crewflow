'use client'

import { UsageSummary } from '@/lib/usage-analytics'
import { formatCost } from '@/lib/ai-cost-calculator'

interface UsageAnalyticsSummaryProps {
  summary: UsageSummary
}

export function UsageAnalyticsSummary({ summary }: UsageAnalyticsSummaryProps) {
  const summaryCards = [
    {
      title: 'Total Requests',
      value: summary.totalRequests.toLocaleString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: '🔄',
      description: 'AI agent requests'
    },
    {
      title: 'Total Cost',
      value: formatCost(summary.totalCostUsd),
      change: '+8%',
      changeType: 'neutral' as const,
      icon: '💰',
      description: 'Total AI spending'
    },
    {
      title: 'Total Tokens',
      value: summary.totalTokens.toLocaleString(),
      change: '+15%',
      changeType: 'positive' as const,
      icon: '🎯',
      description: 'Tokens processed'
    },
    {
      title: 'Success Rate',
      value: `${summary.successRate.toFixed(1)}%`,
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: '✅',
      description: 'Request success rate'
    },
    {
      title: 'Avg Response Time',
      value: `${Math.round(summary.averageResponseTimeMs)}ms`,
      change: '-5%',
      changeType: 'positive' as const,
      icon: '⚡',
      description: 'Average response time'
    },
    {
      title: 'Failed Requests',
      value: summary.failedRequests.toLocaleString(),
      change: '-3%',
      changeType: 'positive' as const,
      icon: '❌',
      description: 'Failed requests'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {summaryCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {card.value}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">{card.icon}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-gray-600">{card.description}</span>
            <span className={`text-xs font-medium ${
              card.changeType === 'positive'
                ? 'text-green-700'
                : card.changeType === 'negative'
                ? 'text-red-700'
                : 'text-gray-700'
            }`}>
              {card.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Token Usage Breakdown Component
export function TokenUsageBreakdown({ summary }: UsageAnalyticsSummaryProps) {
  const inputPercentage = summary.totalTokens > 0
    ? (summary.totalInputTokens / summary.totalTokens) * 100
    : 0
  const outputPercentage = summary.totalTokens > 0
    ? (summary.totalOutputTokens / summary.totalTokens) * 100
    : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage Breakdown</h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800">Input Tokens</span>
            <span className="text-sm font-semibold text-gray-900">
              {summary.totalInputTokens.toLocaleString()} ({inputPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${inputPercentage}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800">Output Tokens</span>
            <span className="text-sm font-semibold text-gray-900">
              {summary.totalOutputTokens.toLocaleString()} ({outputPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${outputPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">Total Tokens</span>
          <span className="text-lg font-bold text-gray-900">
            {summary.totalTokens.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

// Daily Usage Chart Component (simplified)
export function DailyUsageChart({ summary }: UsageAnalyticsSummaryProps) {
  const maxRequests = Math.max(...summary.dailyUsage.map(d => d.requests), 1)
  const maxCost = Math.max(...summary.dailyUsage.map(d => d.cost), 0.01)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Usage Trend</h3>

      <div className="space-y-3">
        {summary.dailyUsage.slice(-7).map((day, index) => {
          const requestsHeight = (day.requests / maxRequests) * 100
          const costHeight = (day.cost / maxCost) * 100

          return (
            <div key={day.date} className="flex items-center space-x-4">
              <div className="w-20 text-xs font-medium text-gray-700">
                {new Date(day.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>

              <div className="flex-1 flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${requestsHeight}%` }}
                  ></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {day.requests}
                  </span>
                </div>

                <div className="w-16 text-xs font-semibold text-gray-700 text-right">
                  {formatCost(day.cost)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
        <span className="font-medium">📊 Requests</span>
        <span className="font-medium">💰 Daily Cost</span>
      </div>
    </div>
  )
}

// Cost by Provider Chart
export function CostByProviderChart({ summary }: UsageAnalyticsSummaryProps) {
  const totalCost = summary.totalCostUsd
  const providers = Object.entries(summary.costByProvider)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai': return 'bg-emerald-600'
      case 'anthropic': return 'bg-indigo-600'
      case 'perplexity': return 'bg-purple-600'
      case 'google': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Provider</h3>

      <div className="space-y-4">
        {providers.map(([provider, cost]) => {
          const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0

          return (
            <div key={provider} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getProviderColor(provider)}`}></div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {provider}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCost(cost)}
                  </div>
                  <div className="text-xs font-medium text-gray-600">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getProviderColor(provider)}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">Total Cost</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCost(totalCost)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Usage by Agent Chart
export function UsageByAgentChart({ summary }: UsageAnalyticsSummaryProps) {
  const totalRequests = summary.totalRequests
  const agents = Object.entries(summary.usageByAgent)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6)

  const getAgentIcon = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case 'anchor': return '⚓'
      case 'pearl': return '🔍'
      case 'splash': return '🌊'
      case 'sage': return '🧙'
      case 'helm': return '🚢'
      case 'flint': return '🔥'
      default: return '🤖'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Agent</h3>

      <div className="space-y-3">
        {agents.map(([agentName, requests]) => {
          const percentage = totalRequests > 0 ? (requests / totalRequests) * 100 : 0

          return (
            <div key={agentName} className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-lg">{getAgentIcon(agentName)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {agentName}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {requests} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
