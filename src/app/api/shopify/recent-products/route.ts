import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get recent published products from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentProducts, error } = await supabase
      .from('product_drafts')
      .select(`
        id,
        title,
        description,
        price,
        category,
        tags,
        images,
        published,
        shopify_product_id,
        published_at,
        created_at,
        store_id
      `)
      .eq('user_id', user.id)
      .eq('published', true)
      .gte('published_at', twentyFourHoursAgo)
      .order('published_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching recent products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recent products' },
        { status: 500 }
      )
    }

    // Get store information for each product
    const storeIds = [...new Set(recentProducts?.map(p => p.store_id).filter(Boolean))]
    let stores: any[] = []
    
    if (storeIds.length > 0) {
      const { data: storeData } = await supabase
        .from('shopify_stores')
        .select('id, store_name, domain')
        .in('id', storeIds)
      
      stores = storeData || []
    }

    // Enhance products with store information
    const enhancedProducts = recentProducts?.map(product => {
      const store = stores.find(s => s.id === product.store_id)
      return {
        ...product,
        store_name: store?.store_name,
        store_domain: store?.domain,
        shopify_admin_url: store?.domain ? 
          `https://${store.domain}/admin/products/${product.shopify_product_id}` : null,
        store_url: store?.domain ? 
          `https://${store.domain}/products/${product.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null
      }
    }) || []

    return NextResponse.json({
      success: true,
      products: enhancedProducts,
      total: enhancedProducts.length,
      timeframe: '24 hours'
    })

  } catch (error) {
    console.error('Error in recent products API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all published products (with pagination)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { page = 1, limit = 20, storeId } = await request.json()
    const offset = (page - 1) * limit

    let query = supabase
      .from('product_drafts')
      .select(`
        id,
        title,
        description,
        price,
        category,
        tags,
        images,
        published,
        shopify_product_id,
        published_at,
        created_at,
        store_id
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('published', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: products, error, count } = await query

    if (error) {
      console.error('Error fetching published products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch published products' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Error in published products API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
