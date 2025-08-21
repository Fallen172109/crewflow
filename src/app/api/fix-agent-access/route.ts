import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAPI } from '@/lib/auth'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 FIXING AGENT ACCESS: Starting agent access fix...')
    
    // Get authenticated user
    const user = await requireAuthAPI()
    console.log('🔧 FIXING AGENT ACCESS: User authenticated:', user.id)
    
    const supabase = await createSupabaseServerClientWithCookies()
    
    // Get all user's stores
    const { data: stores, error: storesError } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('user_id', user.id)
    
    if (storesError) {
      console.error('❌ Error fetching stores:', storesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores',
        details: storesError
      }, { status: 500 })
    }
    
    console.log(`🔧 FIXING AGENT ACCESS: Found ${stores?.length || 0} stores`)
    
    const fixResults = []
    
    for (const store of stores || []) {
      console.log(`🔧 FIXING AGENT ACCESS: Processing store ${store.store_name} (${store.id})`)
      
      // Get current agent access
      const currentAgentAccess = store.agent_access || {}
      console.log('🔧 FIXING AGENT ACCESS: Current agent access:', Object.keys(currentAgentAccess))
      
      // Add ai-store-manager if missing
      const updatedAgentAccess = {
        ...currentAgentAccess,
        'ai-store-manager': {
          enabled: true,
          permissions: [
            'product_research',
            'product_optimization',
            'inventory_management',
            'order_tracking',
            'order_fulfillment',
            'customer_management',
            'analytics_access',
            'content_creation',
            'business_automation'
          ]
        }
      }
      
      // Update the store
      const { data: updatedStore, error: updateError } = await supabase
        .from('shopify_stores')
        .update({ agent_access: updatedAgentAccess })
        .eq('id', store.id)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (updateError) {
        console.error(`❌ Error updating store ${store.store_name}:`, updateError)
        fixResults.push({
          storeId: store.id,
          storeName: store.store_name,
          success: false,
          error: updateError.message
        })
      } else {
        console.log(`✅ Successfully updated store ${store.store_name}`)
        fixResults.push({
          storeId: store.id,
          storeName: store.store_name,
          success: true,
          agentAccessUpdated: Object.keys(updatedAgentAccess),
          aiStoreManagerEnabled: updatedAgentAccess['ai-store-manager']?.enabled
        })
      }
    }
    
    // Summary
    const summary = {
      totalStores: stores?.length || 0,
      successfulUpdates: fixResults.filter(r => r.success).length,
      failedUpdates: fixResults.filter(r => !r.success).length
    }
    
    console.log('🔧 FIXING AGENT ACCESS: Summary:', summary)
    
    return NextResponse.json({
      success: true,
      message: 'Agent access fix completed',
      summary,
      results: fixResults,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🔧 FIXING AGENT ACCESS: Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
