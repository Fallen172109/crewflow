'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AGENTS } from '@/lib/agents'
import { useAdmin } from '@/hooks/useAdmin'

const baseNavigation = [
  {
    name: 'Command Center',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    name: 'Crew Abilities',
    href: '/dashboard/crew',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    name: 'My Usage',
    href: '/dashboard/my-usage',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    name: 'Integrations',
    href: '/dashboard/integrations',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
]

const adminNavigation = {
  name: 'Admin',
  href: '/dashboard/admin',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

// Helper function to get framework badge styling
const getFrameworkBadge = (framework: string) => {
  switch (framework) {
    case 'langchain':
      return 'bg-blue-100 text-blue-700 border border-blue-200'
    case 'autogen':
      return 'bg-purple-100 text-purple-700 border border-purple-200'
    case 'perplexity':
      return 'bg-green-100 text-green-700 border border-green-200'
    case 'hybrid':
      return 'bg-orange-100 text-orange-700 border border-orange-200'
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200'
  }
}

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [isAgentsExpanded, setIsAgentsExpanded] = useState(true)
  const { isAdmin } = useAdmin()

  // Debug log to see admin status in sidebar
  console.log('DashboardSidebar: isAdmin =', isAdmin)

  // Build navigation array based on admin status
  const navigation = isAdmin
    ? [...baseNavigation.slice(0, -1), adminNavigation, baseNavigation[baseNavigation.length - 1]]
    : baseNavigation

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto shadow-sm">
      <div className="p-6">
        {/* Main Navigation */}
        <nav className="space-y-2 mb-8">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* AI Agents Section */}
        <div>
          <button
            onClick={() => setIsAgentsExpanded(!isAgentsExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span className="font-semibold text-sm uppercase tracking-wider">AI Crew</span>
            <svg
              className={`w-4 h-4 transition-transform ${isAgentsExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {isAgentsExpanded && (
            <div className="mt-2 space-y-1">
              {Object.values(AGENTS).map((agent) => {
                const isActive = pathname === `/dashboard/agents/${agent.id}`
                return (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/${agent.id}`}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium truncate">{agent.name}</p>
                        {/* Integration Status Indicators */}
                        <div className="flex items-center space-x-1">
                          {agent.integrations.length > 0 && (
                            <div className="w-2 h-2 bg-green-400 rounded-full" title={`${agent.integrations.length} integrations connected`}></div>
                          )}
                          {agent.requiresApiConnection && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full" title="API connection required"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{agent.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-1.5 py-0.5 text-xs rounded ${getFrameworkBadge(agent.framework)}`}>
                          {agent.framework}
                        </span>
                        <span className="text-xs text-gray-500">
                          {agent.presetActions.length} actions
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Enhanced Usage Summary */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Monthly Usage</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Requests Used</span>
              <span className="text-gray-900">1,247 / 1,500</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '83%' }}></div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Cost This Month</span>
              <span className="text-gray-900">$24.94</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Most Used Agent</span>
              <span className="text-gray-900">Coral</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Avg Response Time</span>
              <span className="text-gray-900">1.2s</span>
            </div>
            <p className="text-xs text-gray-500">Resets in 12 days</p>
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/dashboard/analytics" className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors block">
              📊 View Analytics
            </Link>
            <Link href="/dashboard/my-usage" className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors block">
              💰 My AI Usage
            </Link>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors">
              💬 View All Chats
            </button>
            <Link href="/dashboard/integrations" className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors block">
              🔗 Manage Integrations
            </Link>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors">
              📈 Export Usage Data
            </button>
            <Link href="/dashboard/settings" className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors block">
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
