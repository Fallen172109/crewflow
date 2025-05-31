'use client'

import { useAuth } from '@/lib/auth-context'
import { AGENTS, getAgentsForTier } from '@/lib/agents'
import Link from 'next/link'

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const availableAgents = getAgentsForTier(userProfile?.subscription_tier)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Command Center</h1>
          <p className="text-secondary-300 mt-1">
            Welcome back, Captain. Your AI crew is ready for orders.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-secondary-800 rounded-lg px-4 py-2 border border-secondary-700">
            <span className="text-sm text-secondary-300">Current Plan: </span>
            <span className="text-primary-400 font-semibold capitalize">
              {userProfile?.subscription_tier || 'Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Active Agents</p>
              <p className="text-2xl font-bold text-white">{availableAgents.length}</p>
            </div>
            <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Requests Today</p>
              <p className="text-2xl font-bold text-white">127</p>
            </div>
            <div className="w-12 h-12 bg-maritime-blue/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-maritime-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Tasks Completed</p>
              <p className="text-2xl font-bold text-white">89</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-secondary-800 rounded-xl p-6 border border-secondary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Time Saved</p>
              <p className="text-2xl font-bold text-white">24h</p>
            </div>
            <div className="w-12 h-12 bg-maritime-teal/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-maritime-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agents Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Your AI Crew</h2>
          <Link 
            href="/pricing"
            className="text-primary-400 hover:text-primary-300 text-sm font-medium"
          >
            Upgrade to access more agents →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableAgents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="bg-secondary-800 rounded-xl p-6 border border-secondary-700 hover:border-primary-500/50 transition-all duration-300 group"
            >
              <div className="flex items-start space-x-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-secondary-400 mb-2">{agent.title}</p>
                  <p className="text-sm text-secondary-300 line-clamp-2">
                    {agent.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-secondary-700 text-secondary-300 px-2 py-1 rounded">
                    {agent.framework}
                  </span>
                  <span className="text-xs text-secondary-500">
                    {agent.presetActions.length} actions
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-secondary-400">Online</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="bg-secondary-800 rounded-xl border border-secondary-700">
          <div className="p-6">
            <div className="space-y-4">
              {[
                {
                  agent: 'Coral',
                  action: 'Generated customer support response',
                  time: '2 minutes ago',
                  color: '#f97316'
                },
                {
                  agent: 'Mariner',
                  action: 'Created marketing campaign strategy',
                  time: '15 minutes ago',
                  color: '#0ea5e9'
                },
                {
                  agent: 'Pearl',
                  action: 'Optimized blog post for SEO',
                  time: '1 hour ago',
                  color: '#14b8a6'
                }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-secondary-700 transition-colors">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: activity.color }}
                  >
                    {activity.agent[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      <span className="font-semibold">{activity.agent}</span> {activity.action}
                    </p>
                    <p className="text-secondary-400 text-xs">{activity.time}</p>
                  </div>
                  <button className="text-secondary-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
