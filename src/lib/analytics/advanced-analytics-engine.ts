// Advanced Analytics Engine
// Provides predictive insights, trend analysis, and business intelligence

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface AnalyticsMetrics {
  revenue: {
    total: number
    growth: number
    forecast: number[]
    trend: 'up' | 'down' | 'stable'
  }
  orders: {
    total: number
    averageValue: number
    conversionRate: number
    fulfillmentRate: number
  }
  products: {
    total: number
    topPerformers: ProductPerformance[]
    lowPerformers: ProductPerformance[]
    stockAlerts: number
  }
  customers: {
    total: number
    newCustomers: number
    returningCustomers: number
    lifetimeValue: number
    churnRate: number
  }
  traffic: {
    sessions: number
    bounceRate: number
    averageSessionDuration: number
    topSources: TrafficSource[]
  }
}

export interface ProductPerformance {
  id: number
  title: string
  revenue: number
  units_sold: number
  conversion_rate: number
  profit_margin: number
  inventory_turnover: number
  trend: 'up' | 'down' | 'stable'
  score: number
}

export interface TrafficSource {
  source: string
  sessions: number
  conversion_rate: number
  revenue: number
}

export interface PredictiveInsight {
  type: 'revenue_forecast' | 'demand_prediction' | 'inventory_optimization' | 'customer_behavior' | 'market_opportunity'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  timeframe: string
  data: any
  recommendations: string[]
  createdAt: Date
}

export interface TrendAnalysis {
  metric: string
  period: string
  trend: 'up' | 'down' | 'stable'
  change_percentage: number
  significance: 'high' | 'medium' | 'low'
  factors: string[]
  forecast: number[]
}

