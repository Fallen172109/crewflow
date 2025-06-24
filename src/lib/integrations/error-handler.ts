// OAuth Error Handling and Recovery System
// Comprehensive error handling with automatic retry and user-friendly messages

import { createSupabaseServerClient } from '../supabase'

export interface OAuthError {
  code: string
  message: string
  description?: string
  retryable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  provider?: string
  userId?: string
  integrationId?: string
  timestamp: Date
  context?: any
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  retryableErrors: string[]
}

export interface RecoveryAction {
  type: 'retry' | 'refresh_token' | 'reconnect' | 'manual_intervention'
  description: string
  automated: boolean
  priority: number
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'SERVER_ERROR',
    'TEMPORARY_UNAVAILABLE'
  ]
}

// Error code mappings with user-friendly messages
const ERROR_MESSAGES: Record<string, { message: string; description?: string; retryable: boolean; severity: OAuthError['severity'] }> = {
  // Network and connectivity errors
  'NETWORK_ERROR': {
    message: 'Network connection failed',
    description: 'Please check your internet connection and try again.',
    retryable: true,
    severity: 'medium'
  },
  'TIMEOUT': {
    message: 'Request timed out',
    description: 'The request took too long to complete. Please try again.',
    retryable: true,
    severity: 'medium'
  },
  'RATE_LIMITED': {
    message: 'Too many requests',
    description: 'Please wait a moment before trying again.',
    retryable: true,
    severity: 'low'
  },

  // OAuth specific errors
  'INVALID_CLIENT': {
    message: 'OAuth configuration error',
    description: 'The OAuth client credentials are invalid or not configured properly.',
    retryable: false,
    severity: 'high'
  },
  'INVALID_GRANT': {
    message: 'Authorization expired',
    description: 'The authorization code has expired. Please try connecting again.',
    retryable: false,
    severity: 'medium'
  },
  'ACCESS_DENIED': {
    message: 'Access denied',
    description: 'You denied access to the integration. Please try again and grant the required permissions.',
    retryable: false,
    severity: 'low'
  },
  'INVALID_SCOPE': {
    message: 'Invalid permissions requested',
    description: 'The requested permissions are not valid for this integration.',
    retryable: false,
    severity: 'medium'
  },
  'TOKEN_EXPIRED': {
    message: 'Access token expired',
    description: 'Your access token has expired. We\'ll try to refresh it automatically.',
    retryable: true,
    severity: 'low'
  },

  // Provider specific errors
  'PROVIDER_ERROR': {
    message: 'Provider service error',
    description: 'The integration service is experiencing issues. Please try again later.',
    retryable: true,
    severity: 'medium'
  },
  'INSUFFICIENT_PERMISSIONS': {
    message: 'Insufficient permissions',
    description: 'Your account doesn\'t have the required permissions for this integration.',
    retryable: false,
    severity: 'medium'
  },

  // Configuration errors
  'OAUTH_NOT_CONFIGURED': {
    message: 'Integration not configured',
    description: 'This integration hasn\'t been set up yet. Please contact your administrator.',
    retryable: false,
    severity: 'high'
  },
  'INVALID_CONFIGURATION': {
    message: 'Configuration error',
    description: 'There\'s an issue with the integration configuration.',
    retryable: false,
    severity: 'high'
  },

  // Security errors
  'INVALID_STATE': {
    message: 'Security validation failed',
    description: 'The OAuth state parameter is invalid. Please try again.',
    retryable: false,
    severity: 'high'
  },
  'CSRF_DETECTED': {
    message: 'Security violation detected',
    description: 'A potential security issue was detected. Please try again.',
    retryable: false,
    severity: 'critical'
  },

  // Generic errors
  'UNKNOWN_ERROR': {
    message: 'An unexpected error occurred',
    description: 'Something went wrong. Please try again or contact support if the issue persists.',
    retryable: true,
    severity: 'medium'
  }
}

export class OAuthErrorHandler {
  private retryConfig: RetryConfig

