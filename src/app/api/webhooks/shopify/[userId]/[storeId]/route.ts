import { NextRequest, NextResponse } from 'next/server'
import { processWebhook } from '@/lib/webhooks/shopify-webhook-manager'
import { validateShopifyWebhook } from '@/lib/shopify/webhook-validator'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string; storeId: string } }
) {
  try {
    const { userId, storeId } = params

    // Get webhook topic from headers
    const topic = request.headers.get('x-shopify-topic')
    if (!topic) {
      return NextResponse.json(
        { error: 'Missing webhook topic' },
        { status: 400 }
      )
    }

    // Get raw body for HMAC validation
    const body = await request.text()
    const signature = request.headers.get('x-shopify-hmac-sha256')

    // Validate HMAC signature
    const validation = validateShopifyWebhook(body, signature)
    if (!validation.isValid) {
      console.error('Invalid webhook signature:', validation.error)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Get all headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Parse payload
    let payload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }
    
    console.log(`Received Shopify webhook: ${topic} for user ${userId}, store ${storeId}`)
    
    // Process the webhook
    const result = await processWebhook(userId, storeId, topic, payload, headers)
    
    if (!result.success) {
      console.error(`Webhook processing failed: ${result.error}`)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      eventId: result.eventId
    })
  } catch (error) {
    console.error('Webhook endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle webhook verification (GET request)
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; storeId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const challenge = searchParams.get('hub.challenge')
    
    if (challenge) {
      // Return the challenge for webhook verification
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    
    return NextResponse.json({
      message: 'Shopify webhook endpoint active',
      userId: params.userId,
      storeId: params.storeId
    })
  } catch (error) {
    console.error('Webhook verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
