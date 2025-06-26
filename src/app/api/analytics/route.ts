import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUser, getUserProfile } from '@/lib/auth'
import { getUserAnalytics } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    const userProfile = await getUserProfile()

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') as '7d' | '30d' | '90d' || '30d'

    // Use the new analytics utility
    const analytics = await getUserAnalytics(user.id, timeRange)

    // Analytics should never be null now, but handle it just in case
    if (!analytics) {
      // Return empty analytics data instead of error
      const emptyAnalytics = {
        totalRequests: 0,
        totalCost: 0,
        averageResponseTime: 0,
        successRate: 0,
        mostUsedAgent: 'None',
        agentBreakdown: [],
        frameworkPerformance: [],
        dailyUsage: [],
        trends: {
          requestsChange: 0,
          costChange: 0,
          responseTimeChange: 0,
          successRateChange: 0
        }
      }

      return NextResponse.json({
        success: true,
        data: emptyAnalytics,
        timeRange,
        generatedAt: new Date().toISOString()
      })
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
