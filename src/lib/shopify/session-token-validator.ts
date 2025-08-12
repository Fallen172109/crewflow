import crypto from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Shopify Session Token Validation for CrewFlow
 * Validates session tokens from Shopify App Bridge
 */

export interface SessionTokenPayload {
  iss: string // Issuer (shop domain)
  dest: string // Destination (shop domain)
  aud: string // Audience (API key)
  sub: string // Subject (user ID)
  exp: number // Expiration timestamp
  nbf: number // Not before timestamp
  iat: number // Issued at timestamp
  jti: string // JWT ID
  sid: string // Session ID
}

export interface SessionValidationResult {
  isValid: boolean
  payload?: SessionTokenPayload
  error?: string
}

/**
 * Get Shopify's public key for JWT verification
 * In production, you should cache this and refresh periodically
 */
async function getShopifyPublicKey(): Promise<string> {
  try {
    // Shopify's public key endpoint
    const response = await fetch('https://shopify.dev/apps/auth/oauth/session-tokens')
    
    // For now, we'll use a simplified approach
    // In production, you should implement proper JWT verification with Shopify's public key
    console.warn('Session token validation: Using simplified validation - implement proper JWT verification for production')
    
    return 'simplified-validation'
  } catch (error) {
    console.error('Failed to get Shopify public key:', error)
    throw new Error('Unable to verify session token')
  }
}

/**
 * Decode JWT token without verification (for development)
 * @param token JWT token
 * @returns Decoded payload
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    // Decode the payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    )

    return payload
  } catch (error) {
    throw new Error('Failed to decode JWT token')
  }
}

/**
 * Validate Shopify session token
 * @param token Session token from Authorization header
 * @param expectedAudience Expected API key (audience)
 * @returns Validation result
 */
export async function validateSessionToken(
  token: string,
  expectedAudience?: string
): Promise<SessionValidationResult> {
  try {
    if (!token) {
      return {
        isValid: false,
        error: 'No session token provided'
      }
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '')

    // Decode the token payload
    const payload = decodeJWT(cleanToken)

    // Basic validation
    const now = Math.floor(Date.now() / 1000)

    // Check expiration
    if (payload.exp && payload.exp < now) {
      return {
        isValid: false,
        error: 'Session token expired'
      }
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      return {
        isValid: false,
        error: 'Session token not yet valid'
      }
    }

    // Check audience (API key) if provided
    if (expectedAudience && payload.aud !== expectedAudience) {
      return {
        isValid: false,
        error: 'Invalid audience'
      }
    }

    // Validate required fields
    if (!payload.iss || !payload.dest || !payload.sub) {
      return {
        isValid: false,
        error: 'Missing required token fields'
      }
    }

    // TODO: Implement proper JWT signature verification with Shopify's public key
    // For now, we're doing basic payload validation
    console.warn('Session token validation: Using simplified validation - implement proper signature verification for production')

    return {
      isValid: true,
      payload: payload as SessionTokenPayload
    }

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Token validation failed'
    }
  }
}

/**
 * Extract session token from request headers
 * @param request Next.js request object
 * @returns Session token or null
 */
export function extractSessionToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader) {
    return null
  }

  // Handle both 'Bearer token' and just 'token' formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return authHeader
}

/**
 * Middleware-style session token validator
 * @param request Next.js request object
 * @param expectedAudience Expected API key
 * @returns Session payload or throws error
 */
export async function requireValidSessionToken(
  request: NextRequest,
  expectedAudience?: string
): Promise<SessionTokenPayload> {
  const token = extractSessionToken(request)
  
  if (!token) {
    const error = new Error('Session token required')
    ;(error as any).statusCode = 401
    throw error
  }

  const validation = await validateSessionToken(token, expectedAudience)
  
  if (!validation.isValid) {
    const error = new Error(validation.error || 'Invalid session token')
    ;(error as any).statusCode = 401
    throw error
  }

  return validation.payload!
}

/**
 * Get shop domain from session token
 * @param request Next.js request object
 * @returns Shop domain or null
 */
export async function getShopFromSessionToken(request: NextRequest): Promise<string | null> {
  try {
    const payload = await requireValidSessionToken(request)
    return payload.dest || payload.iss || null
  } catch (error) {
    return null
  }
}

/**
 * Check if request has valid session token
 * @param request Next.js request object
 * @returns True if valid session token present
 */
export async function hasValidSessionToken(request: NextRequest): Promise<boolean> {
  try {
    await requireValidSessionToken(request)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Create session token validation middleware
 * @param expectedAudience Expected API key
 * @returns Middleware function
 */
export function createSessionTokenMiddleware(expectedAudience?: string) {
  return async (request: NextRequest) => {
    try {
      const payload = await requireValidSessionToken(request, expectedAudience)
      return { success: true, payload }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message,
        statusCode: error.statusCode || 401
      }
    }
  }
}
