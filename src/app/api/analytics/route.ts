import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { getUserAnalytics } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    const { user, userProfile } = await getUser()
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') as '7d' | '30d' | '90d' || '30d'

    // Use the new analytics utility
    const analytics = await getUserAnalytics(user.id, timeRange)

    if (!analytics) {
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: analytics,
      timeRange,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
