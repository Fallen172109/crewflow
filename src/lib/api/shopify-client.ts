// Shopify API Client for Frontend
// Handles authenticated API calls to CrewFlow's Shopify endpoints

import { createSupabaseClient } from '@/lib/supabase/client'
import { adminBase } from '@/lib/shopify/constants'

export interface ShopifyApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Make authenticated API call to CrewFlow's Shopify endpoints
 */
export async function shopifyApiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ShopifyApiResponse<T>> {
  try {
    const supabase = createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Authentication required')
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data

  } catch (error) {
    console.error('Shopify API call failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Fetch products from a specific store
 */
export async function fetchProducts(storeId: string, options: {
  limit?: number
  page?: number
  status?: string
} = {}) {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', options.limit.toString())
  if (options.page) params.set('page', options.page.toString())
  if (options.status && options.status !== 'all') params.set('status', options.status)

  const endpoint = `/api/shopify/stores/${storeId}/products?${params.toString()}`
  return shopifyApiCall(endpoint)
}

/**
 * Fetch orders from a specific store
 */
export async function fetchOrders(storeId: string, options: {
  limit?: number
  status?: string
} = {}) {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', options.limit.toString())
  if (options.status && options.status !== 'all') params.set('status', options.status)

  const endpoint = `/api/shopify/stores/${storeId}/orders?${params.toString()}`
  return shopifyApiCall(endpoint)
}

/**
 * Fetch customers from a specific store
 */
export async function fetchCustomers(storeId: string, options: {
  limit?: number
} = {}) {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', options.limit.toString())

  const endpoint = `/api/shopify/stores/${storeId}/customers?${params.toString()}`
  return shopifyApiCall(endpoint)
}

/**
 * Create a new product
 */
export async function createProduct(storeId: string, productData: any) {
  const endpoint = `/api/shopify/stores/${storeId}/products`
  return shopifyApiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(productData)
  })
}

/**
 * Update an existing product
 */
export async function updateProduct(storeId: string, productId: string, productData: any) {
  const endpoint = `/api/shopify/stores/${storeId}/products/${productId}`
  return shopifyApiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(productData)
  })
}

/**
 * Delete a product
 */
export async function deleteProduct(storeId: string, productId: string) {
  const endpoint = `/api/shopify/stores/${storeId}/products/${productId}`
  return shopifyApiCall(endpoint, {
    method: 'DELETE'
  })
}

/**
 * Direct REST API call to Shopify (for testing/diagnostics)
 * Creates a product directly via Shopify REST API
 */
export async function createProductREST(shopDomain: string, accessToken: string, product: any) {
  const res = await fetch(`${adminBase(shopDomain)}/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ product }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Shopify createProduct failed ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Direct REST API call to get shop info (for testing/diagnostics)
 */
export async function getShopInfoREST(shopDomain: string, accessToken: string) {
  const res = await fetch(`${adminBase(shopDomain)}/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Shopify getShopInfo failed ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Direct REST API call to get products (for testing/diagnostics)
 */
export async function getProductsREST(shopDomain: string, accessToken: string, limit: number = 1) {
  const res = await fetch(`${adminBase(shopDomain)}/products.json?limit=${limit}`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Shopify getProducts failed ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Direct REST API call to delete a product (for testing/diagnostics)
 */
export async function deleteProductREST(shopDomain: string, accessToken: string, productId: number) {
  const res = await fetch(`${adminBase(shopDomain)}/products/${productId}.json`, {
    method: 'DELETE',
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Shopify deleteProduct failed ${res.status}: ${text}`);
  }

  // DELETE requests typically return 200 with empty body or 204 with no content
  if (res.status === 204) {
    return { success: true };
  }
  return res.json();
}

/**
 * Fetch store analytics
 */
export async function fetchStoreAnalytics(storeId: string, period: string = '30d') {
  const endpoint = `/api/shopify/stores/${storeId}/analytics?period=${period}`
  return shopifyApiCall(endpoint)
}
