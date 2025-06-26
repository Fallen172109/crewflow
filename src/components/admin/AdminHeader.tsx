'use client'

import { AdminUser } from '@/lib/admin-auth'
import { useState } from 'react'

interface AdminHeaderProps {
  adminUser: AdminUser
}

export function AdminHeader({ adminUser }: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and Navigation */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Admin Dashboard
            </h1>
            <a
              href="/dashboard"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              ⚓ Return to Main Site
            </a>
          </div>

          {/* Right side - Actions and notifications */}
          <div className="flex items-center space-x-4">
            {/* System Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-600">System Healthy</span>
            </div>

            {/* Notifications - Disabled until real notification system is implemented */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
                title="Notifications (Coming Soon)"
              >
                <span className="text-lg">🔔</span>
                {/* No notification badge - no fake notifications */}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="p-8 text-center text-gray-500">
                      <span className="text-4xl mb-2 block">🔔</span>
                      <p className="text-sm">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Real notifications will appear here when the system generates them
                      </p>
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      Real notification system coming soon
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                Export Data
              </button>
              <button className="px-3 py-1 text-sm font-medium text-white bg-orange-500 rounded hover:bg-orange-600">
                System Health
              </button>
            </div>

            {/* Admin Profile */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {adminUser.profile.email}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {adminUser.profile.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
