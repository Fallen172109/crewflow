import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getUsageRecords, exportUsageToCSV } from '@/lib/usage-analytics'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdminAuth()

    const { searchParams } = new URL(request.url)
    
    // Parse filters from query parameters
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined,
      agentId: searchParams.get('agentId') || undefined,
      framework: searchParams.get('framework') || undefined,
      provider: searchParams.get('provider') || undefined,
      messageType: searchParams.get('messageType') || undefined
    }

    const limit = parseInt(searchParams.get('limit') || '10000')
    
    // Fetch usage records
    const { records } = await getUsageRecords(filters, limit, 0)
    
    // Convert to CSV
    const csvData = exportUsageToCSV(records)
    
    // Generate filename with current date
    const filename = `usage-analytics-${new Date().toISOString().split('T')[0]}.csv`
    
    // Return CSV file
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export usage data' },
      { status: 500 }
    )
  }
}
