import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

// DELETE /api/shopify/stores/[storeId]/products/[productId] - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    const { storeId, productId } = params

    // Validate productId is a number
    const productIdNum = parseInt(productId, 10)
    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

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
    console.log('🗑️ Delete product API called:', { storeId, productId: productIdNum, userId })

    // Verify store ownership and get store data
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

    // Check write_products permission
    const permissions = storeData.permissions || {}
    if (!permissions.write_products) {
      return NextResponse.json(
        { error: 'Permission denied: write_products permission required' },
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

    // Delete the product
    try {
      await shopifyAPI.deleteProduct(productIdNum)

      console.log('✅ Product deleted successfully:', productIdNum)

      return NextResponse.json({
        success: true,
        message: `Product ${productIdNum} deleted successfully`,
        productId: productIdNum
      })
    } catch (error) {
      console.error('Failed to delete product:', error)

      // Check if it's a "not found" error
      if (error instanceof Error && error.message.includes('404')) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to delete product from Shopify' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in delete product API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/shopify/stores/[storeId]/products/[productId] - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    const { storeId, productId } = params

    const productIdNum = parseInt(productId, 10)
    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
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

    const userId = user.id

    // Verify store ownership
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

    // Check read_products permission
    const permissions = storeData.permissions || {}
    if (!permissions.read_products) {
      return NextResponse.json(
        { error: 'Permission denied: read_products permission required' },
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

    const product = await shopifyAPI.getProduct(productIdNum)

    return NextResponse.json({
      success: true,
      product
    })

  } catch (error) {
    console.error('❌ Error getting product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
