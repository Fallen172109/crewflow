// Shopify Webhook Handler
// Processes real-time events from Shopify stores for AI agent automation

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateShopifyWebhook } from '@/lib/integrations/shopify-admin-api'
import { headers } from 'next/headers'
import crypto from 'crypto'

interface ShopifyWebhookEvent {
  topic: string
  shop_domain: string
  payload: any
  webhook_id?: string
}

// Webhook verification endpoint for Shopify app setup
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'CrewFlow Shopify webhook endpoint is active',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}

// Handle incoming Shopify webhooks
export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const headersList = headers()
    const shopifyTopic = headersList.get('x-shopify-topic')
    const shopifyShopDomain = headersList.get('x-shopify-shop-domain')
    const shopifyHmacSha256 = headersList.get('x-shopify-hmac-sha256')
    const shopifyWebhookId = headersList.get('x-shopify-webhook-id')

    // Get raw body for signature verification
    const body = await request.text()

    // For Shopify app testing - be more lenient with validation
    if (!shopifyTopic) {
      console.log('Webhook received without topic header - likely a test webhook')
      return NextResponse.json({
        success: true,
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString()
      })
    }

    // Log webhook details for debugging
    console.log('Shopify webhook received:', {
      topic: shopifyTopic,
      shop: shopifyShopDomain,
      hasSignature: !!shopifyHmacSha256,
      bodyLength: body.length
    })

    // Verify webhook signature if we have all required components
    if (shopifyHmacSha256) {
      const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.CREWFLOW_SHOPIFY_WEBHOOK_SECRET
      if (webhookSecret) {
        const isValid = validateShopifyWebhook(body, shopifyHmacSha256, webhookSecret)
        if (!isValid) {
          console.error('Invalid Shopify webhook signature')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
      } else {
        console.warn('Webhook secret not configured - skipping signature verification')
      }
    } else {
      console.warn('No HMAC signature provided - skipping verification (test mode)')
    }

    // Parse webhook payload
    let payload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('Failed to parse webhook payload:', error)
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // Create webhook event object
    const webhookEvent: ShopifyWebhookEvent = {
      topic: shopifyTopic,
      shop_domain: shopifyShopDomain,
      payload,
      webhook_id: shopifyWebhookId || undefined
    }

    // Process the webhook event
    await processWebhookEvent(webhookEvent)

    // Log successful webhook processing
    console.log(`Successfully processed Shopify webhook: ${shopifyTopic} from ${shopifyShopDomain}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    })

  } catch (error) {
    console.error('Shopify webhook processing error:', error)
    return NextResponse.json({ 
      error: 'Webhook processing failed' 
    }, { status: 500 })
  }
}

// Process different types of webhook events
async function processWebhookEvent(event: ShopifyWebhookEvent): Promise<void> {
  const supabase = createSupabaseServerClient()

  try {
    // Find the user associated with this shop domain
    const { data: connection } = await supabase
      .from('api_connections')
      .select('user_id, id')
      .eq('integration_id', 'shopify')
      .eq('facebook_user_id', event.shop_domain) // shop domain stored in facebook_user_id field
      .eq('status', 'connected')
      .single()

    if (!connection) {
      console.warn(`No connected user found for shop domain: ${event.shop_domain}`)
      return
    }

    // Log the webhook event
    await supabase.from('agent_actions').insert({
      user_id: connection.user_id,
      agent_id: 'system',
      integration_id: 'shopify',
      action_type: 'webhook_received',
      action_description: `Received ${event.topic} webhook from ${event.shop_domain}`,
      status: 'completed',
      metadata: {
        topic: event.topic,
        shop_domain: event.shop_domain,
        webhook_id: event.webhook_id,
        payload_summary: getPayloadSummary(event.topic, event.payload)
      }
    })

    // Process specific webhook types
    switch (event.topic) {
      case 'orders/create':
        await handleOrderCreated(connection.user_id, event.payload)
        break
      
      case 'orders/updated':
        await handleOrderUpdated(connection.user_id, event.payload)
        break
      
      case 'orders/paid':
        await handleOrderPaid(connection.user_id, event.payload)
        break
      
      case 'orders/cancelled':
        await handleOrderCancelled(connection.user_id, event.payload)
        break
      
      case 'products/create':
        await handleProductCreated(connection.user_id, event.payload)
        break
      
      case 'products/update':
        await handleProductUpdated(connection.user_id, event.payload)
        break
      
      case 'customers/create':
        await handleCustomerCreated(connection.user_id, event.payload)
        break
      
      case 'inventory_levels/update':
        await handleInventoryUpdated(connection.user_id, event.payload)
        break
      
      case 'app/uninstalled':
        await handleAppUninstalled(connection.user_id, event.shop_domain)
        break
      
      default:
        console.log(`Unhandled webhook topic: ${event.topic}`)
    }

  } catch (error) {
    console.error('Error processing webhook event:', error)
    
    // Log the error
    await supabase.from('agent_actions').insert({
      user_id: connection?.user_id || null,
      agent_id: 'system',
      integration_id: 'shopify',
      action_type: 'webhook_error',
      action_description: `Failed to process ${event.topic} webhook from ${event.shop_domain}`,
      status: 'failed',
      metadata: {
        topic: event.topic,
        shop_domain: event.shop_domain,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

// Webhook event handlers
async function handleOrderCreated(userId: string, order: any): Promise<void> {
  console.log(`New order created: ${order.order_number} for $${order.total_price}`)
  // TODO: Trigger AI agent notifications for new orders
}

async function handleOrderUpdated(userId: string, order: any): Promise<void> {
  console.log(`Order updated: ${order.order_number}`)
  // TODO: Update order tracking and notify relevant agents
}

async function handleOrderPaid(userId: string, order: any): Promise<void> {
  console.log(`Order paid: ${order.order_number} for $${order.total_price}`)
  // TODO: Trigger fulfillment automation
}

async function handleOrderCancelled(userId: string, order: any): Promise<void> {
  console.log(`Order cancelled: ${order.order_number}`)
  // TODO: Handle inventory restoration and customer communication
}

async function handleProductCreated(userId: string, product: any): Promise<void> {
  console.log(`New product created: ${product.title}`)
  // TODO: Trigger SEO optimization and marketing automation
}

async function handleProductUpdated(userId: string, product: any): Promise<void> {
  console.log(`Product updated: ${product.title}`)
  // TODO: Update search indexes and notify marketing agents
}

async function handleCustomerCreated(userId: string, customer: any): Promise<void> {
  console.log(`New customer: ${customer.email}`)
  // TODO: Trigger welcome email automation and customer segmentation
}

async function handleInventoryUpdated(userId: string, inventory: any): Promise<void> {
  console.log(`Inventory updated for item: ${inventory.inventory_item_id}`)
  // TODO: Check for low stock alerts and reorder automation
}

async function handleAppUninstalled(userId: string, shopDomain: string): Promise<void> {
  console.log(`App uninstalled from shop: ${shopDomain}`)
  
  // Disconnect the integration
  const supabase = createSupabaseServerClient()
  await supabase
    .from('api_connections')
    .update({ 
      status: 'disconnected',
      error: 'App uninstalled by user'
    })
    .eq('user_id', userId)
    .eq('integration_id', 'shopify')
    .eq('facebook_user_id', shopDomain)
}

// Generate a summary of the webhook payload for logging
function getPayloadSummary(topic: string, payload: any): any {
  switch (topic) {
    case 'orders/create':
    case 'orders/updated':
    case 'orders/paid':
    case 'orders/cancelled':
      return {
        order_id: payload.id,
        order_number: payload.order_number,
        total_price: payload.total_price,
        customer_email: payload.email
      }
    
    case 'products/create':
    case 'products/update':
      return {
        product_id: payload.id,
        title: payload.title,
        status: payload.status,
        vendor: payload.vendor
      }
    
    case 'customers/create':
      return {
        customer_id: payload.id,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name
      }
    
    default:
      return { id: payload.id || 'unknown' }
  }
}
