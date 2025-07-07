// Shopify Agent Actions
// Handles Shopify operations that agents can perform through the API

import { executeShopifyCapability, getAgentShopifyCapabilities } from './shopify-capabilities'
import { createAutonomousActionManager } from './autonomous-actions'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

export interface ShopifyActionRequest {
  action: string
  params: any
  userId: string
  agentId: string
}

export interface ShopifyActionResponse {
  success: boolean
  data?: any
  error?: string
  tokensUsed?: number
  latency?: number
}

// Main handler for Shopify actions from agents
export async function handleShopifyAction(request: ShopifyActionRequest): Promise<ShopifyActionResponse> {
  const startTime = Date.now()
  
  try {
    const { action, params, userId, agentId } = request
    
    // Initialize Shopify API to verify connection
    const shopifyAPI = await createShopifyAPI(userId)
    if (!shopifyAPI) {
      return {
        success: false,
        error: 'Shopify integration not connected. Please connect your Shopify store first.',
        latency: Date.now() - startTime
      }
    }

    // Route to appropriate action handler
    let result
    switch (action) {
      case 'get_store_info':
        result = await handleGetStoreInfo(shopifyAPI, params)
        break
      
      case 'get_products':
        result = await handleGetProducts(shopifyAPI, params)
        break
      
      case 'get_orders':
        result = await handleGetOrders(shopifyAPI, params)
        break
      
      case 'get_customers':
        result = await handleGetCustomers(shopifyAPI, params)
        break
      
      case 'execute_capability':
        result = await handleExecuteCapability(agentId, userId, params)
        break
      
      case 'autonomous_action':
        result = await handleAutonomousAction(userId, agentId, params)
        break
      
      default:
        // Try to execute as a direct capability
        const capabilities = getAgentShopifyCapabilities(agentId)
        const capability = capabilities.find(cap => cap.id === action)
        
        if (capability) {
          result = await executeShopifyCapability(agentId, action, userId, params)
        } else {
          throw new Error(`Unknown Shopify action: ${action}`)
        }
    }

    return {
      success: true,
      data: result,
      latency: Date.now() - startTime
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return {
      success: false,
      error: errorMessage,
      latency: Date.now() - startTime
    }
  }
}

// Get basic store information
async function handleGetStoreInfo(shopifyAPI: any, params: any) {
  const store = await shopifyAPI.getShop()
  
  return {
    name: store.name,
    domain: store.domain,
    email: store.email,
    currency: store.currency,
    timezone: store.timezone,
    plan: store.plan_name,
    created_at: store.created_at
  }
}

// Get products with filtering and search
async function handleGetProducts(shopifyAPI: any, params: any) {
  const { 
    limit = 50, 
    search, 
    status, 
    vendor, 
    product_type,
    use_graphql = false 
  } = params
  
  if (use_graphql && search) {
    return await shopifyAPI.searchProducts(search, limit)
  } else {
    const products = await shopifyAPI.getProducts(limit)
    
    // Apply filters
    let filtered = products
    if (status) {
      filtered = filtered.filter((p: any) => p.status === status)
    }
    if (vendor) {
      filtered = filtered.filter((p: any) => p.vendor === vendor)
    }
    if (product_type) {
      filtered = filtered.filter((p: any) => p.product_type === product_type)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((p: any) => 
        p.title.toLowerCase().includes(searchLower) ||
        p.vendor.toLowerCase().includes(searchLower) ||
        p.tags.toLowerCase().includes(searchLower)
      )
    }
    
    return {
      products: filtered,
      total: filtered.length,
      filters_applied: { status, vendor, product_type, search }
    }
  }
}

// Get orders with filtering
async function handleGetOrders(shopifyAPI: any, params: any) {
  const { 
    limit = 50, 
    status = 'any',
    financial_status,
    fulfillment_status,
    use_graphql = false 
  } = params
  
  if (use_graphql) {
    const query = []
    if (financial_status) query.push(`financial_status:${financial_status}`)
    if (fulfillment_status) query.push(`fulfillment_status:${fulfillment_status}`)
    
    return await shopifyAPI.getOrdersGraphQL(limit, query.join(' AND '))
  } else {
    const orders = await shopifyAPI.getOrders(limit, status)
    
    // Apply additional filters
    let filtered = orders
    if (financial_status) {
      filtered = filtered.filter((o: any) => o.financial_status === financial_status)
    }
    if (fulfillment_status) {
      filtered = filtered.filter((o: any) => o.fulfillment_status === fulfillment_status)
    }
    
    return {
      orders: filtered,
      total: filtered.length,
      filters_applied: { status, financial_status, fulfillment_status }
    }
  }
}

// Get customers with filtering
async function handleGetCustomers(shopifyAPI: any, params: any) {
  const { limit = 50, search } = params
  
  const customers = await shopifyAPI.getCustomers(limit)
  
  if (search) {
    const searchLower = search.toLowerCase()
    const filtered = customers.filter((c: any) => 
      c.email.toLowerCase().includes(searchLower) ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchLower)
    )
    
    return {
      customers: filtered,
      total: filtered.length,
      search_applied: search
    }
  }
  
  return {
    customers,
    total: customers.length
  }
}

