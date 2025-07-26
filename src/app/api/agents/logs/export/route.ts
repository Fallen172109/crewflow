import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET /api/agents/logs/export - Export action logs as CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const integrationId = searchParams.get('integrationId')
    const actionType = searchParams.get('actionType')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const format = searchParams.get('format') || 'csv'

    // Build query (same as main logs endpoint)
    let query = supabase
      .from('agent_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })

    // Apply filters
    if (agentId) query = query.eq('agent_id', agentId)
    if (integrationId) query = query.eq('integration_id', integrationId)
    if (actionType) query = query.eq('action_type', actionType)
    if (status) query = query.eq('status', status)
    if (dateFrom) query = query.gte('executed_at', dateFrom)
    if (dateTo) query = query.lte('executed_at', dateTo)
    if (search) query = query.ilike('action_description', `%${search}%`)

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching logs for export:', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'ID',
        'Agent ID',
        'Agent Name',
        'Integration',
        'Action Type',
        'Description',
        'Status',
        'Executed At',
        'Duration (ms)',
        'Affected Items',
        'Cost (USD)',
        'Error Message'
      ]

      const csvRows = logs?.map(log => [
        log.id,
        log.agent_id,
        log.agent_name || log.agent_id,
        log.integration_id || '',
        log.action_type,
        `"${(log.action_description || '').replace(/"/g, '""')}"`, // Escape quotes
        log.status,
        new Date(log.executed_at).toISOString(),
        log.duration_ms || 0,
        log.affected_items || 0,
        log.cost_usd || '',
        `"${(log.error_message || '').replace(/"/g, '""')}"` // Escape quotes
      ]) || []

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="action-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (format === 'json') {
      // Return JSON format
      const jsonData = logs?.map(log => ({
        id: log.id,
        agentId: log.agent_id,
        agentName: log.agent_name || log.agent_id,
        integrationId: log.integration_id,
        actionType: log.action_type,
        actionDescription: log.action_description,
        status: log.status,
        executedAt: log.executed_at,
        durationMs: log.duration_ms,
        affectedItems: log.affected_items,
        costUsd: log.cost_usd,
        errorMessage: log.error_message,
        metadata: log.metadata
      })) || []

      return NextResponse.json({ 
        logs: jsonData,
        exportedAt: new Date().toISOString(),
        totalCount: jsonData.length
      }, {
        headers: {
          'Content-Disposition': `attachment; filename="action-logs-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    } else {
      return NextResponse.json({ error: 'Unsupported format. Use csv or json.' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in GET /api/agents/logs/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
