// Shopify Admin API Integration Layer
// Enables AI agents to autonomously manage Shopify stores, products, orders, and customers

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OAuthSecurityManager } from '@/lib/integrations/security'
import {
  ShopifyStore,
  ShopifyProduct,
  ShopifyProductVariant,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyAddress,
  ShopifyInventoryLevel,
  ShopifyFulfillment,
  ShopifyWebhook,
  ShopifyRateLimit,
  ShopifyApiResponse,
  ShopifyPaginatedResponse
} from './shopify-types'

// Re-export commonly used types for convenience
export type {
  ShopifyStore,
  ShopifyProduct,
  ShopifyProductVariant,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyAddress,
  ShopifyInventoryLevel,
  ShopifyFulfillment,
  ShopifyWebhook,
  ShopifyRateLimit as RateLimitInfo
} from './shopify-types'

export class ShopifyAdminAPI {
  private baseUrl: string
  private userId: string
  private accessToken: string | null = null
  private shopDomain: string | null = null
  private rateLimitInfo: ShopifyRateLimit | null = null
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessingQueue = false

  constructor(userId: string) {
    this.userId = userId
    this.baseUrl = '' // Will be set when shop domain is loaded
  }

  // Initialize the API client with user's Shopify credentials
  async initialize(shopDomain?: string): Promise<boolean> {
    try {
      const supabase = createSupabaseServerClient()
      const securityManager = new OAuthSecurityManager()

      let query = supabase
        .from('api_connections')
        .select('access_token, api_key_encrypted, shop_domain, status')
        .eq('user_id', this.userId)
        .eq('integration_id', 'shopify')
        .eq('status', 'connected')

      // If shop domain is provided, filter by it, otherwise get the first active connection
      if (shopDomain) {
        query = query.eq('shop_domain', shopDomain)
      }

      const { data: connection } = await query.single()

      if (!connection) {
        console.warn('No Shopify connection found for user:', this.userId)
        return false
      }

      // Decrypt the access token (prefer api_key_encrypted, fallback to access_token)
      const encryptedToken = connection.api_key_encrypted || connection.access_token
      if (!encryptedToken) {
        console.warn('No Shopify access token found for user:', this.userId)
        return false
      }

      let accessToken: string
      try {
        accessToken = securityManager.decrypt(encryptedToken)
      } catch (decryptError) {
        console.error('Failed to decrypt access token:', decryptError)
        return false
      }

      // Use the decrypted access token
      this.shopDomain = connection.shop_domain
      this.accessToken = accessToken

      if (this.shopDomain) {
        this.baseUrl = `https://${this.shopDomain}/admin/api/2024-01`
      }

      return true
    } catch (error) {
      console.error('Failed to initialize Shopify API:', error)
      return false
    }
  }

