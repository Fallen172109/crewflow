// Test script for Shopify webhook HMAC validation
// Run with: node scripts/test-shopify-webhooks.js

const crypto = require('crypto')

// Test webhook secret (from .env.local)
const WEBHOOK_SECRET = 'CrewFlowShopifyWebhook2024!Maritime'

// Test payload
const testPayload = JSON.stringify({
  shop_domain: 'test-store.myshopify.com',
  timestamp: new Date().toISOString()
})

// Generate HMAC signature
function generateHMAC(body, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body, 'utf8')
  return hmac.digest('base64')
}

// Validate HMAC signature (same function as in webhooks)
function validateShopifyWebhook(body, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(body, 'utf8')
    const calculatedSignature = hmac.digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(calculatedSignature, 'base64')
    )
  } catch (error) {
    console.error('HMAC validation error:', error)
    return false
  }
}

// Test the HMAC validation
console.log('Testing Shopify Webhook HMAC Validation')
console.log('=====================================')

const signature = generateHMAC(testPayload, WEBHOOK_SECRET)
console.log('Test payload:', testPayload)
console.log('Generated HMAC:', signature)

const isValid = validateShopifyWebhook(testPayload, signature, WEBHOOK_SECRET)
console.log('Validation result:', isValid ? 'VALID' : 'INVALID')

// Test with invalid signature
const invalidSignature = 'invalid-signature'
const isInvalid = validateShopifyWebhook(testPayload, invalidSignature, WEBHOOK_SECRET)
console.log('Invalid signature test:', isInvalid ? 'FAILED (should be false)' : 'PASSED')

console.log('\nWebhook endpoints to test:')
console.log('- POST http://localhost:3000/api/webhooks/shopify/shop-data-erasure')
console.log('- POST http://localhost:3000/api/webhooks/shopify/customer-data-request')
console.log('- POST http://localhost:3000/api/webhooks/shopify/customer-redact')

console.log('\nTest with curl:')
console.log(`curl -X POST http://localhost:3000/api/webhooks/shopify/shop-data-erasure \\
  -H "Content-Type: application/json" \\
  -H "X-Shopify-Topic: shop/redact" \\
  -H "X-Shopify-Shop-Domain: test-store.myshopify.com" \\
  -H "X-Shopify-Hmac-Sha256: ${signature}" \\
  -d '${testPayload}'`)
