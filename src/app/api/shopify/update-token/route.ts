import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  console.log('🔄 UPDATE TOKEN: Starting token update process...')
  
  try {
    const body = await request.json()
    const { storeDomain, accessToken } = body

    console.log('🔄 UPDATE TOKEN: Request data:', {
      storeDomain,
      hasAccessToken: !!accessToken,
      tokenLength: accessToken?.length
    })

    if (!storeDomain || !accessToken) {
      console.log('❌ UPDATE TOKEN: Missing required fields')
      return NextResponse.json({
        success: false,
        error: 'Missing storeDomain or accessToken'
      }, { status: 400 })
    }

    const supabase = createSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔄 UPDATE TOKEN: User check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    })
    
    if (!user) {
      console.log('❌ UPDATE TOKEN: No authenticated user')
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 })
    }

    // Test the token first
    console.log('🔄 UPDATE TOKEN: Testing token validity...')
    try {
      const testResponse = await fetch(`https://${storeDomain}/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      console.log('🔄 UPDATE TOKEN: Token test result:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok
      })

      if (!testResponse.ok) {
        const errorText = await testResponse.text()
        console.log('❌ UPDATE TOKEN: Invalid token:', errorText)
        return NextResponse.json({
          success: false,
          error: `Invalid token: HTTP ${testResponse.status} - ${errorText}`
        }, { status: 400 })
      }

      const shopData = await testResponse.json()
      console.log('✅ UPDATE TOKEN: Token is valid for shop:', {
        name: shopData.shop?.name,
        id: shopData.shop?.id,
        domain: shopData.shop?.domain
      })

      // Check if store already exists
      const { data: existingStore, error: findError } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('shop_domain', storeDomain)
        .single()

      console.log('🔄 UPDATE TOKEN: Existing store check:', {
        hasExistingStore: !!existingStore,
        findError: findError?.message
      })

      let result
      if (existingStore) {
        // Update existing store
        console.log('🔄 UPDATE TOKEN: Updating existing store...')
        const { data: updatedStore, error: updateError } = await supabase
          .from('shopify_stores')
          .update({
            api_key_encrypted: accessToken,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStore.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ UPDATE TOKEN: Update failed:', updateError)
          return NextResponse.json({
            success: false,
            error: 'Failed to update store: ' + updateError.message
          }, { status: 500 })
        }

        result = updatedStore
        console.log('✅ UPDATE TOKEN: Store updated successfully:', result.id)
      } else {
        // Create new store
        console.log('🔄 UPDATE TOKEN: Creating new store...')
        const { data: newStore, error: createError } = await supabase
          .from('shopify_stores')
          .insert({
            user_id: user.id,
            shop_domain: storeDomain,
            store_name: shopData.shop?.name || storeDomain,
            api_key_encrypted: accessToken,
            status: 'active',
            plan_name: shopData.shop?.plan_name || 'unknown',
            currency: shopData.shop?.currency || 'USD'
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ UPDATE TOKEN: Create failed:', createError)
          return NextResponse.json({
            success: false,
            error: 'Failed to create store: ' + createError.message
          }, { status: 500 })
        }

        result = newStore
        console.log('✅ UPDATE TOKEN: Store created successfully:', result.id)
      }

      return NextResponse.json({
        success: true,
        message: existingStore ? 'Token updated successfully' : 'Store connected successfully',
        store: {
          id: result.id,
          storeName: result.store_name,
          shopDomain: result.shop_domain,
          status: result.status
        },
        shopInfo: {
          name: shopData.shop?.name,
          id: shopData.shop?.id,
          domain: shopData.shop?.domain,
          currency: shopData.shop?.currency,
          planName: shopData.shop?.plan_name
        }
      })

    } catch (tokenTestError) {
      console.error('💥 UPDATE TOKEN: Token test failed:', tokenTestError)
      return NextResponse.json({
        success: false,
        error: 'Failed to test token: ' + (tokenTestError instanceof Error ? tokenTestError.message : 'Unknown error')
      }, { status: 500 })
    }

  } catch (error) {
    console.error('💥 UPDATE TOKEN: Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
