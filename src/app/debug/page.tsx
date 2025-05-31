export default function DebugPage() {
  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Debug Page</h1>
        <p className="text-secondary-300 mb-8">This page doesn't use auth context</p>
        <div className="space-y-4">
          <a 
            href="/auth/login" 
            className="block bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Login
          </a>
          <a 
            href="/auth/signup" 
            className="block bg-maritime-blue hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Signup
          </a>
          <a 
            href="/dashboard" 
            className="block bg-maritime-teal hover:bg-teal-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
