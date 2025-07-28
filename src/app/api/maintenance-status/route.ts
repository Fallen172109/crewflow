import { NextResponse } from 'next/server'
import { getMaintenanceStatus, getMaintenanceConfigSummary } from '@/lib/maintenance-config'

export async function GET() {
  try {
    // Get automated maintenance status
    const status = getMaintenanceStatus()

    // Log maintenance decision for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Maintenance Status Check:', {
        maintenanceMode: status.maintenanceMode,
        reason: status.reason,
        environment: status.environment,
        timestamp: new Date().toISOString()
      })
    }

    // Return maintenance status with additional context
    return NextResponse.json({
      maintenanceMode: status.maintenanceMode,
      reason: status.reason,
      environment: status.environment,
      canBypass: status.canBypass,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error checking maintenance status:', error)

    // Fallback to legacy behavior on error
    const fallbackMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'

    return NextResponse.json({
      maintenanceMode: fallbackMaintenanceMode,
      reason: 'Fallback due to error',
      environment: 'Unknown',
      canBypass: true,
      error: 'Failed to check automated maintenance status',
      timestamp: new Date().toISOString()
    }, { status: 200 }) // Return 200 to avoid breaking the UI
  }
}

// Debug endpoint for development (only accessible in development mode)
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug endpoint only available in development' },
      { status: 403 }
    )
  }

  try {
    const summary = getMaintenanceConfigSummary()

    return NextResponse.json({
      debug: true,
      summary,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get maintenance config summary' },
      { status: 500 }
    )
  }
}
