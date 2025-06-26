export default function AdminTestPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin Test Page</h1>
        <p className="text-gray-600 mt-1">
          Simple test page to verify admin routing works
        </p>
      </div>

      {/* Test Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Status</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <span className="text-green-500 text-xl mr-2">✅</span>
            <span>Admin page routing is working</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-500 text-xl mr-2">✅</span>
            <span>React components are rendering</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-500 text-xl mr-2">✅</span>
            <span>CSS styling is applied</span>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment Check</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Node Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
          <p><strong>Next.js Version:</strong> Latest</p>
          <p><strong>Page Type:</strong> Server Component</p>
        </div>
      </div>

      {/* Navigation Test */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Navigation Links</h2>
        <div className="space-y-2">
          <a href="/admin" className="block text-blue-600 hover:text-blue-800">← Back to Admin Dashboard</a>
          <a href="/admin/users" className="block text-blue-600 hover:text-blue-800">→ Admin Users</a>
          <a href="/admin/usage-analytics" className="block text-blue-600 hover:text-blue-800">→ Usage Analytics</a>
        </div>
      </div>
    </div>
  )
}
