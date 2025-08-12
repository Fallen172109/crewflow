// Shopify GDPR Webhook Handler - Customer Data Request
// Handles customer data requests for GDPR compliance

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireValidWebhook } from '@/lib/security/webhook-validator'

export async function POST(request: NextRequest) {
  try {
    const headersList = headers()
    const shopifyTopic = headersList.get('x-shopify-topic')
    const shopifyShopDomain = headersList.get('x-shopify-shop-domain')

    // Validate webhook signature using secure timing-safe comparison
    let body: string
    try {
      body = await requireValidWebhook(request)
      console.log('✅ Customer data request webhook signature validated')
    } catch (error: any) {
      console.error('❌ Invalid webhook signature for customer data request:', error.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log the webhook for compliance tracking
    console.log('Shopify customer data request webhook received:', {
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

    // TODO: Implement actual customer data export logic here
    // This should collect and return all data associated with the customer
    console.log('Processing customer data request for:', {
      customerId: payload.customer?.id,
      email: payload.customer?.email,
      shop: shopifyShopDomain
    })

    // For now, acknowledge the request
    // In production, this should trigger data collection and delivery
    return NextResponse.json({
      success: true,
      message: 'Customer data request processed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Customer data request webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Customer data request webhook endpoint active',
    timestamp: new Date().toISOString()
  })
}
