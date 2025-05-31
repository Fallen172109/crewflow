'use client'

import { useState } from 'react'
import { Agent } from '@/lib/agents'

interface PresetActionsProps {
  agent: Agent
  onExecuteAction: (actionId: string) => void
  isLoading: boolean
}

const iconMap: Record<string, string> = {
  MessageSquare: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  ArrowUp: 'M7 14l5-5 5 5',
  UserCheck: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',
  Heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  BookOpen: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z',
  Target: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  Calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  Search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  TrendingUp: 'M22 7l-8.5 8.5-5-5L1 18',
  Users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',
  FileText: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z',
  PenTool: 'M12 19l7-7 3 3-7 7-3-3z',
  Key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  BarChart: 'M18 20V10M12 20V4M6 20v-6',
  Store: 'M3 21h18M5 21V7l8-4v18M19 21V7l-8-4',
  Package: 'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  DollarSign: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  FileBarChart: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z',
  BarChart3: 'M3 3v18h18',
  Brain: 'M9.5 2A2.5 2.5 0 007 4.5v15A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0014.5 2h-5z',
  Filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z'
}

export default function PresetActions({ agent, onExecuteAction, isLoading }: PresetActionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // Get unique categories from actions
  const categories = ['all', ...Array.from(new Set(agent.presetActions.map(action => action.category)))]
  
  // Filter actions by category
  const filteredActions = selectedCategory === 'all' 
    ? agent.presetActions 
    : agent.presetActions.filter(action => action.category === selectedCategory)

  const getIcon = (iconName: string) => {
    const path = iconMap[iconName] || iconMap.Target
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
      </svg>
    )
  }

  return (
    <div className="bg-secondary-800 rounded-xl border border-secondary-700 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-secondary-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Preset Actions</h3>
            <p className="text-secondary-400 text-sm">
              One-click automation for common {agent.title.toLowerCase()} tasks
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-400">Available Actions</p>
            <p className="text-2xl font-bold text-white">{agent.presetActions.length}</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-500 text-white'
                  : 'bg-secondary-700 text-secondary-300 hover:bg-secondary-600 hover:text-white'
              }`}
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Actions Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActions.map((action) => (
            <div
              key={action.id}
              className="bg-secondary-700 rounded-lg p-4 border border-secondary-600 hover:border-primary-500/50 transition-all duration-200 group"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 group-hover:bg-primary-500/30 transition-colors">
                  {getIcon(action.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium mb-1 group-hover:text-primary-400 transition-colors">
                    {action.label}
                  </h4>
                  <p className="text-secondary-300 text-sm mb-3 line-clamp-2">
                    {action.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-secondary-600 text-secondary-300 px-2 py-1 rounded">
                        {action.category}
                      </span>
                      <span className="text-xs text-secondary-400">
                        ⏱️ {action.estimatedTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onExecuteAction(action.id)}
                disabled={isLoading}
                className="w-full mt-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Action</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {filteredActions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.239 0-4.236-.18-5.536-.437C7.061 14.754 8 14.139 8 13.407V6.593c0-.732-.939-1.347-2.464-1.156C4.236 5.18 2.239 5 0 5v8c2.239 0 4.236.18 5.536.437C6.939 13.246 8 13.861 8 14.593v.814A7.962 7.962 0 0112 15z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No actions found</h3>
            <p className="text-secondary-400">
              No preset actions available for the selected category.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-secondary-700 bg-secondary-700/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-secondary-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Actions are executed using {agent.framework} framework</span>
          </div>
          <div className="text-secondary-400">
            {filteredActions.length} of {agent.presetActions.length} actions
          </div>
        </div>
      </div>
    </div>
  )
}
