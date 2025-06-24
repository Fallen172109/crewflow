'use client'

interface AdminAnalyticsMetricsProps {
  analytics: any
}

export function AdminAnalyticsMetrics({ analytics }: AdminAnalyticsMetricsProps) {
  const stats = analytics?.stats || {}
  
  const metrics = [
    {
      title: 'Total Revenue',
      value: '$12,450',
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: '💰',
      description: 'Monthly recurring revenue'
    },
    {
      title: 'Active Users',
      value: stats.active_users_7d || 0,
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: '👥',
      description: 'Weekly active users'
    },
    {
      title: 'API Requests',
      value: stats.requests_30d || 0,
      change: '+23.1%',
      changeType: 'positive' as const,
      icon: '🔄',
      description: 'Total API calls this month'
    },
    {
      title: 'Conversion Rate',
      value: '3.2%',
      change: '+0.8%',
      changeType: 'positive' as const,
      icon: '📈',
      description: 'Free to paid conversion'
    },
    {
      title: 'Avg Session Time',
      value: '24m 32s',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: '⏱️',
      description: 'Average user session duration'
    },
    {
      title: 'Support Tickets',
      value: '18',
      change: '-25.0%',
      changeType: 'positive' as const,
      icon: '🎫',
      description: 'Open support tickets'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{metric.icon}</span>
                <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
              </div>
              
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </p>
                <span className={`text-sm font-medium ${
                  metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
              </div>
              
              <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
            </div>
          </div>
          
          {/* Mini trend indicator */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full ${
                  metric.changeType === 'positive' ? 'bg-green-500' : 'bg-red-500'
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
