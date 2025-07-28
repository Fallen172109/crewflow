// Intelligent Routing System for Shopify Management Requests
// Analyzes user requests and routes them to appropriate handlers with context-aware responses

import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { UploadedFile } from '@/components/ui/FileUpload'

export interface ShopifyRequest {
  message: string
  attachments?: UploadedFile[]
  storeId: string
  userId: string
  context?: string
}

export interface RoutingResult {
  requestType: ShopifyRequestType
  confidence: number
  suggestedActions: string[]
  requiredPermissions: string[]
  contextualInfo: any
  handler: string
}

export type ShopifyRequestType = 
  | 'product_creation'
  | 'product_management'
  | 'inventory_management'
  | 'order_processing'
  | 'customer_service'
  | 'analytics_reporting'
  | 'marketing_optimization'
  | 'store_configuration'
  | 'financial_analysis'
  | 'general_inquiry'

export interface RequestPattern {
  type: ShopifyRequestType
  keywords: string[]
  phrases: string[]
  attachmentTypes?: string[]
  confidence: number
  permissions: string[]
  handler: string
}

// Define request patterns for intelligent routing
const REQUEST_PATTERNS: RequestPattern[] = [
  {
    type: 'product_creation',
    keywords: ['create', 'add', 'new', 'product', 'listing', 'upload', 'generate', 'turn', 'make', 'publish', 'store'],
    phrases: ['create product', 'add product', 'new listing', 'product from image', 'turn this into a product', 'turn into a product', 'make this a product', 'upload to store', 'add to store', 'publish to store', 'create listing'],
    attachmentTypes: ['image/*'],
    confidence: 0.9,
    permissions: ['write_products'],
    handler: 'product-creation'
  },
  {
    type: 'product_management',
    keywords: ['edit', 'update', 'modify', 'change', 'product', 'listing', 'description', 'price'],
    phrases: ['edit product', 'update listing', 'change price', 'modify description'],
    confidence: 0.85,
    permissions: ['write_products'],
    handler: 'product-management'
  },
  {
    type: 'inventory_management',
    keywords: ['inventory', 'stock', 'quantity', 'reorder', 'low stock', 'out of stock'],
    phrases: ['check inventory', 'stock levels', 'reorder point', 'inventory alert'],
    confidence: 0.8,
    permissions: ['read_inventory', 'write_inventory'],
    handler: 'inventory-management'
  },
  {
    type: 'order_processing',
    keywords: ['order', 'fulfillment', 'shipping', 'delivery', 'tracking', 'refund', 'return'],
    phrases: ['process order', 'fulfill order', 'shipping status', 'track order'],
    confidence: 0.85,
    permissions: ['read_orders', 'write_orders'],
    handler: 'order-processing'
  },
  {
    type: 'customer_service',
    keywords: ['customer', 'support', 'inquiry', 'complaint', 'review', 'feedback'],
    phrases: ['customer inquiry', 'support ticket', 'customer complaint', 'review response'],
    confidence: 0.8,
    permissions: ['read_customers', 'write_customers'],
    handler: 'customer-service'
  },
  {
    type: 'analytics_reporting',
    keywords: ['analytics', 'report', 'sales', 'performance', 'metrics', 'dashboard', 'stats'],
    phrases: ['sales report', 'performance metrics', 'analytics dashboard', 'conversion rate'],
    confidence: 0.75,
    permissions: ['read_analytics'],
    handler: 'analytics-reporting'
  },
  {
    type: 'marketing_optimization',
    keywords: ['marketing', 'seo', 'promotion', 'campaign', 'social', 'advertising', 'optimize'],
    phrases: ['marketing campaign', 'seo optimization', 'social media', 'ad campaign'],
    confidence: 0.7,
    permissions: ['read_products', 'write_products'],
    handler: 'marketing-optimization'
  },
  {
    type: 'store_configuration',
    keywords: ['settings', 'configuration', 'theme', 'payment', 'shipping', 'taxes', 'setup'],
    phrases: ['store settings', 'payment setup', 'shipping configuration', 'tax settings'],
    confidence: 0.8,
    permissions: ['read_themes', 'write_themes'],
    handler: 'store-configuration'
  },
  {
    type: 'financial_analysis',
    keywords: ['revenue', 'profit', 'cost', 'financial', 'accounting', 'tax', 'expense'],
    phrases: ['revenue analysis', 'profit margins', 'financial report', 'cost analysis'],
    confidence: 0.75,
    permissions: ['read_orders', 'read_analytics'],
    handler: 'financial-analysis'
  }
]

