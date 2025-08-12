import crypto from 'crypto';

/**
 * Validates Shopify webhook HMAC signature using timing-safe comparison
 * @param raw - Raw request body as string
 * @param header - HMAC signature from x-shopify-hmac-sha256 header
 * @param secret - Webhook secret from environment
 * @returns boolean indicating if signature is valid
 */
export function validHmac(raw: string, header: string | null, secret: string): boolean {
  if (!header || !secret) {
    return false;
  }
  
  const digest = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('base64');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(digest));
  } catch (error) {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

/**
 * Validates Shopify webhook with proper error handling
 * @param body - Raw request body
 * @param signature - HMAC signature from header
 * @returns validation result with error details
 */
export function validateShopifyWebhook(body: string, signature: string | null): {
  isValid: boolean;
  error?: string;
} {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.CREWFLOW_SHOPIFY_WEBHOOK_SECRET;
  
  if (!secret) {
    return {
      isValid: false,
      error: 'Webhook secret not configured'
    };
  }
  
  if (!signature) {
    return {
      isValid: false,
      error: 'Missing HMAC signature'
    };
  }
  
  const isValid = validHmac(body, signature, secret);
  
  return {
    isValid,
    error: isValid ? undefined : 'Invalid HMAC signature'
  };
}
