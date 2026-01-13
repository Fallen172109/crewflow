import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

// POST /api/shopify/stores/[storeId]/orders/[orderId]/fulfill - Fulfill an order
export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string; orderId: string } }
) {
  try {
    const { storeId, orderId } = params

    const orderIdNum = parseInt(orderId, 10)
    if (isNaN(orderIdNum)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    // Parse request body for optional fulfillment details
    let body: {
      trackingNumber?: string
      trackingCompany?: string
      trackingUrl?: string
      notifyCustomer?: boolean
      lineItems?: Array<{ id: number; quantity: number }>
    } = {}

    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Body is optional, continue with defaults
    }

    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id
    console.log('📦 Fulfill order API called:', { storeId, orderId: orderIdNum, userId })

    // Verify store ownership and permissions
    const { data: storeData, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single()

    if (storeError || !storeData) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 403 }
      )
    }

    // Check write_orders permission
    const permissions = storeData.permissions || {}
    if (!permissions.write_orders) {
      return NextResponse.json(
        { error: 'Permission denied: write_orders permission required' },
        { status: 403 }
      )
    }

    // Initialize Shopify API with specific shop domain for multi-store support
    const shopifyAPI = await createShopifyAPI(userId, undefined, storeData.shop_domain)
    if (!shopifyAPI) {
      return NextResponse.json(
        { error: 'Failed to initialize Shopify API' },
        { status: 500 }
      )
    }

    try {
      // First get the order to check its status and get line items
      const order = await shopifyAPI.getOrder(orderIdNum)

      if (order.cancelled_at) {
        return NextResponse.json(
          { error: 'Cannot fulfill a cancelled order' },
          { status: 400 }
        )
      }

      if (order.fulfillment_status === 'fulfilled') {
        return NextResponse.json(
          { error: 'Order is already fulfilled' },
          { status: 400 }
        )
      }

      // Build fulfillment object
      const fulfillmentData: any = {
        notify_customer: body.notifyCustomer !== false, // Default to true
      }

      // Add tracking info if provided
      if (body.trackingNumber) {
        fulfillmentData.tracking_number = body.trackingNumber
      }
      if (body.trackingCompany) {
        fulfillmentData.tracking_company = body.trackingCompany
      }
      if (body.trackingUrl) {
        fulfillmentData.tracking_urls = [body.trackingUrl]
      }

      // If specific line items are provided, use them
      // Otherwise, fulfill all unfulfilled items
      if (body.lineItems && body.lineItems.length > 0) {
        fulfillmentData.line_items = body.lineItems
      }

      // Create the fulfillment
      const fulfillment = await shopifyAPI.createFulfillment(orderIdNum, fulfillmentData)

      console.log('✅ Order fulfilled successfully:', orderIdNum)

      return NextResponse.json({
        success: true,
        message: `Order ${order.name} fulfilled successfully`,
        fulfillment,
        orderId: orderIdNum
      })
    } catch (error) {
      console.error('Failed to fulfill order:', error)

      if (error instanceof Error) {
        // Parse Shopify-specific errors
        if (error.message.includes('404')) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          )
        }
        if (error.message.includes('already fulfilled')) {
          return NextResponse.json(
            { error: 'Order is already fulfilled' },
            { status: 400 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Failed to fulfill order. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in fulfill order API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
