// Agent-Specific Shopify Capabilities
// Defines specialized Shopify functions for each CrewFlow agent based on maritime personalities

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createAutonomousActionManager } from './autonomous-actions'
import { checkInventoryLevels, getInventoryAlerts, suppressInventoryAlert, updateInventoryThreshold } from './inventory-monitoring'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateOptimizedContent, generateContentVariations, analyzeSEOContent } from './content-optimization'
import { generateMarketingCopy, getPlatformMaxLength } from './marketing-copy-generator'

export interface ShopifyCapability {
  id: string
  name: string
  description: string
  agentId: string
  category: 'operations' | 'analytics' | 'marketing' | 'customer_service' | 'automation'
  permissions: string[]
  execute: (userId: string, params: any) => Promise<any>
}

// Anchor - Business Operations & Supply Chain Management
export const anchorCapabilities: ShopifyCapability[] = [
  {
    id: 'inventory_management',
    name: 'Cargo Hold Management',
    description: 'Monitor and manage inventory levels across all locations with natural language support',
    agentId: 'anchor',
    category: 'operations',
    permissions: ['inventory_update', 'product_update'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { action, inventoryItemId, locationId, quantity, productTitle, sku, operation = 'set' } = params

      if (action === 'update_stock') {
        // Handle natural language stock updates
        if (productTitle || sku) {
          // Find product by title or SKU
          const products = await shopifyAPI.getProducts(250)
          let targetProduct = null
          let targetVariant = null

          for (const product of products) {
            if (productTitle && product.title.toLowerCase().includes(productTitle.toLowerCase())) {
              targetProduct = product
              targetVariant = product.variants?.[0] // Use first variant if no specific variant found
              break
            }

            if (sku && product.variants) {
              for (const variant of product.variants) {
                if (variant.sku && variant.sku.toLowerCase() === sku.toLowerCase()) {
                  targetProduct = product
                  targetVariant = variant
                  break
                }
              }
              if (targetVariant) break
            }
          }

          if (!targetProduct || !targetVariant) {
            throw new Error(`Product not found: ${productTitle || sku}`)
          }

          if (!targetVariant.inventory_item_id) {
            throw new Error(`Product "${targetProduct.title}" does not have inventory tracking enabled`)
          }

          // Get current inventory levels
          const inventoryLevels = await shopifyAPI.getInventoryLevels([targetVariant.inventory_item_id])

          if (inventoryLevels.length === 0) {
            throw new Error(`No inventory locations found for product "${targetProduct.title}"`)
          }

          const results = []
          for (const level of inventoryLevels) {
            let newQuantity = quantity

            // Handle different operations
            if (operation === 'add') {
              newQuantity = (level.available || 0) + quantity
            } else if (operation === 'subtract') {
              newQuantity = Math.max(0, (level.available || 0) - quantity)
            }
            // 'set' operation uses quantity directly

            const updatedLevel = await shopifyAPI.updateInventoryLevel(
              targetVariant.inventory_item_id,
              level.location_id,
              newQuantity
            )

            results.push({
              location_id: level.location_id,
              previous_quantity: level.available || 0,
              new_quantity: newQuantity,
              change: newQuantity - (level.available || 0)
            })
          }

          return {
            success: true,
            product: {
              id: targetProduct.id,
              title: targetProduct.title,
              variant_title: targetVariant.title,
              sku: targetVariant.sku
            },
            operation,
            quantity_changed: quantity,
            locations_updated: results,
            message: `Successfully ${operation === 'add' ? 'added' : operation === 'subtract' ? 'removed' : 'set'} ${quantity} units ${operation === 'set' ? 'for' : operation === 'add' ? 'to' : 'from'} "${targetProduct.title}"${targetVariant.title ? ` (${targetVariant.title})` : ''}.`
          }
        } else if (inventoryItemId && locationId) {
          // Direct inventory item update
          const updatedLevel = await shopifyAPI.updateInventoryLevel(inventoryItemId, locationId, quantity)
          return {
            success: true,
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            new_quantity: quantity,
            message: `Inventory updated to ${quantity} units.`
          }
        } else {
          throw new Error('Either product title/SKU or inventory item ID and location ID required')
        }
      } else if (action === 'check_levels') {
        const levels = await shopifyAPI.getInventoryLevels(
          inventoryItemId ? [inventoryItemId] : undefined,
          locationId ? [locationId] : undefined
        )

        return {
          success: true,
          inventory_levels: levels.map(level => ({
            inventory_item_id: level.inventory_item_id,
            location_id: level.location_id,
            available: level.available,
            updated_at: level.updated_at
          })),
          total_locations: levels.length,
          message: `Found inventory levels for ${levels.length} location(s).`
        }
      }

      throw new Error('Invalid inventory action')
    }
  },
  {
    id: 'order_management',
    name: 'Fleet Order Management',
    description: 'Comprehensive order handling, tracking, and fulfillment operations',
    agentId: 'anchor',
    category: 'operations',
    permissions: ['order_read', 'order_fulfill'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { action, orderId, orderNumber, limit = 50, status = 'any' } = params

      switch (action) {
        case 'get_orders':
          const orders = await shopifyAPI.getOrders(limit, status)
          return {
            orders: orders.map(order => ({
              id: order.id,
              name: order.name,
              order_number: order.order_number,
              total_price: order.total_price,
              financial_status: order.financial_status,
              fulfillment_status: order.fulfillment_status,
              created_at: order.created_at,
              customer: order.customer ? {
                first_name: order.customer.first_name,
                last_name: order.customer.last_name,
                email: order.customer.email
              } : null
            })),
            summary: {
              total_orders: orders.length,
              pending_fulfillment: orders.filter(o => o.fulfillment_status === null || o.fulfillment_status === 'unfulfilled').length,
              total_value: orders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)
            }
          }

        case 'get_order_details':
          if (!orderId && !orderNumber) {
            throw new Error('Order ID or order number required')
          }

          let order
          if (orderId) {
            order = await shopifyAPI.getOrder(orderId)
          } else {
            // Find order by order number
            const orders = await shopifyAPI.getOrders(250)
            order = orders.find(o => o.order_number?.toString() === orderNumber?.toString())
            if (!order) {
              throw new Error(`Order #${orderNumber} not found`)
            }
          }

          return {
            order: {
              id: order.id,
              name: order.name,
              order_number: order.order_number,
              total_price: order.total_price,
              subtotal_price: order.subtotal_price,
              total_tax: order.total_tax,
              currency: order.currency,
              financial_status: order.financial_status,
              fulfillment_status: order.fulfillment_status,
              created_at: order.created_at,
              updated_at: order.updated_at,
              customer: order.customer,
              shipping_address: order.shipping_address,
              billing_address: order.billing_address,
              line_items: order.line_items?.map(item => ({
                id: item.id,
                title: item.title,
                quantity: item.quantity,
                price: item.price,
                sku: item.sku,
                product_id: item.product_id,
                variant_id: item.variant_id
              })),
              fulfillments: order.fulfillments
            }
          }

        case 'get_pending_orders':
          const pendingOrders = await shopifyAPI.getOrders(100, 'open')
          const unfulfilled = pendingOrders.filter(order =>
            order.fulfillment_status === null ||
            order.fulfillment_status === 'unfulfilled' ||
            order.fulfillment_status === 'partial'
          )

          return {
            pending_orders: unfulfilled.map(order => ({
              id: order.id,
              name: order.name,
              order_number: order.order_number,
              total_price: order.total_price,
              financial_status: order.financial_status,
              fulfillment_status: order.fulfillment_status,
              created_at: order.created_at,
              days_since_order: Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)),
              customer_email: order.customer?.email
            })),
            summary: {
              total_pending: unfulfilled.length,
              total_value: unfulfilled.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0),
              urgent_orders: unfulfilled.filter(order => {
                const daysSince = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24))
                return daysSince >= 2
              }).length
            }
          }

        default:
          throw new Error(`Invalid order management action: ${action}`)
      }
    }
  },
  {
    id: 'order_fulfillment',
    name: 'Ship Order Processing',
    description: 'Process and fulfill orders with tracking information',
    agentId: 'anchor',
    category: 'operations',
    permissions: ['order_fulfill'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { orderId, orderNumber, trackingNumber, trackingCompany, notifyCustomer = true, lineItems } = params

      // Find order by ID or number
      let targetOrderId = orderId
      if (!targetOrderId && orderNumber) {
        const orders = await shopifyAPI.getOrders(250)
        const order = orders.find(o => o.order_number?.toString() === orderNumber?.toString())
        if (!order) {
          throw new Error(`Order #${orderNumber} not found`)
        }
        targetOrderId = order.id
      }

      if (!targetOrderId) {
        throw new Error('Order ID or order number required')
      }

      const fulfillmentData: any = {
        notify_customer: notifyCustomer
      }

      if (trackingNumber) {
        fulfillmentData.tracking_number = trackingNumber
      }

      if (trackingCompany) {
        fulfillmentData.tracking_company = trackingCompany
      }

      if (lineItems && lineItems.length > 0) {
        fulfillmentData.line_items = lineItems.map((item: any) => ({
          id: item.id,
          quantity: item.quantity || 1
        }))
      }

      const fulfillment = await shopifyAPI.createFulfillment(targetOrderId, fulfillmentData)

      return {
        fulfillment: {
          id: fulfillment.id,
          order_id: fulfillment.order_id,
          status: fulfillment.status,
          tracking_number: fulfillment.tracking_number,
          tracking_company: fulfillment.tracking_company,
          tracking_url: fulfillment.tracking_url,
          created_at: fulfillment.created_at
        },
        message: `Order ${orderNumber || targetOrderId} has been successfully fulfilled${trackingNumber ? ` with tracking number ${trackingNumber}` : ''}.`
      }
    }
  },
  {
    id: 'inventory_monitoring',
    name: 'Automated Inventory Surveillance',
    description: 'Monitor inventory levels with intelligent alerts and threshold management',
    agentId: 'anchor',
    category: 'operations',
    permissions: ['inventory_read', 'inventory_update'],
    execute: async (userId: string, params: any) => {
      const { action, storeId, alertId, threshold, suppressHours } = params

      switch (action) {
        case 'check_inventory':
          const monitoringResult = await checkInventoryLevels(userId, storeId)
          return {
            success: monitoringResult.success,
            summary: {
              products_checked: monitoringResult.productsChecked,
              low_stock_products: monitoringResult.lowStockProducts,
              out_of_stock_products: monitoringResult.outOfStockProducts,
              alerts_triggered: monitoringResult.alertsTriggered.length
            },
            alerts: monitoringResult.alertsTriggered.map(alert => ({
              product: alert.productTitle,
              variant: alert.variantTitle,
              sku: alert.sku,
              current_quantity: alert.currentQuantity,
              threshold: alert.thresholdQuantity,
              alert_level: alert.alertLevel,
              location_id: alert.locationId
            })),
            message: monitoringResult.success
              ? `Inventory check complete. Found ${monitoringResult.alertsTriggered.length} products requiring attention.`
              : `Inventory check failed: ${monitoringResult.error}`,
            error: monitoringResult.error
          }

        case 'get_alerts':
          const alerts = await getInventoryAlerts(userId, storeId)
          return {
            alerts: alerts.map(alert => ({
              id: alert.id,
              product: alert.productTitle,
              variant: alert.variantTitle,
              sku: alert.sku,
              current_quantity: alert.currentQuantity,
              threshold: alert.thresholdQuantity,
              alert_level: alert.alertLevel,
              alert_count: alert.alertCount,
              last_checked: alert.lastCheckedAt,
              last_alert_sent: alert.lastAlertSentAt,
              is_suppressed: alert.suppressedUntil && alert.suppressedUntil > new Date()
            })),
            summary: {
              total_alerts: alerts.length,
              critical_alerts: alerts.filter(a => a.alertLevel === 'critical').length,
              out_of_stock_alerts: alerts.filter(a => a.alertLevel === 'out_of_stock').length
            },
            message: `Found ${alerts.length} active inventory alerts.`
          }

        case 'suppress_alert':
          if (!alertId) {
            throw new Error('Alert ID required for suppression')
          }
          const suppressSuccess = await suppressInventoryAlert(userId, alertId, suppressHours || 24)
          return {
            success: suppressSuccess,
            message: suppressSuccess
              ? `Alert suppressed for ${suppressHours || 24} hours.`
              : 'Failed to suppress alert.'
          }

        case 'update_threshold':
          if (!alertId || !threshold) {
            throw new Error('Alert ID and threshold required')
          }
          const updateSuccess = await updateInventoryThreshold(userId, alertId, threshold)
          return {
            success: updateSuccess,
            message: updateSuccess
              ? `Threshold updated to ${threshold} units.`
              : 'Failed to update threshold.'
          }

        default:
          throw new Error(`Invalid inventory monitoring action: ${action}`)
      }
    }
  },
  {
    id: 'supplier_management',
    name: 'Supply Chain Coordination',
    description: 'Manage vendor relationships and product sourcing',
    agentId: 'anchor',
    category: 'operations',
    permissions: ['product_create', 'product_update'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { action, vendor, products } = params
      
      if (action === 'update_vendor_products') {
        const results = []
        for (const product of products) {
          const updated = await shopifyAPI.updateProduct(product.id, { vendor })
          results.push(updated)
        }
        return results
      }
      
      throw new Error('Invalid supplier action')
    }
  }
]

