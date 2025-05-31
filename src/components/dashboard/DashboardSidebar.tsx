'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AGENTS } from '@/lib/agents'

const navigation = [
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
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [isAgentsExpanded, setIsAgentsExpanded] = useState(true)

  return (
    <div className="w-64 bg-secondary-800 border-r border-secondary-700 h-screen overflow-y-auto">
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
                    ? 'bg-primary-500 text-white'
                    : 'text-secondary-300 hover:bg-secondary-700 hover:text-white'
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
            className="flex items-center justify-between w-full px-3 py-2 text-secondary-300 hover:text-white transition-colors"
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
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-secondary-400 hover:bg-secondary-700 hover:text-white'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-secondary-500 truncate">{agent.title}</p>
                    </div>
                    {/* Status indicator */}
                    <div className="w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Usage Summary */}
        <div className="mt-8 p-4 bg-secondary-700 rounded-lg">
          <h3 className="text-sm font-semibold text-white mb-2">Monthly Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-secondary-300">Requests Used</span>
              <span className="text-white">1,247 / 1,500</span>
            </div>
            <div className="w-full bg-secondary-600 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full" style={{ width: '83%' }}></div>
            </div>
            <p className="text-xs text-secondary-400">Resets in 12 days</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-secondary-300 mb-3 uppercase tracking-wider">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-secondary-400 hover:bg-secondary-700 hover:text-white rounded-lg transition-colors">
              View All Chats
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-secondary-400 hover:bg-secondary-700 hover:text-white rounded-lg transition-colors">
              Export Data
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-secondary-400 hover:bg-secondary-700 hover:text-white rounded-lg transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
