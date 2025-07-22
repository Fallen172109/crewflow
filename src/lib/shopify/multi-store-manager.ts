// Multi-Store Management System
// Handles multiple Shopify stores from a single CrewFlow interface

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { OAuthSecurityManager } from '@/lib/integrations/security'
import crypto from 'crypto'

export interface ShopifyStore {
  id: string
  userId: string
  shopDomain: string
  storeName: string
  storeEmail: string
  currency: string
  timezone: string
  planName: string
  isActive: boolean
  isPrimary: boolean
  connectedAt: Date
  lastSyncAt?: Date
  syncStatus: 'synced' | 'syncing' | 'error' | 'never'
  syncError?: string
  metadata: {
    shop_id: number
    myshopify_domain: string
    country_code: string
    country_name: string
    province_code?: string
    phone?: string
    address1?: string
    city?: string
    zip?: string
  }
  permissions: {
    read_products: boolean
    write_products: boolean
    read_orders: boolean
    write_orders: boolean
    read_customers: boolean
    write_customers: boolean
    read_analytics: boolean
    read_inventory: boolean
    write_inventory: boolean
  }
  agentAccess: {
    [agentId: string]: {
      enabled: boolean
      permissions: string[]
      lastActivity?: Date
    }
  }
}

export interface StoreMetrics {
  storeId: string
  revenue: number
  orders: number
  customers: number
  products: number
  conversionRate: number
  averageOrderValue: number
  period: string
}

export interface CrossStoreInsight {
  type: 'performance_comparison' | 'inventory_optimization' | 'customer_overlap' | 'pricing_analysis'
  title: string
  description: string
  stores: string[]
  data: any
  recommendations: string[]
  impact: 'high' | 'medium' | 'low'
}

// Get decrypted access token for a store
export async function getStoreAccessToken(userId: string, shopDomain: string): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  const securityManager = new OAuthSecurityManager()

  try {
    const { data, error } = await supabase
      .from('api_connections')
      .select('api_key_encrypted, access_token')
      .eq('user_id', userId)
      .eq('shop_domain', shopDomain)
      .eq('integration_id', 'shopify')
      .single()

    if (error || !data) {
      console.log('No access token found for user:', userId)
      return null
    }

    // Try to decrypt the token (prefer api_key_encrypted, fallback to access_token)
    const encryptedToken = data.api_key_encrypted || data.access_token
    if (!encryptedToken) {
      return null
    }

    return securityManager.decrypt(encryptedToken)
  } catch (error) {
    console.error('Error retrieving access token:', error)
    return null
  }
}

// Get all stores for a user
export async function getUserStores(userId: string, supabaseClient?: any): Promise<ShopifyStore[]> {
  // Use provided client or create a new one
  const supabase = supabaseClient || createSupabaseServerClient()

  try {
    // Check if supabase client was created successfully
    if (!supabase) {
      console.error('Supabase client not available in getUserStores')
      return []
    }

    console.log('🔍 getUserStores Debug - User ID:', userId)

    const { data, error } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('connected_at', { ascending: false })

    console.log('🔍 getUserStores Debug - Query result:', { data, error })

    if (error) {
      console.error('Database error in getUserStores:', error)
      throw error
    }
    
    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      shopDomain: record.shop_domain,
      storeName: record.store_name,
      storeEmail: record.store_email,
      currency: record.currency,
      timezone: record.timezone,
      planName: record.plan_name,
      isActive: record.is_active,
      isPrimary: record.is_primary,
      connectedAt: new Date(record.connected_at),
      lastSyncAt: record.last_sync_at ? new Date(record.last_sync_at) : undefined,
      syncStatus: record.sync_status,
      syncError: record.sync_error,
      metadata: record.metadata || {},
      permissions: record.permissions || getDefaultPermissions(),
      agentAccess: record.agent_access || {}
    }))
  } catch (error) {
    console.error('Error getting user stores:', error)
    return []
  }
}

