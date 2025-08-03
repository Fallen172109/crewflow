/**
 * Standardized API Response Formatter for CrewFlow
 * Ensures consistent response structure across all API endpoints
 */

import { NextResponse } from 'next/server'

// Standard response interface
export interface StandardApiResponse<T = any> {
  success: boolean
  data: T | null
  message: string
  error: ErrorDetails | null
  timestamp: string
}

// Error details interface
export interface ErrorDetails {
  code: string
  message: string
  details?: any
  field?: string // For validation errors
  stack?: string // Only in development
}

// Validation error interface
export interface ValidationError {
  field: string
  message: string
  value?: any
}

// Response options
export interface ResponseOptions {
  status?: number
  headers?: Record<string, string>
  includeStack?: boolean
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Request completed successfully',
  options: ResponseOptions = {}
): NextResponse {
  const response: StandardApiResponse<T> = {
    success: true,
    data,
    message,
    error: null,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(response, {
    status: options.status || 200,
    headers: options.headers
  })
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  options: ResponseOptions = {}
): NextResponse {
  const error: ErrorDetails = {
    code,
    message,
    details
  }

  // Include stack trace only in development
  if (options.includeStack && process.env.NODE_ENV === 'development' && details instanceof Error) {
    error.stack = details.stack
  }

  const response: StandardApiResponse = {
    success: false,
    data: null,
    message: 'Request failed',
    error,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(response, {
    status: options.status || 500,
    headers: options.headers
  })
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  message: string = 'Validation failed',
  options: ResponseOptions = {}
): NextResponse {
  const error: ErrorDetails = {
    code: 'VALIDATION_ERROR',
    message,
    details: errors
  }

  const response: StandardApiResponse = {
    success: false,
    data: null,
    message: 'Request validation failed',
    error,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(response, {
    status: options.status || 400,
    headers: options.headers
  })
}

/**
 * Create an authentication error response
 */
export function createAuthErrorResponse(
  message: string = 'Authentication required',
  options: ResponseOptions = {}
): NextResponse {
  return createErrorResponse(
    'AUTH_ERROR',
    message,
    undefined,
    { ...options, status: options.status || 401 }
  )
}

/**
 * Create an authorization error response
 */
export function createAuthorizationErrorResponse(
  message: string = 'Insufficient permissions',
  options: ResponseOptions = {}
): NextResponse {
  return createErrorResponse(
    'AUTHORIZATION_ERROR',
    message,
    undefined,
    { ...options, status: options.status || 403 }
  )
}

/**
 * Create a not found error response
 */
export function createNotFoundErrorResponse(
  resource: string = 'Resource',
  options: ResponseOptions = {}
): NextResponse {
  return createErrorResponse(
    'NOT_FOUND',
    `${resource} not found`,
    undefined,
    { ...options, status: options.status || 404 }
  )
}

/**
 * Create a rate limit error response
 */
export function createRateLimitErrorResponse(
  message: string = 'Rate limit exceeded',
  options: ResponseOptions = {}
): NextResponse {
  return createErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    message,
    undefined,
    { ...options, status: options.status || 429 }
  )
}

/**
 * Create a server error response
 */
export function createServerErrorResponse(
  message: string = 'Internal server error',
  error?: Error,
  options: ResponseOptions = {}
): NextResponse {
  return createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    message,
    error,
    { ...options, status: options.status || 500, includeStack: true }
  )
}

/**
 * Wrap an async API handler with standardized error handling
 */
export function withStandardErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API Error:', error)
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return createAuthErrorResponse()
        }
        if (error.message.includes('not found')) {
          return createNotFoundErrorResponse()
        }
      }
      
      return createServerErrorResponse(
        'An unexpected error occurred',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }
}

/**
 * HTTP Status Code Constants
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const

/**
 * Standard Error Codes
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_ERROR: 'AUTH_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // File Operations
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Integration Specific
  SHOPIFY_API_ERROR: 'SHOPIFY_API_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  OAUTH_ERROR: 'OAUTH_ERROR'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
