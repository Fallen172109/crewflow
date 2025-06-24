'use client'

import { useAdmin } from '@/hooks/useAdmin'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AuditLog {
  id: string
  admin_id: string
  action: string
  target_user_id?: string
  details: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export default function AdminAuditPage() {
  const { isAdmin, loading } = useAdmin()
  const router = useRouter()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, loading, router])

  useEffect(() => {
    if (isAdmin) {
      // Mock audit logs for now
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          admin_id: 'admin-1',
          action: 'USER_PROMOTED',
          target_user_id: 'user-123',
          details: { email: 'borzeckikamil7@gmail.com', role: 'admin' },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          admin_id: 'admin-1',
          action: 'SYSTEM_ACCESS',
          details: { page: '/admin/users' },
          ip_address: '192.168.1.100',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]
      setAuditLogs(mockLogs)
      setIsLoading(false)
    }
  }, [isAdmin])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-300">Loading audit logs...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-secondary-300">You don't have permission to access audit logs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="text-secondary-300 mt-1">
            Track all administrative actions and system access
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search logs..."
            className="px-3 py-2 bg-secondary-700 text-white rounded-lg border border-secondary-600 placeholder-secondary-400"
          />
          <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            Export Logs
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-secondary-800 rounded-xl border border-secondary-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-300 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-300 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-300 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-300 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-secondary-400">
                    Loading audit logs...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-secondary-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-400 rounded-full">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-300">
                      {log.admin_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-300">
                      {log.target_user_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-300">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-300">
                      <details className="cursor-pointer">
                        <summary className="text-primary-400 hover:text-primary-300">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-secondary-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