  // Make authenticated API request to Shopify with rate limiting
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken || !this.baseUrl) {
      throw new Error('Shopify API not initialized. Call initialize() first.')
    }

    // Check rate limits before making request
    if (this.rateLimitInfo && this.rateLimitInfo.callsRemaining <= 1) {
      console.warn('Approaching Shopify API rate limit, queuing request')
      return this.queueRequest(() => this.makeRequestInternal(endpoint, options))
    }

    return this.makeRequestInternal(endpoint, options)
  }

  // Internal method to make the actual request
  private async makeRequestInternal(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'X-Shopify-Access-Token': this.accessToken!,
      'Content-Type': 'application/json',
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      // Update rate limit info from response headers
      this.updateRateLimitInfo(response)

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2')
        console.warn(`Shopify API rate limited, retrying after ${retryAfter} seconds`)

        if (retryCount < 3) {
          await this.sleep(retryAfter * 1000)
          return this.makeRequestInternal(endpoint, options, retryCount + 1)
        } else {
          throw new Error('Max retry attempts reached for rate limited request')
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Shopify API error: ${response.status} ${response.statusText}`

        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.errors) {
            errorMessage += ` - ${JSON.stringify(errorJson.errors)}`
          }
        } catch {
          errorMessage += ` - ${errorText}`
        }

        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      console.error('Shopify API request failed:', error)
      throw error
    }
  }

  // Update rate limit information from response headers
  private updateRateLimitInfo(response: Response): void {
    const callLimit = response.headers.get('X-Shopify-Shop-Api-Call-Limit')

    if (callLimit) {
      const [used, limit] = callLimit.split('/').map(Number)
      this.rateLimitInfo = {
        callLimit: limit,
        callsRemaining: limit - used
      }
    }
  }

  // Queue requests when approaching rate limits
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  // Process queued requests with appropriate delays
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        try {
          await request()
          // Add small delay between requests to avoid hitting limits
          await this.sleep(250) // 250ms delay = ~4 requests per second (well under 40/sec limit)
        } catch (error) {
          console.error('Queued request failed:', error)
        }
      }
    }

    this.isProcessingQueue = false
  }

  // Utility method for delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get current rate limit status
  public getRateLimitInfo(): ShopifyRateLimit | null {
    return this.rateLimitInfo
  }

  // Get shop information
  async getShop(): Promise<ShopifyStore> {
    const response = await this.makeRequest('/shop.json')
    return response.shop
  }

  // Product management
  async getProducts(limit: number = 50): Promise<ShopifyProduct[]> {
    const response = await this.makeRequest(`/products.json?limit=${limit}`)
    return response.products
  }

  async getProduct(productId: number): Promise<ShopifyProduct> {
    const response = await this.makeRequest(`/products/${productId}.json`)
    return response.product
  }

  async createProduct(product: ShopifyProduct): Promise<ShopifyProduct> {
    const response = await this.makeRequest('/products.json', {
      method: 'POST',
      body: JSON.stringify({ product })
    })
    return response.product
  }

  async updateProduct(productId: number, product: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const response = await this.makeRequest(`/products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product })
    })
    return response.product
  }

  // Order management
  async getOrders(limit: number = 50, status: string = 'any'): Promise<ShopifyOrder[]> {
    const response = await this.makeRequest(`/orders.json?limit=${limit}&status=${status}`)
    return response.orders
  }

  async getOrder(orderId: number): Promise<ShopifyOrder> {
    const response = await this.makeRequest(`/orders/${orderId}.json`)
    return response.order
  }

  // Customer management
  async getCustomers(limit: number = 50): Promise<ShopifyCustomer[]> {
    const response = await this.makeRequest(`/customers.json?limit=${limit}`)
    return response.customers
  }

  async getCustomer(customerId: number): Promise<ShopifyCustomer> {
    const response = await this.makeRequest(`/customers/${customerId}.json`)
    return response.customer
  }

  async createCustomer(customer: ShopifyCustomer): Promise<ShopifyCustomer> {
    const response = await this.makeRequest('/customers.json', {
      method: 'POST',
      body: JSON.stringify({ customer })
    })
    return response.customer
  }

  async updateCustomer(customerId: number, customer: Partial<ShopifyCustomer>): Promise<ShopifyCustomer> {
    const response = await this.makeRequest(`/customers/${customerId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ customer })
    })
    return response.customer
  }

  // Inventory management
  async getInventoryLevels(inventoryItemIds?: number[], locationIds?: number[]): Promise<ShopifyInventoryLevel[]> {
    let endpoint = '/inventory_levels.json'
    const params = new URLSearchParams()

    if (inventoryItemIds?.length) {
      params.append('inventory_item_ids', inventoryItemIds.join(','))
    }
    if (locationIds?.length) {
      params.append('location_ids', locationIds.join(','))
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }

    const response = await this.makeRequest(endpoint)
    return response.inventory_levels
  }

  async updateInventoryLevel(inventoryItemId: number, locationId: number, available: number): Promise<ShopifyInventoryLevel> {
    const response = await this.makeRequest('/inventory_levels/set.json', {
      method: 'POST',
      body: JSON.stringify({
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available
      })
    })
    return response.inventory_level
  }

  // Fulfillment management
  async getFulfillments(orderId: number): Promise<ShopifyFulfillment[]> {
    const response = await this.makeRequest(`/orders/${orderId}/fulfillments.json`)
    return response.fulfillments
  }

  async createFulfillment(orderId: number, fulfillment: Partial<ShopifyFulfillment>): Promise<ShopifyFulfillment> {
    const response = await this.makeRequest(`/orders/${orderId}/fulfillments.json`, {
      method: 'POST',
      body: JSON.stringify({ fulfillment })
    })
    return response.fulfillment
  }

  // Webhook management
  async getWebhooks(): Promise<ShopifyWebhook[]> {
    const response = await this.makeRequest('/webhooks.json')
    return response.webhooks
  }

  async createWebhook(webhook: Omit<ShopifyWebhook, 'id' | 'created_at' | 'updated_at'>): Promise<ShopifyWebhook> {
    const response = await this.makeRequest('/webhooks.json', {
      method: 'POST',
      body: JSON.stringify({ webhook })
    })
    return response.webhook
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.makeRequest(`/webhooks/${webhookId}.json`, {
      method: 'DELETE'
    })
  }

  // Analytics and reports
  async getOrdersCount(status?: string): Promise<number> {
    let endpoint = '/orders/count.json'
    if (status) {
      endpoint += `?status=${status}`
    }
    const response = await this.makeRequest(endpoint)
    return response.count
  }

  async getProductsCount(): Promise<number> {
    const response = await this.makeRequest('/products/count.json')
    return response.count
  }

  async getCustomersCount(): Promise<number> {
    const response = await this.makeRequest('/customers/count.json')
    return response.count
  }

  // GraphQL support with rate limiting and error handling
  async makeGraphQLRequest(query: string, variables?: any, retryCount = 0): Promise<any> {
    if (!this.accessToken || !this.baseUrl) {
      throw new Error('Shopify API not initialized. Call initialize() first.')
    }

    // Check GraphQL-specific rate limits (cost-based)
    const estimatedCost = this.estimateGraphQLCost(query)
    if (estimatedCost > 1000) {
      console.warn('GraphQL query may exceed cost limits, consider breaking it down')
    }

    const graphqlUrl = `${this.baseUrl}/graphql.json`
    const headers = {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json'
    }

    try {
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables })
      })

      // Handle rate limiting for GraphQL
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2')
        console.warn(`Shopify GraphQL rate limited, retrying after ${retryAfter} seconds`)

        if (retryCount < 3) {
          await this.sleep(retryAfter * 1000)
          return this.makeGraphQLRequest(query, variables, retryCount + 1)
        } else {
          throw new Error('Max retry attempts reached for GraphQL rate limited request')
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Shopify GraphQL error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()

      // Handle GraphQL-specific errors
      if (result.errors) {
        const errorMessages = result.errors.map((err: any) => err.message).join(', ')
        throw new Error(`GraphQL errors: ${errorMessages}`)
      }

      // Check for throttling information in extensions
      if (result.extensions?.cost) {
        console.log(`GraphQL query cost: ${result.extensions.cost.actualQueryCost}/${result.extensions.cost.throttleStatus.maximumAvailable}`)
      }

      return result.data
    } catch (error) {
      console.error('Shopify GraphQL request failed:', error)
      throw error
    }
  }

  // Estimate GraphQL query cost (simplified)
  private estimateGraphQLCost(query: string): number {
    // Basic cost estimation based on query complexity
    const fieldCount = (query.match(/\w+\s*{/g) || []).length
    const connectionCount = (query.match(/edges|nodes/g) || []).length

    return fieldCount + (connectionCount * 2)
  }

  // Bulk operations using GraphQL
  async bulkUpdateProducts(products: Array<{ id: number; updates: Partial<ShopifyProduct> }>): Promise<any> {
    const mutations = products.map((product, index) => `
      product${index}: productUpdate(input: {
        id: "gid://shopify/Product/${product.id}"
        ${Object.entries(product.updates).map(([key, value]) =>
          `${key}: ${JSON.stringify(value)}`
        ).join('\n        ')}
      }) {
        product {
          id
          title
          status
        }
        userErrors {
          field
          message
        }
      }
    `).join('\n')

    const query = `
      mutation BulkUpdateProducts {
        ${mutations}
      }
    `

    return await this.makeGraphQLRequest(query)
  }

  // Advanced product search with GraphQL
  async searchProducts(searchQuery: string, limit: number = 50): Promise<any> {
    const query = `
      query SearchProducts($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              status
              productType
              vendor
              tags
              createdAt
              updatedAt
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `

    return await this.makeGraphQLRequest(query, {
      query: searchQuery,
      first: limit
    })
  }

  // Get comprehensive order data with GraphQL
  async getOrdersGraphQL(first: number = 50, query?: string): Promise<any> {
    const graphqlQuery = `
      query GetOrders($first: Int!, $query: String) {
        orders(first: $first, query: $query) {
          edges {
            node {
              id
              name
              email
              createdAt
              updatedAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              financialStatus
              fulfillmentStatus
              customer {
                id
                email
                firstName
                lastName
              }
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      title
                      sku
                      price
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `

    return await this.makeGraphQLRequest(graphqlQuery, { first, query })
  }

  // Get inventory levels across all locations
  async getInventoryLevelsGraphQL(productIds?: string[]): Promise<any> {
    const query = `
      query GetInventoryLevels($productIds: [ID!]) {
        products(first: 250, query: $productIds ? "id:${productIds.join(' OR id:')}" : "") {
          edges {
            node {
              id
              title
              variants(first: 100) {
                edges {
                  node {
                    id
                    sku
                    inventoryItem {
                      id
                      inventoryLevels(first: 10) {
                        edges {
                          node {
                            id
                            available
                            location {
                              id
                              name
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    return await this.makeGraphQLRequest(query, { productIds })
  }

  // Get customer analytics data
  async getCustomerAnalytics(customerId: string): Promise<any> {
    const query = `
      query GetCustomerAnalytics($customerId: ID!) {
        customer(id: $customerId) {
          id
          email
          firstName
          lastName
          createdAt
          updatedAt
          ordersCount
          totalSpent
          tags
          addresses {
            id
            address1
            city
            province
            country
            zip
          }
          orders(first: 50) {
            edges {
              node {
                id
                name
                createdAt
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                financialStatus
              }
            }
          }
        }
      }
    `

    return await this.makeGraphQLRequest(query, { customerId })
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getShop()
      return true
    } catch (error) {
      console.error('Shopify connection test failed:', error)
      return false
    }
  }
}

// Factory function to create Shopify API instance
export async function createShopifyAPI(userId: string, accessToken?: string, shopDomain?: string): Promise<ShopifyAdminAPI | null> {
  const api = new ShopifyAdminAPI(userId)

  // If access token and shop domain are provided directly, use them
  if (accessToken && shopDomain) {
    api['accessToken'] = accessToken
    api['shopDomain'] = shopDomain
    api['baseUrl'] = `https://${shopDomain}/admin/api/2024-01`
    return api
  }

  // Otherwise initialize from database
  const initialized = await api.initialize(shopDomain)

  if (!initialized) {
    return null
  }

  return api
}

// Helper function to validate Shopify webhook
export function validateShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body, 'utf8')
  const calculatedSignature = hmac.digest('base64')
  
  return calculatedSignature === signature
}
