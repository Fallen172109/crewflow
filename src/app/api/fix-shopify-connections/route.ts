import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { OAuthSecurityManager } from '@/lib/integrations/security'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 FIX SHOPIFY CONNECTIONS: Starting fix...')
    
    // Get authenticated user
    const user = await requireAuthAPI()
    console.log('🔧 FIX SHOPIFY CONNECTIONS: User authenticated:', user.id)
    
    const supabase = await createSupabaseServerClientWithCookies()
    const securityManager = new OAuthSecurityManager()
    
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
    
    console.log(`🔧 FIX SHOPIFY CONNECTIONS: Found ${stores.length} stores`)
    
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
    
    console.log(`🔧 FIX SHOPIFY CONNECTIONS: Found ${existingConnections?.length || 0} existing connections`)
    
    const existingDomains = existingConnections?.map(c => c.shop_domain) || []
    const fixResults = []
    
    // For each store, check if it has an API connection
    for (const store of stores) {
      console.log(`🔧 FIX SHOPIFY CONNECTIONS: Processing store ${store.store_name} (${store.shop_domain})`)
      
      if (existingDomains.includes(store.shop_domain)) {
        console.log(`✅ Store ${store.store_name} already has API connection`)
        fixResults.push({
          storeId: store.id,
          storeName: store.store_name,
          shopDomain: store.shop_domain,
          action: 'skipped',
          reason: 'Connection already exists'
        })
        continue
      }
      
      // This store is missing an API connection
      console.log(`🔧 Store ${store.store_name} is missing API connection`)

      // Try to copy access token from an existing connection (if available)
      let tokenToUse = 'PLACEHOLDER_TOKEN_NEEDS_OAUTH_RECONNECTION'
      let connectionStatus = 'needs_reconnection'

      if (existingConnections && existingConnections.length > 0) {
        // Use the access token from the first existing connection
        const existingConnection = existingConnections[0]
        if (existingConnection.api_key_encrypted || existingConnection.access_token) {
          tokenToUse = existingConnection.api_key_encrypted || existingConnection.access_token
          connectionStatus = 'connected'
          console.log(`🔧 Copying access token from existing connection for ${existingConnection.shop_domain}`)
        }
      }

      try {
        let encryptedToken: string

        if (tokenToUse === 'PLACEHOLDER_TOKEN_NEEDS_OAUTH_RECONNECTION') {
          // Create a placeholder encrypted token
          encryptedToken = securityManager.encrypt(tokenToUse)
        } else {
          // Use the existing encrypted token directly
          encryptedToken = tokenToUse
        }
        
        const { error: insertError } = await supabase
          .from('api_connections')
          .insert({
            user_id: user.id,
            integration_id: 'shopify',
            service_name: 'shopify',
            api_key_encrypted: encryptedToken,
            access_token: encryptedToken,
            shop_domain: store.shop_domain,
            store_id: store.id,
            status: connectionStatus,
            connected_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error(`❌ Failed to create connection for ${store.store_name}:`, insertError)
          fixResults.push({
            storeId: store.id,
            storeName: store.store_name,
            shopDomain: store.shop_domain,
            action: 'failed',
            error: insertError.message
          })
        } else {
          const actionType = connectionStatus === 'connected' ? 'copied_token' : 'created_placeholder'
          console.log(`✅ ${actionType === 'copied_token' ? 'Copied access token' : 'Created placeholder connection'} for ${store.store_name}`)
          fixResults.push({
            storeId: store.id,
            storeName: store.store_name,
            shopDomain: store.shop_domain,
            action: actionType,
            status: connectionStatus,
            note: connectionStatus === 'connected'
              ? 'Access token copied from existing connection'
              : 'Placeholder created - requires OAuth reconnection'
          })
        }
      } catch (error) {
        console.error(`❌ Error creating connection for ${store.store_name}:`, error)
        fixResults.push({
          storeId: store.id,
          storeName: store.store_name,
          shopDomain: store.shop_domain,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Summary
    const summary = {
      totalStores: stores.length,
      existingConnections: existingConnections?.length || 0,
      tokensCopied: fixResults.filter(r => r.action === 'copied_token').length,
      placeholdersCreated: fixResults.filter(r => r.action === 'created_placeholder').length,
      skipped: fixResults.filter(r => r.action === 'skipped').length,
      failed: fixResults.filter(r => r.action === 'failed').length
    }
    
    console.log('🔧 FIX SHOPIFY CONNECTIONS: Summary:', summary)
    
    return NextResponse.json({
      success: true,
      message: 'Shopify connections fix completed',
      summary,
      results: fixResults,
      nextSteps: [
        'Placeholder connections created for missing stores',
        'These stores will need OAuth reconnection to get real access tokens',
        'For testing, you can manually update the access tokens in the database',
        'Or use the Shopify OAuth flow to properly connect the stores'
      ],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🔧 FIX SHOPIFY CONNECTIONS: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
