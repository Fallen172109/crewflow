// OAuth Security Utilities
// Advanced security features for OAuth 2.0 integrations

import crypto from 'crypto'
import { createSupabaseServerClient } from '../supabase'

export interface SecurityConfig {
  encryptionKey: string
  maxStateAge: number // in milliseconds
  rateLimitWindow: number // in milliseconds
  maxRequestsPerWindow: number
  enableAuditLogging: boolean
  requirePKCE: string[] // integration IDs that require PKCE
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

export interface SecurityViolation {
  type: 'rate_limit' | 'invalid_state' | 'expired_state' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metadata?: any
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  encryptionKey: process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-in-production',
  maxStateAge: 10 * 60 * 1000, // 10 minutes
  rateLimitWindow: 60 * 1000, // 1 minute
  maxRequestsPerWindow: 10,
  enableAuditLogging: true,
  requirePKCE: ['google-workspace', 'salesforce', 'hubspot']
}

export class OAuthSecurityManager {
  private config: SecurityConfig
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(config?: Partial<SecurityConfig>) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config }
  }

  // Generate cryptographically secure random string
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url')
  }

  // Generate PKCE challenge and verifier
  generatePKCE(): { verifier: string; challenge: string; method: string } {
    const verifier = this.generateSecureRandom(32)
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url')
    
    return {
      verifier,
      challenge,
      method: 'S256'
    }
  }

  // Validate PKCE verifier against challenge
  validatePKCE(verifier: string, challenge: string): boolean {
    const computedChallenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url')
    
    return computedChallenge === challenge
  }

  // Encrypt sensitive data
  encrypt(data: string): string {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32)
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipher(algorithm, key)
    cipher.setAAD(Buffer.from('oauth-token', 'utf8'))
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  // Decrypt sensitive data
  decrypt(encryptedData: string): string {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32)
    
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipher(algorithm, key)
    decipher.setAAD(Buffer.from('oauth-token', 'utf8'))
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  // Validate OAuth state parameter
  validateState(state: string): { valid: boolean; violation?: SecurityViolation } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8')
      const stateData = JSON.parse(decoded)
      
      // Check required fields
      if (!stateData.integrationId || !stateData.userId || !stateData.nonce || !stateData.timestamp) {
        return {
          valid: false,
          violation: {
            type: 'invalid_state',
            severity: 'high',
            description: 'OAuth state parameter missing required fields'
          }
        }
      }
      
      // Check state age
      const stateAge = Date.now() - stateData.timestamp
      if (stateAge > this.config.maxStateAge) {
        return {
          valid: false,
          violation: {
            type: 'expired_state',
            severity: 'medium',
            description: `OAuth state expired (age: ${stateAge}ms, max: ${this.config.maxStateAge}ms)`
          }
        }
      }
      
      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        violation: {
          type: 'invalid_state',
          severity: 'high',
          description: 'OAuth state parameter is malformed or corrupted'
        }
      }
    }
  }

  // Rate limiting for OAuth requests
  checkRateLimit(identifier: string): RateLimitResult {
    const now = Date.now()
    const key = `oauth:${identifier}`
    const existing = this.rateLimitStore.get(key)
    
    if (!existing || now > existing.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow
      })
      
      return {
        allowed: true,
        remaining: this.config.maxRequestsPerWindow - 1,
        resetTime: now + this.config.rateLimitWindow
      }
    }
    
    if (existing.count >= this.config.maxRequestsPerWindow) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        retryAfter: Math.ceil((existing.resetTime - now) / 1000)
      }
    }
    
    // Increment counter
    existing.count++
    this.rateLimitStore.set(key, existing)
    
    return {
      allowed: true,
      remaining: this.config.maxRequestsPerWindow - existing.count,
      resetTime: existing.resetTime
    }
  }

  // Log security violations
  async logSecurityViolation(
    userId: string | null,
    integrationId: string,
    violation: SecurityViolation,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enableAuditLogging) return
    
    try {
      const supabase = createSupabaseServerClient()
      await supabase
        .from('oauth_audit_log')
        .insert({
          user_id: userId,
          integration_id: integrationId,
          event_type: 'security_violation',
          event_description: violation.description,
          error_code: violation.type.toUpperCase(),
          error_message: violation.description,
          metadata: {
            violation,
            ...metadata
          }
        })
    } catch (error) {
      console.error('Failed to log security violation:', error)
    }
  }

  // Validate request origin and referrer
  validateRequestOrigin(request: Request, allowedOrigins: string[]): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    if (!origin && !referer) return false
    
    const requestOrigin = origin || new URL(referer!).origin
    return allowedOrigins.includes(requestOrigin)
  }

  // Generate secure webhook signature
  generateWebhookSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateWebhookSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  // Check if integration requires PKCE
  requiresPKCE(integrationId: string): boolean {
    return this.config.requirePKCE.includes(integrationId)
  }

  // Clean up expired rate limit entries
  cleanupRateLimits(): void {
    const now = Date.now()
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now > data.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }
  }
}

// Create security manager instance
export function createSecurityManager(config?: Partial<SecurityConfig>): OAuthSecurityManager {
  return new OAuthSecurityManager(config)
}

// Security middleware for OAuth routes
export function createSecurityMiddleware(securityManager: OAuthSecurityManager) {
  return async (request: Request, userId?: string) => {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // Rate limiting
    const rateLimitResult = securityManager.checkRateLimit(ip)
    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      }
    }
    
    // Origin validation for production
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL!,
        'https://crewflow.com',
        'https://www.crewflow.com'
      ].filter(Boolean)
      
      if (!securityManager.validateRequestOrigin(request, allowedOrigins)) {
        await securityManager.logSecurityViolation(
          userId || null,
          'unknown',
          {
            type: 'suspicious_activity',
            severity: 'medium',
            description: 'Request from unauthorized origin'
          },
          { ip, origin: request.headers.get('origin') }
        )
        
        return {
          allowed: false,
          error: 'Unauthorized origin'
        }
      }
    }
    
    return { allowed: true }
  }
}
