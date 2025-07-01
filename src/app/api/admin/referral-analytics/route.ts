import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getReferralAnalytics } from '@/lib/ai/referral-analytics'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const { getUser } = await import('@/lib/auth')
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const userId = searchParams.get('userId') // Optional: filter by specific user

    // Get referral analytics
    const analytics = await getReferralAnalytics(startDate, endDate, userId || undefined)

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching referral analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
