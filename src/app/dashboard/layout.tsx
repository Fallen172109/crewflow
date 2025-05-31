import { requireAuth } from '@/lib/auth'
import DashboardNav from '@/components/dashboard/DashboardNav'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure user is authenticated
  await requireAuth()

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Navigation */}
      <DashboardNav />
      
      <div className="flex">
        {/* Sidebar */}
        <DashboardSidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
