// Streaming Chat API Endpoint
// Provides real-time streaming responses using Server-Sent Events (SSE)

import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getChatRouter } from '@/lib/chat/router'
import {
  ChatValidationError,
  ChatAuthenticationError,
  ChatRateLimitError,
  ChatHandlerError
} from '@/lib/chat/types'

export async function POST(request: NextRequest) {
  let encoder: TextEncoder
  let controller: ReadableStreamDefaultController<Uint8Array>

  try {
    console.log('🚀 STREAMING CHAT API: Request received')

    // Authenticate user
    const user = await requireAuth()
    console.log('🚀 STREAMING CHAT API: User authenticated:', user.id)

    // Parse request body
    const body = await request.json()
    console.log('🚀 STREAMING CHAT API: Request details:', {
      chatType: body.chatType,
      agentId: body.agentId,
      taskType: body.taskType,
      threadId: body.threadId,
      messageLength: body.message?.length || 0,
      attachmentsCount: body.attachments?.length || 0
    })

    // Create streaming response
    encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl
      }
    })

    // Send SSE headers
    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

    // Process streaming chat in background
    processStreamingChat(body, user, controller, encoder)
      .catch(error => {
        console.error('🚀 STREAMING CHAT API: Background processing error:', error)
        sendSSEError(controller, encoder, error)
      })

    return response

  } catch (error) {
    console.error('🚀 STREAMING CHAT API: Setup error:', error)
    
    // If we have a controller, send error via SSE
    if (controller && encoder) {
      sendSSEError(controller, encoder, error)
      return new Response(null, { status: 200 }) // Keep connection open for error
    }

    // Otherwise return standard error response
    return new Response(
      JSON.stringify({
        error: 'Failed to initialize streaming',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function processStreamingChat(
  body: any,
  user: any,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  try {
    console.log('🚀 STREAMING CHAT API: Starting background processing')

    // Get chat router
    const router = getChatRouter()

    // Send initial connection event
    sendSSEEvent(controller, encoder, {
      type: 'connected',
      message: 'Streaming connection established'
    })

    console.log('🚀 STREAMING CHAT API: Router obtained, processing streaming chat')

    // Process streaming chat
    const response = await router.processStreamingChat(body, user, (chunk) => {
      console.log('🚀 STREAMING CHAT API: Received chunk:', {
        contentLength: chunk.content?.length || 0,
        messageId: chunk.messageId
      })

      // Send each streaming chunk
      sendSSEEvent(controller, encoder, {
        type: 'chunk',
        content: chunk.content,
        messageId: chunk.messageId,
        metadata: chunk.metadata
      })
    })

    console.log('🚀 STREAMING CHAT API: Streaming completed:', {
      success: response.success,
      responseLength: response.response?.length || 0,
      threadId: response.threadId,
      tokensUsed: response.tokensUsed,
      error: response.error
    })

    // Send completion event
    if (response.success) {
      sendSSEEvent(controller, encoder, {
        type: 'complete',
        response: response.response,
        threadId: response.threadId,
        messageId: response.messageId,
        agent: response.agent,
        tokensUsed: response.tokensUsed,
        metadata: response.metadata
      })
    } else {
      console.error('🚀 STREAMING CHAT API: Response indicates failure:', response.error)
      sendSSEEvent(controller, encoder, {
        type: 'error',
        error: response.error || 'Chat processing failed',
        details: response.details
      })
    }

  } catch (error) {
    console.error('🚀 STREAMING CHAT API: Processing error:', error)
    console.error('🚀 STREAMING CHAT API: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    sendSSEError(controller, encoder, error)
  } finally {
    // Close the stream
    try {
      controller.close()
    } catch (e) {
      console.error('🚀 STREAMING CHAT API: Error closing stream:', e)
    }
  }
}

function sendSSEEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  data: any
) {
  try {
    const eventData = `data: ${JSON.stringify(data)}\n\n`
    controller.enqueue(encoder.encode(eventData))
  } catch (error) {
    console.error('🚀 STREAMING CHAT API: Error sending SSE event:', error)
  }
}

function sendSSEError(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  error: any
) {
  let errorMessage = 'Unknown error'
  let statusCode = 500
  let details = undefined

  if (error instanceof ChatValidationError) {
    errorMessage = 'Validation failed'
    statusCode = 400
    details = error.errors
  } else if (error instanceof ChatAuthenticationError) {
    errorMessage = 'Authentication required'
    statusCode = 401
    details = error.message
  } else if (error instanceof ChatRateLimitError) {
    errorMessage = 'Rate limit exceeded'
    statusCode = 429
    details = error.message
  } else if (error instanceof ChatHandlerError) {
    errorMessage = 'Handler error'
    statusCode = error.statusCode || 500
    details = error.message
  } else if (error instanceof Error) {
    errorMessage = error.message
  }

  sendSSEEvent(controller, encoder, {
    type: 'error',
    error: errorMessage,
    statusCode,
    details
  })
}

// OPTIONS endpoint for CORS support
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
