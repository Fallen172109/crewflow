'use client'

interface AdminOverviewCardsProps {
  analytics: any
}

export function AdminOverviewCards({ analytics }: AdminOverviewCardsProps) {
  const stats = analytics?.stats || {}
  
  // Helper function to format growth percentage
  const formatGrowth = (growth: number | null | undefined) => {
    if (growth === null || growth === undefined || growth === 0) return '0%'
    const sign = growth > 0 ? '+' : ''
    return `${sign}${growth}%`
  }

  // Helper function to determine change type
  const getChangeType = (growth: number | null | undefined) => {
    if (growth === null || growth === undefined) return 'neutral' as const
    return growth >= 0 ? 'positive' as const : 'negative' as const
  }

  const cards = [
    {
      title: 'Total Users',
      value: stats.total_users || 0,
      change: formatGrowth(stats.users_growth_30d),
      changeType: getChangeType(stats.users_growth_30d),
      icon: '👥',
      description: 'Registered users'
    },
    {
      title: 'Active Subscribers',
      value: stats.active_subscribers || 0,
      change: formatGrowth(stats.subscribers_growth_30d),
      changeType: getChangeType(stats.subscribers_growth_30d),
      icon: '💳',
      description: 'Paying customers'
    },
    {
      title: 'API Requests (30d)',
      value: stats.requests_30d || 0,
      change: formatGrowth(stats.requests_growth_30d),
      changeType: getChangeType(stats.requests_growth_30d),
      icon: '🔄',
      description: 'Total API calls'
    },
    {
      title: 'Active Users (7d)',
      value: stats.active_users_7d || 0,
      change: formatGrowth(stats.active_users_growth_7d),
      changeType: getChangeType(stats.active_users_growth_7d),
      icon: '📈',
      description: 'Weekly active users'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">{card.icon}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className={`text-sm font-semibold ${
                card.changeType === 'positive' ? 'text-green-700' :
                card.changeType === 'negative' ? 'text-red-700' : 'text-gray-600'
              }`}>
                {card.change}
              </span>
              <span className="text-sm text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-2">{card.description}</p>
        </div>
      ))}
    </div>
  )
}

// Default export for easier importing
export default AdminOverviewCards
