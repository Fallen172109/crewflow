'use client'

import { useState } from 'react'

interface AdminUsersFiltersProps {
  onFiltersChange?: (filters: {
    role: string
    subscription: string
    status: string
    dateRange: string
  }) => void
}

export function AdminUsersFilters({ onFiltersChange }: AdminUsersFiltersProps) {
  const [filters, setFilters] = useState({
    role: 'all',
    subscription: 'all',
    status: 'all',
    dateRange: '30d'
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      role: 'all',
      subscription: 'all',
      status: 'all',
      dateRange: '30d'
    }
    setFilters(clearedFilters)
    onFiltersChange?.(clearedFilters)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">🔍 Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Role Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            🛡️ Role
          </label>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Roles</option>
            <option value="user">👤 Users</option>
            <option value="admin">🛡️ Admins</option>
          </select>
        </div>

        {/* Subscription Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            ⚓ Subscription
          </label>
          <select
            value={filters.subscription}
            onChange={(e) => handleFilterChange('subscription', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Plans</option>
            <option value="free">⚓ Free</option>
            <option value="starter">🚤 Starter</option>
            <option value="professional">⛵ Professional</option>
            <option value="enterprise">🚢 Enterprise</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            📊 Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">✅ Active</option>
            <option value="inactive">⏸️ Inactive</option>
            <option value="cancelled">❌ Cancelled</option>
            <option value="past_due">⚠️ Past Due</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            📅 Joined
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {Object.values(filters).some(value => value !== 'all' && value !== '30d') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-xs text-gray-600">Active filters:</span>
            {filters.role !== 'all' && (
              <span className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded border border-orange-200">
                Role: {filters.role}
              </span>
            )}
            {filters.subscription !== 'all' && (
              <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200">
                Plan: {filters.subscription}
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-200">
                Status: {filters.status}
              </span>
            )}
            {filters.dateRange !== '30d' && (
              <span className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200">
                Period: {filters.dateRange}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Default export for easier importing
export default AdminUsersFilters
