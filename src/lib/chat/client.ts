// Unified Chat Client
// Helper functions for frontend components to use the unified chat API

import { UnifiedChatRequest, UnifiedChatResponse, ChatType } from './types'
import { UploadedFile } from '@/components/ui/FileUpload'

export interface ChatClientOptions {
  baseUrl?: string
  timeout?: number
  retries?: number
}

export class ChatClient {
  private baseUrl: string
  private timeout: number
  private retries: number

  constructor(options: ChatClientOptions = {}) {
    this.baseUrl = options.baseUrl || '/api/chat'
    this.timeout = options.timeout || 30000
    this.retries = options.retries || 2
  }

  /**
   * Send a chat message using the unified API
   */
  async sendMessage(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const response = await this.makeRequest(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ChatError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.details
      )
    }

    return response.json()
  }

  /**
   * Send message to a general agent
   */
  async sendAgentMessage(
    agentId: string,
    message: string,
    options: {
      taskType?: string
      threadId?: string
      attachments?: UploadedFile[]
    } = {}
  ): Promise<UnifiedChatResponse> {
    return this.sendMessage({
      message,
      agentId,
      chatType: 'agent',
      taskType: options.taskType,
      threadId: options.threadId || `temp-${Date.now()}`,
      attachments: options.attachments
    })
  }

  /**
   * Send message to Shopify AI
   */
  async sendShopifyMessage(
    message: string,
    options: {
      taskType?: string
      threadId: string
      attachments?: UploadedFile[]
    }
  ): Promise<UnifiedChatResponse> {
    return this.sendMessage({
      message,
      chatType: 'shopify-ai',
      taskType: options.taskType || 'general',
      threadId: options.threadId,
      attachments: options.attachments
    })
  }

  /**
   * Send message to AI Store Manager
   */
  async sendStoreManagerMessage(
    message: string,
    options: {
      threadId: string
      attachments?: UploadedFile[]
    }
  ): Promise<UnifiedChatResponse> {
    return this.sendMessage({
      message,
      chatType: 'ai-store-manager',
      taskType: 'business_automation',
      threadId: options.threadId,
      attachments: options.attachments
    })
  }

  /**
   * Send streaming message to AI Store Manager
   */
  async sendStreamingStoreManagerMessage(
    message: string,
    options: {
      threadId: string
      attachments?: UploadedFile[]
      onChunk?: (chunk: { content: string; messageId?: string; metadata?: any }) => void
      onComplete?: (response: UnifiedChatResponse) => void
      onError?: (error: any) => void
    }
  ): Promise<void> {
    return this.sendStreamingMessage({
      message,
      chatType: 'ai-store-manager',
      taskType: 'business_automation',
      threadId: options.threadId,
      attachments: options.attachments
    }, {
      onChunk: options.onChunk,
      onComplete: options.onComplete,
      onError: options.onError
    })
  }

  /**
   * Send streaming message using Server-Sent Events
   */
  async sendStreamingMessage(
    request: UnifiedChatRequest,
    callbacks: {
      onChunk?: (chunk: { content: string; messageId?: string; metadata?: any }) => void
      onComplete?: (response: UnifiedChatResponse) => void
      onError?: (error: any) => void
    }
  ): Promise<void> {
    try {
      console.log('🚀 CHAT CLIENT: Starting streaming request', {
        chatType: request.chatType,
        threadId: request.threadId,
        messageLength: request.message.length
      })

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ChatError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.details
        )
      }

      if (!response.body) {
        throw new ChatError('No response body for streaming', 500)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log('🚀 CHAT CLIENT: Streaming completed')
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'chunk' && callbacks.onChunk) {
                  callbacks.onChunk({
                    content: data.content,
                    messageId: data.messageId,
                    metadata: data.metadata
                  })
                } else if (data.type === 'complete' && callbacks.onComplete) {
                  callbacks.onComplete({
                    response: data.response,
                    success: true,
                    threadId: data.threadId,
                    messageId: data.messageId,
                    agent: data.agent,
                    tokensUsed: data.tokensUsed,
                    metadata: data.metadata
                  })
                } else if (data.type === 'error' && callbacks.onError) {
                  callbacks.onError(new ChatError(
                    data.error || 'Streaming error',
                    data.statusCode || 500,
                    data.details
                  ))
                } else if (data.type === 'connected') {
                  console.log('🚀 CHAT CLIENT: Streaming connection established')
                }
              } catch (parseError) {
                console.error('🚀 CHAT CLIENT: Error parsing SSE data:', parseError, line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (error) {
      console.error('🚀 CHAT CLIENT: Streaming error:', error)
      if (callbacks.onError) {
        callbacks.onError(error)
      } else {
        throw error
      }
    }
  }

  /**
   * Send message to meal planning assistant
   */
  async sendMealPlanningMessage(
    message: string,
    options: {
      threadId?: string
      mealPlanningContext?: any
    } = {}
  ): Promise<UnifiedChatResponse> {
    return this.sendMessage({
      message,
      chatType: 'meal-planning',
      threadId: options.threadId || 'meal-planning-session',
      mealPlanningContext: options.mealPlanningContext
    })
  }

  /**
   * Get chat API health status
   */
  async getHealthStatus(): Promise<any> {
    const response = await this.makeRequest(`${this.baseUrl}?action=health`)
    return response.json()
  }

  /**
   * Get available chat types
   */
  async getChatTypes(): Promise<{ chatTypes: ChatType[] }> {
    const response = await this.makeRequest(`${this.baseUrl}?action=types`)
    return response.json()
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ChatError('Request timeout', 408)
      }
      
      throw error
    }
  }
}

