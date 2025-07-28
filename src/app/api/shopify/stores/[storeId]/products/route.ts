import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { withStorePermission } from '@/lib/shopify/store-permission-validator'

/**
 * Example endpoint that demonstrates store permission validation
 * This shows how to protect Shopify API operations with store-specific permissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = await params
    const url = new URL(request.url)
    const agentId = url.searchParams.get('agentId') || undefined

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    console.log('📦 Products API called:', { storeId, agentId, userId: user.id })

    // Validate store permission - this will throw an error if not allowed
    const storeData = await withStorePermission(
      storeId,
      user.id,
      'read_products',
      agentId
    )

    console.log('✅ Permission validated for products read access')

    // Fetch products from Shopify using the Admin API
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
      const products = await shopifyAPI.getProducts()

      return NextResponse.json({
        success: true,
        store: {
          id: storeData.id,
          name: storeData.store_name,
          domain: storeData.shop_domain
        },
        products,
        count: products.length,
        agentId,
        message: agentId
          ? `Products fetched successfully by agent '${agentId}'`
          : 'Products fetched successfully'
      })
    } catch (error) {
      console.error('Failed to fetch products from Shopify:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch products from Shopify. Please try again.'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in products API:', error)
    
    // Check if it's a permission error
    if (error instanceof Error && error.message.includes('Permission')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          reason: error.message,
          storeId,
          permission: 'read_products'
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
 * Create or update products - requires write permission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = await params
    const body = await request.json()
    const { agentId, product } = body

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    console.log('📦 Product creation API called:', { storeId, agentId, userId: user.id })

    // Validate store permission for writing products
    const storeData = await withStorePermission(
      storeId,
      user.id,
      'write_products',
      agentId
    )

    console.log('✅ Permission validated for products write access')

    // Create product using Shopify Admin API
    const shopifyAPI = await createShopifyAPI(user.id)
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
      // Prepare product data for Shopify API
      const productData = {
        title: product?.title || 'New Product',
        handle: product?.handle || 'new-product',
        status: 'draft',
        vendor: storeData.store_name,
        product_type: product?.product_type || 'General',
        variants: [
          {
            title: 'Default Title',
            price: product?.price || '0.00',
            inventory_quantity: product?.inventory_quantity || 0,
            sku: product?.sku || `SKU-${Date.now()}`
          }
        ]
      }

      const newProduct = await shopifyAPI.createProduct(productData)

      return NextResponse.json({
        success: true,
        store: {
          id: storeData.id,
          name: storeData.store_name,
          domain: storeData.shop_domain
        },
        product: newProduct,
        agentId,
        message: agentId
          ? `Product created successfully by agent '${agentId}'`
          : 'Product created successfully'
      })
    } catch (shopifyError) {
      console.error('Failed to create product in Shopify:', shopifyError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create product in Shopify. Please try again.'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in product creation API:', error)
    
    // Check if it's a permission error
    if (error instanceof Error && error.message.includes('Permission')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          reason: error.message,
          storeId,
          permission: 'write_products'
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