  constructor(config?: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  // Create standardized error object
  createError(
    code: string,
    originalError?: any,
    context?: any
  ): OAuthError {
    const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES['UNKNOWN_ERROR']
    
    return {
      code,
      message: errorInfo.message,
      description: errorInfo.description,
      retryable: errorInfo.retryable,
      severity: errorInfo.severity,
      timestamp: new Date(),
      context: {
        originalError: originalError?.message || originalError,
        stack: originalError?.stack,
        ...context
      }
    }
  }

  // Parse error from various sources
  parseError(error: any, context?: any): OAuthError {
    let code = 'UNKNOWN_ERROR'
    
    if (error?.code) {
      code = error.code
    } else if (error?.message) {
      // Try to extract error code from message
      if (error.message.includes('network') || error.message.includes('fetch')) {
        code = 'NETWORK_ERROR'
      } else if (error.message.includes('timeout')) {
        code = 'TIMEOUT'
      } else if (error.message.includes('rate limit')) {
        code = 'RATE_LIMITED'
      } else if (error.message.includes('invalid_client')) {
        code = 'INVALID_CLIENT'
      } else if (error.message.includes('invalid_grant')) {
        code = 'INVALID_GRANT'
      } else if (error.message.includes('access_denied')) {
        code = 'ACCESS_DENIED'
      } else if (error.message.includes('expired')) {
        code = 'TOKEN_EXPIRED'
      }
    }

    return this.createError(code, error, context)
  }

  // Determine recovery actions for an error
  getRecoveryActions(error: OAuthError): RecoveryAction[] {
    const actions: RecoveryAction[] = []

    switch (error.code) {
      case 'TOKEN_EXPIRED':
        actions.push({
          type: 'refresh_token',
          description: 'Automatically refresh the access token',
          automated: true,
          priority: 1
        })
        break

      case 'NETWORK_ERROR':
      case 'TIMEOUT':
      case 'RATE_LIMITED':
        actions.push({
          type: 'retry',
          description: 'Retry the request with exponential backoff',
          automated: true,
          priority: 1
        })
        break

      case 'INVALID_GRANT':
      case 'ACCESS_DENIED':
        actions.push({
          type: 'reconnect',
          description: 'Reconnect the integration with fresh authorization',
          automated: false,
          priority: 2
        })
        break

      case 'OAUTH_NOT_CONFIGURED':
      case 'INVALID_CONFIGURATION':
        actions.push({
          type: 'manual_intervention',
          description: 'Administrator needs to configure OAuth credentials',
          automated: false,
          priority: 3
        })
        break

      default:
        if (error.retryable) {
          actions.push({
            type: 'retry',
            description: 'Retry the operation',
            automated: true,
            priority: 2
          })
        } else {
          actions.push({
            type: 'manual_intervention',
            description: 'Manual intervention required',
            automated: false,
            priority: 3
          })
        }
    }

    return actions.sort((a, b) => a.priority - b.priority)
  }

  // Execute retry with exponential backoff
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        const oauthError = this.parseError(error, { ...context, attempt })
        
        // Don't retry if error is not retryable
        if (!oauthError.retryable || !this.retryConfig.retryableErrors.includes(oauthError.code)) {
          throw oauthError
        }
        
        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          throw oauthError
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        )
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, oauthError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw this.parseError(lastError, context)
  }

  // Log error for monitoring and debugging
  async logError(error: OAuthError): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      
      await supabase
        .from('oauth_audit_log')
        .insert({
          user_id: error.userId || null,
          integration_id: error.integrationId || 'unknown',
          event_type: 'error_occurred',
          event_description: error.message,
          error_code: error.code,
          error_message: error.description,
          metadata: {
            severity: error.severity,
            retryable: error.retryable,
            context: error.context,
            timestamp: error.timestamp.toISOString()
          }
        })
    } catch (logError) {
      console.error('Failed to log OAuth error:', logError)
    }
  }

  // Get user-friendly error message
  getUserMessage(error: OAuthError): { title: string; message: string; actions?: string[] } {
    const actions: string[] = []
    const recoveryActions = this.getRecoveryActions(error)
    
    recoveryActions.forEach(action => {
      if (!action.automated) {
        switch (action.type) {
          case 'reconnect':
            actions.push('Try reconnecting the integration')
            break
          case 'manual_intervention':
            actions.push('Contact your administrator for help')
            break
        }
      }
    })

    return {
      title: error.message,
      message: error.description || 'Please try again or contact support if the issue persists.',
      actions: actions.length > 0 ? actions : undefined
    }
  }
}

// Create error handler instance
export function createErrorHandler(config?: Partial<RetryConfig>): OAuthErrorHandler {
  return new OAuthErrorHandler(config)
}

// Utility function for handling async operations with error recovery
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: any,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const errorHandler = createErrorHandler(retryConfig)
  
  try {
    return await errorHandler.executeWithRetry(operation, context)
  } catch (error) {
    const oauthError = error instanceof Error && 'code' in error 
      ? error as OAuthError 
      : errorHandler.parseError(error, context)
    
    await errorHandler.logError(oauthError)
    throw oauthError
  }
}
