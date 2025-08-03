/**
 * Standardized Error Handlers for CrewFlow API
 * Provides consistent error handling across all endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createErrorResponse, 
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  createValidationErrorResponse,
  createServerErrorResponse,
  createRateLimitErrorResponse,
  ERROR_CODES,
  HTTP_STATUS,
  ValidationError
} from './response-formatter'

/**
 * Handle authentication errors
 */
export function handleAuthError(error: any): NextResponse {
  if (error?.message === 'Authentication required') {
    return createAuthErrorResponse('Authentication required')
  }
  
  if (error?.message === 'Invalid token') {
    return createAuthErrorResponse('Invalid authentication token')
  }
  
  if (error?.message === 'Token expired') {
    return createErrorResponse(
      ERROR_CODES.TOKEN_EXPIRED,
      'Authentication token has expired',
      undefined,
      { status: HTTP_STATUS.UNAUTHORIZED }
    )
  }
  
  return createAuthErrorResponse('Authentication failed')
}

/**
 * Handle authorization errors
 */
export function handleAuthorizationError(requiredRole?: string): NextResponse {
  const message = requiredRole 
    ? `${requiredRole} access required`
    : 'Insufficient permissions'
    
  return createAuthorizationErrorResponse(message)
}

/**
 * Handle validation errors
 */
export function handleValidationError(errors: ValidationError[] | string): NextResponse {
  if (typeof errors === 'string') {
    return createValidationErrorResponse([{
      field: 'general',
      message: errors
    }])
  }
  
  return createValidationErrorResponse(errors)
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: any): NextResponse {
  console.error('Database error:', error)
  
  // Handle specific database error types
  if (error?.code === '23505') { // Unique constraint violation
    return createErrorResponse(
      ERROR_CODES.ALREADY_EXISTS,
      'Resource already exists',
      undefined,
      { status: HTTP_STATUS.CONFLICT }
    )
  }
  
  if (error?.code === '23503') { // Foreign key constraint violation
    return createErrorResponse(
      ERROR_CODES.CONFLICT,
      'Cannot perform operation due to existing dependencies',
      undefined,
      { status: HTTP_STATUS.CONFLICT }
    )
  }
  
  return createErrorResponse(
    ERROR_CODES.DATABASE_ERROR,
    'Database operation failed',
    process.env.NODE_ENV === 'development' ? error : undefined,
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  )
}

/**
 * Handle file upload errors
 */
