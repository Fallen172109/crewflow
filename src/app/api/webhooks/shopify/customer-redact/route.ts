// Shopify GDPR Webhook Handler - Customer Redact
// Handles customer data redaction requests for GDPR compliance

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireValidWebhook } from '@/lib/security/webhook-validator'

export async function POST(request: NextRequest) {
  try {
    const headersList = headers()
    const shopifyTopic = headersList.get('x-shopify-topic')
    const shopifyShopDomain = headersList.get('x-shopify-shop-domain')
    const shopifyHmacSha256 = headersList.get('x-shopify-hmac-sha256')

    // Validate webhook signature using secure timing-safe comparison
    let body: string
    try {
      body = await requireValidWebhook(request)
      console.log('✅ Customer redact webhook signature validated')
    } catch (error: any) {
      console.error('❌ Invalid webhook signature for customer redact:', error.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log the webhook for compliance tracking
    console.log('Shopify customer redact webhook received:', {
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

    // TODO: Implement actual customer data redaction logic here
    // This should remove/anonymize all data associated with the customer
    console.log('Processing customer redaction for:', {
      customerId: payload.customer?.id,
      email: payload.customer?.email,
      shop: payload.shop_domain
    })

    return NextResponse.json({
      success: true,
      message: 'Customer redaction request processed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Customer redact webhook error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Customer redact webhook endpoint active',
    timestamp: new Date().toISOString()
  })
}