// Execute a specific agent capability
async function handleExecuteCapability(agentId: string, userId: string, params: any) {
  const { capability_id, ...capabilityParams } = params
  
  return await executeShopifyCapability(agentId, capability_id, userId, capabilityParams)
}

// Handle autonomous actions
async function handleAutonomousAction(userId: string, agentId: string, params: any) {
  const { action_type, action_data, schedule_for } = params
  
  const actionManager = createAutonomousActionManager(userId)
  
  if (schedule_for) {
    // Schedule for later execution
    const scheduledFor = new Date(schedule_for)
    return await actionManager.scheduleAction(agentId, 'shopify', action_type, action_data, scheduledFor)
  } else {
    // Execute immediately based on action type
    switch (action_type) {
      case 'product_create':
        return await actionManager.executeShopifyProductCreate(action_data, agentId)
      
      case 'product_update':
        return await actionManager.executeShopifyProductUpdate(action_data.productId, action_data.updates, agentId)
      
      case 'inventory_update':
        return await actionManager.executeShopifyInventoryUpdate(
          action_data.inventoryItemId, 
          action_data.locationId, 
          action_data.available, 
          agentId
        )
      
      case 'order_fulfill':
        return await actionManager.executeShopifyOrderFulfill(action_data.orderId, action_data.fulfillmentData, agentId)
      
      default:
        throw new Error(`Unknown autonomous action type: ${action_type}`)
    }
  }
}

// Helper function to get available actions for an agent
export function getAvailableShopifyActions(agentId: string): any[] {
  const capabilities = getAgentShopifyCapabilities(agentId)
  
  const baseActions = [
    {
      id: 'get_store_info',
      name: 'Get Store Information',
      description: 'Retrieve basic information about the connected Shopify store',
      category: 'information'
    },
    {
      id: 'get_products',
      name: 'Get Products',
      description: 'Retrieve and search products from the store',
      category: 'information'
    },
    {
      id: 'get_orders',
      name: 'Get Orders',
      description: 'Retrieve and filter orders from the store',
      category: 'information'
    },
    {
      id: 'get_customers',
      name: 'Get Customers',
      description: 'Retrieve and search customers from the store',
      category: 'information'
    }
  ]
  
  const capabilityActions = capabilities.map(cap => ({
    id: cap.id,
    name: cap.name,
    description: cap.description,
    category: cap.category,
    permissions: cap.permissions
  }))
  
  return [...baseActions, ...capabilityActions]
}

// Helper function to check if user has Shopify connected
export async function hasShopifyConnection(userId: string): Promise<boolean> {
  try {
    const shopifyAPI = await createShopifyAPI(userId)
    return shopifyAPI !== null
  } catch {
    return false
  }
}

// Helper function to get Shopify connection status
export async function getShopifyConnectionStatus(userId: string): Promise<any> {
  try {
    const shopifyAPI = await createShopifyAPI(userId)
    if (!shopifyAPI) {
      return {
        connected: false,
        error: 'No Shopify connection found'
      }
    }
    
    const isConnected = await shopifyAPI.testConnection()
    if (!isConnected) {
      return {
        connected: false,
        error: 'Shopify connection test failed'
      }
    }
    
    const store = await shopifyAPI.getShop()
    return {
      connected: true,
      store: {
        name: store.name,
        domain: store.domain,
        plan: store.plan_name
      }
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
