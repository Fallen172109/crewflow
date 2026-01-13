import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

// Helper to verify store access
async function verifyStoreAccess(storeId: string, userId: string, requiredPermission?: string) {
  const supabase = await createSupabaseServerClientWithCookies()

  const { data: storeData, error } = await supabase
    .from('shopify_stores')
    .select('*')
    .eq('id', storeId)
    .eq('user_id', userId)
    .single()

  if (error || !storeData) {
    return { error: 'Store not found or access denied', status: 403 }
  }

  if (requiredPermission) {
    const permissions = storeData.permissions || {}
    if (!permissions[requiredPermission]) {
      return { error: `Permission denied: ${requiredPermission} permission required`, status: 403 }
    }
  }

  return { storeData }
}

// GET /api/shopify/stores/[storeId]/orders/[orderId] - Get order details
export async function GET(
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

    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await verifyStoreAccess(storeId, user.id, 'read_orders')
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    // Initialize Shopify API with specific shop domain for multi-store support
    const shopifyAPI = await createShopifyAPI(user.id, undefined, result.storeData?.shop_domain)
    if (!shopifyAPI) {
      return NextResponse.json(
        { error: 'Failed to initialize Shopify API' },
        { status: 500 }
      )
    }

    try {
      const order = await shopifyAPI.getOrder(orderIdNum)

      return NextResponse.json({
        success: true,
        order
      })
    } catch (error) {
      console.error('Failed to get order:', error)

      if (error instanceof Error && error.message.includes('404')) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch order from Shopify' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error getting order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
