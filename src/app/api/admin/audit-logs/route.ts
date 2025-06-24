import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUserAdmin, logAdminAction } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isUserAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const actionType = searchParams.get('action_type')
    const adminId = searchParams.get('admin_id')
    const targetUserId = searchParams.get('target_user_id')
    const action = searchParams.get('action')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const success = searchParams.get('success')

    // Build query
    let query = supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(email),
        target_user:target_user_id(email)
      `, { count: 'exact' })

    // Apply filters
    if (actionType && actionType !== 'all') {
      query = query.eq('action_type', actionType)
    }

    if (adminId && adminId !== 'all') {
      query = query.eq('admin_id', adminId)
    }

    if (targetUserId) {
      query = query.eq('target_user_id', targetUserId)
    }

    if (action) {
      query = query.ilike('action', `%${action}%`)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (success !== null && success !== 'all') {
      query = query.eq('success', success === 'true')
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: auditLogs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction(user.id, 'VIEW_AUDIT_LOGS', undefined, {
      filters: { actionType, adminId, targetUserId, action, startDate, endDate, success },
      page,
      limit
    }, request)

    return NextResponse.json({
      auditLogs: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in audit logs API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get audit log statistics
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isUserAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { timeframe = '7d' } = body

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get statistics
    const { data: stats, error: statsError } = await supabase
      .from('admin_audit_log')
      .select('action_type, success, created_at')
      .gte('created_at', startDate.toISOString())

    if (statsError) {
      console.error('Error fetching audit log stats:', statsError)
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
    }

    // Process statistics
    const actionTypeStats = stats?.reduce((acc: Record<string, number>, log) => {
      acc[log.action_type] = (acc[log.action_type] || 0) + 1
      return acc
    }, {}) || {}

    const successStats = stats?.reduce((acc: { success: number, failed: number }, log) => {
      if (log.success) {
        acc.success++
      } else {
        acc.failed++
      }
      return acc
    }, { success: 0, failed: 0 }) || { success: 0, failed: 0 }

    // Get recent activity
    const { data: recentActivity, error: recentError } = await supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_id(email),
        target_user:target_user_id(email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Error fetching recent activity:', recentError)
    }

    // Log admin action
    await logAdminAction(user.id, 'VIEW_AUDIT_STATISTICS', undefined, {
      timeframe
    }, request)

    return NextResponse.json({
      stats: {
        total: stats?.length || 0,
        actionTypes: actionTypeStats,
        success: successStats,
        timeframe
      },
      recentActivity: recentActivity || []
    })

  } catch (error) {
    console.error('Error in audit log statistics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
