import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { runFileCleanup } from '@/lib/cleanup/file-retention'

// POST /api/admin/cleanup-files - Run file cleanup (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication (admin check would be added here)
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    console.log(`File cleanup initiated by admin: ${adminUser.email}`)

    // Run the cleanup
    const result = await runFileCleanup()

    return NextResponse.json({
      success: result.success,
      message: `Cleanup completed: ${result.totalDeletedFiles} files and ${result.totalDeletedRecords} records deleted`,
      deletedFiles: result.totalDeletedFiles,
      deletedRecords: result.totalDeletedRecords,
      errors: result.errors
    })
  } catch (error) {
    console.error('File cleanup API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run file cleanup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/admin/cleanup-files - Get cleanup status/stats (admin only)
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

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = await createSupabaseServerClient()

    // Get attachment statistics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      { count: totalAttachments },
      { count: expiredAttachments },
      { data: recentAttachments }
    ] = await Promise.all([
      supabase
        .from('chat_attachments')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('chat_attachments')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('chat_attachments')
        .select('file_size, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)
    ])

    // Calculate storage usage
    const totalStorageBytes = recentAttachments?.reduce((sum, att) => sum + (att.file_size || 0), 0) || 0
    const totalStorageMB = Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100

    return NextResponse.json({
      stats: {
        totalAttachments: totalAttachments || 0,
        expiredAttachments: expiredAttachments || 0,
        activeAttachments: (totalAttachments || 0) - (expiredAttachments || 0),
        totalStorageMB,
        lastCleanupDate: null // TODO: Track last cleanup date
      }
    })
  } catch (error) {
    console.error('File cleanup stats API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get cleanup stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