// Pearl - Research & Analytics
export const pearlCapabilities: ShopifyCapability[] = [
  {
    id: 'market_analysis',
    name: 'Market Intelligence Gathering',
    description: 'Analyze market trends and competitor data',
    agentId: 'pearl',
    category: 'analytics',
    permissions: ['analytics_read'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { timeframe = '30d', productType } = params
      
      // Get comprehensive analytics data
      const [products, orders, customers] = await Promise.all([
        shopifyAPI.getProducts(250),
        shopifyAPI.getOrders(250),
        shopifyAPI.getCustomers(250)
      ])
      
      return {
        productPerformance: products.filter(p => !productType || p.product_type === productType),
        salesTrends: orders,
        customerInsights: customers,
        timeframe
      }
    }
  },
  {
    id: 'customer_behavior_analysis',
    name: 'Crew Behavior Analysis',
    description: 'Deep dive into customer purchasing patterns and preferences',
    agentId: 'pearl',
    category: 'analytics',
    permissions: ['analytics_read'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { customerId, segment } = params
      
      if (customerId) {
        return await shopifyAPI.getCustomerAnalytics(customerId)
      } else {
        // Get customer segments analysis
        const customers = await shopifyAPI.getCustomers(500)
        return {
          totalCustomers: customers.length,
          segments: customers.reduce((acc: any, customer: any) => {
            const segment = customer.tags || 'untagged'
            acc[segment] = (acc[segment] || 0) + 1
            return acc
          }, {})
        }
      }
    }
  },
  {
    id: 'product_research',
    name: 'Cargo Research & Optimization',
    description: 'Research product opportunities and optimization strategies',
    agentId: 'pearl',
    category: 'analytics',
    permissions: ['analytics_read'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { query, limit = 50 } = params
      
      return await shopifyAPI.searchProducts(query, limit)
    }
  }
]

