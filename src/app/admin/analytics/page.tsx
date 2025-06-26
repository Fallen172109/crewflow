import { redirect } from 'next/navigation'

export default async function AdminAnalyticsPage() {
  // Redirect to the new usage analytics page
  redirect('/admin/usage-analytics')
}
