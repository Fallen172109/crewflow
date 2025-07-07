// Shopify Proactive Monitoring
// Enables agents to monitor Shopify stores and provide proactive recommendations

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { executeWorkflow } from './shopify-workflows'

export interface MonitoringAlert {
  id: string
  type: 'warning' | 'critical' | 'info' | 'opportunity'
  title: string
  description: string
  agentId: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  actionRequired: boolean
  suggestedActions: string[]
  data: any
  createdAt: Date
  resolvedAt?: Date
}

export interface MonitoringRule {
  id: string
  name: string
  description: string
  agentId: string
  enabled: boolean
  frequency: 'hourly' | 'daily' | 'weekly'
  conditions: any
  alertType: 'warning' | 'critical' | 'info' | 'opportunity'
  priority: 'low' | 'medium' | 'high' | 'critical'
}

// Pre-defined monitoring rules for different scenarios
export const defaultMonitoringRules: MonitoringRule[] = [
  {
    id: 'low_inventory_monitor',
    name: 'Low Inventory Alert',
    description: 'Monitor for products with low stock levels',
    agentId: 'anchor',
    enabled: true,
    frequency: 'hourly',
    conditions: {
      inventory_quantity: { operator: 'less_than', value: 10 },
      product_status: 'active'
    },
    alertType: 'warning',
    priority: 'high'
  },
  {
    id: 'unfulfilled_orders_monitor',
    name: 'Unfulfilled Orders Alert',
    description: 'Monitor for orders that need fulfillment',
    agentId: 'anchor',
    enabled: true,
    frequency: 'hourly',
    conditions: {
      fulfillment_status: 'unfulfilled',
      financial_status: 'paid',
      age_hours: { operator: 'greater_than', value: 24 }
    },
    alertType: 'critical',
    priority: 'critical'
  },
  {
    id: 'sales_performance_monitor',
    name: 'Sales Performance Analysis',
    description: 'Monitor daily sales performance and trends',
    agentId: 'pearl',
    enabled: true,
    frequency: 'daily',
    conditions: {
      daily_sales_drop: { operator: 'greater_than', value: 20 }, // 20% drop
      comparison_period: '7d'
    },
    alertType: 'warning',
    priority: 'medium'
  },
  {
    id: 'conversion_rate_monitor',
    name: 'Conversion Rate Monitoring',
    description: 'Monitor conversion rate changes and optimization opportunities',
    agentId: 'flint',
    enabled: true,
    frequency: 'daily',
    conditions: {
      conversion_rate_drop: { operator: 'greater_than', value: 15 }, // 15% drop
      min_visitors: { operator: 'greater_than', value: 100 }
    },
    alertType: 'opportunity',
    priority: 'medium'
  },
  {
    id: 'customer_satisfaction_monitor',
    name: 'Customer Satisfaction Tracking',
    description: 'Monitor customer feedback and satisfaction metrics',
    agentId: 'beacon',
    enabled: true,
    frequency: 'daily',
    conditions: {
      negative_reviews: { operator: 'greater_than', value: 3 },
      timeframe: '24h'
    },
    alertType: 'warning',
    priority: 'high'
  },
  {
    id: 'product_performance_monitor',
    name: 'Product Performance Analysis',
    description: 'Monitor individual product performance and optimization opportunities',
    agentId: 'splash',
    enabled: true,
    frequency: 'weekly',
    conditions: {
      zero_sales_days: { operator: 'greater_than', value: 7 },
      product_status: 'active'
    },
    alertType: 'opportunity',
    priority: 'low'
  },
  {
    id: 'revenue_growth_monitor',
    name: 'Revenue Growth Tracking',
    description: 'Monitor revenue trends and growth opportunities',
    agentId: 'drake',
    enabled: true,
    frequency: 'weekly',
    conditions: {
      revenue_growth: { operator: 'less_than', value: 0 }, // Negative growth
      comparison_period: '30d'
    },
    alertType: 'critical',
    priority: 'critical'
  }
]

