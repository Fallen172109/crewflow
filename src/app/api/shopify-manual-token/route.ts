import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'
import { OAuthSecurityManager } from '@/lib/integrations/security'

export async function POST(request: NextRequest) {
  try {
    console.log('🔑 MANUAL TOKEN UPDATE: Starting manual token update...')
    
    // Get authenticated user
    const user = await requireAuthAPI()
    console.log('🔑 MANUAL TOKEN UPDATE: User authenticated:', user.id)
    
    const { accessToken } = await request.json()
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Access token is required'
      }, { status: 400 })
    }
    
    console.log('🔑 MANUAL TOKEN UPDATE: Token provided, length:', accessToken.length)
    
    const supabase = await createSupabaseServerClientWithCookies()
    
    // Get the current connection
    const { data: connection, error: connectionError } = await supabase
      .from('api_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_id', 'shopify')
      .single()
    
    if (connectionError || !connection) {
      console.error('❌ No connection found:', connectionError)
      return NextResponse.json({
        success: false,
        error: 'No Shopify connection found'
      }, { status: 404 })
    }
    
    // Encrypt the new token
    const securityManager = new OAuthSecurityManager()
    const encryptedToken = securityManager.encrypt(accessToken)
    
    console.log('🔑 MANUAL TOKEN UPDATE: Token encrypted successfully')
    
    // Update the connection with the new token
    const { error: updateError } = await supabase
      .from('api_connections')
      .update({
        api_key_encrypted: encryptedToken,
        access_token: encryptedToken, // Store in both fields for compatibility
        status: 'connected',
        health: 'healthy',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)
    
    if (updateError) {
      console.error('❌ Failed to update token:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update token'
      }, { status: 500 })
    }
    
    console.log('✅ Token updated successfully')
    
    // Test the new token immediately
    const shopifyUrl = `https://${connection.shop_domain}/admin/api/2023-10/shop.json`
    
    try {
      const testResponse = await fetch(shopifyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken
        }
      })
      
      const testResult = await testResponse.json()
      
      if (testResponse.ok) {
        console.log('✅ Token test successful')
        return NextResponse.json({
          success: true,
          message: 'Token updated and tested successfully!',
          connection: {
            id: connection.id,
            shopDomain: connection.shop_domain,
            status: 'connected',
            health: 'healthy'
          },
          shopInfo: {
            name: testResult.shop?.name,
            domain: testResult.shop?.domain,
            email: testResult.shop?.email
          }
        })
      } else {
        console.error('❌ Token test failed:', testResult)
        return NextResponse.json({
          success: false,
          error: 'Token updated but test failed - token may be invalid',
          details: testResult
        }, { status: 400 })
      }
      
    } catch (testError) {
      console.error('❌ Token test error:', testError)
      return NextResponse.json({
        success: false,
        error: 'Token updated but test failed',
        details: testError instanceof Error ? testError.message : 'Unknown test error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('🔑 MANUAL TOKEN UPDATE: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
