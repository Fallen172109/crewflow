import crypto from 'crypto'

/**
 * Secure webhook validation utilities for CrewFlow
 * Implements timing-safe HMAC validation for Shopify webhooks
 */

export interface WebhookValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate Shopify webhook HMAC signature using timing-safe comparison
 * @param rawBody - Raw request body as string or Buffer
 * @param signature - HMAC signature from x-shopify-hmac-sha256 header
 * @param secret - Webhook secret from environment
 * @returns Validation result with timing-safe comparison
 */
export function validateShopifyWebhook(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): WebhookValidationResult {
  try {
    if (!signature || !secret) {
      return {
        isValid: false,
        error: 'Missing signature or secret'
      }
    }

    // Ensure we have the raw body as a string
    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')

    // Create HMAC using SHA256
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(bodyString, 'utf8')
    const calculatedSignature = hmac.digest('base64')

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(calculatedSignature, 'base64')
    )

    return {
      isValid,
      error: isValid ? undefined : 'Invalid HMAC signature'
    }

  } catch (error) {
    console.error('Webhook HMAC validation error:', error)
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

/**
 * Get raw body from Next.js request for webhook validation
 * @param request - Next.js request object
 * @returns Raw body as string
 */
export async function getRawBody(request: Request): Promise<string> {
  try {
    // For webhook validation, we need the raw body exactly as received
    const arrayBuffer = await request.arrayBuffer()
    return Buffer.from(arrayBuffer).toString('utf8')
  } catch (error) {
    console.error('Failed to get raw body:', error)
    throw new Error('Failed to read request body')
  }
}

/**
 * Validate webhook with proper error responses
 * @param request - Next.js request object
 * @param webhookSecret - Secret from environment
 * @returns Validation result and raw body
 */
export async function validateWebhookRequest(
  request: Request,
  webhookSecret?: string
): Promise<{
  isValid: boolean
  rawBody: string
  error?: string
  statusCode?: number
}> {
  try {
    // Get HMAC signature from headers
    const signature = request.headers.get('x-shopify-hmac-sha256')
    
    if (!signature) {
      return {
        isValid: false,
        rawBody: '',
        error: 'Missing HMAC signature',
        statusCode: 401
      }
    }

    if (!webhookSecret) {
      console.warn('Webhook secret not configured - this is insecure for production')
      return {
        isValid: false,
        rawBody: '',
        error: 'Webhook secret not configured',
        statusCode: 500
      }
    }

    // Get raw body
    const rawBody = await getRawBody(request)

    // Validate HMAC
    const validation = validateShopifyWebhook(rawBody, signature, webhookSecret)

    return {
      isValid: validation.isValid,
      rawBody,
      error: validation.error,
      statusCode: validation.isValid ? undefined : 401
    }

  } catch (error) {
    console.error('Webhook validation error:', error)
    return {
      isValid: false,
      rawBody: '',
      error: 'Webhook validation failed',
      statusCode: 500
    }
  }
}

/**
 * Middleware-style webhook validator for API routes
 * @param request - Next.js request object
 * @param webhookSecret - Optional webhook secret (will try to get from env if not provided)
 * @returns Validation result or throws with proper HTTP status
 */
export async function requireValidWebhook(
  request: Request,
  webhookSecret?: string
): Promise<string> {
  const secret = webhookSecret || 
    process.env.SHOPIFY_WEBHOOK_SECRET || 
    process.env.CREWFLOW_SHOPIFY_WEBHOOK_SECRET

  const validation = await validateWebhookRequest(request, secret)

  if (!validation.isValid) {
    const error = new Error(validation.error || 'Invalid webhook')
    ;(error as any).statusCode = validation.statusCode || 401
    throw error
  }

  return validation.rawBody
}