// Main monitoring function that runs periodically
export async function runShopifyMonitoring(userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []

  try {
    const shopifyAPI = await createShopifyAPI(userId)
    if (!shopifyAPI) {
      console.log(`No Shopify connection for user ${userId}`)
      return alerts
    }

    // Get user's monitoring rules
    const rules = await getUserMonitoringRules(userId)
    
    // Run each enabled monitoring rule
    for (const rule of rules.filter(r => r.enabled)) {
      try {
        const ruleAlerts = await executeMonitoringRule(rule, shopifyAPI, userId)
        alerts.push(...ruleAlerts)
      } catch (error) {
        console.error(`Error executing monitoring rule ${rule.id}:`, error)
      }
    }

    // Store alerts in database
    if (alerts.length > 0) {
      await storeMonitoringAlerts(alerts, userId)
    }

  } catch (error) {
    console.error(`Error running Shopify monitoring for user ${userId}:`, error)
  }

  return alerts
}

// Execute a specific monitoring rule
async function executeMonitoringRule(
  rule: MonitoringRule,
  shopifyAPI: any,
  userId: string
): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []

  switch (rule.id) {
    case 'low_inventory_monitor':
      alerts.push(...await checkLowInventory(rule, shopifyAPI, userId))
      break

    case 'unfulfilled_orders_monitor':
      alerts.push(...await checkUnfulfilledOrders(rule, shopifyAPI, userId))
      break

    case 'sales_performance_monitor':
      alerts.push(...await checkSalesPerformance(rule, shopifyAPI, userId))
      break

    case 'conversion_rate_monitor':
      alerts.push(...await checkConversionRate(rule, shopifyAPI, userId))
      break

    case 'customer_satisfaction_monitor':
      alerts.push(...await checkCustomerSatisfaction(rule, shopifyAPI, userId))
      break

    case 'product_performance_monitor':
      alerts.push(...await checkProductPerformance(rule, shopifyAPI, userId))
      break

    case 'revenue_growth_monitor':
      alerts.push(...await checkRevenueGrowth(rule, shopifyAPI, userId))
      break

    default:
      console.warn(`Unknown monitoring rule: ${rule.id}`)
  }

  return alerts
}

// Monitoring rule implementations
async function checkLowInventory(rule: MonitoringRule, shopifyAPI: any, userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  
  try {
    const products = await shopifyAPI.getProducts(250)
    const threshold = rule.conditions.inventory_quantity.value

    for (const product of products) {
      if (product.status !== 'active') continue

      const lowStockVariants = product.variants?.filter((variant: any) => 
        variant.inventory_quantity !== null && 
        variant.inventory_quantity < threshold &&
        variant.inventory_quantity >= 0
      ) || []

      if (lowStockVariants.length > 0) {
        alerts.push({
          id: `low_inventory_${product.id}`,
          type: rule.alertType,
          title: `Low Stock Alert: ${product.title}`,
          description: `Product has ${lowStockVariants.length} variant(s) with low inventory`,
          agentId: rule.agentId,
          priority: rule.priority,
          actionRequired: true,
          suggestedActions: [
            'Review inventory levels',
            'Contact suppliers for restock',
            'Consider adjusting reorder points',
            'Update product availability if needed'
          ],
          data: {
            product_id: product.id,
            product_title: product.title,
            low_stock_variants: lowStockVariants.map((v: any) => ({
              id: v.id,
              title: v.title,
              inventory_quantity: v.inventory_quantity
            }))
          },
          createdAt: new Date()
        })
      }
    }
  } catch (error) {
    console.error('Error checking low inventory:', error)
  }

  return alerts
}

