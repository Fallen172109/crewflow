import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  // Redirect to the comprehensive usage analytics page
  redirect('/admin/usage-analytics')
}
