import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { getUserStores } from '@/lib/shopify/multi-store-manager'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()

    // Check if supabase client was created successfully
    if (!supabase || !supabase.auth) {
      console.error('Supabase client not properly initialized')
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error:', authError.message)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Debug: Log user ID
    console.log('🔍 API Debug - User ID:', user.id)

    // Get user's Shopify stores - pass the authenticated supabase client
    const stores = await getUserStores(user.id, supabase)

    // Debug: Log stores result
    console.log('🔍 API Debug - Stores returned:', { count: stores.length, stores })

    return NextResponse.json({
      success: true,
      stores
    })

  } catch (error) {
    console.error('Error loading Shopify stores:', error)
    return NextResponse.json(
      { error: 'Failed to load stores' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { action, storeId, ...data } = body
    
    switch (action) {
      case 'sync':
        // Trigger store sync
        const { syncStoreData } = await import('@/lib/shopify/multi-store-manager')
        const syncResult = await syncStoreData(storeId, user.id)
        
        if (!syncResult.success) {
          return NextResponse.json(
            { error: syncResult.error },
            { status: 400 }
          )
        }
        
        return NextResponse.json({ success: true })
        
      case 'setPrimary':
        // Set primary store
        const { setPrimaryStore } = await import('@/lib/shopify/multi-store-manager')
        const primaryResult = await setPrimaryStore(user.id, storeId)
        
        if (!primaryResult.success) {
          return NextResponse.json(
            { error: primaryResult.error },
            { status: 400 }
          )
        }
        
        return NextResponse.json({ success: true })
        
      case 'remove':
        // Remove store
        const { removeStore } = await import('@/lib/shopify/multi-store-manager')
        const removeResult = await removeStore(user.id, storeId)
        
        if (!removeResult.success) {
          return NextResponse.json(
            { error: removeResult.error },
            { status: 400 }
          )
        }
        
        return NextResponse.json({ success: true })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Error managing Shopify store:', error)
    return NextResponse.json(
      { error: 'Failed to manage store' },
      { status: 500 }
    )
  }
}
