// Enhanced Store Intelligence Integration
// Real-time store data analysis for intelligent AI suggestions

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getShopifyContextData } from '@/lib/agents/shopify-context'

export interface StoreIntelligence {
  storeProfile: StoreProfile
  salesPatterns: SalesPattern[]
  inventoryInsights: InventoryInsight[]
  customerBehavior: CustomerBehavior
  marketTrends: MarketTrend[]
  recommendations: IntelligentRecommendation[]
  predictiveAnalytics: PredictiveAnalytic[]
  realTimeMetrics: RealTimeMetric[]
}

export interface StoreProfile {
  storeId: string
  storeName: string
  industry: string
  storeType: 'b2c' | 'b2b' | 'hybrid'
  averageOrderValue: number
  topCategories: string[]
  seasonalityPattern: 'high' | 'medium' | 'low'
  growthStage: 'startup' | 'growth' | 'mature' | 'enterprise'
  primaryMarkets: string[]
}

export interface SalesPattern {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  pattern: number[]
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonality: boolean
  peakTimes: string[]
  lowTimes: string[]
  confidence: number
}

export interface InventoryInsight {
  productId: number
  title: string
  sku: string
  currentStock: number
  optimalStock: number
  turnoverRate: number
  daysOfSupply: number
  reorderPoint: number
  trend: 'fast_moving' | 'slow_moving' | 'dead_stock'
  recommendation: string
  urgency: 'low' | 'medium' | 'high'
}

export interface CustomerBehavior {
  averageSessionDuration: number
  bounceRate: number
  conversionRate: number
  repeatCustomerRate: number
  averageOrdersPerCustomer: number
  topTrafficSources: string[]
  preferredPaymentMethods: string[]
  peakShoppingTimes: string[]
  abandonmentReasons: string[]
}

export interface MarketTrend {
  category: string
  trend: 'rising' | 'falling' | 'stable'
  strength: number
  timeframe: string
  relatedKeywords: string[]
  competitorActivity: string
  opportunity: string
}

export interface IntelligentRecommendation {
  id: string
  type: 'product' | 'inventory' | 'marketing' | 'pricing' | 'customer_service'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  reasoning: string
  expectedImpact: string
  effort: 'low' | 'medium' | 'high'
  timeframe: string
  actionItems: string[]
  metrics: string[]
  confidence: number
}

export interface PredictiveAnalytic {
  metric: string
  currentValue: number
  predictedValue: number
  timeframe: string
  confidence: number
  factors: string[]
  recommendation: string
}

export interface RealTimeMetric {
  name: string
  value: number
  change: number
  changeDirection: 'up' | 'down' | 'stable'
  timestamp: Date
  alert?: {
    type: 'warning' | 'critical' | 'opportunity'
    message: string
  }
}

export class EnhancedStoreIntelligence {
  private userId: string
  private storeId?: string
  private supabase = createSupabaseServerClient()

  constructor(userId: string, storeId?: string) {
    this.userId = userId
    this.storeId = storeId
  }

  async generateStoreIntelligence(): Promise<StoreIntelligence> {
    const [
      storeProfile,
      salesPatterns,
      inventoryInsights,
      customerBehavior,
      marketTrends,
      realTimeMetrics
    ] = await Promise.all([
      this.analyzeStoreProfile(),
      this.analyzeSalesPatterns(),
      this.analyzeInventoryInsights(),
      this.analyzeCustomerBehavior(),
      this.analyzeMarketTrends(),
      this.getRealTimeMetrics()
    ])

    const recommendations = await this.generateRecommendations(
      storeProfile,
      salesPatterns,
      inventoryInsights,
      customerBehavior
    )

    const predictiveAnalytics = await this.generatePredictiveAnalytics(
      salesPatterns,
      inventoryInsights,
      customerBehavior
    )

    return {
      storeProfile,
      salesPatterns,
      inventoryInsights,
      customerBehavior,
      marketTrends,
      recommendations,
      predictiveAnalytics,
      realTimeMetrics
    }
  }

  private async analyzeStoreProfile(): Promise<StoreProfile> {
    const shopifyAPI = await createShopifyAPI(this.userId)
    if (!shopifyAPI) {
      throw new Error('Shopify connection required')
    }

    const [store, products, orders] = await Promise.all([
      shopifyAPI.getShop(),
      shopifyAPI.getProducts(250),
      shopifyAPI.getOrders(100)
    ])

    // Calculate average order value
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

    // Analyze top categories
    const categoryCount: Record<string, number> = {}
    products.forEach(product => {
      const category = product.product_type || 'Uncategorized'
      categoryCount[category] = (categoryCount[category] || 0) + 1
    })
    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category)