// Add a new store
export async function addStore(userId: string, accessToken: string, shopDomain: string, supabaseClient?: any): Promise<{ success: boolean; store?: ShopifyStore; error?: string }> {
  const supabase = supabaseClient || createSupabaseServerClient()
  const securityManager = new OAuthSecurityManager()

  try {
    console.log('🔄 Starting addStore process:', { userId, shopDomain, accessTokenLength: accessToken?.length || 0 })

    // Check if store already exists for this user
    const { data: existingStoreData, error: checkError } = await supabase
      .from('shopify_stores')
      .select('id, store_name, is_active')
      .eq('user_id', userId)
      .eq('shop_domain', shopDomain)
      .single()

    if (existingStoreData && !checkError) {
      console.log('🔄 Store already exists, updating access token:', { storeId: existingStoreData.id, storeName: existingStoreData.store_name })

      // Update the existing store's access token
      const encryptedToken = securityManager.encrypt(accessToken)

      const { error: updateError } = await supabase
        .from('api_connections')
        .upsert({
          user_id: userId,
          integration_id: 'shopify',
          service_name: 'shopify',
          api_key_encrypted: encryptedToken,
          access_token: encryptedToken,
          shop_domain: shopDomain,
          store_id: existingStoreData.id,
          status: 'connected',
          connected_at: new Date().toISOString()
        })

      if (updateError) {
        console.error('❌ Failed to update access token:', updateError)
      } else {
        console.log('✅ Access token updated successfully')
      }

      return {
        success: true,
        store: {
          id: existingStoreData.id,
          userId,
          shopDomain,
          storeName: existingStoreData.store_name,
          storeEmail: '',
          currency: '',
          timezone: '',
          planName: '',
          isActive: existingStoreData.is_active,
          isPrimary: true,
          connectedAt: new Date(),
          syncStatus: 'never',
          metadata: {},
          permissions: getDefaultPermissions(),
          agentAccess: getDefaultAgentAccess()
        }
      }
    }

    // Create Shopify API client with the new token
    console.log('🔄 Creating Shopify API client...')
    const shopifyAPI = await createShopifyAPI(userId, accessToken, shopDomain)
    if (!shopifyAPI) {
      console.error('❌ Failed to create Shopify API client')
      throw new Error('Failed to create Shopify API client')
    }
    console.log('✅ Shopify API client created successfully')

    // Get shop information
    console.log('🔄 Fetching shop information...')
    const shopInfo = await shopifyAPI.getShop()
    console.log('✅ Shop information retrieved:', { name: shopInfo.name, id: shopInfo.id, domain: shopInfo.myshopify_domain })
    
    // Check if store already exists (this should not happen due to earlier check, but keeping as safety)
    const allUserStores = await getUserStores(userId)
    const duplicateStore = allUserStores.find(store => store.shopDomain === shopDomain)

    if (duplicateStore) {
      return {
        success: false,
        error: 'Store is already connected'
      }
    }
    
    // Determine if this should be the primary store
    const isPrimary = allUserStores.length === 0
    
    // Create store record
    const store: ShopifyStore = {
      id: crypto.randomUUID(),
      userId,
      shopDomain,
      storeName: shopInfo.name,
      storeEmail: shopInfo.email,
      currency: shopInfo.currency,
      timezone: shopInfo.timezone,
      planName: shopInfo.plan_name,
      isActive: true,
      isPrimary,
      connectedAt: new Date(),
      syncStatus: 'never',
      metadata: {
        shop_id: shopInfo.id,
        myshopify_domain: shopInfo.myshopify_domain,
        country_code: shopInfo.country_code,
        country_name: shopInfo.country_name,
        province_code: shopInfo.province_code,
        phone: shopInfo.phone,
        address1: shopInfo.address1,
        city: shopInfo.city,
        zip: shopInfo.zip
      },
      permissions: getDefaultPermissions(),
      agentAccess: getDefaultAgentAccess()
    }
    
    // Store in database
    console.log('🔄 Inserting store into database:', { storeId: store.id, storeName: store.storeName, isPrimary })
    const { error } = await supabase.from('shopify_stores').insert({
      id: store.id,
      user_id: userId,
      shop_domain: shopDomain,
      store_name: store.storeName,
      store_email: store.storeEmail,
      currency: store.currency,
      timezone: store.timezone,
      plan_name: store.planName,
      is_active: true,
      is_primary: isPrimary,
      connected_at: store.connectedAt.toISOString(),
      sync_status: 'never',
      metadata: store.metadata,
      permissions: store.permissions,
      agent_access: store.agentAccess
    })

    if (error) {
      console.error('❌ Database error inserting store:', error)
      throw error
    }
    console.log('✅ Store inserted into database successfully')

    // Store access token securely with encryption
    console.log('🔄 Storing access token in api_connections...')
    const encryptedToken = securityManager.encrypt(accessToken)

    const { error: tokenError } = await supabase.from('api_connections').insert({
      user_id: userId,
      integration_id: 'shopify',
      service_name: 'shopify',
      api_key_encrypted: encryptedToken,
      access_token: encryptedToken,
      shop_domain: shopDomain,
      store_id: store.id,
      status: 'connected',
      connected_at: new Date().toISOString()
    })

    if (tokenError) {
      console.error('❌ Database error storing access token:', tokenError)
      // Don't throw error - store creation should still succeed
      console.warn('⚠️ Continuing without storing access token...')
    } else {
      console.log('✅ Access token stored successfully')
    }
    
    // Trigger initial sync
    console.log('🔄 Triggering initial sync...')
    try {
      await syncStoreData(store.id, userId)
      console.log('✅ Initial sync completed successfully')
    } catch (syncError) {
      console.warn('⚠️ Initial sync failed, but store was created:', syncError)
      // Don't fail the entire process if sync fails
    }

    console.log('✅ Store addition process completed successfully')
    return {
      success: true,
      store
    }
  } catch (error) {
    console.error('❌ Error in addStore process:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      shopDomain
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Remove a store
export async function removeStore(userId: string, storeId: string, supabaseClient?: any): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseClient || createSupabaseServerClient()
  
  try {
    // Check if user owns the store
    const stores = await getUserStores(userId)
    const store = stores.find(s => s.id === storeId)
    
    if (!store) {
      return {
        success: false,
        error: 'Store not found'
      }
    }
    
    // If this is the primary store and there are other stores, make another one primary
    if (store.isPrimary && stores.length > 1) {
      const nextPrimary = stores.find(s => s.id !== storeId)
      if (nextPrimary) {
        await supabase
          .from('shopify_stores')
          .update({ is_primary: true })
          .eq('id', nextPrimary.id)
      }
    }
    
    // Remove store and related data
    await Promise.all([
      supabase.from('shopify_stores').delete().eq('id', storeId),
      supabase.from('api_connections').delete().eq('store_id', storeId),
      supabase.from('webhook_configs').delete().eq('store_id', storeId),
      supabase.from('webhook_events').delete().eq('store_id', storeId)
    ])
    
    return { success: true }
  } catch (error) {
    console.error('Error removing store:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Set primary store
export async function setPrimaryStore(userId: string, storeId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    // Verify user owns the store
    const stores = await getUserStores(userId)
    const store = stores.find(s => s.id === storeId)
    
    if (!store) {
      return {
        success: false,
        error: 'Store not found'
      }
    }
    
    // Update primary status
    await Promise.all([
      // Remove primary from all stores
      supabase
        .from('shopify_stores')
        .update({ is_primary: false })
        .eq('user_id', userId),
      // Set new primary
      supabase
        .from('shopify_stores')
        .update({ is_primary: true })
        .eq('id', storeId)
    ])
    
    return { success: true }
  } catch (error) {
    console.error('Error setting primary store:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Sync store data
export async function syncStoreData(storeId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    // Update sync status
    await supabase
      .from('shopify_stores')
      .update({ 
        sync_status: 'syncing',
        sync_error: null
      })
      .eq('id', storeId)
    
    // Get store info
    const stores = await getUserStores(userId)
    const store = stores.find(s => s.id === storeId)
    
    if (!store) {
      throw new Error('Store not found')
    }
    
    // Create API client for this store
    const shopifyAPI = await createShopifyAPI(userId, undefined, store.shopDomain)
    if (!shopifyAPI) {
      throw new Error('Failed to create Shopify API client')
    }
    
    // Sync basic data
    const [products, orders, customers] = await Promise.all([
      shopifyAPI.getProducts(100),
      shopifyAPI.getOrders(100),
      shopifyAPI.getCustomers(100)
    ])
    
    // Store synced data (simplified - would normally cache this data)
    const syncData = {
      products: products.length,
      orders: orders.length,
      customers: customers.length,
      last_sync: new Date().toISOString()
    }
    
    // Update sync status
    await supabase
      .from('shopify_stores')
      .update({ 
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
        sync_data: syncData
      })
      .eq('id', storeId)
    
    return { success: true }
  } catch (error) {
    console.error('Error syncing store data:', error)
    
    // Update error status
    await supabase
      .from('shopify_stores')
      .update({ 
        sync_status: 'error',
        sync_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', storeId)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get metrics for all stores
export async function getMultiStoreMetrics(userId: string, timeframe: string = '30d'): Promise<StoreMetrics[]> {
  const stores = await getUserStores(userId)
  const metrics: StoreMetrics[] = []
  
  for (const store of stores) {
    try {
      const shopifyAPI = await createShopifyAPI(userId, undefined, store.shopDomain)
      if (!shopifyAPI) continue
      
      const [orders, customers, products] = await Promise.all([
        shopifyAPI.getOrders(500),
        shopifyAPI.getCustomers(500),
        shopifyAPI.getProducts(500)
      ])
      
      const revenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)
      const averageOrderValue = orders.length > 0 ? revenue / orders.length : 0
      
      metrics.push({
        storeId: store.id,
        revenue,
        orders: orders.length,
        customers: customers.length,
        products: products.length,
        conversionRate: 2.5, // Would calculate from actual data
        averageOrderValue,
        period: timeframe
      })
    } catch (error) {
      console.error(`Error getting metrics for store ${store.id}:`, error)
    }
  }
  
  return metrics
}

// Generate cross-store insights
export async function generateCrossStoreInsights(userId: string): Promise<CrossStoreInsight[]> {
  const stores = await getUserStores(userId)
  const metrics = await getMultiStoreMetrics(userId)
  const insights: CrossStoreInsight[] = []
  
  if (stores.length < 2) {
    return insights
  }
  
  // Performance comparison insight
  const sortedByRevenue = metrics.sort((a, b) => b.revenue - a.revenue)
  if (sortedByRevenue.length >= 2) {
    const topStore = stores.find(s => s.id === sortedByRevenue[0].storeId)
    const bottomStore = stores.find(s => s.id === sortedByRevenue[sortedByRevenue.length - 1].storeId)
    
    if (topStore && bottomStore) {
      insights.push({
        type: 'performance_comparison',
        title: 'Store Performance Gap',
        description: `${topStore.storeName} is outperforming ${bottomStore.storeName} by ${((sortedByRevenue[0].revenue / sortedByRevenue[sortedByRevenue.length - 1].revenue - 1) * 100).toFixed(0)}% in revenue`,
        stores: [topStore.id, bottomStore.id],
        data: {
          top_store: { name: topStore.storeName, revenue: sortedByRevenue[0].revenue },
          bottom_store: { name: bottomStore.storeName, revenue: sortedByRevenue[sortedByRevenue.length - 1].revenue }
        },
        recommendations: [
          'Analyze top-performing store\'s strategies',
          'Implement successful tactics across all stores',
          'Review pricing and product mix differences'
        ],
        impact: 'high'
      })
    }
  }
  
  // Currency optimization insight
  const currencies = [...new Set(stores.map(s => s.currency))]
  if (currencies.length > 1) {
    insights.push({
      type: 'pricing_analysis',
      title: 'Multi-Currency Optimization',
      description: `You have stores in ${currencies.length} different currencies. Consider currency-specific pricing strategies.`,
      stores: stores.map(s => s.id),
      data: { currencies },
      recommendations: [
        'Implement dynamic currency pricing',
        'Monitor exchange rate impacts',
        'Consider local market pricing strategies'
      ],
      impact: 'medium'
    })
  }
  
  return insights
}

// Helper functions
function getDefaultPermissions() {
  return {
    read_products: true,
    write_products: true,
    read_orders: true,
    write_orders: true,
    read_customers: true,
    write_customers: false,
    read_analytics: true,
    read_inventory: true,
    write_inventory: true
  }
}

function getDefaultAgentAccess() {
  return {
    anchor: {
      enabled: true,
      permissions: ['inventory_management', 'order_fulfillment', 'supplier_management']
    },
    pearl: {
      enabled: true,
      permissions: ['market_analysis', 'customer_behavior_analysis', 'product_research']
    },
    flint: {
      enabled: true,
      permissions: ['product_optimization', 'discount_management', 'abandoned_cart_recovery']
    },
    beacon: {
      enabled: true,
      permissions: ['customer_service', 'order_tracking']
    },
    splash: {
      enabled: true,
      permissions: ['content_creation', 'brand_consistency']
    },
    drake: {
      enabled: true,
      permissions: ['business_intelligence', 'expansion_planning']
    }
  }
}

// Get primary store for a user
export async function getPrimaryStore(userId: string): Promise<ShopifyStore | null> {
  const stores = await getUserStores(userId)
  return stores.find(store => store.isPrimary) || stores[0] || null
}

// Update store permissions
export async function updateStorePermissions(
  userId: string, 
  storeId: string, 
  permissions: Partial<ShopifyStore['permissions']>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { error } = await supabase
      .from('shopify_stores')
      .update({ permissions })
      .eq('id', storeId)
      .eq('user_id', userId)
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error updating store permissions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Update agent access for a store
export async function updateStoreAgentAccess(
  userId: string,
  storeId: string,
  agentAccess: Partial<ShopifyStore['agentAccess']>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { error } = await supabase
      .from('shopify_stores')
      .update({ agent_access: agentAccess })
      .eq('id', storeId)
      .eq('user_id', userId)
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error updating store agent access:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
