import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getChatRouter } from '@/lib/chat/router'

// DEPRECATED: This endpoint is deprecated in favor of the unified chat API
// Redirect to /api/chat with backward compatibility
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    console.log('⚠️  DEPRECATED ENDPOINT: /api/agents/[agentId]/chat - Redirecting to unified chat API')

    // Authenticate user
    const user = await requireAuth()
    const resolvedParams = await params
    const body = await request.json()

    // Transform legacy request to unified format
    const unifiedRequest = {
      message: body.message,
      agentId: resolvedParams.agentId,
      chatType: 'agent' as const,
      taskType: body.taskType,
      threadId: body.threadId,
      userId: body.userId,
      attachments: body.attachments
    }

    console.log('⚠️  LEGACY REDIRECT: Transforming request', {
      agentId: resolvedParams.agentId,
      originalFormat: Object.keys(body),
      unifiedFormat: Object.keys(unifiedRequest)
    })

    // Use unified chat router
    const router = getChatRouter()
    const response = await router.processChat(unifiedRequest, user)

    console.log('⚠️  LEGACY REDIRECT: Response generated', {
      success: response.success,
      agentId: response.agent?.id
    })

    // Transform response to match legacy format
    const legacyResponse = {
      response: response.response,
      usage: response.usage,
      limit: response.limit,
      agent: response.agent
    }

    return NextResponse.json(legacyResponse)

  } catch (error) {
    console.error('⚠️  LEGACY REDIRECT ERROR:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
