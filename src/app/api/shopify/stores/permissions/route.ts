// API endpoint to check current Shopify store permissions
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Permissions API called')

    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      console.error('❌ Authentication failed:', userError?.message)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin (borzeckikamil7@gmail.com)
    const isAdmin = user.email === 'borzeckikamil7@gmail.com'
    console.log('👤 User:', user.email, 'isAdmin:', isAdmin)

    // Get connected Shopify stores
    let storesQuery = supabase
      .from('shopify_stores')
      .select(`
        id,
        shop_domain,
        store_name,
        is_active,
        connected_at,
        permissions,
        agent_access,
        metadata,
        user_id
      `)

    // If admin, get all stores; otherwise, only user's stores
    if (!isAdmin) {
      storesQuery = storesQuery.eq('user_id', user.id)
    }

    const { data: stores, error: storesError } = await storesQuery
      .order('connected_at', { ascending: false })

    if (storesError) {
      console.error('❌ Error fetching stores:', storesError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch stores',
          details: storesError.message
        },
        { status: 500 }
      )
    }

    console.log('📊 Found stores:', stores?.length || 0)

    // Get API connections to check access tokens
    const { data: connections, error: connectionsError } = await supabase
      .from('api_connections')
      .select('store_id, status, connected_at, shop_domain')
      .eq('user_id', user.id)
      .eq('integration_id', 'shopify')

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
    }

    // Get user emails for admin view
    let userEmails: Record<string, string> = {}
    if (isAdmin && stores && stores.length > 0) {
      const userIds = [...new Set(stores.map(store => store.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds)

      if (users) {
        userEmails = users.reduce((acc, user) => {
          acc[user.id] = user.email
          return acc
        }, {} as Record<string, string>)
      }
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
        metadata: store.metadata || {},
        userId: store.user_id,
        userEmail: isAdmin ? (userEmails[store.user_id] || 'Unknown') : undefined
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
      isAdmin,
      currentUser: {
        id: user.id,
        email: user.email
      },
      summary: {
        totalStores: storesWithPermissions.length,
        activeStores: storesWithPermissions.filter(s => s.isActive).length,
        connectedStores: storesWithPermissions.filter(s => s.connectionStatus === 'connected').length
      }
    })

  } catch (error) {
    console.error('❌ Error in permissions API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
