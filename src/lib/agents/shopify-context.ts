// Shopify Context Integration
// Provides Shopify store data as context for agent conversations

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ShopifyContextData {
  store: {
    name: string
    domain: string
    currency: string
    plan: string
    timezone?: string
  }
  metrics: {
    totalProducts: number
    totalOrders: number
    totalCustomers: number
    monthlyRevenue: number
    pendingOrders: number
    lowStockProducts: number
  }
  recentActivity: {
    recentOrders: any[]
    recentProducts: any[]
    recentCustomers: any[]
  }
  alerts: {
    lowStock: any[]
    pendingFulfillment: any[]
    failedPayments: any[]
  }
}

// Generate Shopify context for agent conversations
export async function generateShopifyContext(userId: string): Promise<string> {
  try {
    const contextData = await getShopifyContextData(userId)
    if (!contextData) {
      return "No Shopify store connected. User needs to connect their Shopify store to access e-commerce features."
    }

    return formatShopifyContext(contextData)
  } catch (error) {
    console.error('Error generating Shopify context:', error)
    return "Unable to load Shopify store data at this time."
  }
}

// Get comprehensive Shopify context data
export async function getShopifyContextData(userId: string): Promise<ShopifyContextData | null> {
  try {
    const shopifyAPI = await createShopifyAPI(userId)
    if (!shopifyAPI) {
      return null
    }

    // Get store information
    const store = await shopifyAPI.getShop()
    
    // Get basic metrics
    const [products, orders, customers] = await Promise.all([
      shopifyAPI.getProducts(250),
      shopifyAPI.getOrders(100),
      shopifyAPI.getCustomers(100)
    ])

    // Calculate metrics
    const monthlyRevenue = orders
      .filter(order => {
        const orderDate = new Date(order.created_at)
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return orderDate >= monthAgo
      })
      .reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)

    const pendingOrders = orders.filter(order => 
      order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === null
    )

    // Identify low stock products (assuming inventory < 10 is low)
    const lowStockProducts = products.filter(product => {
      return product.variants?.some((variant: any) => 
        variant.inventory_quantity !== null && variant.inventory_quantity < 10
      )
    })

    // Get recent activity (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const recentOrders = orders
      .filter(order => new Date(order.created_at) >= weekAgo)
      .slice(0, 5)

    const recentProducts = products
      .filter(product => new Date(product.updated_at) >= weekAgo)
      .slice(0, 5)

    const recentCustomers = customers
      .filter(customer => new Date(customer.created_at) >= weekAgo)
      .slice(0, 5)

    // Identify alerts
    const failedPayments = orders.filter(order => 
      order.financial_status === 'pending' || order.financial_status === 'voided'
    )

    return {
      store: {
        name: store.name,
        domain: store.domain,
        currency: store.currency,
        plan: store.plan_name,
        timezone: store.timezone
      },
      metrics: {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        monthlyRevenue,
        pendingOrders: pendingOrders.length,
        lowStockProducts: lowStockProducts.length
      },
      recentActivity: {
        recentOrders,
        recentProducts,
        recentCustomers
      },
      alerts: {
        lowStock: lowStockProducts.slice(0, 5),
        pendingFulfillment: pendingOrders.slice(0, 5),
        failedPayments: failedPayments.slice(0, 5)
      }
    }
  } catch (error) {
    console.error('Error getting Shopify context data:', error)
    return null
  }
}

// Format Shopify context for agent consumption
function formatShopifyContext(data: ShopifyContextData): string {
  const { store, metrics, recentActivity, alerts } = data

  let context = `=== SHOPIFY STORE CONTEXT ===

STORE INFORMATION:
- Store Name: ${store.name}
- Domain: ${store.domain}
- Currency: ${store.currency}
- Plan: ${store.plan}
${store.timezone ? `- Timezone: ${store.timezone}` : ''}

CURRENT METRICS:
- Total Products: ${metrics.totalProducts.toLocaleString()}
- Total Orders: ${metrics.totalOrders.toLocaleString()}
- Total Customers: ${metrics.totalCustomers.toLocaleString()}
- Monthly Revenue: ${store.currency} ${metrics.monthlyRevenue.toLocaleString()}
- Pending Orders: ${metrics.pendingOrders}
- Low Stock Products: ${metrics.lowStockProducts}

`

  // Add recent activity if available
  if (recentActivity.recentOrders.length > 0) {
    context += `RECENT ORDERS (Last 7 days):
${recentActivity.recentOrders.map(order => 
  `- Order ${order.name}: ${store.currency} ${order.total_price} (${order.financial_status})`
).join('\n')}

`
  }

  if (recentActivity.recentProducts.length > 0) {
    context += `RECENTLY UPDATED PRODUCTS:
${recentActivity.recentProducts.map(product => 
  `- ${product.title} (${product.status})`
).join('\n')}

`
  }

  if (recentActivity.recentCustomers.length > 0) {
    context += `NEW CUSTOMERS (Last 7 days):
${recentActivity.recentCustomers.map(customer => 
  `- ${customer.first_name} ${customer.last_name} (${customer.email})`
).join('\n')}

`
  }

  // Add alerts if any
  const hasAlerts = alerts.lowStock.length > 0 || alerts.pendingFulfillment.length > 0 || alerts.failedPayments.length > 0

  if (hasAlerts) {
    context += `⚠️ ALERTS & ATTENTION REQUIRED:

`
    
    if (alerts.lowStock.length > 0) {
      context += `LOW STOCK ALERTS:
${alerts.lowStock.map(product => 
  `- ${product.title}: Low inventory detected`
).join('\n')}

`
    }

    if (alerts.pendingFulfillment.length > 0) {
      context += `PENDING FULFILLMENT:
${alerts.pendingFulfillment.map(order => 
  `- Order ${order.name}: Awaiting fulfillment (${store.currency} ${order.total_price})`
).join('\n')}

`
    }

    if (alerts.failedPayments.length > 0) {
      context += `PAYMENT ISSUES:
${alerts.failedPayments.map(order => 
  `- Order ${order.name}: Payment ${order.financial_status} (${store.currency} ${order.total_price})`
).join('\n')}

`
    }
  }

  context += `=== END SHOPIFY CONTEXT ===

`

  return context
}