export class ShopifyIntelligentRouter {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async analyzeRequest(request: ShopifyRequest): Promise<RoutingResult> {
    const { message, attachments = [], storeId } = request
    const lowerMessage = message.toLowerCase()

    // Calculate confidence scores for each pattern
    const scores = REQUEST_PATTERNS.map(pattern => {
      let score = 0
      let matchCount = 0

      // Check keywords
      pattern.keywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) {
          score += 1
          matchCount++
        }
      })

      // Check phrases (higher weight)
      pattern.phrases.forEach(phrase => {
        if (lowerMessage.includes(phrase)) {
          score += 2
          matchCount++
        }
      })

      // Check attachment types
      if (pattern.attachmentTypes && attachments.length > 0) {
        attachments.forEach(attachment => {
          pattern.attachmentTypes!.forEach(type => {
            if (attachment.fileType && attachment.fileType.match(type)) {
              score += 1.5
              matchCount++
            }
          })
        })
      }

      // Normalize score
      const normalizedScore = matchCount > 0 ? (score / (pattern.keywords.length + pattern.phrases.length)) * pattern.confidence : 0

      return {
        pattern,
        score: normalizedScore,
        matchCount
      }
    })

    // Find the best match
    const bestMatch = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    )

    // If no good match found, default to general inquiry
    if (bestMatch.score < 0.3) {
      return {
        requestType: 'general_inquiry',
        confidence: 0.5,
        suggestedActions: ['Provide general assistance', 'Ask clarifying questions'],
        requiredPermissions: [],
        contextualInfo: {},
        handler: 'general-inquiry'
      }
    }

    // Get contextual information based on request type
    const contextualInfo = await this.getContextualInfo(bestMatch.pattern.type, storeId)

    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(bestMatch.pattern.type, message, contextualInfo)

    return {
      requestType: bestMatch.pattern.type,
      confidence: bestMatch.score,
      suggestedActions,
      requiredPermissions: bestMatch.pattern.permissions,
      contextualInfo,
      handler: bestMatch.pattern.handler
    }
  }

  private async getContextualInfo(requestType: ShopifyRequestType, storeId: string): Promise<any> {
    try {
      const shopifyAPI = await createShopifyAPI(this.userId)
      if (!shopifyAPI) return {}

      switch (requestType) {
        case 'product_creation':
        case 'product_management':
          const products = await shopifyAPI.getProducts(5)
          return {
            recentProducts: products.slice(0, 3),
            totalProducts: products.length
          }

        case 'inventory_management':
          const inventoryProducts = await shopifyAPI.getProducts(10)
          const lowStockProducts = inventoryProducts.filter(p => 
            p.variants?.some(v => (v.inventory_quantity || 0) < 10)
          )
          return {
            lowStockProducts: lowStockProducts.slice(0, 5),
            totalProducts: inventoryProducts.length
          }

        case 'order_processing':
          const orders = await shopifyAPI.getOrders(10)
          const pendingOrders = orders.filter(o => o.fulfillment_status !== 'fulfilled')
          return {
            pendingOrders: pendingOrders.slice(0, 5),
            totalOrders: orders.length
          }

        case 'customer_service':
          const customers = await shopifyAPI.getCustomers(5)
          return {
            recentCustomers: customers.slice(0, 3),
            totalCustomers: customers.length
          }

        case 'analytics_reporting':
          const analyticsProducts = await shopifyAPI.getProducts(5)
          const analyticsOrders = await shopifyAPI.getOrders(10)
          return {
            productCount: analyticsProducts.length,
            orderCount: analyticsOrders.length,
            recentOrders: analyticsOrders.slice(0, 3)
          }

        default:
          return {}
      }
    } catch (error) {
      console.error('Error getting contextual info:', error)
      return {}
    }
  }

  private generateSuggestedActions(requestType: ShopifyRequestType, message: string, contextualInfo: any): string[] {
    const actions: string[] = []

    switch (requestType) {
      case 'product_creation':
        actions.push('Upload product images for AI analysis')
        actions.push('Generate product title and description')
        actions.push('Set competitive pricing')
        actions.push('Create product variants if needed')
        actions.push('Optimize for SEO and discoverability')
        break

      case 'product_management':
        actions.push('Review current product performance')
        actions.push('Update product descriptions and images')
        actions.push('Adjust pricing based on market trends')
        actions.push('Optimize SEO keywords and tags')
        actions.push('Create or modify product variants')
        break

      case 'inventory_management':
        if (contextualInfo.lowStockProducts?.length > 0) {
          actions.push(`Address ${contextualInfo.lowStockProducts.length} low stock products`)
        }
        actions.push('Set up inventory alerts and reorder points')
        actions.push('Analyze inventory turnover rates')
        actions.push('Plan for seasonal demand changes')
        actions.push('Optimize inventory levels to reduce costs')
        break

      case 'order_processing':
        if (contextualInfo.pendingOrders?.length > 0) {
          actions.push(`Process ${contextualInfo.pendingOrders.length} pending orders`)
        }
        actions.push('Update order fulfillment status')
        actions.push('Generate shipping labels and tracking')
        actions.push('Handle returns and exchanges')
        actions.push('Send order confirmation emails')
        break

      case 'customer_service':
        actions.push('Respond to customer inquiries promptly')
        actions.push('Resolve customer complaints professionally')
        actions.push('Update customer profiles and preferences')
        actions.push('Create customer satisfaction surveys')
        actions.push('Implement loyalty program strategies')
        break

      case 'analytics_reporting':
        actions.push('Generate sales performance reports')
        actions.push('Analyze conversion rates and traffic')
        actions.push('Review top-performing products')
        actions.push('Identify growth opportunities')
        actions.push('Create custom dashboard views')
        break

      case 'marketing_optimization':
        actions.push('Optimize product listings for SEO')
        actions.push('Create social media marketing campaigns')
        actions.push('Set up email marketing automation')
        actions.push('Analyze competitor strategies')
        actions.push('Implement conversion rate optimization')
        break

      case 'store_configuration':
        actions.push('Review and update store settings')
        actions.push('Configure payment and shipping options')
        actions.push('Customize store theme and branding')
        actions.push('Set up tax and legal compliance')
        actions.push('Optimize checkout process')
        break

      case 'financial_analysis':
        actions.push('Calculate profit margins by product')
        actions.push('Analyze revenue trends and patterns')
        actions.push('Review cost structures and expenses')
        actions.push('Generate financial reports for accounting')
        actions.push('Plan budget allocation and investments')
        break

      default:
        actions.push('Provide general Shopify assistance')
        actions.push('Answer questions about store management')
        actions.push('Suggest best practices and optimizations')
        break
    }

    return actions
  }
}

// Factory function to create router instance
export function createShopifyIntelligentRouter(userId: string): ShopifyIntelligentRouter {
  return new ShopifyIntelligentRouter(userId)
}

// Utility function for quick request analysis
export async function analyzeShopifyRequest(request: ShopifyRequest): Promise<RoutingResult> {
  const router = createShopifyIntelligentRouter(request.userId)
  return router.analyzeRequest(request)
}
