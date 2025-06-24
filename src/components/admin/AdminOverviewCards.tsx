'use client'

interface AdminOverviewCardsProps {
  analytics: any
}

export function AdminOverviewCards({ analytics }: AdminOverviewCardsProps) {
  const stats = analytics?.stats || {}
  
  const cards = [
    {
      title: 'Total Users',
      value: stats.total_users || 0,
      change: '+12%',
      changeType: 'positive' as const,
      icon: '👥',
      description: 'Registered users'
    },
    {
      title: 'Active Subscribers',
      value: stats.active_subscribers || 0,
      change: '+8%',
      changeType: 'positive' as const,
      icon: '💳',
      description: 'Paying customers'
    },
    {
      title: 'API Requests (30d)',
      value: stats.requests_30d || 0,
      change: '+23%',
      changeType: 'positive' as const,
      icon: '🔄',
      description: 'Total API calls'
    },
    {
      title: 'Active Users (7d)',
      value: stats.active_users_7d || 0,
      change: '+5%',
      changeType: 'positive' as const,
      icon: '📈',
      description: 'Weekly active users'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-secondary-800 rounded-xl border border-secondary-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-400">{card.title}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <span className="text-primary-400 text-xl">{card.icon}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className={`text-sm font-medium ${
                card.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
              }`}>
                {card.change}
              </span>
              <span className="text-sm text-secondary-400 ml-1">vs last month</span>
            </div>
          </div>

          <p className="text-xs text-secondary-400 mt-2">{card.description}</p>
        </div>
      ))}
    </div>
  )
}

// Default export for easier importing
export default AdminOverviewCards
