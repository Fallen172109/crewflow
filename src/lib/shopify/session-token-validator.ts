import crypto from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Shopify Session Token Validation for CrewFlow
 * Validates session tokens from Shopify App Bridge using HMAC-SHA256
 *
 * Shopify session tokens are JWTs signed with your app's API secret.
 * See: https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens
 */

export interface SessionTokenPayload {
  iss: string // Issuer (shop admin URL, e.g., https://shop.myshopify.com/admin)
  dest: string // Destination (shop URL, e.g., https://shop.myshopify.com)
  aud: string // Audience (API key/client ID)
  sub: string // Subject (user ID)
  exp: number // Expiration timestamp
  nbf: number // Not before timestamp
  iat: number // Issued at timestamp
  jti: string // JWT ID (unique token identifier)
  sid: string // Session ID
}

export interface SessionValidationResult {
  isValid: boolean
  payload?: SessionTokenPayload
  error?: string
}

/**
 * Get the Shopify API secret for JWT signature verification
 */
function getShopifyApiSecret(): string {
  const secret = process.env.SHOPIFY_CLIENT_SECRET
  if (!secret) {
    throw new Error('SHOPIFY_CLIENT_SECRET environment variable is not set')
  }
  return secret
}

/**
 * Base64URL decode (handles URL-safe base64 encoding used in JWTs)
 */
function base64UrlDecode(str: string): Buffer {
  // Replace URL-safe characters and add padding if needed
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }
  return Buffer.from(base64, 'base64')
}

/**
 * Verify JWT signature using HMAC-SHA256
 * @param token Full JWT token
 * @param secret API secret for verification
 * @returns True if signature is valid
 */
function verifyJWTSignature(token: string, secret: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    const [headerB64, payloadB64, signatureB64] = parts

    // Create the signing input (header.payload)
    const signingInput = `${headerB64}.${payloadB64}`

    // Compute expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url')

    // Timing-safe comparison to prevent timing attacks
    const actualSignature = signatureB64

    if (expectedSignature.length !== actualSignature.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(actualSignature)
    )
  } catch (error) {
    return false
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
 * Validate Shopify session token with full cryptographic signature verification
 * @param token Session token from Authorization header
 * @param expectedAudience Expected API key (audience) - defaults to SHOPIFY_CLIENT_ID env var
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

    // Get API secret for signature verification
    let apiSecret: string
    try {
      apiSecret = getShopifyApiSecret()
    } catch (error) {
      // In development without secret, fall back to decode-only mode
      if (process.env.NODE_ENV === 'development') {
        console.warn('[DEV MODE] SHOPIFY_CLIENT_SECRET not set - skipping signature verification')
        const payload = decodeJWT(cleanToken)
        return validatePayloadFields(payload, expectedAudience)
      }
      return {
        isValid: false,
        error: 'Server configuration error: Missing API secret'
      }
    }

    // CRITICAL: Verify JWT signature using HMAC-SHA256
    if (!verifyJWTSignature(cleanToken, apiSecret)) {
      return {
        isValid: false,
        error: 'Invalid token signature'
      }
    }

    // Decode the verified token payload
    const payload = decodeJWT(cleanToken)

    // Validate payload fields
    return validatePayloadFields(payload, expectedAudience)

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Token validation failed'
    }
  }
}

/**
 * Validate JWT payload fields (timing, audience, required fields)
 */
function validatePayloadFields(
  payload: any,
  expectedAudience?: string
): SessionValidationResult {
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

  // Check audience (API key/client ID)
  const audience = expectedAudience || process.env.SHOPIFY_CLIENT_ID
  if (audience && payload.aud !== audience) {
    return {
      isValid: false,
      error: 'Invalid audience - token was issued for a different app'
    }
  }

  // Validate required fields
  if (!payload.iss || !payload.dest || !payload.sub) {
    return {
      isValid: false,
      error: 'Missing required token fields (iss, dest, or sub)'
    }
  }

  // Validate issuer format (should be a Shopify admin URL)
  if (!payload.iss.includes('myshopify.com') && !payload.iss.includes('shopify.com')) {
    return {
      isValid: false,
      error: 'Invalid issuer - not a Shopify domain'
    }
  }

  return {
    isValid: true,
    payload: payload as SessionTokenPayload
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
