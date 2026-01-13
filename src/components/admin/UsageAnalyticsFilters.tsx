'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UsageAnalyticsFilters as FilterType } from '@/lib/usage-analytics'

interface UsageAnalyticsFiltersProps {
  currentFilters: FilterType
}

export function UsageAnalyticsFilters({ currentFilters }: UsageAnalyticsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<FilterType>(currentFilters)
  const [isLoading, setIsLoading] = useState(false)

  // Predefined filter options
  const frameworks = ['langchain', 'perplexity', 'autogen', 'hybrid']
  const providers = ['openai', 'anthropic', 'perplexity', 'google']
  const messageTypes = ['chat', 'preset_action', 'tool_execution']

  // Quick date range presets
  const datePresets = [
    { label: 'Last 24 hours', value: 'last_24h' },
    { label: 'Last 7 days', value: 'last_7d' },
    { label: 'Last 30 days', value: 'last_30d' },
    { label: 'Last 90 days', value: 'last_90d' },
    { label: 'Custom range', value: 'custom' }
  ]

  const [selectedDatePreset, setSelectedDatePreset] = useState('custom')

  // Handle date preset changes
  const handleDatePresetChange = (preset: string) => {
    setSelectedDatePreset(preset)
    
    const now = new Date()
    let startDate = ''
    let endDate = now.toISOString().split('T')[0]

    switch (preset) {
      case 'last_24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'last_7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'last_30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'last_90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'custom':
        return // Don't auto-set dates for custom
    }

    if (preset !== 'custom') {
      setFilters(prev => ({
        ...prev,
        startDate,
        endDate
      }))
    }
  }

  // Apply filters
  const applyFilters = () => {
    setIsLoading(true)
    
    const params = new URLSearchParams(searchParams.toString())
    
    // Clear existing filter params
    params.delete('startDate')
    params.delete('endDate')
    params.delete('userId')
    params.delete('agentId')
    params.delete('framework')
    params.delete('provider')
    params.delete('messageType')
    params.delete('page') // Reset to first page when filtering

    // Add new filter params
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        params.set(key, value)
      }
    })

    router.push(`/admin/usage-analytics?${params.toString()}`)
    setIsLoading(false)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setSelectedDatePreset('custom')
    router.push('/admin/usage-analytics')
  }

  // Export filtered data
  const exportData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.set(key, value)
        }
      })
      params.set('export', 'csv')
      params.set('limit', '10000') // Export more records

      const response = await fetch(`/api/admin/usage-analytics/export?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `usage-analytics-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Range Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleDatePresetChange(preset.value)}
              className={`px-3 py-1 text-sm rounded-lg border ${
                selectedDatePreset === preset.value
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      {selectedDatePreset === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
      )}

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Email
          </label>
          <input
            type="text"
            placeholder="user@example.com"
            value={filters.userId || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agent
          </label>
          <input
            type="text"
            placeholder="anchor, pearl, etc."
            value={filters.agentId || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, agentId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Framework
          </label>
          <select
            value={filters.framework || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, framework: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Frameworks</option>
            {frameworks.map((framework) => (
              <option key={framework} value={framework}>
                {framework.charAt(0).toUpperCase() + framework.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider
          </label>
          <select
            value={filters.provider || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Providers</option>
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Request Type
          </label>
          <select
            value={filters.messageType || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, messageType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Types</option>
            {messageTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <button
            onClick={applyFilters}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Applying...' : '🔍 Apply Filters'}
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            🗑️ Clear All
          </button>
        </div>
        
        <button
          onClick={exportData}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Exporting...' : '📥 Export CSV'}
        </button>
      </div>
    </div>
  )
}
