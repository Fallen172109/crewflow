import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { OAuthSecurityManager } from '@/lib/integrations/security'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 DIRECT SHOPIFY TEST: Starting direct Shopify product creation test...')
    
    // Get authenticated user
    const user = await requireAuthAPI()
    console.log('🎯 DIRECT SHOPIFY TEST: User authenticated:', user.id)
    
    const supabase = await createSupabaseServerClientWithCookies()
    
    // Step 1: Get the store
    const { data: stores, error: storesError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single()
    
    if (storesError || !stores) {
      console.error('❌ No primary store found:', storesError)
      return NextResponse.json({
        success: false,
        error: 'No primary store found'
      }, { status: 404 })
    }
    
    console.log('🎯 DIRECT SHOPIFY TEST: Primary store found:', {
      id: stores.id,
      shopDomain: stores.shop_domain,
      storeName: stores.store_name
    })
    
    // Step 2: Get the API connection for this store's domain
    const { data: connection, error: connectionError } = await supabase
      .from('api_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_id', 'shopify')
      .eq('status', 'connected')
      .eq('shop_domain', stores.shop_domain)
      .maybeSingle()

    console.log('🎯 DIRECT SHOPIFY TEST: Connection query result:', {
      connection: !!connection,
      error: connectionError,
      connectionData: connection ? {
        id: connection.id,
        shopDomain: connection.shop_domain,
        status: connection.status,
        hasAccessToken: !!connection.access_token,
        hasApiKeyEncrypted: !!connection.api_key_encrypted
      } : null
    })
    
    if (connectionError || !connection) {
      console.error('❌ No API connection found for store domain:', stores.shop_domain, connectionError)
      return NextResponse.json({
        success: false,
        error: 'No API connection found for this Shopify store. Please reconnect in CrewFlow.',
        debug: {
          connectionError,
          userId: user.id,
          shopDomain: stores.shop_domain
        }
      }, { status: 404 })
    }

    // Step 3: Decrypt the access token
    const securityManager = new OAuthSecurityManager()
    const encryptedToken = connection.api_key_encrypted || connection.access_token
    
    if (!encryptedToken) {
      console.error('❌ No access token found')
      return NextResponse.json({
        success: false,
        error: 'No access token found'
      }, { status: 404 })
    }
    
    let accessToken: string
    try {
      accessToken = securityManager.decrypt(encryptedToken)
      console.log('🎯 DIRECT SHOPIFY TEST: Access token decrypted successfully')
    } catch (decryptError) {
      console.error('❌ Failed to decrypt access token:', decryptError)
      return NextResponse.json({
        success: false,
        error: 'Failed to decrypt access token'
      }, { status: 500 })
    }
    
    // Step 4: Make direct Shopify API call
    const shopifyUrl = `https://${stores.shop_domain}/admin/api/2023-10/products.json`
    
    const productData = {
      product: {
        title: 'CrewFlow AI Test Product - SUCCESS!',
        body_html: '<p>This product was created successfully by CrewFlow AI Store Manager!</p><p>🎉 Your Shopify integration is working perfectly!</p>',
        vendor: 'CrewFlow AI',
        product_type: 'Test Product',
        status: 'draft',
        variants: [
          {
            price: '19.99',
            inventory_quantity: 100,
            inventory_management: 'shopify'
          }
        ],
        tags: 'ai-created, test-product, crewflow'
      }
    }
    
    console.log('🎯 DIRECT SHOPIFY TEST: Making Shopify API call to:', shopifyUrl)
    
    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify(productData)
    })
    
    const shopifyResult = await shopifyResponse.json()
    
    console.log('🎯 DIRECT SHOPIFY TEST: Shopify API response:', {
      status: shopifyResponse.status,
      success: shopifyResponse.ok,
      hasProduct: !!shopifyResult.product
    })
    
    if (!shopifyResponse.ok) {
      console.error('❌ Shopify API error:', shopifyResult)
      return NextResponse.json({
        success: false,
        error: 'Shopify API error',
        details: shopifyResult
      }, { status: shopifyResponse.status })
    }
    
    // Step 5: Success!
    const product = shopifyResult.product
    const shopifyAdminUrl = `https://${stores.shop_domain}/admin/products/${product.id}`
    const shopifyStoreUrl = `https://${stores.shop_domain.replace('.myshopify.com', '')}.myshopify.com/products/${product.handle}`
    
    console.log('🎉 SUCCESS: Product created successfully!')
    console.log('🎉 Product ID:', product.id)
    console.log('🎉 Shopify Admin URL:', shopifyAdminUrl)
    
    return NextResponse.json({
      success: true,
      message: '🎉 SUCCESS: Shopify integration is working perfectly!',
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        status: product.status,
        shopifyAdminUrl,
        shopifyStoreUrl,
        createdAt: product.created_at
      },
      store: {
        id: stores.id,
        name: stores.store_name,
        domain: stores.shop_domain
      },
      debug: {
        connectionFound: true,
        tokenDecrypted: true,
        shopifyApiSuccess: true
      }
    })
    
  } catch (error) {
    console.error('🎯 DIRECT SHOPIFY TEST: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
