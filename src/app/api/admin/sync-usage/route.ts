import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { syncRealUsageData } from '@/lib/ai-usage-tracker'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUser = await requireAdminAuth()
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    // Sync real usage data from AI provider APIs
    const syncResult = await syncRealUsageData()

    return NextResponse.json({
      success: syncResult.success,
      message: `Synced ${syncResult.synced} usage records`,
      synced: syncResult.synced,
      errors: syncResult.errors
    })
  } catch (error) {
    console.error('Error syncing usage data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync usage data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUser = await requireAdminAuth()
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    // Get sync status and last sync time
    // This would check when the last sync was performed
    return NextResponse.json({
      lastSync: null, // Would be retrieved from database
      status: 'ready',
      availableProviders: ['openai', 'anthropic', 'perplexity', 'google']
    })
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
