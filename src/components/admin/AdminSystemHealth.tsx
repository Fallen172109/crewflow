'use client'

import { useState, useEffect } from 'react'

export function AdminSystemHealth() {
  const [healthData, setHealthData] = useState({
    database: { status: 'healthy', responseTime: 45 },
    api: { status: 'healthy', responseTime: 120 },
    agents: { status: 'healthy', activeAgents: 10 },
    storage: { status: 'healthy', usage: 68 }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-100 border-green-200'
      case 'warning':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200'
      case 'error':
        return 'text-red-700 bg-red-100 border-red-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return '❓'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">⚙️ System Health</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Database Health */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{getStatusIcon(healthData.database.status)}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">🗄️ Database</p>
              <p className="text-xs text-gray-600">Response time: {healthData.database.responseTime}ms</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(healthData.database.status)}`}>
            {healthData.database.status}
          </span>
        </div>

        {/* API Health */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{getStatusIcon(healthData.api.status)}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">🔌 API Services</p>
              <p className="text-xs text-gray-600">Response time: {healthData.api.responseTime}ms</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(healthData.api.status)}`}>
            {healthData.api.status}
          </span>
        </div>

        {/* AI Agents Health */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{getStatusIcon(healthData.agents.status)}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">🤖 AI Agents</p>
              <p className="text-xs text-gray-600">{healthData.agents.activeAgents}/10 agents active</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(healthData.agents.status)}`}>
            {healthData.agents.status}
          </span>
        </div>

        {/* Storage Health */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{getStatusIcon(healthData.storage.status)}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">💾 Storage</p>
              <p className="text-xs text-gray-600">{healthData.storage.usage}% used</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(healthData.storage.status)}`}>
            {healthData.storage.status}
          </span>
        </div>
      </div>

      {/* System Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex space-x-2">
          <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
            🔍 Run Diagnostics
          </button>
          <button className="flex-1 px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded hover:bg-orange-600">
            📋 View Logs
          </button>
        </div>
      </div>
    </div>
  )
}

// Default export for easier importing
export default AdminSystemHealth
