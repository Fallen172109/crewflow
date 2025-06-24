import { requireAdminAuth } from '@/lib/admin-auth'
import { AdminAuditLog } from '@/components/admin/AdminAuditLog'
import Link from 'next/link'

export default async function AdminAuditLogsPage() {
  const adminUser = await requireAdminAuth()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back to Admin Dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-gray-600 mt-1">
                Track all administrative actions and system events
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Export Logs
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Component */}
      <AdminAuditLog adminUser={adminUser} />
    </div>
  )
}