export function handleFileUploadError(error: any): NextResponse {
  if (error?.message?.includes('File size exceeds')) {
    return createErrorResponse(
      ERROR_CODES.FILE_TOO_LARGE,
      'File size exceeds the maximum allowed limit',
      { maxSize: '25MB' },
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }
  
  if (error?.message?.includes('File type not allowed')) {
    return createErrorResponse(
      ERROR_CODES.INVALID_FILE_TYPE,
      'File type is not supported',
      undefined,
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }
  
  return createErrorResponse(
    ERROR_CODES.UPLOAD_FAILED,
    'File upload failed',
    process.env.NODE_ENV === 'development' ? error : undefined,
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  )
}

/**
 * Handle Shopify API errors
 */
export function handleShopifyError(error: any): NextResponse {
  console.error('Shopify API error:', error)
  
  if (error?.response?.status === 401) {
    return createErrorResponse(
      ERROR_CODES.SHOPIFY_API_ERROR,
      'Shopify authentication failed',
      { suggestion: 'Please reconnect your Shopify store' },
      { status: HTTP_STATUS.UNAUTHORIZED }
    )
  }
  
  if (error?.response?.status === 429) {
    return createRateLimitErrorResponse('Shopify API rate limit exceeded')
  }
  
  if (error?.response?.status === 404) {
    return createErrorResponse(
      ERROR_CODES.NOT_FOUND,
      'Shopify resource not found',
      undefined,
      { status: HTTP_STATUS.NOT_FOUND }
    )
  }
  
  return createErrorResponse(
    ERROR_CODES.SHOPIFY_API_ERROR,
    'Shopify API operation failed',
    process.env.NODE_ENV === 'development' ? error : undefined,
    { status: HTTP_STATUS.BAD_GATEWAY }
  )
}

/**
 * Handle AI service errors
 */
export function handleAIServiceError(error: any, service: string = 'AI'): NextResponse {
  console.error(`${service} service error:`, error)
  
  if (error?.response?.status === 429) {
    return createRateLimitErrorResponse(`${service} service rate limit exceeded`)
  }
  
  if (error?.response?.status === 401) {
    return createErrorResponse(
      ERROR_CODES.AI_SERVICE_ERROR,
      `${service} service authentication failed`,
      undefined,
      { status: HTTP_STATUS.UNAUTHORIZED }
    )
  }
  
  return createErrorResponse(
    ERROR_CODES.AI_SERVICE_ERROR,
    `${service} service operation failed`,
    process.env.NODE_ENV === 'development' ? error : undefined,
    { status: HTTP_STATUS.BAD_GATEWAY }
  )
}

/**
 * Handle OAuth errors
 */
export function handleOAuthError(error: any): NextResponse {
  console.error('OAuth error:', error)
  
  if (error?.error === 'access_denied') {
    return createErrorResponse(
      ERROR_CODES.OAUTH_ERROR,
      'OAuth access denied by user',
      undefined,
      { status: HTTP_STATUS.FORBIDDEN }
    )
  }
  
  if (error?.error === 'invalid_grant') {
    return createErrorResponse(
      ERROR_CODES.OAUTH_ERROR,
      'OAuth grant is invalid or expired',
      undefined,
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }
  
  return createErrorResponse(
    ERROR_CODES.OAUTH_ERROR,
    'OAuth operation failed',
    process.env.NODE_ENV === 'development' ? error : undefined,
    { status: HTTP_STATUS.BAD_REQUEST }
  )
}

/**
 * Generic error handler that routes to specific handlers
 */
export function handleGenericError(error: any, context?: string): NextResponse {
  console.error(`Generic error${context ? ` in ${context}` : ''}:`, error)
  
  // Route to specific handlers based on error type or message
  if (error?.message?.includes('Authentication')) {
    return handleAuthError(error)
  }
  
  if (error?.message?.includes('permission') || error?.message?.includes('authorization')) {
    return handleAuthorizationError()
  }
  
  if (error?.code?.startsWith('23')) { // PostgreSQL error codes
    return handleDatabaseError(error)
  }
  
  if (error?.message?.includes('File') || error?.message?.includes('upload')) {
    return handleFileUploadError(error)
  }
  
  if (error?.message?.includes('Shopify') || context === 'shopify') {
    return handleShopifyError(error)
  }
  
  if (context === 'ai' || error?.message?.includes('AI')) {
    return handleAIServiceError(error, context || 'AI')
  }
  
  if (error?.error || context === 'oauth') {
    return handleOAuthError(error)
  }
  
  // Default server error
  return createServerErrorResponse(
    'An unexpected error occurred',
    error instanceof Error ? error : new Error(String(error))
  )
}

/**
 * Middleware wrapper for consistent error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleGenericError(error, context)
    }
  }
}

/**
 * Request validation helper
 */
export function validateRequest(
  request: NextRequest,
  requiredFields: string[],
  body?: any
): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!body && requiredFields.length > 0) {
    errors.push({
      field: 'body',
      message: 'Request body is required'
    })
    return errors
  }
  
  for (const field of requiredFields) {
    if (!body[field]) {
      errors.push({
        field,
        message: `${field} is required`
      })
    }
  }
  
  return errors
}

/**
 * Method validation helper
 */
export function validateMethod(
  request: NextRequest,
  allowedMethods: string[]
): NextResponse | null {
  if (!allowedMethods.includes(request.method)) {
    return createErrorResponse(
      'METHOD_NOT_ALLOWED',
      `Method ${request.method} not allowed`,
      { allowedMethods },
      { status: HTTP_STATUS.METHOD_NOT_ALLOWED }
    )
  }
  return null
}
