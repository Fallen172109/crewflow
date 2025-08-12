import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { hasValidSessionToken, getShopFromSessionToken } from '@/lib/shopify/session-token-validator'

export async function GET(request: NextRequest) {
  try {
    // Check for session token (embedded app) or regular authentication
    const hasSessionToken = await hasValidSessionToken(request)
    let shop: string | null = null
    let userId: string | null = null

    if (hasSessionToken) {
      // Embedded app with session token
      shop = await getShopFromSessionToken(request)
      console.log('Store info request from embedded app:', { shop })
    } else {
      // Regular authentication
      const supabase = await createSupabaseServerClientWithCookies()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!user || userError) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      userId = user.id
      
      // Get shop from query parameter or user's connected stores
      shop = request.nextUrl.searchParams.get('shop')
      
      if (!shop) {
        // Get the first connected store for this user
        const { data: stores } = await supabase
          .from('api_connections')
          .select('shop_domain')
          .eq('user_id', userId)
          .eq('integration_id', 'shopify')
          .eq('status', 'connected')
          .limit(1)
          .single()

        shop = stores?.shop_domain || null
      }
    }

    if (!shop) {
      return NextResponse.json(
        { error: 'No store information available' },
        { status: 404 }
      )
    }

    // Get store information from database
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: storeConnection } = await supabase
      .from('api_connections')
      .select('*')
      .eq('shop_domain', shop)
      .eq('integration_id', 'shopify')
      .eq('status', 'connected')
      .single()

    if (!storeConnection) {
      return NextResponse.json(
        { error: 'Store not connected' },
        { status: 404 }
      )
    }

    // Get additional store details if available
    const storeInfo = {
      name: shop.replace('.myshopify.com', ''),
      domain: shop,
      status: 'connected',
      connectedAt: storeConnection.created_at,
      lastSync: storeConnection.updated_at,
      features: {
        products: true,
        orders: true,
        customers: true,
        inventory: true
      },
      agents: {
        anchor: {
          name: 'Anchor',
          description: 'Store Manager',
          status: 'active',
          lastActivity: new Date().toISOString()
        },
        helm: {
          name: 'Helm',
          description: 'Order Fulfillment',
          status: 'standby',
          lastActivity: null
        },
        pearl: {
          name: 'Pearl',
          description: 'Customer Service',
          status: 'standby',
          lastActivity: null
        }
      }
    }

    return NextResponse.json(storeInfo)

  } catch (error) {
    console.error('Store info API error:', error)
    return NextResponse.json(
      { error: 'Failed to get store information' },
      { status: 500 }
    )
  }
}
