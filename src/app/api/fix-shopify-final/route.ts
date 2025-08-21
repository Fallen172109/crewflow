import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 FINAL SHOPIFY FIX: Starting final connection fix...')
    
    // Get authenticated user
    const user = await requireAuthAPI()
    console.log('🔧 FINAL SHOPIFY FIX: User authenticated:', user.id)
    
    const supabase = await createSupabaseServerClientWithCookies()
    
    // Get all stores for this user
    const { data: stores, error: storesError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('user_id', user.id)
    
    if (storesError || !stores) {
      console.error('❌ Error fetching stores:', storesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores'
      }, { status: 500 })
    }
    
    console.log(`🔧 FINAL SHOPIFY FIX: Found ${stores.length} stores`)
    
    // Get existing API connections
    const { data: existingConnections, error: connectionsError } = await supabase
      .from('api_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_id', 'shopify')
    
    if (connectionsError) {
      console.error('❌ Error fetching connections:', connectionsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch connections'
      }, { status: 500 })
    }
    
    console.log(`🔧 FINAL SHOPIFY FIX: Found ${existingConnections?.length || 0} existing connections`)
    
    // Log current state
    console.log('🔧 FINAL SHOPIFY FIX: Current state:')
    stores.forEach(store => {
      console.log(`  Store: ${store.store_name} (${store.shop_domain})`)
    })
    existingConnections?.forEach(conn => {
      console.log(`  Connection: ${conn.shop_domain} (${conn.service_name})`)
    })
    
    const fixResults = []
    
    // Strategy: Update existing connections to match the primary store domain
    if (existingConnections && existingConnections.length > 0 && stores.length > 0) {
      const primaryStore = stores.find(s => s.is_primary) || stores[0]
      const existingConnection = existingConnections[0]
      
      console.log(`🔧 FINAL SHOPIFY FIX: Primary store: ${primaryStore.store_name} (${primaryStore.shop_domain})`)
      console.log(`🔧 FINAL SHOPIFY FIX: Existing connection: ${existingConnection.shop_domain}`)
      
      if (existingConnection.shop_domain !== primaryStore.shop_domain) {
        console.log(`🔧 FINAL SHOPIFY FIX: Updating connection domain from ${existingConnection.shop_domain} to ${primaryStore.shop_domain}`)
        
        // Update the existing connection to match the primary store
        const { error: updateError } = await supabase
          .from('api_connections')
          .update({
            shop_domain: primaryStore.shop_domain,
            store_id: primaryStore.id
          })
          .eq('id', existingConnection.id)
        
        if (updateError) {
          console.error(`❌ Failed to update connection:`, updateError)
          fixResults.push({
            action: 'update_connection',
            success: false,
            error: updateError.message
          })
        } else {
          console.log(`✅ Successfully updated connection domain`)
          fixResults.push({
            action: 'update_connection',
            success: true,
            oldDomain: existingConnection.shop_domain,
            newDomain: primaryStore.shop_domain,
            storeId: primaryStore.id
          })
        }
      } else {
        console.log(`✅ Connection domain already matches primary store`)
        fixResults.push({
          action: 'no_update_needed',
          success: true,
          domain: primaryStore.shop_domain
        })
      }
      
      // Now create connections for any additional stores that need them
      for (const store of stores) {
        if (store.id === primaryStore.id) continue // Skip primary store, already handled
        
        // Check if this store has a connection
        const hasConnection = existingConnections.some(conn => 
          conn.shop_domain === store.shop_domain || conn.store_id === store.id
        )
        
        if (!hasConnection) {
          console.log(`🔧 FINAL SHOPIFY FIX: Creating connection for additional store: ${store.store_name}`)
          
          // Create a new connection for this store using the same access token
          const { error: insertError } = await supabase
            .from('api_connections')
            .insert({
              user_id: user.id,
              integration_id: 'shopify',
              service_name: 'shopify',
              api_key_encrypted: existingConnection.api_key_encrypted,
              access_token: existingConnection.access_token,
              shop_domain: store.shop_domain,
              store_id: store.id,
              status: 'connected',
              connected_at: new Date().toISOString()
            })
          
          if (insertError) {
            console.error(`❌ Failed to create connection for ${store.store_name}:`, insertError)
            fixResults.push({
              action: 'create_connection',
              success: false,
              storeName: store.store_name,
              shopDomain: store.shop_domain,
              error: insertError.message
            })
          } else {
            console.log(`✅ Created connection for ${store.store_name}`)
            fixResults.push({
              action: 'create_connection',
              success: true,
              storeName: store.store_name,
              shopDomain: store.shop_domain,
              storeId: store.id
            })
          }
        }
      }
    } else {
      console.log('❌ No existing connections found to work with')
      fixResults.push({
        action: 'no_connections',
        success: false,
        error: 'No existing API connections found. Need to run Shopify OAuth flow.'
      })
    }
    
    // Summary
    const summary = {
      totalStores: stores.length,
      existingConnections: existingConnections?.length || 0,
      updatedConnections: fixResults.filter(r => r.action === 'update_connection' && r.success).length,
      createdConnections: fixResults.filter(r => r.action === 'create_connection' && r.success).length,
      failed: fixResults.filter(r => !r.success).length
    }
    
    console.log('🔧 FINAL SHOPIFY FIX: Summary:', summary)
    
    return NextResponse.json({
      success: true,
      message: 'Final Shopify connection fix completed',
      summary,
      results: fixResults,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🔧 FINAL SHOPIFY FIX: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