// Generate comprehensive analytics for a user's store
export async function generateAdvancedAnalytics(
  userId: string,
  timeframe: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<AnalyticsMetrics> {
  const shopifyAPI = await createShopifyAPI(userId)
  if (!shopifyAPI) {
    throw new Error('Shopify API not available')
  }

  const endDate = new Date()
  const startDate = new Date()
  
  switch (timeframe) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(endDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(endDate.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
  }

  // Fetch data from Shopify
  const [orders, products, customers] = await Promise.all([
    shopifyAPI.getOrders(500, 'any'),
    shopifyAPI.getProducts(500),
    shopifyAPI.getCustomers(500)
  ])

  // Filter data by timeframe
  const filteredOrders = orders.filter(order => 
    new Date(order.created_at) >= startDate
  )

  // Calculate revenue metrics
  const revenue = calculateRevenueMetrics(filteredOrders, timeframe)
  
  // Calculate order metrics
  const orderMetrics = calculateOrderMetrics(filteredOrders)
  
  // Calculate product metrics
  const productMetrics = await calculateProductMetrics(products, filteredOrders)
  
  // Calculate customer metrics
  const customerMetrics = calculateCustomerMetrics(customers, filteredOrders, startDate)
  
  // Calculate traffic metrics (would need additional data source)
  const trafficMetrics = await calculateTrafficMetrics(userId, timeframe)

  return {
    revenue,
    orders: orderMetrics,
    products: productMetrics,
    customers: customerMetrics,
    traffic: trafficMetrics
  }
}

// Calculate revenue metrics with forecasting
function calculateRevenueMetrics(orders: any[], timeframe: string) {
  const totalRevenue = orders.reduce((sum, order) => 
    sum + parseFloat(order.total_price || '0'), 0
  )

  // Calculate growth (compare with previous period)
  const midpoint = Math.floor(orders.length / 2)
  const recentRevenue = orders.slice(0, midpoint).reduce((sum, order) => 
    sum + parseFloat(order.total_price || '0'), 0
  )
  const previousRevenue = orders.slice(midpoint).reduce((sum, order) => 
    sum + parseFloat(order.total_price || '0'), 0
  )
  
  const growth = previousRevenue > 0 ? 
    ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0

  // Simple linear forecast (would use more sophisticated models in production)
  const dailyRevenue = totalRevenue / getDaysInTimeframe(timeframe)
  const forecast = Array.from({ length: 7 }, (_, i) => 
    dailyRevenue * (1 + (growth / 100) * (i + 1) / 30)
  )

  const trend = growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable'

  return {
    total: totalRevenue,
    growth,
    forecast,
    trend
  }
}

// Calculate order metrics
function calculateOrderMetrics(orders: any[]) {
  const total = orders.length
  const totalValue = orders.reduce((sum, order) => 
    sum + parseFloat(order.total_price || '0'), 0
  )
  const averageValue = total > 0 ? totalValue / total : 0

  const fulfilledOrders = orders.filter(order => 
    order.fulfillment_status === 'fulfilled'
  ).length
  const fulfillmentRate = total > 0 ? (fulfilledOrders / total) * 100 : 0

  // Conversion rate would need additional traffic data
  const conversionRate = 2.5 // Placeholder

  return {
    total,
    averageValue,
    conversionRate,
    fulfillmentRate
  }
}

// Calculate product performance metrics
async function calculateProductMetrics(products: any[], orders: any[]) {
  const productPerformance: ProductPerformance[] = []

  for (const product of products) {
    const productOrders = orders.filter(order =>
      order.line_items.some((item: any) => item.product_id === product.id)
    )

    const revenue = productOrders.reduce((sum, order) => {
      const productItems = order.line_items.filter((item: any) => 
        item.product_id === product.id
      )
      return sum + productItems.reduce((itemSum: number, item: any) => 
        itemSum + parseFloat(item.price) * item.quantity, 0
      )
    }, 0)

    const unitsSold = productOrders.reduce((sum, order) => {
      const productItems = order.line_items.filter((item: any) => 
        item.product_id === product.id
      )
      return sum + productItems.reduce((itemSum: number, item: any) => 
        itemSum + item.quantity, 0
      )
    }, 0)

    // Calculate performance score
    const score = calculateProductScore(revenue, unitsSold, product)

    productPerformance.push({
      id: product.id,
      title: product.title,
      revenue,
      units_sold: unitsSold,
      conversion_rate: 2.5, // Would need additional data
      profit_margin: 30, // Would need cost data
      inventory_turnover: unitsSold / (product.variants?.[0]?.inventory_quantity || 1),
      trend: revenue > 1000 ? 'up' : revenue < 100 ? 'down' : 'stable',
      score
    })
  }

  // Sort by performance score
  productPerformance.sort((a, b) => b.score - a.score)

  const topPerformers = productPerformance.slice(0, 5)
  const lowPerformers = productPerformance.slice(-5).reverse()
  
  const stockAlerts = products.filter(product =>
    product.variants?.some((variant: any) => 
      variant.inventory_quantity !== null && variant.inventory_quantity < 10
    )
  ).length

  return {
    total: products.length,
    topPerformers,
    lowPerformers,
    stockAlerts
  }
}

// Calculate customer metrics
function calculateCustomerMetrics(customers: any[], orders: any[], startDate: Date) {
  const total = customers.length
  const newCustomers = customers.filter(customer =>
    new Date(customer.created_at) >= startDate
  ).length

  const customerOrderCounts = customers.map(customer => {
    const customerOrders = orders.filter(order => order.customer?.id === customer.id)
    return {
      customerId: customer.id,
      orderCount: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_price || '0'), 0
      )
    }
  })

  const returningCustomers = customerOrderCounts.filter(c => c.orderCount > 1).length
  const lifetimeValue = customerOrderCounts.reduce((sum, c) => sum + c.totalSpent, 0) / total

  // Simple churn rate calculation
  const churnRate = total > 0 ? ((total - returningCustomers) / total) * 100 : 0

  return {
    total,
    newCustomers,
    returningCustomers,
    lifetimeValue,
    churnRate
  }
}

// Calculate traffic metrics (placeholder - would integrate with analytics service)
async function calculateTrafficMetrics(userId: string, timeframe: string) {
  // This would integrate with Google Analytics, Shopify Analytics, or similar
  return {
    sessions: 1250,
    bounceRate: 45.2,
    averageSessionDuration: 180,
    topSources: [
      { source: 'Organic Search', sessions: 450, conversion_rate: 3.2, revenue: 15000 },
      { source: 'Direct', sessions: 320, conversion_rate: 4.1, revenue: 12000 },
      { source: 'Social Media', sessions: 280, conversion_rate: 2.8, revenue: 8500 },
      { source: 'Email', sessions: 200, conversion_rate: 5.5, revenue: 11000 }
    ]
  }
}