// Flint - Marketing & Automation
export const flintCapabilities: ShopifyCapability[] = [
  {
    id: 'product_optimization',
    name: 'Cargo Listing Optimization',
    description: 'AI-powered product title, description, and SEO optimization with keyword integration',
    agentId: 'flint',
    category: 'marketing',
    permissions: ['product_update'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const {
        action,
        productId,
        currentTitle,
        currentDescription,
        targetKeywords = [],
        tone = 'professional',
        platform = 'shopify',
        maxTitleLength = 70,
        maxDescriptionLength = 320,
        includeFeatures = true,
        includeBenefits = true,
        includeCallToAction = true
      } = params

      switch (action) {
        case 'optimize_existing':
          if (!productId) {
            throw new Error('Product ID required for optimization')
          }

          // Get current product data
          const product = await shopifyAPI.getProduct(productId)

          // Generate optimized content using AI
          const optimizedContent = await generateOptimizedContent({
            currentTitle: product.title,
            currentDescription: product.body_html,
            targetKeywords,
            tone,
            platform,
            maxTitleLength,
            maxDescriptionLength,
            includeFeatures,
            includeBenefits,
            includeCallToAction,
            productType: product.product_type,
            vendor: product.vendor,
            tags: product.tags
          })

          // Update product with optimized content
          const updatedProduct = await shopifyAPI.updateProduct(productId, {
            title: optimizedContent.title,
            body_html: optimizedContent.description,
            handle: optimizedContent.handle,
            tags: optimizedContent.tags.join(', ')
          })

          // Save to marketing snippets for reuse
          const supabase = createSupabaseServerClient()
          await supabase.from('marketing_snippets').insert([
            {
              user_id: userId,
              title: `Optimized Title: ${product.title}`,
              content: optimizedContent.title,
              content_type: 'seo_title',
              platform,
              product_id: productId,
              product_title: product.title,
              keywords: targetKeywords,
              tone,
              ai_model: 'gpt-5',
              generation_cost: 0.02
            },
            {
              user_id: userId,
              title: `Optimized Description: ${product.title}`,
              content: optimizedContent.description,
              content_type: 'product_description',
              platform,
              product_id: productId,
              product_title: product.title,
              keywords: targetKeywords,
              tone,
              ai_model: 'gpt-5',
              generation_cost: 0.03
            }
          ])

          return {
            success: true,
            original: {
              title: product.title,
              description: product.body_html
            },
            optimized: optimizedContent,
            improvements: {
              title_length_change: optimizedContent.title.length - product.title.length,
              description_length_change: optimizedContent.description.length - (product.body_html?.length || 0),
              keywords_added: optimizedContent.keywords_used,
              seo_score_improvement: optimizedContent.seo_score || 0
            },
            message: `Successfully optimized "${product.title}" with ${optimizedContent.keywords_used.length} target keywords.`
          }

        case 'generate_variations':
          const variations = await generateContentVariations({
            title: currentTitle,
            description: currentDescription,
            targetKeywords,
            tone,
            variationCount: params.variationCount || 3
          })

          return {
            success: true,
            variations,
            message: `Generated ${variations.length} content variations.`
          }

        case 'analyze_seo':
          const seoAnalysis = await analyzeSEOContent({
            title: currentTitle,
            description: currentDescription,
            targetKeywords
          })

          return {
            success: true,
            analysis: seoAnalysis,
            message: `SEO analysis complete. Score: ${seoAnalysis.overall_score}/100`
          }

        default:
          throw new Error(`Invalid product optimization action: ${action}`)
      }
    }
  },
  {
    id: 'discount_management',
    name: 'Promotional Campaign Management',
    description: 'Create and manage discount codes and promotions with advanced targeting',
    agentId: 'flint',
    category: 'marketing',
    permissions: ['marketing_campaign'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { action, discountData } = params

      switch (action) {
        case 'create_discount':
          const {
            code,
            type = 'percentage',
            value,
            description,
            minimumAmount,
            minimumQuantity,
            usageLimit,
            oncePerCustomer = false,
            durationDays = 30,
            productIds,
            collectionIds,
            customerSegments,
            customerIds
          } = discountData

          if (!code || !value) {
            throw new Error('Discount code and value are required')
          }

          // Generate start and end dates
          const startsAt = new Date().toISOString()
          const endsAt = durationDays > 0
            ? new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000)).toISOString()
            : undefined

          // Build discount configuration
          const discountConfig: any = {
            code: code.toUpperCase().replace(/\s+/g, ''),
            type,
            value: type === 'percentage' ? Math.min(value, 100) : value,
            startsAt,
            endsAt,
            usageLimit,
            oncePerCustomer
          }

          // Add minimum requirements
          if (minimumAmount && minimumAmount > 0) {
            discountConfig.minimumRequirement = {
              type: 'minimum_subtotal',
              value: minimumAmount
            }
          } else if (minimumQuantity && minimumQuantity > 0) {
            discountConfig.minimumRequirement = {
              type: 'minimum_quantity',
              value: minimumQuantity
            }
          }

          // Set customer targeting
          if (customerSegments && customerSegments.length > 0) {
            discountConfig.customerSelection = {
              type: 'customer_segments',
              segments: customerSegments
            }
          } else if (customerIds && customerIds.length > 0) {
            discountConfig.customerSelection = {
              type: 'customers',
              customers: customerIds
            }
          } else {
            discountConfig.customerSelection = {
              type: 'all'
            }
          }

          // Set product/collection targeting
          if (productIds && productIds.length > 0) {
            discountConfig.appliesTo = {
              type: 'specific_products',
              productIds
            }
          } else if (collectionIds && collectionIds.length > 0) {
            discountConfig.appliesTo = {
              type: 'specific_collections',
              collectionIds
            }
          } else {
            discountConfig.appliesTo = {
              type: 'all_products'
            }
          }

          const result = await shopifyAPI.createDiscountCode(discountConfig)

          if (result.discountCodeBasicCreate.userErrors.length > 0) {
            throw new Error(`Discount creation failed: ${result.discountCodeBasicCreate.userErrors.map((e: any) => e.message).join(', ')}`)
          }

          const createdDiscount = result.discountCodeBasicCreate.codeDiscountNode.codeDiscount

          return {
            success: true,
            discount: {
              id: result.discountCodeBasicCreate.codeDiscountNode.id,
              code: createdDiscount.codes.edges[0]?.node.code,
              title: createdDiscount.title,
              type,
              value,
              status: createdDiscount.status,
              summary: createdDiscount.summary,
              starts_at: createdDiscount.startsAt,
              ends_at: createdDiscount.endsAt,
              usage_limit: createdDiscount.usageLimit,
              once_per_customer: createdDiscount.appliesOncePerCustomer
            },
            message: `Successfully created ${type === 'percentage' ? value + '%' : '$' + value} discount code "${discountConfig.code}".`
          }

        case 'get_discounts':
          const discounts = await shopifyAPI.getDiscountCodes(params.limit || 50)

          return {
            success: true,
            discounts: discounts.codeDiscountNodes.edges.map((edge: any) => {
              const discount = edge.node.codeDiscount
              return {
                id: edge.node.id,
                code: discount.codes.edges[0]?.node.code,
                title: discount.title,
                status: discount.status,
                summary: discount.summary,
                starts_at: discount.startsAt,
                ends_at: discount.endsAt,
                usage_limit: discount.usageLimit,
                usage_count: discount.asyncUsageCount,
                once_per_customer: discount.appliesOncePerCustomer,
                value: discount.customerGets.value.percentage
                  ? `${(discount.customerGets.value.percentage * 100).toFixed(0)}%`
                  : `$${discount.customerGets.value.amount?.amount || '0'}`
              }
            }),
            total: discounts.codeDiscountNodes.edges.length,
            message: `Found ${discounts.codeDiscountNodes.edges.length} discount codes.`
          }

        case 'generate_code':
          const { prefix = 'SAVE', suffix = '', length = 8 } = params
          const randomPart = Math.random().toString(36).substring(2, 2 + length).toUpperCase()
          const generatedCode = `${prefix}${randomPart}${suffix}`

          return {
            success: true,
            code: generatedCode,
            message: `Generated discount code: ${generatedCode}`
          }

        default:
          throw new Error(`Invalid discount management action: ${action}`)
      }
    }
  },
  {
    id: 'marketing_copy_generation',
    name: 'AI Marketing Copy Generator',
    description: 'Generate platform-specific marketing copy for social media, ads, and email campaigns',
    agentId: 'flint',
    category: 'marketing',
    permissions: ['marketing_campaign'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      const supabase = createSupabaseServerClient()

      const {
        action,
        platform = 'general',
        contentType = 'social_post',
        productId,
        productTitle,
        productDescription,
        tone = 'friendly',
        includeHashtags = true,
        includeCallToAction = true,
        maxLength,
        targetAudience = 'general',
        promotionType,
        discountCode,
        urgency = false
      } = params

      switch (action) {
        case 'generate_copy':
          let product = null

          // Get product details if productId provided
          if (productId) {
            try {
              product = await shopifyAPI.getProduct(productId)
            } catch (error) {
              console.warn('Could not fetch product details:', error)
            }
          }

          const copyData = {
            product: product || { title: productTitle, body_html: productDescription },
            platform,
            contentType,
            tone,
            includeHashtags,
            includeCallToAction,
            maxLength: maxLength || getPlatformMaxLength(platform, contentType),
            targetAudience,
            promotionType,
            discountCode,
            urgency
          }

          const generatedCopy = await generateMarketingCopy(copyData)

          // Save to marketing snippets database
          const snippetData = {
            user_id: userId,
            title: `${platform} ${contentType} - ${product?.title || productTitle || 'Marketing Copy'}`,
            content: generatedCopy.content,
            content_type: contentType,
            platform,
            product_id: productId,
            product_title: product?.title || productTitle,
            character_count: generatedCopy.content.length,
            word_count: generatedCopy.content.split(/\s+/).length,
            keywords: generatedCopy.keywords || [],
            tone,
            ai_model: 'gpt-5',
            generation_cost: 0.02
          }

          const { data: savedSnippet } = await supabase
            .from('marketing_snippets')
            .insert(snippetData)
            .select()
            .single()

          return {
            success: true,
            copy: generatedCopy,
            snippet_id: savedSnippet?.id,
            message: `Generated ${platform} ${contentType} copy (${generatedCopy.content.length} characters).`
          }

        case 'generate_variations':
          const variationCount = params.variationCount || 3
          const variations = []

          for (let i = 0; i < variationCount; i++) {
            const variationData = {
              ...params,
              tone: ['professional', 'casual', 'playful', 'urgent', 'friendly'][i % 5],
              urgency: i % 2 === 0
            }

            const variation = await generateMarketingCopy(variationData)
            variations.push({
              ...variation,
              variation_number: i + 1,
              tone: variationData.tone
            })
          }

          return {
            success: true,
            variations,
            message: `Generated ${variations.length} copy variations.`
          }

        case 'get_saved_snippets':
          const { data: snippets } = await supabase
            .from('marketing_snippets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(params.limit || 20)

          return {
            success: true,
            snippets: snippets?.map(snippet => ({
              id: snippet.id,
              title: snippet.title,
              content: snippet.content,
              content_type: snippet.content_type,
              platform: snippet.platform,
              character_count: snippet.character_count,
              word_count: snippet.word_count,
              tone: snippet.tone,
              used_count: snippet.used_count,
              is_favorite: snippet.is_favorite,
              created_at: snippet.created_at
            })) || [],
            total: snippets?.length || 0,
            message: `Found ${snippets?.length || 0} saved marketing snippets.`
          }

        case 'use_snippet':
          const { snippetId } = params
          if (!snippetId) {
            throw new Error('Snippet ID required')
          }

          // Increment usage count
          await supabase
            .from('marketing_snippets')
            .update({
              used_count: supabase.raw('used_count + 1'),
              last_used_at: new Date().toISOString()
            })
            .eq('id', snippetId)
            .eq('user_id', userId)

          const { data: snippet } = await supabase
            .from('marketing_snippets')
            .select('*')
            .eq('id', snippetId)
            .eq('user_id', userId)
            .single()

          return {
            success: true,
            snippet,
            message: 'Snippet usage tracked.'
          }

        default:
          throw new Error(`Invalid marketing copy action: ${action}`)
      }
    }
  },
  {
    id: 'abandoned_cart_recovery',
    name: 'Lost Cargo Recovery',
    description: 'Recover abandoned carts with targeted campaigns',
    agentId: 'flint',
    category: 'marketing',
    permissions: ['marketing_campaign'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      // This would integrate with email marketing systems
      // Placeholder for abandoned cart recovery logic
      return {
        message: 'Abandoned cart recovery campaign initiated',
        params
      }
    }
  }
]

