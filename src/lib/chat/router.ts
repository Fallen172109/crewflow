// Unified Chat Router
// Central routing system for all chat interactions

import {
  UnifiedChatRequest,
  UnifiedChatResponse,
  ChatHandler,
  ChatType,
  ChatValidationError,
  ChatHandlerError,
  ChatAuthenticationError,
  ChatRateLimitError,
  ChatAnalytics
} from './types'
import {
  validateChatRequest,
  normalizeRequest,
  validateSecurityConstraints,
  createValidationError,
  detectChatType
} from './utils/validation'
import { predictiveResponseChecker } from '@/lib/ai/predictive-response-checker'
import { createLogger } from '@/lib/logger'

const log = createLogger('ChatRouter')

export class ChatRouter {
  private handlers: Map<ChatType, ChatHandler> = new Map()
  private analytics: ChatAnalytics[] = []
  private rateLimitCache: Map<string, { count: number; resetTime: number }> = new Map()
  private initializationPromise: Promise<void>

  constructor() {
    this.initializationPromise = this.initializeHandlers()
  }

  private async initializeHandlers() {
    try {
      log.debug('Initializing handlers...')

      // Lazy load Shopify-focused handlers only
      const { ShopifyAIHandler } = await import('./handlers/shopify-ai')
      const { AIStoreManagerHandler } = await import('./handlers/ai-store-manager')

      this.handlers.set('shopify-ai', new ShopifyAIHandler())
      this.handlers.set('ai-store-manager', new AIStoreManagerHandler())

      log.debug('Handlers initialized:', Array.from(this.handlers.keys()))
    } catch (error) {
      log.error('Error initializing handlers:', error)
      throw error
    }
  }

  private async ensureInitialized() {
    await this.initializationPromise
  }

  async processChat(rawRequest: any, user: any): Promise<UnifiedChatResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      // Ensure handlers are initialized
      await this.ensureInitialized()
      // Normalize the request format
      const request = normalizeRequest(rawRequest)

      // Validate the request
      const validation = validateChatRequest(request)
      if (!validation.isValid) {
        throw createValidationError(validation.errors)
      }

      // Security validation
      const securityValidation = validateSecurityConstraints(request, user)
      if (!securityValidation.isValid) {
        throw new ChatAuthenticationError(securityValidation.errors.join(', '))
      }

      // Rate limiting
      if (!this.checkRateLimit(user.id)) {
        throw new ChatRateLimitError('Rate limit exceeded. Please try again later.')
      }

      // Detect chat type if not explicitly provided
      const chatType = (request.chatType || detectChatType(request)) as ChatType
      log.debug(`[${requestId}] Chat type detected: ${chatType}`)

      // Get appropriate handler
      const handler = this.handlers.get(chatType)
      if (!handler) {
        throw new ChatHandlerError(`No handler available for chat type: ${chatType}`)
      }
      log.debug(`[${requestId}] Handler found: ${handler.constructor.name}`)

      // Verify handler can process this request
      if (!handler.canHandle(request)) {
        throw new ChatHandlerError(`Handler cannot process this request type`)
      }

      // Process the chat request
      const response = await handler.process(request, user)
      log.debug(`[${requestId}] Handler response received`, {
        success: response.success,
        responseLength: response.response?.length || 0
      })

      // Record analytics
      this.recordAnalytics({
        requestId,
        userId: user.id,
        chatType,
        agentId: request.agentId,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        tokensUsed: response.tokensUsed,
        success: true
      })

