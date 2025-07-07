// Shopify GDPR Webhook Handler - Shop Data Erasure
// Handles shop data erasure requests for GDPR compliance

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'

// Validate Shopify webhook HMAC signature
function validateShopifyWebhook(body: string, signature: string, secret: string): boolean {
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

export async function POST(request: NextRequest) {
  try {
    const headersList = headers()
    const shopifyTopic = headersList.get('x-shopify-topic')
    const shopifyShopDomain = headersList.get('x-shopify-shop-domain')
    const shopifyHmacSha256 = headersList.get('x-shopify-hmac-sha256')

    // Get raw body for signature verification
    const body = await request.text()

    // Validate webhook signature - REQUIRED for Shopify compliance
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.CREWFLOW_SHOPIFY_WEBHOOK_SECRET

    if (!shopifyHmacSha256 || !webhookSecret) {
      console.error('Missing HMAC signature or webhook secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isValid = validateShopifyWebhook(body, shopifyHmacSha256, webhookSecret)
    if (!isValid) {
      console.error('Invalid Shopify webhook signature for shop data erasure')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log the webhook for compliance tracking
    console.log('Shopify shop data erasure webhook received:', {
      topic: shopifyTopic,
      shop: shopifyShopDomain,
      timestamp: new Date().toISOString()
    })

    // Parse the webhook payload
    let payload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('Failed to parse webhook payload:', error)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // TODO: Implement actual data erasure logic here
    // This should remove all data associated with the shop
    console.log('Processing shop data erasure for:', payload.shop_domain)

    return NextResponse.json({
      success: true,
      message: 'Shop data erasure request processed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Shop data erasure webhook error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Shop data erasure webhook endpoint active',
    timestamp: new Date().toISOString()
  })
}