async function checkUnfulfilledOrders(rule: MonitoringRule, shopifyAPI: any, userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  
  try {
    const orders = await shopifyAPI.getOrders(100, 'any')
    const ageThreshold = rule.conditions.age_hours.value * 60 * 60 * 1000 // Convert to milliseconds
    const now = new Date()

    const unfulfilledOrders = orders.filter((order: any) => {
      const orderAge = now.getTime() - new Date(order.created_at).getTime()
      return order.fulfillment_status === 'unfulfilled' &&
             order.financial_status === 'paid' &&
             orderAge > ageThreshold
    })

    if (unfulfilledOrders.length > 0) {
      alerts.push({
        id: `unfulfilled_orders_${Date.now()}`,
        type: rule.alertType,
        title: `${unfulfilledOrders.length} Orders Awaiting Fulfillment`,
        description: `You have ${unfulfilledOrders.length} paid orders that need fulfillment`,
        agentId: rule.agentId,
        priority: rule.priority,
        actionRequired: true,
        suggestedActions: [
          'Review unfulfilled orders',
          'Process fulfillments',
          'Update tracking information',
          'Contact customers if delays expected'
        ],
        data: {
          unfulfilled_count: unfulfilledOrders.length,
          orders: unfulfilledOrders.slice(0, 5).map((order: any) => ({
            id: order.id,
            name: order.name,
            total_price: order.total_price,
            created_at: order.created_at
          }))
        },
        createdAt: new Date()
      })
    }
  } catch (error) {
    console.error('Error checking unfulfilled orders:', error)
  }

  return alerts
}

async function checkSalesPerformance(rule: MonitoringRule, shopifyAPI: any, userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  
  try {
    const orders = await shopifyAPI.getOrders(200, 'any')
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Calculate yesterday's sales
    const yesterdaySales = orders
      .filter((order: any) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= yesterday && orderDate < now
      })
      .reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0)

    // Calculate average daily sales for the past week
    const weekSales = orders
      .filter((order: any) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= weekAgo && orderDate < yesterday
      })
      .reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0)

    const avgDailySales = weekSales / 7
    const dropPercentage = avgDailySales > 0 ? ((avgDailySales - yesterdaySales) / avgDailySales) * 100 : 0

    if (dropPercentage > rule.conditions.daily_sales_drop.value) {
      alerts.push({
        id: `sales_drop_${Date.now()}`,
        type: rule.alertType,
        title: `Sales Performance Alert`,
        description: `Daily sales dropped by ${dropPercentage.toFixed(1)}% compared to weekly average`,
        agentId: rule.agentId,
        priority: rule.priority,
        actionRequired: true,
        suggestedActions: [
          'Analyze traffic sources',
          'Review marketing campaigns',
          'Check for technical issues',
          'Consider promotional activities'
        ],
        data: {
          yesterday_sales: yesterdaySales,
          avg_daily_sales: avgDailySales,
          drop_percentage: dropPercentage
        },
        createdAt: new Date()
      })
    }
  } catch (error) {
    console.error('Error checking sales performance:', error)
  }

  return alerts
}

async function checkConversionRate(rule: MonitoringRule, shopifyAPI: any, userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  
  // Note: This would require additional analytics data that might not be available through basic Shopify API
  // Implementation would depend on available analytics integrations
  
  return alerts
}

async function checkCustomerSatisfaction(rule: MonitoringRule, shopifyAPI: any, userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  
  // Note: This would require integration with review systems or customer feedback platforms
  // Implementation would depend on available review/feedback integrations
  
  return alerts
}

