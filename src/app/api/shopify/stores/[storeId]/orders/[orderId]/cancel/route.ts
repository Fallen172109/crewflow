import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

// Valid cancellation reasons per Shopify API
const VALID_CANCEL_REASONS = ['customer', 'fraud', 'inventory', 'declined', 'other'] as const
type CancelReason = typeof VALID_CANCEL_REASONS[number]

// POST /api/shopify/stores/[storeId]/orders/[orderId]/cancel - Cancel an order
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

    // Parse request body for cancellation options
    let body: {
      reason?: CancelReason
      notifyCustomer?: boolean
      refund?: boolean
    } = {}

    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // Body is optional, continue with defaults
    }

    // Validate reason if provided
    const reason: CancelReason = body.reason && VALID_CANCEL_REASONS.includes(body.reason as CancelReason)
      ? body.reason as CancelReason
      : 'other'

    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id
    console.log('❌ Cancel order API called:', { storeId, orderId: orderIdNum, userId, reason })

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
      // First get the order to check its status
      const order = await shopifyAPI.getOrder(orderIdNum)

      if (order.cancelled_at) {
        return NextResponse.json(
          { error: 'Order is already cancelled' },
          { status: 400 }
        )
      }

      // Check if order can be cancelled (not yet fulfilled)
      if (order.fulfillment_status === 'fulfilled') {
        return NextResponse.json(
          { error: 'Cannot cancel a fully fulfilled order. Please process a refund instead.' },
          { status: 400 }
        )
      }

      // Cancel the order
      const cancelledOrder = await shopifyAPI.cancelOrder(
        orderIdNum,
        reason,
        body.notifyCustomer !== false, // Default to true
        body.refund || false // Default to false - manual refund preferred
      )

      console.log('✅ Order cancelled successfully:', orderIdNum)

      return NextResponse.json({
        success: true,
        message: `Order ${order.name} cancelled successfully`,
        order: cancelledOrder,
        orderId: orderIdNum,
        reason
      })
    } catch (error) {
      console.error('Failed to cancel order:', error)

      if (error instanceof Error) {
        if (error.message.includes('404')) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          )
        }
        if (error.message.includes('already cancelled')) {
          return NextResponse.json(
            { error: 'Order is already cancelled' },
            { status: 400 }
          )
        }
        if (error.message.includes('fulfilled')) {
          return NextResponse.json(
            { error: 'Cannot cancel a fulfilled order' },
            { status: 400 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Failed to cancel order. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in cancel order API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