// Generate predictive insights
export async function generatePredictiveInsights(
  userId: string,
  metrics: AnalyticsMetrics
): Promise<PredictiveInsight[]> {
  const insights: PredictiveInsight[] = []

  // Revenue forecast insight
  if (metrics.revenue.trend === 'up') {
    insights.push({
      type: 'revenue_forecast',
      title: 'Strong Revenue Growth Predicted',
      description: `Based on current trends, revenue is expected to grow by ${metrics.revenue.growth.toFixed(1)}% over the next 30 days.`,
      confidence: 0.85,
      impact: 'high',
      timeframe: '30 days',
      data: { forecast: metrics.revenue.forecast },
      recommendations: [
        'Increase inventory for top-performing products',
        'Scale successful marketing campaigns',
        'Consider expanding product line'
      ],
      createdAt: new Date()
    })
  }

  // Inventory optimization insight
  if (metrics.products.stockAlerts > 0) {
    insights.push({
      type: 'inventory_optimization',
      title: 'Inventory Optimization Opportunity',
      description: `${metrics.products.stockAlerts} products are running low on stock. Optimize inventory to prevent stockouts.`,
      confidence: 0.95,
      impact: 'high',
      timeframe: '7 days',
      data: { stockAlerts: metrics.products.stockAlerts },
      recommendations: [
        'Reorder low-stock items immediately',
        'Set up automated reorder points',
        'Review supplier lead times'
      ],
      createdAt: new Date()
    })
  }

  // Customer behavior insight
  if (metrics.customers.churnRate > 50) {
    insights.push({
      type: 'customer_behavior',
      title: 'Customer Retention Needs Attention',
      description: `Customer churn rate is ${metrics.customers.churnRate.toFixed(1)}%. Focus on retention strategies.`,
      confidence: 0.78,
      impact: 'medium',
      timeframe: '60 days',
      data: { churnRate: metrics.customers.churnRate },
      recommendations: [
        'Implement loyalty program',
        'Improve customer service response times',
        'Send personalized follow-up emails'
      ],
      createdAt: new Date()
    })
  }

  // Market opportunity insight
  const topProduct = metrics.products.topPerformers[0]
  if (topProduct && topProduct.trend === 'up') {
    insights.push({
      type: 'market_opportunity',
      title: 'Expand Top-Performing Product Line',
      description: `${topProduct.title} is showing strong performance. Consider expanding this product category.`,
      confidence: 0.72,
      impact: 'medium',
      timeframe: '90 days',
      data: { product: topProduct },
      recommendations: [
        'Research similar products to add',
        'Increase marketing budget for this category',
        'Consider product variations or bundles'
      ],
      createdAt: new Date()
    })
  }

  return insights
}

// Generate trend analysis
export async function generateTrendAnalysis(
  userId: string,
  metrics: AnalyticsMetrics
): Promise<TrendAnalysis[]> {
  const trends: TrendAnalysis[] = []

  // Revenue trend
  trends.push({
    metric: 'Revenue',
    period: '30 days',
    trend: metrics.revenue.trend,
    change_percentage: metrics.revenue.growth,
    significance: Math.abs(metrics.revenue.growth) > 10 ? 'high' : 
                 Math.abs(metrics.revenue.growth) > 5 ? 'medium' : 'low',
    factors: ['Seasonal demand', 'Marketing campaigns', 'Product launches'],
    forecast: metrics.revenue.forecast
  })

  // Order volume trend
  const orderTrend = metrics.orders.total > 100 ? 'up' : 
                    metrics.orders.total < 50 ? 'down' : 'stable'
  trends.push({
    metric: 'Order Volume',
    period: '30 days',
    trend: orderTrend,
    change_percentage: 15, // Would calculate from historical data
    significance: 'medium',
    factors: ['Customer acquisition', 'Conversion optimization', 'Product availability'],
    forecast: [metrics.orders.total * 1.1, metrics.orders.total * 1.15, metrics.orders.total * 1.2]
  })

  return trends
}

// Helper functions
function calculateProductScore(revenue: number, unitsSold: number, product: any): number {
  // Weighted scoring algorithm
  const revenueScore = Math.min(revenue / 1000, 100) * 0.4
  const volumeScore = Math.min(unitsSold / 10, 100) * 0.3
  const inventoryScore = product.variants?.[0]?.inventory_quantity > 0 ? 30 : 0
  
  return revenueScore + volumeScore + inventoryScore
}

function getDaysInTimeframe(timeframe: string): number {
  switch (timeframe) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    case '1y': return 365
    default: return 30
  }
}

// Store analytics results for caching
export async function storeAnalyticsResults(
  userId: string,
  metrics: AnalyticsMetrics,
  insights: PredictiveInsight[],
  trends: TrendAnalysis[]
): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    await supabase.from('analytics_cache').upsert({
      user_id: userId,
      metrics,
      insights,
      trends,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour cache
    })
  } catch (error) {
    console.error('Error storing analytics results:', error)
  }
}

// Get cached analytics results
export async function getCachedAnalytics(userId: string): Promise<{
  metrics?: AnalyticsMetrics
  insights?: PredictiveInsight[]
  trends?: TrendAnalysis[]
} | null> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from('analytics_cache')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (error || !data) {
      return null
    }
    
    return {
      metrics: data.metrics,
      insights: data.insights,
      trends: data.trends
    }
  } catch (error) {
    console.error('Error getting cached analytics:', error)
    return null
  }
}
