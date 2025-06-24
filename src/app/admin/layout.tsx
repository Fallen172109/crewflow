import { requireAdminAuth } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('Admin layout: Checking admin authentication...')

  // Require admin authentication
  const adminUser = await requireAdminAuth()

  console.log('Admin layout: Admin user authenticated:', adminUser.profile.email)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader adminUser={adminUser} />
      
      <div className="flex">
        {/* Admin Sidebar */}
        <AdminSidebar adminUser={adminUser} />
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'CrewFlow Admin Dashboard',
  description: 'Administrative interface for CrewFlow platform management',
}