// Get Shopify context for specific agent based on their role
export async function getAgentSpecificShopifyContext(userId: string, agentId: string): Promise<string> {
  const baseContext = await generateShopifyContext(userId)
  
  if (!baseContext || baseContext.includes('No Shopify store connected')) {
    return baseContext
  }

  // Add agent-specific context based on their maritime role
  let agentSpecificContext = ''

  switch (agentId) {
    case 'anchor':
      agentSpecificContext = `
ANCHOR'S OPERATIONAL FOCUS:
As the ship's quartermaster, focus on:
- Inventory management and stock levels
- Order fulfillment and shipping operations
- Supply chain coordination
- Operational efficiency and cost control

Available Shopify Actions:
- inventory_management: Monitor and update stock levels
- order_fulfillment: Process and fulfill orders
- supplier_management: Coordinate with vendors
`
      break

    case 'pearl':
      agentSpecificContext = `
PEARL'S ANALYTICAL FOCUS:
As the research specialist, focus on:
- Market analysis and trends
- Customer behavior insights
- Product performance analytics
- Competitive intelligence

Available Shopify Actions:
- market_analysis: Analyze market trends and opportunities
- customer_behavior_analysis: Deep dive into customer patterns
- product_research: Research product opportunities
`
      break

    case 'flint':
      agentSpecificContext = `
FLINT'S MARKETING FOCUS:
As the marketing strategist, focus on:
- Product optimization and SEO
- Marketing campaigns and promotions
- Conversion optimization
- Brand positioning

Available Shopify Actions:
- product_optimization: Optimize product listings
- discount_management: Create promotional campaigns
- abandoned_cart_recovery: Recover lost sales
`
      break

    case 'beacon':
      agentSpecificContext = `
BEACON'S CUSTOMER FOCUS:
As the customer support specialist, focus on:
- Customer service and support
- Order tracking and status
- Issue resolution
- Customer satisfaction

Available Shopify Actions:
- customer_service: Handle customer inquiries
- order_tracking: Provide order status updates
`
      break

    case 'splash':
      agentSpecificContext = `
SPLASH'S CREATIVE FOCUS:
As the creative director, focus on:
- Content creation and optimization
- Brand consistency
- Visual merchandising
- Product presentation

Available Shopify Actions:
- content_creation: Create and optimize product content
- brand_consistency: Ensure brand standards
`
      break

    case 'drake':
      agentSpecificContext = `
DRAKE'S STRATEGIC FOCUS:
As the business strategist, focus on:
- Business intelligence and growth
- Strategic planning and expansion
- Performance optimization
- Revenue growth strategies

Available Shopify Actions:
- business_intelligence: Analyze business performance
- expansion_planning: Plan growth strategies
`
      break

    default:
      agentSpecificContext = `
GENERAL SHOPIFY ACCESS:
This agent has access to basic Shopify store information and can assist with general e-commerce questions.
`
  }

  return baseContext + agentSpecificContext
}

// Check if user has Shopify integration and return status
export async function getShopifyIntegrationStatus(userId: string): Promise<{
  connected: boolean
  storeName?: string
  lastSync?: string
  error?: string
}> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data: connection } = await supabase
      .from('api_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_id', 'shopify')
      .eq('status', 'connected')
      .single()

    if (!connection) {
      return { connected: false, error: 'No Shopify connection found' }
    }

    // Test the connection
    const shopifyAPI = await createShopifyAPI(userId)
    if (!shopifyAPI) {
      return { connected: false, error: 'Shopify API initialization failed' }
    }

    const isWorking = await shopifyAPI.testConnection()
    if (!isWorking) {
      return { connected: false, error: 'Shopify connection test failed' }
    }

    const store = await shopifyAPI.getShop()
    
    return {
      connected: true,
      storeName: store.name,
      lastSync: connection.updated_at
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