      return {
        ...response,
        success: true
      }

    } catch (error) {
      // Record failed analytics
      this.recordAnalytics({
        requestId,
        userId: user.id,
        chatType: (rawRequest.chatType || 'unknown') as ChatType,
        agentId: rawRequest.agentId,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Handle different error types
      if (error instanceof ChatValidationError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Validation failed',
          details: error.errors
        }
      }

      if (error instanceof ChatAuthenticationError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Authentication failed',
          details: error.message
        }
      }

      if (error instanceof ChatRateLimitError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Rate limit exceeded',
          details: error.message
        }
      }

      if (error instanceof ChatHandlerError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Handler error',
          details: error.message
        }
      }

      // Generic error handling
      log.error('Unexpected chat router error:', error)
      return {
        response: '',
        success: false,
        threadId: rawRequest.threadId || '',
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }
  }

  async processStreamingChat(
    rawRequest: any,
    user: any,
    onChunk: (chunk: { content: string; messageId?: string; metadata?: any }) => void
  ): Promise<UnifiedChatResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      // Ensure handlers are initialized
      await this.ensureInitialized()

      // Normalize the request format
      const request = normalizeRequest(rawRequest)

      // Validate the request
      const validation = validateChatRequest(request)
      if (!validation.isValid) {
        log.warn(`[${requestId}] Request validation failed:`, validation.errors)
        throw createValidationError(validation.errors)
      }

      // Security validation
      const securityValidation = validateSecurityConstraints(request, user)
      if (!securityValidation.isValid) {
        log.warn(`[${requestId}] Security validation failed`)
        throw new ChatAuthenticationError(securityValidation.errors.join(', '))
      }

      // Rate limiting
      if (!this.checkRateLimit(user.id)) {
        log.warn(`[${requestId}] Rate limit exceeded for user`)
        throw new ChatRateLimitError('Rate limit exceeded. Please try again later.')
      }

      // Detect chat type if not explicitly provided
      const chatType = (request.chatType || detectChatType(request)) as ChatType
      log.debug(`[${requestId}] Chat type: ${chatType}`)

      // Get appropriate handler
      const handler = this.handlers.get(chatType)
      if (!handler) {
        throw new ChatHandlerError(`No handler available for chat type: ${chatType}`)
      }

      // Verify handler can process this request
      if (!handler.canHandle(request)) {
        throw new ChatHandlerError(`Handler cannot process this request type`)
      }

      log.debug(`[${requestId}] Processing streaming request for ${chatType}`)

      // Check if handler supports streaming
      let response: UnifiedChatResponse
      if ('processStreaming' in handler && typeof handler.processStreaming === 'function') {
        // Use streaming-capable handler
        response = await (handler as any).processStreaming(request, user, onChunk)
      } else {
        // Fallback to regular processing for handlers that don't support streaming
        log.debug(`[${requestId}] Handler doesn't support streaming, using regular processing`)
        response = await handler.process(request, user)

        // Simulate streaming by sending the complete response as a single chunk
        if (response.success && response.response) {
          onChunk({
            content: response.response,
            messageId: response.messageId,
            metadata: { fallback: true }
          })
        }
      }

      // Record analytics
      this.recordAnalytics({
        requestId,
        userId: user.id,
        chatType,
        agentId: request.agentId,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        tokensUsed: response.tokensUsed,
        success: true
      })

      return {
        ...response,
        success: true,
        // Pass through any extra metadata (like product previews) so the
        // streaming API can expose it to the client.
        metadata: (response as any).productPreview
          ? { ...(response as any).metadata, productPreview: (response as any).productPreview }
          : (response as any).metadata
      }

    } catch (error) {
      // Record failed analytics
      this.recordAnalytics({
        requestId,
        userId: user.id,
        chatType: (rawRequest.chatType || 'unknown') as ChatType,
        agentId: rawRequest.agentId,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Handle different error types
      if (error instanceof ChatValidationError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Validation failed',
          details: error.errors
        }
      }

      if (error instanceof ChatAuthenticationError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Authentication failed',
          details: error.message
        }
      }

      if (error instanceof ChatRateLimitError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Rate limit exceeded',
          details: error.message
        }
      }

      if (error instanceof ChatHandlerError) {
        return {
          response: '',
          success: false,
          threadId: rawRequest.threadId || '',
          error: 'Handler error',
          details: error.message
        }
      }

      // Generic error handling
      log.error('Unexpected streaming chat router error:', error)
      return {
        response: '',
        success: false,
        threadId: rawRequest.threadId || '',
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const maxRequests = 60

    const userLimit = this.rateLimitCache.get(userId)
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitCache.set(userId, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }

    if (userLimit.count >= maxRequests) {
      return false
    }

    // Increment count
    userLimit.count++
    return true
  }

  private generateRequestId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private recordAnalytics(analytics: ChatAnalytics): void {
    this.analytics.push(analytics)

    // Keep only last 1000 analytics entries in memory
    if (this.analytics.length > 1000) {
      this.analytics = this.analytics.slice(-1000)
    }

    // Log analytics in development only
    log.debug('Chat Analytics:', {
      requestId: analytics.requestId,
      chatType: analytics.chatType,
      latency: analytics.latency,
      success: analytics.success
    })
  }

  // Get analytics data (for admin/monitoring)
  getAnalytics(limit: number = 100): ChatAnalytics[] {
    return this.analytics.slice(-limit)
  }

  // Clear rate limit for a user (admin function)
  clearRateLimit(userId: string): void {
    this.rateLimitCache.delete(userId)
  }

  // Get available chat types
  getAvailableChatTypes(): ChatType[] {
    return Array.from(this.handlers.keys())
  }

  // Health check
  async healthCheck(): Promise<{ status: string; handlers: Record<string, boolean> }> {
    const handlerStatus: Record<string, boolean> = {}
    
    for (const [type, handler] of this.handlers) {
      try {
        // Basic health check - could be expanded
        handlerStatus[type] = typeof handler.process === 'function'
      } catch (error) {
        handlerStatus[type] = false
      }
    }

    return {
      status: Object.values(handlerStatus).every(Boolean) ? 'healthy' : 'degraded',
      handlers: handlerStatus
    }
  }
}

// Singleton instance
let chatRouterInstance: ChatRouter | null = null

export function getChatRouter(): ChatRouter {
  if (!chatRouterInstance) {
    chatRouterInstance = new ChatRouter()
  }
  return chatRouterInstance
}

// Helper function for backward compatibility
export function routeChat(request: any, user: any): Promise<UnifiedChatResponse> {
  const router = getChatRouter()
  return router.processChat(request, user)
}
