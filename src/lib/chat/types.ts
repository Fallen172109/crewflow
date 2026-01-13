// Unified Chat System Types
// Type definitions for the consolidated chat API system

import { UploadedFile } from '@/components/ui/FileUpload'

export type ChatType = 'shopify-ai' | 'ai-store-manager'

export interface UnifiedChatRequest {
  // Core message data
  message: string

  // Routing parameters
  agentId?: string           // For Shopify agents
  chatType?: ChatType        // Explicit chat type

  // Context parameters
  taskType?: string          // Task context (general, business_automation, etc.)
  threadId: string           // Required for all conversations

  // Optional parameters
  attachments?: UploadedFile[]
  userId?: string            // Legacy support
  context?: any              // General context (storeId, etc.)
}

export interface AgentInfo {
  id: string
  name: string
  framework: string
}

export interface UnifiedChatResponse {
  // Core response
  response: string
  success: boolean

  // Context information
  threadId: string
  messageId?: string

  // Agent information
  agent?: AgentInfo

  // Usage tracking
  usage?: number
  limit?: number
  tokensUsed?: number

  // Specialized responses
  detectedActions?: any[]   // For Shopify actions
  productPreview?: any      // For product creation previews
  metadata?: any            // Additional response metadata

  // Error handling
  error?: string
  details?: any
}

export interface ChatHandler {
  canHandle(request: UnifiedChatRequest): boolean
  process(request: UnifiedChatRequest, user: any): Promise<UnifiedChatResponse>
}

export interface ChatRouterConfig {
  enableLegacySupport: boolean
  enableAnalytics: boolean
  enableRateLimit: boolean
  maxRequestSize: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface UsageInfo {
  currentUsage: number
  limit: number
  tokensUsed?: number
  costEstimate?: number
}

// Legacy request formats for backward compatibility
export interface LegacyShopifyAIChatRequest {
  message: string
  taskType: string
  threadId: string
  attachments?: UploadedFile[]
  userId?: string
}

// Error types
export class ChatValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message)
    this.name = 'ChatValidationError'
  }
}

export class ChatHandlerError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message)
    this.name = 'ChatHandlerError'
  }
}

export class ChatAuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'ChatAuthenticationError'
  }
}

export class ChatRateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message)
    this.name = 'ChatRateLimitError'
  }
}

// Analytics types
export interface ChatAnalytics {
  requestId: string
  userId: string
  chatType: ChatType
  agentId?: string
  timestamp: Date
  latency: number
  tokensUsed?: number
  success: boolean
  error?: string
}

// Configuration constants
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_ATTACHMENTS: 10,
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 60,
} as const

// Supported file types for attachments
export const SUPPORTED_FILE_TYPES = [
  'text/plain',
  'text/csv',
  'application/json',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type SupportedFileType = typeof SUPPORTED_FILE_TYPES[number]
