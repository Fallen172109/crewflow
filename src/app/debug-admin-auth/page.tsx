import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAdminUser, isUserAdmin } from '@/lib/admin-auth'
import { cookies } from 'next/headers'

export default async function DebugAdminAuthPage() {
  const supabase = await createSupabaseServerClient()
  const cookieStore = await cookies()
  
  // Get all cookies
  const allCookies = cookieStore.getAll()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Check admin status
  let isAdmin = false
  let adminUser = null
  let adminError = null
  
  try {
    isAdmin = await isUserAdmin()
    adminUser = await getAdminUser()
  } catch (error) {
    adminError = error instanceof Error ? error.message : 'Unknown error'
  }
  
  // Get user profile from database
  let userProfile = null
  let profileError = null
  
  if (user) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      userProfile = data
      profileError = error
    } catch (error) {
      profileError = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Authentication Debug</h1>
        
        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Status</h2>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="font-medium text-gray-700 w-32">Auth User:</span>
              <span className={`px-2 py-1 rounded text-sm ${user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {user ? '✅ Authenticated' : '❌ Not Authenticated'}
              </span>
            </div>
            
            {user && (
              <>
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-32">User ID:</span>
                  <span className="text-gray-900 font-mono text-sm">{user.id}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 w-32">Email:</span>
                  <span className="text-gray-900">{user.email}</span>
                </div>
              </>
            )}
            
            {authError && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 w-32">Auth Error:</span>
                <span className="text-red-600 text-sm">{authError.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Profile</h2>
          
          {userProfile ? (
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="font-medium text-gray-700 w-32">Role:</span>
                <span className={`px-2 py-1 rounded text-sm ${userProfile.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                  {userProfile.role}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700 w-32">Suspended:</span>
                <span className={`px-2 py-1 rounded text-sm ${userProfile.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {userProfile.suspended ? '🚫 Yes' : '✅ No'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-700 w-32">Created:</span>
                <span className="text-gray-900">{new Date(userProfile.created_at).toLocaleString()}</span>
              </div>
            </div>
          ) : profileError ? (
            <div className="text-red-600 text-sm">Error: {profileError.message || profileError}</div>
          ) : (
            <div className="text-gray-500">No profile data available</div>
          )}
        </div>

        {/* Admin Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Status</h2>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="font-medium text-gray-700 w-32">Is Admin:</span>
              <span className={`px-2 py-1 rounded text-sm ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isAdmin ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            
            <div className="flex items-center">
              <span className="font-medium text-gray-700 w-32">Admin User:</span>
              <span className={`px-2 py-1 rounded text-sm ${adminUser ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {adminUser ? '✅ Available' : '❌ Not Available'}
              </span>
            </div>
            
            {adminError && (
              <div className="flex items-start">
                <span className="font-medium text-gray-700 w-32">Admin Error:</span>
                <span className="text-red-600 text-sm">{adminError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cookies */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cookies</h2>
          
          <div className="space-y-2">
            {allCookies.length > 0 ? (
              allCookies.map((cookie) => (
                <div key={cookie.name} className="flex items-start">
                  <span className="font-medium text-gray-700 w-48 flex-shrink-0">{cookie.name}:</span>
                  <span className="text-gray-900 font-mono text-xs break-all">
                    {cookie.value.length > 100 ? `${cookie.value.substring(0, 100)}...` : cookie.value}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No cookies found</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Troubleshooting Actions</h2>
          
          <div className="space-y-4">
            {!user && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">Not Authenticated</h3>
                <p className="text-yellow-700 text-sm mb-3">You need to sign in first.</p>
                <a 
                  href="/auth/login" 
                  className="inline-block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Go to Login
                </a>
              </div>
            )}
            
            {user && userProfile?.role !== 'admin' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">Not an Admin</h3>
                <p className="text-red-700 text-sm mb-3">Your account is not set as an admin. Contact a system administrator.</p>
                <p className="text-red-700 text-sm">Current role: <strong>{userProfile?.role || 'unknown'}</strong></p>
              </div>
            )}
            
            {user && userProfile?.suspended && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">Account Suspended</h3>
                <p className="text-red-700 text-sm">Your account has been suspended and cannot access admin features.</p>
              </div>
            )}
            
            {user && userProfile?.role === 'admin' && !userProfile?.suspended && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Admin Access Available</h3>
                <p className="text-green-700 text-sm mb-3">You should have admin access. Try accessing the admin panel.</p>
                <a 
                  href="/admin" 
                  className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Go to Admin Panel
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
