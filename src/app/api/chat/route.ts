// Unified Chat API Endpoint
// Single entry point for all CrewFlow chat interactions

import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { getChatRouter } from '@/lib/chat/router'
import {
  ChatValidationError,
  ChatAuthenticationError,
  ChatRateLimitError,
  ChatHandlerError
} from '@/lib/chat/types'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  createRateLimitErrorResponse,
  withStandardErrorHandling,
  ERROR_CODES,
  HTTP_STATUS
} from '@/lib/api/response-formatter'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 UNIFIED CHAT API: Request received')

    // Authenticate user
    const user = await requireAuthAPI()
    console.log('🚀 UNIFIED CHAT API: User authenticated:', user.id)

    // Parse request body
    const body = await request.json()
    console.log('🚀 UNIFIED CHAT API: Request details:', {
      chatType: body.chatType,
      agentId: body.agentId,
      taskType: body.taskType,
      threadId: body.threadId,
      messageLength: body.message?.length || 0,
      attachmentsCount: body.attachments?.length || 0,
      hasMealPlanningContext: !!body.mealPlanningContext
    })

    // Get chat router and process request
    const router = getChatRouter()
    console.log('🚀 UNIFIED CHAT API: About to call router.processChat')
    const response = await router.processChat(body, user)

    console.log('🚀 UNIFIED CHAT API: Response generated:', {
      success: response.success,
      responseLength: response.response?.length || 0,
      responseContent: response.response?.substring(0, 100) || 'NO CONTENT',
      threadId: response.threadId,
      agentId: response.agent?.id,
      tokensUsed: response.tokensUsed,
      error: response.error,
      fullResponse: response
    })

    // Return standardized response
    if (response.success) {
      return createSuccessResponse(
        {
          response: response.response,
          threadId: response.threadId,
          agent: response.agent,
          tokensUsed: response.tokensUsed,
          metadata: response.metadata,
          detectedActions: response.detectedActions,
          productPreview: response.productPreview,
          // DEBUG: Add debugging info to response
          debug: {
            routerResponse: {
              success: response.success,
              responseLength: response.response?.length || 0,
              responseContent: response.response?.substring(0, 200) || 'NO CONTENT',
              hasAgent: !!response.agent,
              agentId: response.agent?.id,
              hasError: !!response.error,
              error: response.error,
              hasDetectedActions: !!(response.detectedActions && response.detectedActions.length > 0),
              detectedActionsCount: response.detectedActions?.length || 0,
              hasProductPreview: !!response.productPreview
            }
          }
        },
        'Chat message processed successfully'
      )
    } else {
      // Handle different error types
      if (response.error === 'Authentication failed') {
        return createAuthErrorResponse()
      }
      if (response.error === 'Rate limit exceeded') {
        return createRateLimitErrorResponse()
      }
      if (response.error === 'Validation failed') {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Chat validation failed',
          response.details,
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      return createErrorResponse(
        ERROR_CODES.AI_SERVICE_ERROR,
        response.error || 'Chat processing failed',
        response.details
      )
    }

  } catch (error) {
    console.error('🚀 UNIFIED CHAT API: Unexpected error:', error)

    // Handle specific error types
    if (error instanceof ChatValidationError) {
      return NextResponse.json({
        response: '',
        success: false,
        threadId: '',
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof ChatAuthenticationError) {
      return NextResponse.json({
        response: '',
        success: false,
        threadId: '',
        error: 'Authentication required',
        details: error.message
      }, { status: 401 })
    }

    if (error instanceof ChatRateLimitError) {
      return NextResponse.json({
        response: '',
        success: false,
        threadId: '',
        error: 'Rate limit exceeded',
        details: error.message
      }, { status: 429 })
    }

    if (error instanceof ChatHandlerError) {
      return NextResponse.json({
        response: '',
        success: false,
        threadId: '',
        error: 'Handler error',
        details: error.message
      }, { status: error.statusCode || 500 })
    }

    // Generic error response
    return NextResponse.json({
      response: '',
      success: false,
      threadId: '',
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        undefined
    }, { status: 500 })
  }
}

// GET endpoint for health check and router information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Authenticate user for most actions
    let user = null
    try {
      user = await requireAuth()
    } catch (error) {
      // Only allow health check without authentication
      if (action !== 'health') {
        return NextResponse.json({
          error: 'Authentication required'
        }, { status: 401 })
      }
    }

    const router = getChatRouter()

    switch (action) {
      case 'health':
        const healthStatus = await router.healthCheck()
        return NextResponse.json(healthStatus)

      case 'types':
        const availableTypes = router.getAvailableChatTypes()
        return NextResponse.json({ 
          chatTypes: availableTypes,
          description: 'Available chat types for the unified chat API'
        })

      case 'analytics':
        if (!user) {
          return NextResponse.json({
            error: 'Authentication required'
          }, { status: 401 })
        }
        
        const limit = parseInt(searchParams.get('limit') || '100')
        const analytics = router.getAnalytics(limit)
        return NextResponse.json({ 
          analytics,
          total: analytics.length
        })

      default:
        return NextResponse.json({
          message: 'CrewFlow Unified Chat API',
          version: '1.0.0',
          endpoints: {
            'POST /api/chat': 'Send chat message',
            'GET /api/chat?action=health': 'Health check',
            'GET /api/chat?action=types': 'Available chat types',
            'GET /api/chat?action=analytics': 'Analytics data (authenticated)'
          },
          documentation: 'See UNIFIED_CHAT_ARCHITECTURE.md for detailed documentation'
        })
    }

  } catch (error) {
    console.error('🚀 UNIFIED CHAT API GET: Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        undefined
    }, { status: 500 })
  }
}

// OPTIONS endpoint for CORS support
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