async function checkProductPerformance(rule: MonitoringRule, shopifyAPI: any, userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  
  try {
    const products = await shopifyAPI.getProducts(250)
    const orders = await shopifyAPI.getOrders(200, 'any')
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Find products with no sales in the past week
    const productsWithNoSales = products.filter((product: any) => {
      if (product.status !== 'active') return false
      
      const hasRecentSales = orders.some((order: any) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= weekAgo && 
               order.line_items.some((item: any) => item.product_id === product.id)
      })
      
      return !hasRecentSales
    })

    if (productsWithNoSales.length > 0) {
      alerts.push({
        id: `no_sales_products_${Date.now()}`,
        type: rule.alertType,
        title: `${productsWithNoSales.length} Products with No Recent Sales`,
        description: `${productsWithNoSales.length} active products haven't sold in the past week`,
        agentId: rule.agentId,
        priority: rule.priority,
        actionRequired: false,
        suggestedActions: [
          'Review product descriptions and images',
          'Optimize SEO and keywords',
          'Consider promotional pricing',
          'Analyze competitor products'
        ],
        data: {
          no_sales_count: productsWithNoSales.length,
          products: productsWithNoSales.slice(0, 10).map((product: any) => ({
            id: product.id,
            title: product.title,
            created_at: product.created_at
          }))
        },
        createdAt: new Date()
      })
    }
  } catch (error) {
    console.error('Error checking product performance:', error)
  }

  return alerts
}

async function checkRevenueGrowth(rule: MonitoringRule, shopifyAPI: any, userId: string): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  
  try {
    const orders = await shopifyAPI.getOrders(500, 'any')
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Calculate revenue for last 30 days
    const recentRevenue = orders
      .filter((order: any) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= thirtyDaysAgo
      })
      .reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0)

    // Calculate revenue for previous 30 days
    const previousRevenue = orders
      .filter((order: any) => {
        const orderDate = new Date(order.created_at)
        return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo
      })
      .reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0)

    const growthRate = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    if (growthRate < 0) {
      alerts.push({
        id: `revenue_decline_${Date.now()}`,
        type: rule.alertType,
        title: `Revenue Decline Detected`,
        description: `Revenue decreased by ${Math.abs(growthRate).toFixed(1)}% compared to previous period`,
        agentId: rule.agentId,
        priority: rule.priority,
        actionRequired: true,
        suggestedActions: [
          'Analyze sales trends and patterns',
          'Review marketing effectiveness',
          'Consider new customer acquisition strategies',
          'Evaluate pricing and competitive position'
        ],
        data: {
          recent_revenue: recentRevenue,
          previous_revenue: previousRevenue,
          growth_rate: growthRate
        },
        createdAt: new Date()
      })
    }
  } catch (error) {
    console.error('Error checking revenue growth:', error)
  }

  return alerts
}

// Get user's monitoring rules
async function getUserMonitoringRules(userId: string): Promise<MonitoringRule[]> {
  try {
    const supabase = createSupabaseServerClient()
    
    // For now, return default rules
    // In the future, this could be customized per user
    return defaultMonitoringRules
  } catch (error) {
    console.error('Error getting user monitoring rules:', error)
    return defaultMonitoringRules
  }
}

// Store monitoring alerts in database
async function storeMonitoringAlerts(alerts: MonitoringAlert[], userId: string): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()
    
    for (const alert of alerts) {
      await supabase.from('agent_actions').insert({
        user_id: userId,
        agent_id: alert.agentId,
        integration_id: 'shopify',
        action_type: 'monitoring_alert',
        action_description: alert.title,
        status: 'completed',
        metadata: {
          alert_type: alert.type,
          priority: alert.priority,
          description: alert.description,
          suggested_actions: alert.suggestedActions,
          data: alert.data
        }
      })
    }
  } catch (error) {
    console.error('Error storing monitoring alerts:', error)
  }
}

// Get recent alerts for a user
export async function getUserShopifyAlerts(userId: string, limit: number = 50): Promise<MonitoringAlert[]> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_id', 'shopify')
      .eq('action_type', 'monitoring_alert')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data || []).map(record => ({
      id: record.id,
      type: record.metadata.alert_type,
      title: record.action_description,
      description: record.metadata.description,
      agentId: record.agent_id,
      priority: record.metadata.priority,
      actionRequired: record.metadata.suggested_actions?.length > 0,
      suggestedActions: record.metadata.suggested_actions || [],
      data: record.metadata.data || {},
      createdAt: new Date(record.created_at)
    }))
  } catch (error) {
    console.error('Error getting user Shopify alerts:', error)
    return []
  }
}