// Beacon - Customer Support & Communication
export const beaconCapabilities: ShopifyCapability[] = [
  {
    id: 'customer_service',
    name: 'Crew Support Operations',
    description: 'Handle customer inquiries and support requests',
    agentId: 'beacon',
    category: 'customer_service',
    permissions: ['customer_create', 'order_fulfill'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { action, customerId, orderId, message } = params
      
      if (action === 'get_customer_info') {
        return await shopifyAPI.getCustomer(customerId)
      } else if (action === 'get_order_info') {
        return await shopifyAPI.getOrder(orderId)
      }
      
      return { message: 'Customer service action processed', action, params }
    }
  },
  {
    id: 'order_tracking',
    name: 'Shipment Tracking',
    description: 'Provide order status and tracking information',
    agentId: 'beacon',
    category: 'customer_service',
    permissions: ['analytics_read'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { orderId } = params
      
      const order = await shopifyAPI.getOrder(orderId)
      const fulfillments = await shopifyAPI.getFulfillments(orderId)
      
      return {
        order,
        fulfillments,
        trackingInfo: fulfillments.map(f => ({
          trackingNumber: f.tracking_number,
          trackingCompany: f.tracking_company,
          status: f.status
        }))
      }
    }
  }
]

// Splash - Creative & Content Management
export const splashCapabilities: ShopifyCapability[] = [
  {
    id: 'content_creation',
    name: 'Maritime Content Creation',
    description: 'Create and optimize product content with maritime flair',
    agentId: 'splash',
    category: 'marketing',
    permissions: ['product_update'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { productId, contentType, content } = params
      
      const updates: any = {}
      if (contentType === 'description') {
        updates.body_html = content
      } else if (contentType === 'title') {
        updates.title = content
      } else if (contentType === 'tags') {
        updates.tags = content
      }
      
      return await shopifyAPI.updateProduct(productId, updates)
    }
  },
  {
    id: 'brand_consistency',
    name: 'Brand Standards Enforcement',
    description: 'Ensure consistent maritime branding across all products',
    agentId: 'splash',
    category: 'marketing',
    permissions: ['product_update'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { brandGuidelines, productIds } = params
      
      const results = []
      for (const productId of productIds) {
        // Apply brand guidelines to product
        const updates = {
          tags: brandGuidelines.tags,
          // Add other brand consistency updates
        }
        const updated = await shopifyAPI.updateProduct(productId, updates)
        results.push(updated)
      }
      
      return results
    }
  }
]

