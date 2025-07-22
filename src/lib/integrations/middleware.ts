// OAuth Security Middleware
// Production-ready middleware for OAuth API routes

import { NextRequest, NextResponse } from 'next/server'
import { createSecurityManager, type SecurityViolation } from './security'
import { requireAuth } from '../auth'

export interface MiddlewareConfig {
  requireAuth?: boolean
  rateLimitByUser?: boolean
  rateLimitByIP?: boolean
  validateOrigin?: boolean
  logRequests?: boolean
  allowedMethods?: string[]
}

export interface MiddlewareResult {
  success: boolean
  response?: NextResponse
  userId?: string
  error?: string
}

// Default middleware configuration
const DEFAULT_CONFIG: MiddlewareConfig = {
  requireAuth: true,
  rateLimitByUser: true,
  rateLimitByIP: true,
  validateOrigin: true,
  logRequests: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
}

export class OAuthMiddleware {
  private securityManager = createSecurityManager()
  private config: MiddlewareConfig

  constructor(config?: Partial<MiddlewareConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Main middleware function
  async handle(request: NextRequest, config?: Partial<MiddlewareConfig>): Promise<MiddlewareResult> {
    const effectiveConfig = { ...this.config, ...config }
    
    try {
      // Method validation
      if (effectiveConfig.allowedMethods && 
          !effectiveConfig.allowedMethods.includes(request.method)) {
        return this.createErrorResponse('Method not allowed', 405)
      }

      // Authentication check
      let userId: string | undefined
      if (effectiveConfig.requireAuth) {
        try {
          const user = await requireAuth()
          userId = user.id
        } catch (error) {
          return this.createErrorResponse('Authentication required', 401)
        }
      }

      // Rate limiting
      const rateLimitResult = await this.checkRateLimits(request, userId, effectiveConfig)
      if (!rateLimitResult.success) {
        return rateLimitResult
      }

      // Origin validation
      if (effectiveConfig.validateOrigin) {
        const originResult = this.validateOrigin(request)
        if (!originResult.success) {
          await this.logSecurityViolation(userId, {
            type: 'suspicious_activity',
            severity: 'medium',
            description: 'Request from unauthorized origin',
            metadata: {
              origin: request.headers.get('origin'),
              referer: request.headers.get('referer'),
              userAgent: request.headers.get('user-agent')
            }
          })
          return originResult
        }
      }

      // Request logging
      if (effectiveConfig.logRequests) {
        await this.logRequest(request, userId)
      }

      return { success: true, userId }
    } catch (error) {
      console.error('OAuth middleware error:', error)
      return this.createErrorResponse('Internal server error', 500)
    }
  }

  // Rate limiting checks
  private async checkRateLimits(
    request: NextRequest, 
    userId?: string, 
    config?: MiddlewareConfig
  ): Promise<MiddlewareResult> {
    const ip = this.getClientIP(request)
    
    // IP-based rate limiting
    if (config?.rateLimitByIP) {
      const ipRateLimit = this.securityManager.checkRateLimit(`ip:${ip}`)
      if (!ipRateLimit.allowed) {
        await this.logSecurityViolation(userId, {
          type: 'rate_limit',
          severity: 'low',
          description: `IP rate limit exceeded: ${ip}`,
          metadata: { ip, retryAfter: ipRateLimit.retryAfter }
        })
        
        return this.createErrorResponse(
          'Rate limit exceeded',
          429,
          {
            'Retry-After': ipRateLimit.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': ipRateLimit.resetTime.toString()
          }
        )
      }
    }

    // User-based rate limiting
    if (config?.rateLimitByUser && userId) {
      const userRateLimit = this.securityManager.checkRateLimit(`user:${userId}`)
      if (!userRateLimit.allowed) {
        await this.logSecurityViolation(userId, {
          type: 'rate_limit',
          severity: 'low',
          description: `User rate limit exceeded: ${userId}`,
          metadata: { userId, retryAfter: userRateLimit.retryAfter }
        })
        
        return this.createErrorResponse(
          'Rate limit exceeded',
          429,
          {
            'Retry-After': userRateLimit.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': userRateLimit.resetTime.toString()
          }
        )
      }
    }

    return { success: true }
  }

  // Origin validation
  private validateOrigin(request: NextRequest): MiddlewareResult {
    if (process.env.NODE_ENV !== 'production') {
      return { success: true } // Skip in development
    }

    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'https://crewflow.ai',
      'https://www.crewflow.ai'
    ].filter(Boolean)

    if (!this.securityManager.validateRequestOrigin(request, allowedOrigins)) {
      return this.createErrorResponse('Unauthorized origin', 403)
    }

    return { success: true }
  }

