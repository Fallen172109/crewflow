import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import {
  getPendingApprovals,
  getApprovalHistory,
  getApprovalStats,
  processApprovalResponse,
  type ApprovalRequest
} from '@/lib/agents/approval-workflow'

const log = createLogger('ApprovalsAPI')

/**
 * GET /api/approvals
 *
 * Fetch approvals and stats for the authenticated user.
 *
 * Query params:
 * - type: 'pending' | 'history' | 'stats' (required)
 * - limit: number (optional, for history type, default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.warn('Unauthorized access attempt to approvals endpoint')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    // Validate type parameter
    if (!type || !['pending', 'history', 'stats'].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing type parameter. Must be one of: pending, history, stats'
        },
        { status: 400 }
      )
    }

    log.debug('Fetching approvals', { userId: user.id, type })

    let data: ApprovalRequest[] | Record<string, number> | null = null

    try {
      switch (type) {
        case 'pending': {
          data = await getPendingApprovals(user.id)
          break
        }

        case 'history': {
          const limitStr = searchParams.get('limit') || '50'
          const parsedLimit = parseInt(limitStr, 10)
          const limit = isNaN(parsedLimit) ? 50 : Math.min(Math.max(parsedLimit, 1), 200)
          data = await getApprovalHistory(user.id, limit)
          break
        }

        case 'stats': {
          data = await getApprovalStats(user.id)
          break
        }
      }

      log.debug('Approvals fetched successfully', {
        userId: user.id,
        type,
        count: Array.isArray(data) ? data.length : 'stats'
      })

      return NextResponse.json({
        success: true,
        data
      })

    } catch (dbError: any) {
      // Handle case where approval_requests table doesn't exist
      if (
        dbError.code === '42P01' ||
        dbError.message?.includes('does not exist') ||
        dbError.message?.includes('relation') ||
        dbError.message?.includes('approval_requests')
      ) {
        log.info('approval_requests table does not exist, returning empty data')

        // Return appropriate empty data based on type
        if (type === 'stats') {
          return NextResponse.json({
            success: true,
            data: {
              pending: 0,
              approved: 0,
              rejected: 0,
              expired: 0,
              averageResponseTime: 0
            }
          })
        }

        return NextResponse.json({
          success: true,
          data: []
        })
      }

      // Re-throw other errors
      throw dbError
    }

  } catch (error) {
    log.error('Error fetching approvals:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch approvals'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/approvals
 *
 * Respond to an approval request (approve or reject).
 *
 * Body:
 * - requestId: string (required)
 * - decision: 'approve' | 'reject' (required)
 * - reason?: string (optional)
 * - conditions?: string[] (optional, only for approve)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      log.warn('Unauthorized access attempt to approval response endpoint')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.requestId || typeof body.requestId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'requestId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!body.decision || !['approve', 'reject'].includes(body.decision)) {
      return NextResponse.json(
        { success: false, error: 'decision is required and must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Validate optional fields
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      return NextResponse.json(
        { success: false, error: 'reason must be a string' },
        { status: 400 }
      )
    }

    if (body.conditions !== undefined) {
      if (!Array.isArray(body.conditions)) {
        return NextResponse.json(
          { success: false, error: 'conditions must be an array of strings' },
          { status: 400 }
        )
      }
      if (!body.conditions.every((c: any) => typeof c === 'string')) {
        return NextResponse.json(
          { success: false, error: 'conditions must be an array of strings' },
          { status: 400 }
        )
      }
    }

    log.debug('Processing approval response', {
      userId: user.id,
      requestId: body.requestId,
      decision: body.decision
    })

    try {
      // Build the approval response object
      const approvalResponse = {
        approved: body.decision === 'approve',
        reason: body.reason,
        conditions: body.conditions
      }

      const result = await processApprovalResponse(
        body.requestId,
        user.id,
        approvalResponse
      )

      if (!result.success) {
        log.warn('Approval response processing failed', {
          userId: user.id,
          requestId: body.requestId,
          error: result.error
        })

        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      log.info('Approval response processed successfully', {
        userId: user.id,
        requestId: body.requestId,
        decision: body.decision
      })

      return NextResponse.json({
        success: true,
        data: {
          requestId: body.requestId,
          decision: body.decision,
          processedAt: new Date().toISOString()
        }
      })

    } catch (dbError: any) {
      // Handle case where approval_requests table doesn't exist
      if (
        dbError.code === '42P01' ||
        dbError.message?.includes('does not exist') ||
        dbError.message?.includes('relation') ||
        dbError.message?.includes('approval_requests')
      ) {
        log.info('approval_requests table does not exist')
        return NextResponse.json(
          { success: false, error: 'Approval request not found' },
          { status: 404 }
        )
      }

      // Re-throw other errors
      throw dbError
    }

  } catch (error) {
    log.error('Error processing approval response:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process approval response'
      },
      { status: 500 }
    )
  }
}