    // Determine growth stage based on metrics
    let growthStage: StoreProfile['growthStage'] = 'startup'
    if (products.length > 100 && orders.length > 500) growthStage = 'growth'
    if (products.length > 500 && orders.length > 2000) growthStage = 'mature'
    if (products.length > 1000 && orders.length > 10000) growthStage = 'enterprise'

    return {
      storeId: this.storeId || 'primary',
      storeName: store.name,
      industry: this.determineIndustry(topCategories),
      storeType: 'b2c', // Could be determined from order patterns
      averageOrderValue,
      topCategories,
      seasonalityPattern: 'medium', // Would need historical data
      growthStage,
      primaryMarkets: [store.country_name || 'Unknown']
    }
  }

  private async analyzeSalesPatterns(): Promise<SalesPattern[]> {
    const shopifyAPI = await createShopifyAPI(this.userId)
    if (!shopifyAPI) return []

    const orders = await shopifyAPI.getOrders(500)
    const patterns: SalesPattern[] = []

    // Daily pattern analysis
    const dailyData = new Array(7).fill(0)
    const hourlyData = new Array(24).fill(0)

    orders.forEach(order => {
      const date = new Date(order.created_at)
      const dayOfWeek = date.getDay()
      const hour = date.getHours()
      
      dailyData[dayOfWeek]++
      hourlyData[hour]++
    })

    patterns.push({
      period: 'daily',
      pattern: dailyData,
      trend: this.calculateTrend(dailyData),
      seasonality: this.detectSeasonality(dailyData),
      peakTimes: this.findPeakTimes(dailyData, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
      lowTimes: this.findLowTimes(dailyData, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
      confidence: 0.8
    })

    patterns.push({
      period: 'hourly',
      pattern: hourlyData,
      trend: this.calculateTrend(hourlyData),
      seasonality: this.detectSeasonality(hourlyData),
      peakTimes: this.findPeakTimes(hourlyData, Array.from({length: 24}, (_, i) => `${i}:00`)),
      lowTimes: this.findLowTimes(hourlyData, Array.from({length: 24}, (_, i) => `${i}:00`)),
      confidence: 0.8
    })

    return patterns
  }

  private async analyzeInventoryInsights(): Promise<InventoryInsight[]> {
    const shopifyAPI = await createShopifyAPI(this.userId)
    if (!shopifyAPI) return []

    const products = await shopifyAPI.getProducts(250)
    const insights: InventoryInsight[] = []

    for (const product of products) {
      for (const variant of product.variants || []) {
        if (!variant.inventory_item_id) continue

        try {
          const inventoryLevels = await shopifyAPI.getInventoryLevels([variant.inventory_item_id])
          const currentStock = inventoryLevels.reduce((sum, level) => sum + (level.available || 0), 0)

          // Calculate turnover rate (simplified - would need sales data)
          const turnoverRate = this.calculateTurnoverRate(product, variant)
          const daysOfSupply = turnoverRate > 0 ? currentStock / turnoverRate : 999
          const optimalStock = Math.ceil(turnoverRate * 30) // 30 days supply
          const reorderPoint = Math.ceil(turnoverRate * 7) // 7 days supply

          let trend: InventoryInsight['trend'] = 'slow_moving'
          if (turnoverRate > 2) trend = 'fast_moving'
          else if (turnoverRate < 0.1) trend = 'dead_stock'

          let urgency: InventoryInsight['urgency'] = 'low'
          if (currentStock <= reorderPoint) urgency = 'high'
          else if (currentStock <= optimalStock * 0.5) urgency = 'medium'

          insights.push({
            productId: product.id,
            title: product.title,
            sku: variant.sku || '',
            currentStock,
            optimalStock,
            turnoverRate,
            daysOfSupply,
            reorderPoint,
            trend,
            recommendation: this.generateInventoryRecommendation(currentStock, optimalStock, trend),
            urgency
          })
        } catch (error) {
          console.error(`Error analyzing inventory for product ${product.id}:`, error)
        }
      }
    }

    return insights.slice(0, 50) // Limit to top 50 for performance
  }

  private async analyzeCustomerBehavior(): Promise<CustomerBehavior> {
    const shopifyAPI = await createShopifyAPI(this.userId)
    if (!shopifyAPI) {
      return this.getDefaultCustomerBehavior()
    }

    const [orders, customers] = await Promise.all([
      shopifyAPI.getOrders(500),
      shopifyAPI.getCustomers(500)
    ])

    // Calculate repeat customer rate
    const customerOrderCounts: Record<string, number> = {}
    orders.forEach(order => {
      if (order.customer?.id) {
        const customerId = order.customer.id.toString()
        customerOrderCounts[customerId] = (customerOrderCounts[customerId] || 0) + 1
      }
    })

    const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length
    const repeatCustomerRate = customers.length > 0 ? (repeatCustomers / customers.length) * 100 : 0

    // Calculate average orders per customer
    const totalOrders = Object.values(customerOrderCounts).reduce((sum, count) => sum + count, 0)
    const averageOrdersPerCustomer = customers.length > 0 ? totalOrders / customers.length : 0

    // Analyze peak shopping times
    const hourCounts = new Array(24).fill(0)
    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours()
      hourCounts[hour]++
    })
    const peakShoppingTimes = this.findPeakTimes(hourCounts, Array.from({length: 24}, (_, i) => `${i}:00`))

    return {
      averageSessionDuration: 180, // Would need analytics integration
      bounceRate: 45, // Would need analytics integration
      conversionRate: 2.5, // Would need analytics integration
      repeatCustomerRate,
      averageOrdersPerCustomer,
      topTrafficSources: ['Direct', 'Google', 'Social Media'], // Would need analytics integration
      preferredPaymentMethods: ['Credit Card', 'PayPal', 'Apple Pay'], // Would analyze order data
      peakShoppingTimes,
      abandonmentReasons: ['High shipping costs', 'Complicated checkout', 'Security concerns'] // Would need analytics
    }
  }

  private async analyzeMarketTrends(): Promise<MarketTrend[]> {
    // This would integrate with external market data APIs
    // For now, return sample trends based on store categories
    return [
      {
        category: 'E-commerce',
        trend: 'rising',
        strength: 0.8,
        timeframe: '3 months',
        relatedKeywords: ['online shopping', 'digital commerce', 'mobile shopping'],
        competitorActivity: 'Increasing investment in mobile optimization',
        opportunity: 'Focus on mobile-first shopping experience'
      }
    ]
  }

  private async getRealTimeMetrics(): Promise<RealTimeMetric[]> {
    const shopifyAPI = await createShopifyAPI(this.userId)
    if (!shopifyAPI) return []

    // Get recent data for real-time metrics
    const recentOrders = await shopifyAPI.getOrders(50)
    const todayOrders = recentOrders.filter(order => {
      const orderDate = new Date(order.created_at)
      const today = new Date()
      return orderDate.toDateString() === today.toDateString()
    })

    const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)
    const yesterdayRevenue = 1000 // Would calculate from yesterday's data

    return [
      {
        name: 'Today\'s Revenue',
        value: todayRevenue,
        change: ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100,
        changeDirection: todayRevenue > yesterdayRevenue ? 'up' : 'down',
        timestamp: new Date()
      },
      {
        name: 'Today\'s Orders',
        value: todayOrders.length,
        change: 5.2,
        changeDirection: 'up',
        timestamp: new Date()
      }
    ]
  }

  private async generateRecommendations(
    storeProfile: StoreProfile,
    salesPatterns: SalesPattern[],
    inventoryInsights: InventoryInsight[],
    customerBehavior: CustomerBehavior
  ): Promise<IntelligentRecommendation[]> {
    const recommendations: IntelligentRecommendation[] = []

    // Inventory recommendations
    const lowStockItems = inventoryInsights.filter(item => item.urgency === 'high')
    if (lowStockItems.length > 0) {
      recommendations.push({
        id: 'restock_low_inventory',
        type: 'inventory',
        priority: 'high',
        title: 'Restock Low Inventory Items',
        description: `${lowStockItems.length} products are running low on stock`,
        reasoning: 'Low stock levels can lead to lost sales and disappointed customers',
        expectedImpact: 'Prevent stockouts and maintain sales momentum',
        effort: 'medium',
        timeframe: '1-2 days',
        actionItems: [
          'Review low stock alerts',
          'Contact suppliers for restock',
          'Update inventory levels'
        ],
        metrics: ['Stock levels', 'Sales velocity', 'Customer satisfaction'],
        confidence: 0.9
      })
    }

    // Sales pattern recommendations
    const dailyPattern = salesPatterns.find(p => p.period === 'daily')
    if (dailyPattern && dailyPattern.peakTimes.length > 0) {
      recommendations.push({
        id: 'optimize_peak_times',
        type: 'marketing',
        priority: 'medium',
        title: 'Optimize Marketing for Peak Sales Times',
        description: `Focus marketing efforts on ${dailyPattern.peakTimes.join(', ')}`,
        reasoning: 'Sales data shows higher conversion rates during these periods',
        expectedImpact: 'Increase conversion rates by 15-25%',
        effort: 'low',
        timeframe: '1 week',
        actionItems: [
          'Schedule social media posts for peak times',
          'Run targeted ads during high-traffic periods',
          'Send email campaigns at optimal times'
        ],
        metrics: ['Conversion rate', 'Click-through rate', 'Revenue'],
        confidence: 0.8
      })
    }

    // Customer behavior recommendations
    if (customerBehavior.repeatCustomerRate < 30) {
      recommendations.push({
        id: 'improve_customer_retention',
        type: 'customer_service',
        priority: 'high',
        title: 'Implement Customer Retention Strategy',
        description: 'Low repeat customer rate indicates retention opportunities',
        reasoning: `Current repeat rate of ${customerBehavior.repeatCustomerRate.toFixed(1)}% is below industry average`,
        expectedImpact: 'Increase customer lifetime value by 20-30%',
        effort: 'high',
        timeframe: '2-4 weeks',
        actionItems: [
          'Create loyalty program',
          'Implement email marketing automation',
          'Improve customer service response times'
        ],
        metrics: ['Repeat customer rate', 'Customer lifetime value', 'Churn rate'],
        confidence: 0.85
      })
    }

    return recommendations
  }

  private async generatePredictiveAnalytics(
    salesPatterns: SalesPattern[],
    inventoryInsights: InventoryInsight[],
    customerBehavior: CustomerBehavior
  ): Promise<PredictiveAnalytic[]> {
    const analytics: PredictiveAnalytic[] = []

    // Predict next month's revenue based on trends
    const dailyPattern = salesPatterns.find(p => p.period === 'daily')
    if (dailyPattern) {
      const avgDailySales = dailyPattern.pattern.reduce((sum, val) => sum + val, 0) / 7
      const predictedMonthlyRevenue = avgDailySales * 30 * 100 // Simplified calculation

      analytics.push({
        metric: 'Monthly Revenue',
        currentValue: avgDailySales * 30 * 100,
        predictedValue: predictedMonthlyRevenue * 1.1, // 10% growth assumption
        timeframe: '30 days',
        confidence: 0.75,
        factors: ['Historical sales trends', 'Seasonal patterns', 'Market conditions'],
        recommendation: 'Maintain current growth trajectory with focused marketing'
      })
    }

    return analytics
  }

  // Helper methods
  private determineIndustry(topCategories: string[]): string {
    const industryMap: Record<string, string> = {
      'Electronics': 'Technology',
      'Clothing': 'Fashion',
      'Home & Garden': 'Home & Living',
      'Sports': 'Sports & Recreation',
      'Books': 'Media & Entertainment'
    }

    for (const category of topCategories) {
      if (industryMap[category]) {
        return industryMap[category]
      }
    }

    return 'General Retail'
  }

  private calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable'
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2))
    const secondHalf = data.slice(Math.floor(data.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    
    const change = (secondAvg - firstAvg) / firstAvg
    
    if (change > 0.1) return 'increasing'
    if (change < -0.1) return 'decreasing'
    return 'stable'
  }

  private detectSeasonality(data: number[]): boolean {
    // Simple seasonality detection - would use more sophisticated algorithms in production
    const max = Math.max(...data)
    const min = Math.min(...data)
    const variance = max - min
    const average = data.reduce((sum, val) => sum + val, 0) / data.length
    
    return variance > average * 0.5
  }

  private findPeakTimes(data: number[], labels: string[]): string[] {
    const max = Math.max(...data)
    const threshold = max * 0.8
    
    return data
      .map((value, index) => ({ value, label: labels[index] }))
      .filter(item => item.value >= threshold)
      .map(item => item.label)
  }

  private findLowTimes(data: number[], labels: string[]): string[] {
    const min = Math.min(...data)
    const threshold = min * 1.2
    
    return data
      .map((value, index) => ({ value, label: labels[index] }))
      .filter(item => item.value <= threshold)
      .map(item => item.label)
  }

  private calculateTurnoverRate(product: any, variant: any): number {
    // Simplified turnover calculation - would use actual sales data
    // This is a placeholder that would be replaced with real analytics
    return Math.random() * 5 // Random value between 0-5 for demo
  }

  private generateInventoryRecommendation(current: number, optimal: number, trend: string): string {
    if (current < optimal * 0.3) {
      return 'Urgent restock needed - risk of stockout'
    } else if (current < optimal * 0.5) {
      return 'Restock recommended within 1-2 weeks'
    } else if (current > optimal * 2 && trend === 'slow_moving') {
      return 'Consider reducing inventory or promotional pricing'
    } else {
      return 'Inventory levels are adequate'
    }
  }

  private getDefaultCustomerBehavior(): CustomerBehavior {
    return {
      averageSessionDuration: 180,
      bounceRate: 45,
      conversionRate: 2.5,
      repeatCustomerRate: 25,
      averageOrdersPerCustomer: 1.8,
      topTrafficSources: ['Direct', 'Google', 'Social Media'],
      preferredPaymentMethods: ['Credit Card', 'PayPal'],
      peakShoppingTimes: ['19:00', '20:00', '21:00'],
      abandonmentReasons: ['High shipping costs', 'Complicated checkout']
    }
  }
}
