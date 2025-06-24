export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Debug Page</h1>
        <p className="text-gray-600 mb-8">This page doesn't use auth context</p>
        <div className="space-y-4">
          <a
            href="/auth/login"
            className="block bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Login
          </a>
          <a
            href="/auth/signup"
            className="block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Signup
          </a>
          <a
            href="/dashboard"
            className="block bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
