import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

// Helper function to validate store permissions
async function withStorePermission(
  storeId: string,
  userId: string,
  permission: string,
  agentId?: string
) {
  const supabase = await createSupabaseServerClientWithCookies()
  
  const { data: storeData, error } = await supabase
    .from('shopify_stores')
    .select('*')
    .eq('id', storeId)
    .eq('user_id', userId)
    .single()

  if (error || !storeData) {
    throw new Error(`Store not found or access denied: ${storeId}`)
  }

  // Check if the store has the required permission
  const permissions = storeData.permissions || {}
  if (!permissions[permission]) {
    throw new Error(`Permission '${permission}' not granted for store: ${storeId}`)
  }

  // If agent is specified, check agent access
  if (agentId) {
    const agentAccess = storeData.agent_access || {}
    if (!agentAccess[agentId]?.enabled) {
      throw new Error(`Agent '${agentId}' does not have access to store: ${storeId}`)
    }
  }

  return storeData
}

// GET /api/shopify/stores/[storeId]/orders - Fetch orders from Shopify
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status') || 'any'

    // Validate and clamp pagination bounds (Shopify max is 250)
    const requestedLimit = parseInt(searchParams.get('limit') || '50')
    const limit = Math.max(1, Math.min(250, isNaN(requestedLimit) ? 50 : requestedLimit))

    // Get authenticated user
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id
    console.log('📦 Orders fetch API called:', { storeId, agentId, userId })

    // Validate store permission for reading orders
    const storeData = await withStorePermission(
      storeId,
      userId,
      'read_orders',
      agentId
    )

    console.log('✅ Permission validated for orders read access')

    // Fetch orders from Shopify using the Admin API with specific shop domain for multi-store support
    const shopifyAPI = await createShopifyAPI(userId, undefined, storeData.shop_domain)
    if (!shopifyAPI) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to initialize Shopify API. Please check your store connection.' 
        },
        { status: 500 }
      )
    }

    try {
      const orders = await shopifyAPI.getOrders(limit, status)
      
      return NextResponse.json({
        success: true,
        store: {
          id: storeData.id,
          name: storeData.store_name,
          domain: storeData.shop_domain
        },
        orders,
        count: orders.length,
        agentId,
        message: agentId 
          ? `Orders fetched successfully by agent '${agentId}'`
          : 'Orders fetched successfully'
      })
    } catch (error) {
      console.error('Failed to fetch orders from Shopify:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch orders from Shopify. Please try again.' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in orders fetch API:', error)
    
    // Check if it's a permission error
    if (error instanceof Error && error.message.includes('Permission')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          reason: error.message,
          storeId: params.storeId,
          permission: 'read_orders'
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
