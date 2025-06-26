'use client'

interface AdminAnalyticsMetricsProps {
  analytics: any
}

export function AdminAnalyticsMetrics({ analytics }: AdminAnalyticsMetricsProps) {
  const stats = analytics?.stats || {}
  
  const metrics = [
    {
      title: 'Total Users',
      value: stats.total_users || 0,
      change: stats.users_growth_30d ? `${stats.users_growth_30d > 0 ? '+' : ''}${stats.users_growth_30d}%` : '0%',
      changeType: (stats.users_growth_30d || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '👥',
      description: 'Total registered users'
    },
    {
      title: 'Active Subscribers',
      value: stats.active_subscribers || 0,
      change: stats.subscribers_growth_30d ? `${stats.subscribers_growth_30d > 0 ? '+' : ''}${stats.subscribers_growth_30d}%` : '0%',
      changeType: (stats.subscribers_growth_30d || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '💳',
      description: 'Paying customers'
    },
    {
      title: 'API Requests (30d)',
      value: stats.requests_30d || 0,
      change: stats.requests_growth_30d ? `${stats.requests_growth_30d > 0 ? '+' : ''}${stats.requests_growth_30d}%` : '0%',
      changeType: (stats.requests_growth_30d || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '🔄',
      description: 'Total API calls this month'
    },
    {
      title: 'Active Users (7d)',
      value: stats.active_users_7d || 0,
      change: stats.active_users_growth_7d ? `${stats.active_users_growth_7d > 0 ? '+' : ''}${stats.active_users_growth_7d}%` : '0%',
      changeType: (stats.active_users_growth_7d || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '📈',
      description: 'Weekly active users'
    },
    {
      title: 'Active Users (7d)',
      value: stats.active_users_7d || 0,
      change: '0%', // Would need historical data to calculate
      changeType: 'neutral' as const,
      icon: '⚡',
      description: 'Users active in last 7 days'
    },
    {
      title: 'Success Rate',
      value: stats.success_rate ? `${stats.success_rate}%` : '0%',
      change: '0%', // Would need historical data to calculate
      changeType: 'neutral' as const,
      icon: '✅',
      description: 'Overall system success rate'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{metric.icon}</span>
                <h3 className="text-sm font-medium text-gray-700">{metric.title}</h3>
              </div>

              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </p>
                <span className={`text-sm font-semibold ${
                  metric.changeType === 'positive' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {metric.change}
                </span>
              </div>

              <p className="text-xs text-gray-600 mt-1">{metric.description}</p>
            </div>
          </div>

          {/* Mini trend indicator */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  metric.changeType === 'positive' ? 'bg-green-600' : 'bg-red-600'
                }`}
                style={{ width: '65%' }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
