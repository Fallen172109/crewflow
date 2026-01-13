'use client'

import { useState, useEffect } from 'react'
import { AdminUser } from '@/lib/admin-auth'

interface AuditLogEntry {
  id: string
  admin_id: string
  action: string
  action_type: string
  target_user_id: string | null
  target_user_email: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  success: boolean
  error_message: string | null
  created_at: string
  admin?: { email: string }
  target_user?: { email: string }
}

interface AdminAuditLogProps {
  adminUser: AdminUser
}

export function AdminAuditLog({ adminUser }: AdminAuditLogProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    action_type: 'all',
    action: '',
    start_date: '',
    end_date: '',
    success: 'all',
    page: 1,
    limit: 50
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  const fetchAuditLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs')
      }

      setAuditLogs(data.auditLogs)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'SECURITY_ACTION':
        return 'bg-red-100 text-red-800'
      case 'USER_MANAGEMENT':
        return 'bg-blue-100 text-blue-800'
      case 'SUBSCRIPTION_MANAGEMENT':
        return 'bg-purple-100 text-purple-800'
      case 'SYSTEM_ACCESS':
        return 'bg-green-100 text-green-800'
      case 'DATA_EXPORT':
        return 'bg-yellow-100 text-yellow-800'
      case 'CONFIGURATION_CHANGE':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('SUSPEND')) return '🚫'
    if (action.includes('UNSUSPEND')) return '✅'
    if (action.includes('DELETE')) return '🗑️'
    if (action.includes('UPDATE')) return '✏️'
    if (action.includes('VIEW')) return '👁️'
    if (action.includes('PROMOTE')) return '⬆️'
    if (action.includes('LOGIN')) return '🔐'
    return '📝'
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Admin Audit Log</h2>
          <button
            onClick={fetchAuditLogs}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={filters.action_type}
              onChange={(e) => handleFilterChange('action_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Types</option>
              <option value="SECURITY_ACTION">Security Actions</option>
              <option value="USER_MANAGEMENT">User Management</option>
              <option value="SUBSCRIPTION_MANAGEMENT">Subscription Management</option>
              <option value="SYSTEM_ACCESS">System Access</option>
              <option value="DATA_EXPORT">Data Export</option>
              <option value="CONFIGURATION_CHANGE">Configuration Changes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              placeholder="Search actions..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.success}
              onChange={(e) => handleFilterChange('success', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Loading audit logs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchAuditLogs}
              className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600"
            >
              Try Again
            </button>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-400 text-xl">📊</span>
            </div>
            <p className="text-sm text-gray-500">No audit logs found</p>
          </div>
        ) : (
          auditLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">{getActionIcon(log.action)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getActionTypeColor(log.action_type)}`}>
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                      {!log.success && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          FAILED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Admin:</span> {log.admin?.email || 'Unknown'}
                    {log.target_user_email && (
                      <>
                        <span className="mx-2">→</span>
                        <span className="font-medium">Target:</span> {log.target_user_email}
                      </>
                    )}
                  </div>

                  {log.error_message && (
                    <div className="text-xs text-red-600 mb-2">
                      <span className="font-medium">Error:</span> {log.error_message}
                    </div>
                  )}

                  {log.ip_address && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">IP:</span> {log.ip_address}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleFilterChange('page', pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-900">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handleFilterChange('page', pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
