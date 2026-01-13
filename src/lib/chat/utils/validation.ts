// Chat Request Validation Utilities
// Comprehensive validation for unified chat requests

import {
  UnifiedChatRequest,
  ValidationResult,
  ChatValidationError,
  CHAT_CONFIG,
  SUPPORTED_FILE_TYPES,
  SupportedFileType
} from '../types'

// Known valid agent IDs for Shopify-focused system
const VALID_AGENT_IDS = ['shopify-ai', 'ai-store-manager', 'store-manager']

export function validateChatRequest(request: UnifiedChatRequest): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate required fields
  if (!request.message || typeof request.message !== 'string') {
    errors.push('Message is required and must be a string')
  } else if (request.message.trim().length === 0) {
    errors.push('Message cannot be empty')
  } else if (request.message.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
    errors.push(`Message exceeds maximum length of ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} characters`)
  }

  if (!request.threadId || typeof request.threadId !== 'string') {
    errors.push('Thread ID is required and must be a string')
  }

  // Validate chat type and agent ID relationship
  if (request.chatType === 'agent' && !request.agentId) {
    errors.push('Agent ID is required when chat type is "agent"')
  }

  // Validate agent ID if provided
  if (request.agentId) {
    if (!VALID_AGENT_IDS.includes(request.agentId)) {
      errors.push(`Agent with ID "${request.agentId}" not found`)
    }
  }

  // Validate attachments
  if (request.attachments && Array.isArray(request.attachments)) {
    if (request.attachments.length > CHAT_CONFIG.MAX_ATTACHMENTS) {
      errors.push(`Maximum ${CHAT_CONFIG.MAX_ATTACHMENTS} attachments allowed`)
    }

    request.attachments.forEach((attachment, index) => {
      if (!attachment.name || !attachment.type || !attachment.url) {
        errors.push(`Attachment ${index + 1} is missing required fields (name, type, url)`)
      }

      if (attachment.size && attachment.size > CHAT_CONFIG.MAX_ATTACHMENT_SIZE) {
        errors.push(`Attachment "${attachment.name}" exceeds maximum size of ${CHAT_CONFIG.MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB`)
      }

      if (attachment.type && !SUPPORTED_FILE_TYPES.includes(attachment.type as SupportedFileType)) {
        warnings.push(`Attachment "${attachment.name}" has unsupported file type: ${attachment.type}`)
      }
    })
  }

  // Validate task type
  if (request.taskType && typeof request.taskType !== 'string') {
    errors.push('Task type must be a string')
  }

  // Validate legacy fields
  if (request.userId && typeof request.userId !== 'string') {
    errors.push('User ID must be a string')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

export function sanitizeMessage(message: string): string {
  // Remove potentially harmful content
  return message
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, CHAT_CONFIG.MAX_MESSAGE_LENGTH) // Ensure length limit
}

export function validateThreadAccess(threadId: string, userId: string): boolean {
  // Basic validation - actual implementation would check database
  if (!threadId || !userId) return false

  // Temporary threads are always accessible
  if (threadId.startsWith('temp-')) return true

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(threadId)
}

export function detectChatType(request: UnifiedChatRequest): string {
  // Explicit chat type provided
  if (request.chatType) return request.chatType

  // Agent-based detection for Shopify-focused system
  if (request.agentId) {
    if (VALID_AGENT_IDS.includes(request.agentId)) {
      return request.agentId === 'ai-store-manager' ? 'ai-store-manager' : 'shopify-ai'
    }
    return 'shopify-ai' // Default to shopify-ai for unknown agents
  }

  // Context-based detection
  if (request.taskType === 'business_automation') return 'ai-store-manager'

  // Default fallback to AI Store Manager
  return 'ai-store-manager'
}

export function normalizeRequest(request: any): UnifiedChatRequest {
  // Handle legacy request formats and normalize to unified format
  const normalized: UnifiedChatRequest = {
    message: request.message || '',
    threadId: request.threadId || '',
    chatType: request.chatType,
    agentId: request.agentId,
    taskType: request.taskType,
    attachments: request.attachments,
    userId: request.userId,
    context: request.context
  }

  // Auto-detect chat type if not provided
  if (!normalized.chatType) {
    normalized.chatType = detectChatType(normalized) as any
  }

  return normalized
}

export function createValidationError(errors: string[]): ChatValidationError {
  return new ChatValidationError(
    `Validation failed: ${errors.join(', ')}`,
    errors
  )
}

// Rate limiting validation
export function validateRateLimit(userId: string, requestCount: number, windowMs: number): boolean {
  // This would typically check against a Redis cache or database
  // For now, return a simple check
  return requestCount <= CHAT_CONFIG.RATE_LIMIT_MAX_REQUESTS
}

// Security validation
export function validateSecurityConstraints(request: UnifiedChatRequest, user: any): ValidationResult {
  const errors: string[] = []

  // Check if user has access to the requested agent (simplified - all Shopify agents accessible)
  if (request.agentId && !VALID_AGENT_IDS.includes(request.agentId)) {
    errors.push(`Access denied to agent "${request.agentId}"`)
  }

  // Validate thread ownership (would check database in real implementation)
  if (!validateThreadAccess(request.threadId, user.id)) {
    errors.push('Access denied to the specified thread')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
