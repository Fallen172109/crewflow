// API endpoint to check current Shopify store permissions
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get all connected Shopify stores for the user
    const { data: stores, error: storesError } = await supabase
      .from('shopify_stores')
      .select(`
        id,
        shop_domain,
        store_name,
        is_active,
        connected_at,
        permissions,
        agent_access,
        metadata
      `)
      .eq('user_id', user.id)
      .order('connected_at', { ascending: false })

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json(
        { error: 'Failed to fetch stores' },
        { status: 500 }
      )
    }

    // Get API connections to check access tokens
    const { data: connections, error: connectionsError } = await supabase
      .from('api_connections')
      .select('store_id, status, connected_at, shop_domain')
      .eq('user_id', user.id)
      .eq('integration_id', 'shopify')

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
    }

    // Combine store data with connection status
    const storesWithPermissions = stores?.map(store => {
      const connection = connections?.find(conn => conn.store_id === store.id)
      
      return {
        id: store.id,
        shopDomain: store.shop_domain,
        storeName: store.store_name,
        isActive: store.is_active,
        connectedAt: store.connected_at,
        connectionStatus: connection?.status || 'unknown',
        permissions: store.permissions || {},
        agentAccess: store.agent_access || {},
        metadata: store.metadata || {}
      }
    }) || []

    // Define the scopes that CrewFlow requests
    const requestedScopes = [
      'read_products',
      'write_products', 
      'read_orders',
      'write_orders',
      'read_customers',
      'read_analytics',
      'read_inventory',
      'write_inventory',
      'read_fulfillments',
      'write_fulfillments'
    ]

    return NextResponse.json({
      success: true,
      stores: storesWithPermissions,
      requestedScopes,
      summary: {
        totalStores: storesWithPermissions.length,
        activeStores: storesWithPermissions.filter(s => s.isActive).length,
        connectedStores: storesWithPermissions.filter(s => s.connectionStatus === 'connected').length
      }
    })

  } catch (error) {
    console.error('Error checking store permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
