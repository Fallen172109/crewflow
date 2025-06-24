'use client'

interface AdminAnalyticsChartsProps {
  analytics: any
}

export function AdminAnalyticsCharts({ analytics }: AdminAnalyticsChartsProps) {
  // Mock chart data - in real implementation, this would come from analytics
  const chartData = {
    users: [
      { date: '2024-01-01', value: 120 },
      { date: '2024-01-02', value: 135 },
      { date: '2024-01-03', value: 148 },
      { date: '2024-01-04', value: 162 },
      { date: '2024-01-05', value: 178 },
      { date: '2024-01-06', value: 195 },
      { date: '2024-01-07', value: 210 }
    ],
    revenue: [
      { date: '2024-01-01', value: 8500 },
      { date: '2024-01-02', value: 9200 },
      { date: '2024-01-03', value: 9800 },
      { date: '2024-01-04', value: 10500 },
      { date: '2024-01-05', value: 11200 },
      { date: '2024-01-06', value: 11800 },
      { date: '2024-01-07', value: 12450 }
    ]
  }

  return (
    <div className="space-y-6">
      {/* User Growth Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">User Growth</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded">
                7D
              </button>
              <button className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                30D
              </button>
              <button className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                90D
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Simple chart representation */}
          <div className="h-64 flex items-end space-x-2">
            {chartData.users.map((point, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-orange-500 rounded-t"
                  style={{ 
                    height: `${(point.value / Math.max(...chartData.users.map(p => p.value))) * 200}px` 
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(point.date).getDate()}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Total Users: {chartData.users[chartData.users.length - 1].value}</span>
            <span className="text-green-600 font-medium">
              +{((chartData.users[chartData.users.length - 1].value - chartData.users[0].value) / chartData.users[0].value * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">MRR</span>
              <span className="text-lg font-bold text-gray-900">
                ${chartData.revenue[chartData.revenue.length - 1].value.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Simple revenue chart */}
          <div className="h-64 flex items-end space-x-2">
            {chartData.revenue.map((point, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-green-500 rounded-t"
                  style={{ 
                    height: `${(point.value / Math.max(...chartData.revenue.map(p => p.value))) * 200}px` 
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(point.date).getDate()}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Monthly Growth</span>
            <span className="text-green-600 font-medium">
              +{((chartData.revenue[chartData.revenue.length - 1].value - chartData.revenue[0].value) / chartData.revenue[0].value * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