export class ChatError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ChatError'
  }
}

// Singleton instance for easy use
let chatClientInstance: ChatClient | null = null

export function getChatClient(): ChatClient {
  if (!chatClientInstance) {
    chatClientInstance = new ChatClient()
  }
  return chatClientInstance
}

// Legacy compatibility helpers
export namespace LegacyCompat {
  /**
   * Helper to migrate from legacy agent chat API calls
   */
  export async function sendAgentChatMessage(
    agentId: string,
    message: string,
    taskType?: string,
    threadId?: string,
    userId?: string
  ): Promise<any> {
    const client = getChatClient()
    const response = await client.sendAgentMessage(agentId, message, {
      taskType,
      threadId
    })

    // Transform to legacy response format
    return {
      response: response.response,
      usage: response.usage,
      limit: response.limit,
      agent: response.agent
    }
  }

  /**
   * Helper to migrate from legacy Shopify AI API calls
   */
  export async function sendShopifyAIChatMessage(
    message: string,
    taskType: string,
    threadId: string,
    attachments?: UploadedFile[]
  ): Promise<any> {
    const client = getChatClient()
    const response = await client.sendShopifyMessage(message, {
      taskType,
      threadId,
      attachments
    })

    // Transform to legacy response format
    return {
      response: response.response,
      threadId: response.threadId,
      messageId: response.messageId,
      usage: response.usage
    }
  }

  /**
   * Helper to migrate from legacy AI Store Manager API calls
   */
  export async function sendAIStoreManagerMessage(
    message: string,
    threadId: string,
    attachments?: UploadedFile[]
  ): Promise<any> {
    const client = getChatClient()
    const response = await client.sendStoreManagerMessage(message, {
      threadId,
      attachments
    })

    // Transform to legacy response format
    return {
      response: response.response,
      threadId: response.threadId,
      messageId: response.messageId,
      usage: response.usage
    }
  }

  /**
   * Helper to migrate from legacy meal planning API calls
   */
  export async function sendMealPlanningMessage(
    message: string,
    context: any = {}
  ): Promise<any> {
    const client = getChatClient()
    const response = await client.sendMealPlanningMessage(message, {
      mealPlanningContext: context
    })

    // Transform to legacy response format
    return {
      response: response.response,
      meal_plan: response.meal_plan,
      context_used: response.context_used
    }
  }
}

// Export commonly used types for convenience
export type { UnifiedChatRequest, UnifiedChatResponse, ChatType }
