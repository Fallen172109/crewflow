// Inventory Monitoring System for Anchor Agent
// Handles automated inventory level checking, alerts, and stock management

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface InventoryAlert {
  id: string
  userId: string
  storeId: string
  productId: number
  variantId?: number
  inventoryItemId: number
  locationId: number
  productTitle: string
  variantTitle?: string
  sku?: string
  thresholdQuantity: number
  currentQuantity: number
  alertTriggered: boolean
  alertLevel: 'low' | 'critical' | 'out_of_stock'
  lastCheckedAt: Date
  lastAlertSentAt?: Date
  alertCount: number
  suppressedUntil?: Date
}

export interface InventoryMonitoringResult {
  success: boolean
  alertsTriggered: InventoryAlert[]
  productsChecked: number
  lowStockProducts: number
  outOfStockProducts: number
  error?: string
}

// Check inventory levels for a specific user's stores
export async function checkInventoryLevels(userId: string, storeId?: string): Promise<InventoryMonitoringResult> {
  try {
    const supabase = createSupabaseServerClient()
    const shopifyAPI = await createShopifyAPI(userId)
    
    if (!shopifyAPI) {
      throw new Error('Shopify connection required')
    }

    // Get all products with inventory tracking
    const products = await shopifyAPI.getProducts(250)
    const alertsTriggered: InventoryAlert[] = []
    let productsChecked = 0
    let lowStockProducts = 0
    let outOfStockProducts = 0

    for (const product of products) {
      if (!product.variants) continue

      for (const variant of product.variants) {
        if (!variant.inventory_management || !variant.inventory_item_id) continue

        productsChecked++

        // Get inventory levels for this variant
        const inventoryLevels = await shopifyAPI.getInventoryLevels([variant.inventory_item_id])
        
        for (const level of inventoryLevels) {
          const currentQuantity = level.available || 0
          
          // Check if we have an existing alert record
          const { data: existingAlert } = await supabase
            .from('inventory_alerts')
            .select('*')
            .eq('user_id', userId)
            .eq('inventory_item_id', variant.inventory_item_id)
            .eq('location_id', level.location_id)
            .single()

          const thresholdQuantity = existingAlert?.threshold_quantity || 10
          let alertLevel: 'low' | 'critical' | 'out_of_stock' = 'low'
          
          if (currentQuantity === 0) {
            alertLevel = 'out_of_stock'
            outOfStockProducts++
          } else if (currentQuantity <= Math.floor(thresholdQuantity * 0.3)) {
            alertLevel = 'critical'
            lowStockProducts++
          } else if (currentQuantity <= thresholdQuantity) {
            alertLevel = 'low'
            lowStockProducts++
          }

          const shouldTriggerAlert = currentQuantity <= thresholdQuantity
          const now = new Date()

          if (shouldTriggerAlert) {
            // Check if alert is suppressed
            const isSuppressed = existingAlert?.suppressed_until && new Date(existingAlert.suppressed_until) > now

            if (!isSuppressed) {
              const alertData = {
                user_id: userId,
                store_id: storeId || 'default',
                product_id: product.id,
                variant_id: variant.id,
                inventory_item_id: variant.inventory_item_id,
                location_id: level.location_id,
                product_title: product.title,
                variant_title: variant.title,
                sku: variant.sku,
                threshold_quantity: thresholdQuantity,
                current_quantity: currentQuantity,
                alert_triggered: true,
                alert_level: alertLevel,
                last_checked_at: now.toISOString(),
                alert_count: (existingAlert?.alert_count || 0) + 1
              }

              if (existingAlert) {
                // Update existing alert
                await supabase
                  .from('inventory_alerts')
                  .update({
                    ...alertData,
                    last_alert_sent_at: now.toISOString()
                  })
                  .eq('id', existingAlert.id)
              } else {
                // Create new alert
                await supabase
                  .from('inventory_alerts')
                  .insert({
                    ...alertData,
                    last_alert_sent_at: now.toISOString()
                  })
              }

              alertsTriggered.push({
                id: existingAlert?.id || 'new',
                userId,
                storeId: storeId || 'default',
                productId: product.id,
                variantId: variant.id,
                inventoryItemId: variant.inventory_item_id,
                locationId: level.location_id,
                productTitle: product.title,
                variantTitle: variant.title,
                sku: variant.sku,
                thresholdQuantity,
                currentQuantity,
                alertTriggered: true,
                alertLevel,
                lastCheckedAt: now,
                lastAlertSentAt: now,
                alertCount: (existingAlert?.alert_count || 0) + 1
              })
            }
          } else if (existingAlert && existingAlert.alert_triggered) {
            // Reset alert if stock is back above threshold
            await supabase
              .from('inventory_alerts')
              .update({
                alert_triggered: false,
                current_quantity: currentQuantity,
                last_checked_at: now.toISOString()
              })
              .eq('id', existingAlert.id)
          }

          // Update or create tracking record even if no alert
          if (!existingAlert && !shouldTriggerAlert) {
            await supabase
              .from('inventory_alerts')
              .insert({
                user_id: userId,
                store_id: storeId || 'default',
                product_id: product.id,
                variant_id: variant.id,
                inventory_item_id: variant.inventory_item_id,
                location_id: level.location_id,
                product_title: product.title,
                variant_title: variant.title,
                sku: variant.sku,
                threshold_quantity: thresholdQuantity,
                current_quantity: currentQuantity,
                alert_triggered: false,
                alert_level: 'low',
                last_checked_at: now.toISOString()
              })
          } else if (existingAlert && !shouldTriggerAlert) {
            await supabase
              .from('inventory_alerts')
              .update({
                current_quantity: currentQuantity,
                last_checked_at: now.toISOString()
              })
              .eq('id', existingAlert.id)
          }
        }
      }
    }

    return {
      success: true,
      alertsTriggered,
      productsChecked,
      lowStockProducts,
      outOfStockProducts
    }
  } catch (error) {
    console.error('Inventory monitoring error:', error)
    return {
      success: false,
      alertsTriggered: [],
      productsChecked: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get current inventory alerts for a user
export async function getInventoryAlerts(userId: string, storeId?: string): Promise<InventoryAlert[]> {
  const supabase = createSupabaseServerClient()
  
  let query = supabase
    .from('inventory_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('alert_triggered', true)
    .order('alert_level', { ascending: false })
    .order('current_quantity', { ascending: true })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: alerts, error } = await query

  if (error) {
    throw new Error(`Failed to fetch inventory alerts: ${error.message}`)
  }

  return alerts?.map(alert => ({
    id: alert.id,
    userId: alert.user_id,
    storeId: alert.store_id,
    productId: alert.product_id,
    variantId: alert.variant_id,
    inventoryItemId: alert.inventory_item_id,
    locationId: alert.location_id,
    productTitle: alert.product_title,
    variantTitle: alert.variant_title,
    sku: alert.sku,
    thresholdQuantity: alert.threshold_quantity,
    currentQuantity: alert.current_quantity,
    alertTriggered: alert.alert_triggered,
    alertLevel: alert.alert_level,
    lastCheckedAt: new Date(alert.last_checked_at),
    lastAlertSentAt: alert.last_alert_sent_at ? new Date(alert.last_alert_sent_at) : undefined,
    alertCount: alert.alert_count,
    suppressedUntil: alert.suppressed_until ? new Date(alert.suppressed_until) : undefined
  })) || []
}

// Suppress alerts for a specific product/variant for a given duration
export async function suppressInventoryAlert(
  userId: string, 
  alertId: string, 
  suppressDurationHours: number = 24
): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  const suppressUntil = new Date()
  suppressUntil.setHours(suppressUntil.getHours() + suppressDurationHours)

  const { error } = await supabase
    .from('inventory_alerts')
    .update({
      suppressed_until: suppressUntil.toISOString()
    })
    .eq('id', alertId)
    .eq('user_id', userId)

  return !error
}

// Update threshold for a specific product/variant
export async function updateInventoryThreshold(
  userId: string,
  alertId: string,
  newThreshold: number
): Promise<boolean> {
  const supabase = createSupabaseServerClient()

  const { error } = await supabase
    .from('inventory_alerts')
    .update({
      threshold_quantity: newThreshold
    })
    .eq('id', alertId)
    .eq('user_id', userId)

  return !error
}
