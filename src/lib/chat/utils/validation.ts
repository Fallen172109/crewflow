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
import { getAgent } from '@/lib/agents'

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

  if (request.agentId) {
    const agent = getAgent(request.agentId)
    if (!agent) {
      errors.push(`Agent with ID "${request.agentId}" not found`)
    } else {
      // Validate agent-specific requirements
      if (agent.requiresApiConnection && !request.taskType) {
        warnings.push(`Agent "${agent.name}" typically requires a task type for optimal performance`)
      }
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

  // Validate meal planning context
  if (request.chatType === 'meal-planning' && request.mealPlanningContext) {
    const context = request.mealPlanningContext
    
    if (context.conversation_history && !Array.isArray(context.conversation_history)) {
      errors.push('Meal planning conversation history must be an array')
    }

    if (context.pantry_items && !Array.isArray(context.pantry_items)) {
      errors.push('Meal planning pantry items must be an array')
    }

    if (context.dietary_restrictions && !Array.isArray(context.dietary_restrictions)) {
      errors.push('Meal planning dietary restrictions must be an array')
    }
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
  
  // Agent-based detection
  if (request.agentId) {
    const agent = getAgent(request.agentId)
    if (agent?.shopifySpecialized) return 'shopify-ai'
    return 'agent'
  }
  
  // Context-based detection
  if (request.mealPlanningContext) return 'meal-planning'
  if (request.taskType === 'business_automation') return 'ai-store-manager'
  
  // Default fallback
  return 'agent'
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
    mealPlanningContext: request.mealPlanningContext
  }

  // Handle legacy meal planning format
  if (!normalized.chatType && (
    request.conversation_history || 
    request.user_profile || 
    request.pantry_items ||
    request.recent_meal_plans ||
    request.dietary_restrictions ||
    request.nutritional_targets
  )) {
    normalized.chatType = 'meal-planning'
    normalized.mealPlanningContext = {
      conversation_history: request.conversation_history,
      user_profile: request.user_profile,
      pantry_items: request.pantry_items,
      recent_meal_plans: request.recent_meal_plans,
      dietary_restrictions: request.dietary_restrictions,
      nutritional_targets: request.nutritional_targets,
      context_summary: request.context_summary,
      request_intent: request.request_intent
    }
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
  
  // Check if user has access to the requested agent
  if (request.agentId) {
    const agent = getAgent(request.agentId)
    if (agent && !canUserAccessAgent(user.subscription_tier, request.agentId)) {
      errors.push(`Access denied to agent "${request.agentId}" for subscription tier "${user.subscription_tier}"`)
    }
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

// Import the function we need
function canUserAccessAgent(userTier: string | null, agentId: string): boolean {
  // Import here to avoid circular dependency
  const { canUserAccessAgent: checkAccess } = require('@/lib/agents')
  return checkAccess(userTier, agentId)
}
