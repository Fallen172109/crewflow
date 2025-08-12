import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { validateStorePermission } from '@/lib/shopify/store-permission-validator'

// Helper function to validate store permissions
async function withStorePermission(
  storeId: string,
  userId: string,
  permission: string,
  agentId?: string
) {
  const supabase = createSupabaseServerClientWithCookies()
  
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

  return storeData
}

// GET /api/shopify/stores/[storeId]/customers - Fetch customers from Shopify
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get authenticated user
    const supabase = createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id
    console.log('👥 Customers fetch API called:', { storeId, agentId, userId })

    // Validate store permission for reading customers
    const storeData = await withStorePermission(
      storeId,
      userId,
      'read_customers',
      agentId
    )

    console.log('✅ Permission validated for customers read access')

    // Fetch customers from Shopify using the Admin API
    const shopifyAPI = await createShopifyAPI(userId)
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
      const customers = await shopifyAPI.getCustomers(limit)
      
      return NextResponse.json({
        success: true,
        store: {
          id: storeData.id,
          name: storeData.store_name,
          domain: storeData.shop_domain
        },
        customers,
        count: customers.length,
        agentId,
        message: agentId 
          ? `Customers fetched successfully by agent '${agentId}'`
          : 'Customers fetched successfully'
      })
    } catch (error) {
      console.error('Failed to fetch customers from Shopify:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch customers from Shopify. Please try again.' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in customers API:', error)
    
    // Check if it's a permission error
    if (error instanceof Error && error.message.includes('Permission')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          reason: error.message,
          storeId,
          permission: 'read_customers'
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

/**
 * Create or update customers - requires write permission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const supabase = createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = params
    const body = await request.json()
    const { customer, agentId } = body

    console.log('👥 Customer creation API called:', { storeId, agentId, userId: user.id })

    // Validate store permission for writing customers
    const storeData = await withStorePermission(
      storeId,
      user.id,
      'write_customers',
      agentId
    )

    // Initialize Shopify API
    const shopifyAPI = await createShopifyAPI(user.id)
    if (!shopifyAPI) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to initialize Shopify API' 
        },
        { status: 500 }
      )
    }

    try {
      const createdCustomer = await shopifyAPI.createCustomer(customer)
      
      return NextResponse.json({
        success: true,
        customer: createdCustomer,
        store: {
          id: storeData.id,
          name: storeData.store_name,
          domain: storeData.shop_domain
        },
        agentId,
        message: agentId 
          ? `Customer created successfully by agent '${agentId}'`
          : 'Customer created successfully'
      })
    } catch (error) {
      console.error('Failed to create customer in Shopify:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create customer in Shopify. Please try again.' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in customer creation API:', error)
    
    if (error instanceof Error && error.message.includes('Permission')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          reason: error.message,
          permission: 'write_customers'
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