// Drake - Business Development & Strategy
export const drakeCapabilities: ShopifyCapability[] = [
  {
    id: 'business_intelligence',
    name: 'Strategic Business Intelligence',
    description: 'Analyze business performance and growth opportunities',
    agentId: 'drake',
    category: 'analytics',
    permissions: ['analytics_read'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { timeframe = '90d' } = params
      
      const [store, products, orders] = await Promise.all([
        shopifyAPI.getShop(),
        shopifyAPI.getProducts(500),
        shopifyAPI.getOrders(500)
      ])
      
      return {
        storeInfo: store,
        productCount: products.length,
        orderCount: orders.length,
        revenue: orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0),
        timeframe
      }
    }
  },
  {
    id: 'expansion_planning',
    name: 'Fleet Expansion Strategy',
    description: 'Plan and execute business expansion strategies',
    agentId: 'drake',
    category: 'analytics',
    permissions: ['analytics_read', 'product_create'],
    execute: async (userId: string, params: any) => {
      const shopifyAPI = await createShopifyAPI(userId)
      if (!shopifyAPI) throw new Error('Shopify connection required')

      const { strategy, targetMarket } = params
      
      // Analyze current market position
      const products = await shopifyAPI.getProducts(500)
      const productTypes = [...new Set(products.map(p => p.product_type))]
      
      return {
        currentProductTypes: productTypes,
        expansionStrategy: strategy,
        targetMarket,
        recommendations: 'Expansion analysis complete'
      }
    }
  }
]

// Export all capabilities by agent
export const shopifyCapabilities = {
  anchor: anchorCapabilities,
  pearl: pearlCapabilities,
  flint: flintCapabilities,
  beacon: beaconCapabilities,
  splash: splashCapabilities,
  drake: drakeCapabilities
}

// Helper function to get capabilities for a specific agent
export function getAgentShopifyCapabilities(agentId: string): ShopifyCapability[] {
  return shopifyCapabilities[agentId as keyof typeof shopifyCapabilities] || []
}

// Helper function to execute a capability
export async function executeShopifyCapability(
  agentId: string, 
  capabilityId: string, 
  userId: string, 
  params: any
): Promise<any> {
  const capabilities = getAgentShopifyCapabilities(agentId)
  const capability = capabilities.find(cap => cap.id === capabilityId)
  
  if (!capability) {
    throw new Error(`Capability ${capabilityId} not found for agent ${agentId}`)
  }
  
  // Check permissions
  const actionManager = createAutonomousActionManager(userId)
  for (const permission of capability.permissions) {
    const hasPermission = await actionManager.hasPermission('shopify', permission)
    if (!hasPermission) {
      throw new Error(`Permission ${permission} not granted for Shopify integration`)
    }
  }
  
  return await capability.execute(userId, params)
}
