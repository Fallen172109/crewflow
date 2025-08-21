import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 SHOPIFY TOKEN REFRESH: Starting token refresh...')
    
    // Get authenticated user
    const user = await requireAuthAPI()
    console.log('🔄 SHOPIFY TOKEN REFRESH: User authenticated:', user.id)
    
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
    
    console.log('🔄 SHOPIFY TOKEN REFRESH: Connection found:', {
      id: connection.id,
      shopDomain: connection.shop_domain,
      status: connection.status
    })
    
    // For now, let's just update the status to indicate we need a fresh token
    // In a real scenario, you'd use the refresh token to get a new access token
    const { error: updateError } = await supabase
      .from('api_connections')
      .update({
        status: 'needs_reconnection',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)
    
    if (updateError) {
      console.error('❌ Failed to update connection:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update connection status'
      }, { status: 500 })
    }
    
    console.log('✅ Connection marked for reconnection')
    
    return NextResponse.json({
      success: true,
      message: 'Connection marked for reconnection. Please use manual token entry.',
      connection: {
        id: connection.id,
        shopDomain: connection.shop_domain,
        status: 'needs_reconnection'
      },
      instructions: {
        step1: 'Go to your Shopify admin',
        step2: 'Navigate to Settings → Apps and sales channels → Develop apps',
        step3: 'Find your CrewFlow app and get a fresh access token',
        step4: 'Use the manual token update endpoint'
      }
    })
    
  } catch (error) {
    console.error('🔄 SHOPIFY TOKEN REFRESH: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