  // Get client IP address
  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           'unknown'
  }

  // Log security violations
  private async logSecurityViolation(userId: string | undefined, violation: SecurityViolation): Promise<void> {
    await this.securityManager.logSecurityViolation(
      userId || null,
      'middleware',
      violation
    )
  }

  // Log requests for audit trail
  private async logRequest(request: NextRequest, userId?: string): Promise<void> {
    try {
      const { createSupabaseServerClient } = await import('../supabase')
      const supabase = createSupabaseServerClient()
      
      await supabase
        .from('oauth_audit_log')
        .insert({
          user_id: userId || null,
          integration_id: 'middleware',
          event_type: 'api_request',
          event_description: `${request.method} ${request.nextUrl.pathname}`,
          ip_address: this.getClientIP(request),
          user_agent: request.headers.get('user-agent'),
          metadata: {
            method: request.method,
            path: request.nextUrl.pathname,
            query: Object.fromEntries(request.nextUrl.searchParams),
            headers: Object.fromEntries(request.headers.entries())
          }
        })
    } catch (error) {
      console.warn('Failed to log request:', error)
    }
  }

  // Create error response
  private createErrorResponse(
    message: string, 
    status: number, 
    headers?: Record<string, string>
  ): MiddlewareResult {
    const response = NextResponse.json(
      { error: message, timestamp: new Date().toISOString() },
      { status, headers }
    )
    
    return { success: false, response, error: message }
  }

  // Cleanup expired rate limits periodically
  cleanup(): void {
    this.securityManager.cleanupRateLimits()
  }
}

// Create middleware instance
export function createOAuthMiddleware(config?: Partial<MiddlewareConfig>): OAuthMiddleware {
  return new OAuthMiddleware(config)
}

// Convenience function for API routes
export async function withOAuthSecurity(
  request: NextRequest,
  handler: (request: NextRequest, userId?: string) => Promise<NextResponse>,
  config?: Partial<MiddlewareConfig>
): Promise<NextResponse> {
  const middleware = createOAuthMiddleware(config)
  const result = await middleware.handle(request, config)
  
  if (!result.success) {
    return result.response || NextResponse.json(
      { error: result.error || 'Security check failed' },
      { status: 500 }
    )
  }
  
  return handler(request, result.userId)
}

// State validation middleware
export async function validateOAuthState(
  state: string,
  userId?: string
): Promise<{ valid: boolean; error?: string; violation?: SecurityViolation }> {
  const securityManager = createSecurityManager()
  const validation = securityManager.validateState(state)
  
  if (!validation.valid && validation.violation) {
    await securityManager.logSecurityViolation(
      userId || null,
      'state_validation',
      validation.violation
    )
  }
  
  return {
    valid: validation.valid,
    error: validation.violation?.description,
    violation: validation.violation
  }
}

// PKCE validation middleware
export function validatePKCE(verifier: string, challenge: string): boolean {
  const securityManager = createSecurityManager()
  return securityManager.validatePKCE(verifier, challenge)
}

// Webhook signature validation
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const securityManager = createSecurityManager()
  return securityManager.verifyWebhookSignature(payload, signature, secret)
}
