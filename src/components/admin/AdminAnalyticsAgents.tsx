'use client'

interface AdminAnalyticsAgentsProps {
  analytics: any
}

export function AdminAnalyticsAgents({ analytics }: AdminAnalyticsAgentsProps) {
  // Real agent data - currently no agents have real usage data
  const agentData = [
    {
      name: 'Coral',
      description: 'Customer Support',
      usage: 0, // Will show real usage when data is available
      growth: '0%',
      status: 'ready', // Ready for real tracking
      framework: 'LangChain'
    }
    // Other agents will appear here when they have real usage data
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'ready':
        return 'bg-blue-100 text-blue-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getFrameworkColor = (framework: string) => {
    switch (framework) {
      case 'LangChain':
        return 'bg-blue-100 text-blue-800'
      case 'AutoGen':
        return 'bg-purple-100 text-purple-800'
      case 'Perplexity':
        return 'bg-orange-100 text-orange-800'
      case 'Hybrid':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const totalUsage = agentData.reduce((sum, agent) => sum + agent.usage, 0)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Agent Performance</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Total Requests</span>
            <span className="text-lg font-bold text-gray-900">
              {totalUsage.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {agentData.map((agent, index) => (
            <div key={agent.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-semibold text-sm">
                    {agent.name.charAt(0)}
                  </span>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900">{agent.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{agent.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getFrameworkColor(agent.framework)}`}>
                      {agent.framework}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {agent.usage.toLocaleString()}
                  </span>
                  <span className="text-xs text-green-600 font-medium">
                    {agent.growth}
                  </span>
                </div>
                <p className="text-xs text-gray-500">requests this month</p>
                
                {/* Usage bar */}
                <div className="w-20 bg-gray-200 rounded-full h-1 mt-2">
                  <div 
                    className="bg-orange-500 h-1 rounded-full"
                    style={{ width: `${(agent.usage / Math.max(...agentData.map(a => a.usage))) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{agentData.length}</div>
              <div className="text-xs text-gray-500">Active Agents</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {agentData.filter(a => a.status === 'ready' || a.status === 'healthy').length}
              </div>
              <div className="text-xs text-gray-500">Ready/Healthy</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">
                {(totalUsage / agentData.length).toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">Avg Requests</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
