'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminUser } from '@/lib/admin-auth'

interface AdminSidebarProps {
  adminUser: AdminUser
}

const navigation = [
  {
    name: 'Usage Analytics',
    href: '/admin/usage-analytics',
    icon: '📊',
    description: 'AI usage and cost tracking'
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: '👥',
    description: 'Manage user accounts'
  },
  {
    name: 'Agents',
    href: '/admin/agents',
    icon: '🤖',
    description: 'AI agent monitoring'
  },
  {
    name: 'Cost Verification',
    href: '/admin/cost-verification-simple',
    icon: '🔍',
    description: 'Verify AI cost calculations'
  },
  {
    name: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: '💳',
    description: 'Billing and subscriptions'
  },
  {
    name: 'System',
    href: '/admin/system',
    icon: '⚙️',
    description: 'System configuration'
  },
  {
    name: 'Shopify Permissions',
    href: '/admin/shopify-permissions',
    icon: '🛍️',
    description: 'Store permissions overview'
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: '📋',
    description: 'Admin action history'
  }
]

export function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🚢</span>
          </div>
          <div className="ml-3">
            <h2 className="text-lg font-semibold text-gray-900">CrewFlow</h2>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
                          pathname.startsWith(item.href) ||
                          (item.href === '/admin/usage-analytics' && pathname === '/admin')

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <span className="mr-3 text-base">{item.icon}</span>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Admin Info */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {adminUser.profile.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {adminUser.profile.email}
            </p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <Link
            href="/dashboard"
            className="flex-1 text-center px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            User View
          </Link>
          <Link
            href="/auth/logout"
            className="flex-1 text-center px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
          >
            Sign Out
          </Link>
        </div>
      </div>
    </div>
  )
}
