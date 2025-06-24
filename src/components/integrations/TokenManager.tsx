'use client'

// Token Manager Component
// Dashboard for monitoring and managing OAuth token lifecycle

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react'

interface TokenStats {
  total: number
  active: number
  expired: number
  expiringSoon: number
  refreshed: number
  failed: number
}

interface HealthStatus {
  serviceRunning: boolean
  lastCycleStats: TokenStats
  nextMaintenance: Date | null
  issues: string[]
}

interface TokenManagerProps {
  className?: string
}

export default function TokenManager({ className = '' }: TokenManagerProps) {
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [serviceControlling, setServiceControlling] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchTokenInfo = useCallback(async () => {
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        fetch('/api/integrations/tokens?action=stats'),
        fetch('/api/integrations/tokens?action=health')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setHealth(healthData.health)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch token info:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokenInfo()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTokenInfo, 30000)
    return () => clearInterval(interval)
  }, [fetchTokenInfo])

  const forceMaintenanceCycle = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/integrations/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_maintenance' })
      })

      if (response.ok) {
        await fetchTokenInfo()
      }
    } catch (error) {
      console.error('Failed to force maintenance cycle:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const controlService = async (action: 'start' | 'stop' | 'restart') => {
    setServiceControlling(true)
    try {
      const response = await fetch('/api/integrations/tokens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, intervalMinutes: 15 })
      })

      if (response.ok) {
        await fetchTokenInfo()
      }
    } catch (error) {
      console.error(`Failed to ${action} service:`, error)
    } finally {
      setServiceControlling(false)
    }
  }

  const getSuccessRate = () => {
    if (!stats || stats.refreshed + stats.failed === 0) return 0
    return Math.round((stats.refreshed / (stats.refreshed + stats.failed)) * 100)
  }

  const getHealthColor = () => {
    if (!health) return 'text-gray-500'
    if (!health.serviceRunning) return 'text-red-500'
    if (health.issues.length > 0) return 'text-yellow-500'
    return 'text-green-500'
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Token Management</h3>
            <p className="text-sm text-gray-600">
              Automated OAuth token refresh and lifecycle management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 ${getHealthColor()}`}>
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">
                {health?.serviceRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <button
              onClick={fetchTokenInfo}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Tokens</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active</p>
                  <p className="text-2xl font-bold text-green-900">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.expiringSoon}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Expired</p>
                  <p className="text-2xl font-bold text-red-900">{stats.expired}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* Service Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Service Status</h4>
            <div className="flex space-x-2">
              {health?.serviceRunning ? (
                <>
                  <button
                    onClick={() => controlService('restart')}
                    disabled={serviceControlling}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restart</span>
                  </button>
                  <button
                    onClick={() => controlService('stop')}
                    disabled={serviceControlling}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    <Pause className="w-3 h-3" />
                    <span>Stop</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => controlService('start')}
                  disabled={serviceControlling}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>Start</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Status</p>
              <p className={`font-medium ${getHealthColor()}`}>
                {health?.serviceRunning ? 'Running' : 'Stopped'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Next Maintenance</p>
              <p className="font-medium text-gray-900">
                {health?.nextMaintenance 
                  ? new Date(health.nextMaintenance).toLocaleTimeString()
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <p className="text-gray-600">Success Rate</p>
              <p className="font-medium text-gray-900">{getSuccessRate()}%</p>
            </div>
          </div>

          {health?.issues && health.issues.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Issues Detected</p>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    {health.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={forceMaintenanceCycle}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {refreshing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>{refreshing ? 'Running...' : 'Force Maintenance'}</span>
          </button>

          {stats && (stats.refreshed > 0 || stats.failed > 0) && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>{stats.refreshed} refreshed</span>
              </div>
              {stats.failed > 0 && (
                <div className="flex items-center space-x-1">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span>{stats.failed} failed</span>
                </div>
              )}
            </div>
          )}
        </div>

        {lastUpdate && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}
