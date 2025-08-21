/**
 * Shopify API Constants
 * Centralized configuration for Shopify API version and base URLs
 * Prevents API version drift across the application
 */

// Get API version from environment or use default
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-07';

/**
 * Generate Shopify Admin API base URL for a given shop domain
 * @param shopDomain - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns Complete base URL for Shopify Admin API
 */
export const adminBase = (shopDomain: string): string => {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}`;
};

/**
 * Generate Shopify GraphQL Admin API URL for a given shop domain
 * @param shopDomain - The shop domain (e.g., 'mystore.myshopify.com')
 * @returns Complete GraphQL URL for Shopify Admin API
 */
export const graphqlBase = (shopDomain: string): string => {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
};

/**
 * Default Shopify OAuth scopes for CrewFlow
 * These are the minimum required scopes for full functionality
 */
export const DEFAULT_SHOPIFY_SCOPES = [
  'read_products',
  'write_products',
  'read_product_listings',
  'read_files',
  'write_files',
  'read_inventory',
  'write_inventory',
  'read_orders',
  'write_orders',
  'read_customers',
  'read_analytics'
] as const;

/**
 * Shopify API rate limits
 */
export const SHOPIFY_RATE_LIMITS = {
  REST_API: {
    BUCKET_SIZE: 40,
    LEAK_RATE: 2, // requests per second
    MAX_COST: 40
  },
  GRAPHQL_API: {
    BUCKET_SIZE: 1000,
    LEAK_RATE: 50, // cost points per second
    MAX_COST: 1000
  }
} as const;

/**
 * Common Shopify API endpoints
 */
export const SHOPIFY_ENDPOINTS = {
  SHOP: '/shop.json',
  PRODUCTS: '/products.json',
  ORDERS: '/orders.json',
  CUSTOMERS: '/customers.json',
  INVENTORY_LEVELS: '/inventory_levels.json',
  WEBHOOKS: '/webhooks.json',
  FULFILLMENTS: '/fulfillments.json'
} as const;

/**
 * Shopify webhook topics that CrewFlow listens to
 */
export const SHOPIFY_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/cancelled',
  'products/create',
  'products/update',
  'inventory_levels/update',
  'app/uninstalled'
] as const;

/**
 * Normalize shop domain input to proper Shopify format
 * @param input - Raw shop domain input (e.g., 'mystore', 'mystore.myshopify.com')
 * @returns Normalized domain (e.g., 'mystore.myshopify.com')
 */
export function normalizeShopDomain(input: string): string {
  let s = input.trim().toLowerCase();
  if (!s.endsWith('.myshopify.com')) {
    s = `${s}.myshopify.com`;
  }
  return s;
}

/**
 * Helper function to validate shop domain format
 * @param shopDomain - Domain to validate
 * @returns true if valid Shopify domain format
 */
export const isValidShopDomain = (shopDomain: string): boolean => {
  const shopDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopDomainRegex.test(shopDomain);
};

/**
 * Extract shop name from full domain
 * @param shopDomain - Full shop domain (e.g., 'mystore.myshopify.com')
 * @returns Shop name (e.g., 'mystore')
 */
export const extractShopName = (shopDomain: string): string => {
  return shopDomain.replace('.myshopify.com', '');
};

/**
 * Generate Shopify admin URL for a resource
 * @param shopDomain - Shop domain
 * @param resourceType - Type of resource (products, orders, etc.)
 * @param resourceId - ID of the resource
 * @returns Admin URL for the resource
 */
export const generateAdminUrl = (
  shopDomain: string,
  resourceType: string,
  resourceId: string | number
): string => {
  const shopName = extractShopName(shopDomain);
  return `https://admin.shopify.com/store/${shopName}/${resourceType}/${resourceId}`;
};

/**
 * Generate public store URL for a product
 * @param shopDomain - Shop domain
 * @param productHandle - Product handle/slug
 * @returns Public store URL for the product
 */
export const generatePublicProductUrl = (
  shopDomain: string,
  productHandle: string
): string => {
  return `https://${shopDomain}/products/${productHandle}`;
};
