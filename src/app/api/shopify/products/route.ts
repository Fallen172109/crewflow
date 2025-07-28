import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createSupabaseServerClient()

    const body = await request.json()
    const { storeId, product } = body

    if (!storeId || !product) {
      return NextResponse.json(
        { error: 'Store ID and product data are required' },
        { status: 400 }
      )
    }

    // Verify user owns the store
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user has product write permissions
    if (!store.permissions?.write_products) {
      return NextResponse.json(
        { error: 'You do not have permission to create products in this store' },
        { status: 403 }
      )
    }

    // Initialize Shopify API
    const shopifyAPI = await createShopifyAPI(user.id)
    if (!shopifyAPI) {
      return NextResponse.json(
        { error: 'Failed to initialize Shopify API' },
        { status: 500 }
      )
    }

    // Transform product data to Shopify format
    const shopifyProduct = {
      title: product.title,
      body_html: product.description,
      vendor: store.store_name,
      product_type: product.category || 'General',
      tags: product.tags ? product.tags.join(', ') : '',
      status: 'active',
      variants: product.variants?.map((variant: any) => ({
        title: variant.title || 'Default Title',
        price: variant.price?.toString() || product.price?.toString() || '0.00',
        inventory_quantity: variant.inventory_quantity || 0,
        inventory_management: 'shopify'
      })) || [{
        title: 'Default Title',
        price: product.price?.toString() || '0.00',
        inventory_quantity: 0,
        inventory_management: 'shopify'
      }],
      images: product.images?.map((imageUrl: string) => ({
        src: imageUrl
      })) || []
    }

    // Create product in Shopify
    const createdProduct = await shopifyAPI.createProduct(shopifyProduct)

    if (!createdProduct) {
      return NextResponse.json(
        { error: 'Failed to create product in Shopify' },
        { status: 500 }
      )
    }

    // Update product draft status
    await supabase
      .from('product_drafts')
      .update({ 
        published: true,
        shopify_product_id: createdProduct.id,
        published_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .eq('title', product.title)

    // Log the successful product creation
    await supabase.from('shopify_activity_log').insert({
      user_id: user.id,
      store_id: storeId,
      action: 'product_created',
      resource_type: 'product',
      resource_id: createdProduct.id.toString(),
      details: {
        title: createdProduct.title,
        price: createdProduct.variants?.[0]?.price,
        created_via: 'ai_chat'
      },
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      product: {
        id: createdProduct.id,
        title: createdProduct.title,
        handle: createdProduct.handle,
        admin_url: `https://admin.shopify.com/store/${store.shop_domain.replace('.myshopify.com', '')}/products/${createdProduct.id}`,
        public_url: `https://${store.shop_domain}/products/${createdProduct.handle}`
      }
    })

  } catch (error) {
    console.error('Error creating Shopify product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Verify user owns the store
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    // Initialize Shopify API
    const shopifyAPI = await createShopifyAPI(user.id)
    if (!shopifyAPI) {
      return NextResponse.json(
        { error: 'Failed to initialize Shopify API' },
        { status: 500 }
      )
    }

    // Get products from Shopify
    const products = await shopifyAPI.getProducts(limit, offset)

    return NextResponse.json({
      success: true,
      products: products || [],
      store: {
        id: store.id,
        name: store.store_name,
        domain: store.shop_domain
      }
    })

  } catch (error) {
    console.error('Error fetching Shopify products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
