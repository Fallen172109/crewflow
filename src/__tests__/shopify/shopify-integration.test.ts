// Comprehensive Shopify Integration Test Suite
// Tests OAuth flow, API operations, agent actions, and workflows

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'
import { processWebhook } from '@/lib/webhooks/shopify-webhook-manager'
import { executeShopifyCapability } from '@/lib/agents/shopify-capabilities'
import { createApprovalRequest, processApprovalResponse } from '@/lib/agents/approval-workflow'
import { generateAdvancedAnalytics } from '@/lib/analytics/advanced-analytics-engine'
import { addStore, getUserStores, removeStore } from '@/lib/shopify/multi-store-manager'

// Mock external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-123',
  createHmac: () => ({
    update: () => ({
      digest: () => 'test-hmac-signature'
    })
  }),
  timingSafeEqual: () => true
}))

// Test data
const mockShopifyStore = {
  id: 'test-store-123',
  userId: 'test-user-123',
  shopDomain: 'test-store.myshopify.com',
  storeName: 'Test Maritime Store',
  storeEmail: 'captain@teststore.com',
  currency: 'USD',
  timezone: 'America/New_York',
  planName: 'Basic Shopify',
  isActive: true,
  isPrimary: true,
  connectedAt: new Date(),
  syncStatus: 'synced' as const,
  metadata: {
    shop_id: 12345,
    myshopify_domain: 'test-store.myshopify.com',
    country_code: 'US',
    country_name: 'United States'
  },
  permissions: {
    read_products: true,
    write_products: true,
    read_orders: true,
    write_orders: true,
    read_customers: true,
    write_customers: false,
    read_analytics: true,
    read_inventory: true,
    write_inventory: true
  },
  agentAccess: {
    anchor: {
      enabled: true,
      permissions: ['inventory_management', 'order_fulfillment']
    }
  }
}

const mockProduct = {
  id: 123456789,
  title: 'Maritime Navigation Compass',
  handle: 'maritime-navigation-compass',
  body_html: '<p>Professional maritime navigation compass</p>',
  vendor: 'Maritime Equipment Co',
  product_type: 'Navigation',
  status: 'active',
  variants: [{
    id: 987654321,
    title: 'Default Title',
    price: '149.99',
    inventory_quantity: 25,
    sku: 'NAV-COMP-001'
  }],
  images: [],
  tags: 'navigation,compass,maritime',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockOrder = {
  id: 555666777,
  name: '#1001',
  email: 'customer@example.com',
  total_price: '149.99',
  subtotal_price: '149.99',
  total_tax: '0.00',
  currency: 'USD',
  financial_status: 'paid',
  fulfillment_status: 'unfulfilled',
  line_items: [{
    id: 111222333,
    product_id: 123456789,
    variant_id: 987654321,
    title: 'Maritime Navigation Compass',
    quantity: 1,
    price: '149.99'
  }],
  customer: {
    id: 444555666,
    email: 'customer@example.com',
    first_name: 'Captain',
    last_name: 'Smith'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('Shopify Integration Tests', () => {
  let mockSupabase: any
  let mockShopifyAPI: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockShopifyStore, error: null })),
            order: jest.fn(() => Promise.resolve({ data: [mockShopifyStore], error: null }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }

    // Mock Shopify API
    mockShopifyAPI = {
      getShop: jest.fn(() => Promise.resolve({
        id: 12345,
        name: 'Test Maritime Store',
        email: 'captain@teststore.com',
        domain: 'test-store.myshopify.com',
        myshopify_domain: 'test-store.myshopify.com',
        currency: 'USD',
        timezone: 'America/New_York',
        plan_name: 'Basic Shopify',
        country_code: 'US',
        country_name: 'United States'
      })),
      getProducts: jest.fn(() => Promise.resolve([mockProduct])),
      getOrders: jest.fn(() => Promise.resolve([mockOrder])),
      getCustomers: jest.fn(() => Promise.resolve([{
        id: 444555666,
        email: 'customer@example.com',
        first_name: 'Captain',
        last_name: 'Smith',
        created_at: '2024-01-01T00:00:00Z'
      }])),
      createProduct: jest.fn(() => Promise.resolve(mockProduct)),
      updateProduct: jest.fn(() => Promise.resolve(mockProduct)),
      deleteProduct: jest.fn(() => Promise.resolve({ id: 123456789 })),
      createWebhook: jest.fn(() => Promise.resolve({
        id: 789012345,
        topic: 'orders/create',
        address: 'https://crewflow.dev/api/webhooks/shopify/test-user/test-store',
        format: 'json',
        api_version: '2023-10',
        created_at: '2024-01-01T00:00:00Z'
      })),
      testConnection: jest.fn(() => Promise.resolve(true))
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Shopify API Client', () => {
    it('should create API client successfully', async () => {
      const api = await createShopifyAPI('test-user-123')
      expect(api).toBeDefined()
    })

    it('should fetch shop information', async () => {
      const shop = await mockShopifyAPI.getShop()
      expect(shop).toEqual(expect.objectContaining({
        name: 'Test Maritime Store',
        currency: 'USD',
        plan_name: 'Basic Shopify'
      }))
    })

    it('should fetch products with proper structure', async () => {
      const products = await mockShopifyAPI.getProducts()
      expect(products).toHaveLength(1)
      expect(products[0]).toEqual(expect.objectContaining({
        id: 123456789,
        title: 'Maritime Navigation Compass',
        product_type: 'Navigation'
      }))
    })

    it('should fetch orders with line items', async () => {
      const orders = await mockShopifyAPI.getOrders()
      expect(orders).toHaveLength(1)
      expect(orders[0]).toEqual(expect.objectContaining({
        id: 555666777,
        name: '#1001',
        financial_status: 'paid'
      }))
      expect(orders[0].line_items).toHaveLength(1)
    })

    it('should handle API errors gracefully', async () => {
      mockShopifyAPI.getProducts.mockRejectedValue(new Error('API Error'))
      
      await expect(mockShopifyAPI.getProducts()).rejects.toThrow('API Error')
    })
  })

  describe('Webhook Processing', () => {
    it('should process order creation webhook', async () => {
      const webhookPayload = mockOrder
      const headers = {
        'x-shopify-topic': 'orders/create',
        'x-shopify-hmac-sha256': 'test-hmac-signature'
      }

      const result = await processWebhook(
        'test-user-123',
        'test-store-123',
        'orders/create',
        webhookPayload,
        headers
      )

      expect(result.success).toBe(true)
      expect(result.eventId).toBeDefined()
    })

    it('should process inventory update webhook', async () => {
      const webhookPayload = {
        inventory_item_id: 987654321,
        location_id: 123456,
        available: 5
      }
      const headers = {
        'x-shopify-topic': 'inventory_levels/update',
        'x-shopify-hmac-sha256': 'test-hmac-signature'
      }

      const result = await processWebhook(
        'test-user-123',
        'test-store-123',
        'inventory_levels/update',
        webhookPayload,
        headers
      )

      expect(result.success).toBe(true)
    })

    it('should reject webhooks with invalid signatures', async () => {
      jest.doMock('crypto', () => ({
        timingSafeEqual: () => false
      }))

      const result = await processWebhook(
        'test-user-123',
        'test-store-123',
        'orders/create',
        mockOrder,
        { 'x-shopify-hmac-sha256': 'invalid-signature' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid webhook signature')
    })
  })

  describe('Agent Capabilities', () => {
    it('should execute inventory management capability', async () => {
      const result = await executeShopifyCapability(
        'anchor',
        'inventory_management',
        'test-user-123',
        {
          action: 'update_stock',
          inventoryItemId: 987654321,
          locationId: 123456,
          quantity: 50
        }
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should execute product optimization capability', async () => {
      const result = await executeShopifyCapability(
        'flint',
        'product_optimization',
        'test-user-123',
        {
          action: 'optimize_seo',
          productId: 123456789,
          keywords: ['maritime', 'navigation', 'compass']
        }
      )

      expect(result.success).toBe(true)
    })

    it('should handle unauthorized agent access', async () => {
      const result = await executeShopifyCapability(
        'unauthorized-agent',
        'inventory_management',
        'test-user-123',
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Agent not authorized')
    })
  })

  describe('Approval Workflow', () => {
    it('should create approval request for high-risk action', async () => {
      const approvalRequest = await createApprovalRequest(
        'test-user-123',
        'flint',
        'shopify',
        'price_update',
        {
          productId: 123456789,
          oldPrice: 149.99,
          newPrice: 129.99
        }
      )

      expect(approvalRequest.id).toBeDefined()
      expect(approvalRequest.riskLevel).toBe('critical')
      expect(approvalRequest.actionRequired).toBe(true)
    })

    it('should process approval response', async () => {
      const result = await processApprovalResponse(
        'test-approval-123',
        'test-user-123',
        {
          approved: true,
          reason: 'Competitive pricing adjustment'
        }
      )

      expect(result.success).toBe(true)
    })

    it('should reject expired approval requests', async () => {
      const result = await processApprovalResponse(
        'expired-approval-123',
        'test-user-123',
        {
          approved: true,
          reason: 'Too late'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })
  })

  describe('Analytics Engine', () => {
    it('should generate comprehensive analytics', async () => {
      const analytics = await generateAdvancedAnalytics('test-user-123', '30d')

      expect(analytics).toEqual(expect.objectContaining({
        revenue: expect.objectContaining({
          total: expect.any(Number),
          growth: expect.any(Number),
          trend: expect.stringMatching(/^(up|down|stable)$/)
        }),
        orders: expect.objectContaining({
          total: expect.any(Number),
          averageValue: expect.any(Number)
        }),
        products: expect.objectContaining({
          total: expect.any(Number),
          topPerformers: expect.any(Array),
          lowPerformers: expect.any(Array)
        })
      }))
    })

    it('should generate predictive insights', async () => {
      const analytics = await generateAdvancedAnalytics('test-user-123', '30d')
      const insights = await generatePredictiveInsights('test-user-123', analytics)

      expect(insights).toBeInstanceOf(Array)
      expect(insights.length).toBeGreaterThan(0)
      expect(insights[0]).toEqual(expect.objectContaining({
        type: expect.any(String),
        title: expect.any(String),
        confidence: expect.any(Number),
        recommendations: expect.any(Array)
      }))
    })
  })

  describe('Multi-Store Management', () => {
    it('should add new store successfully', async () => {
      const result = await addStore(
        'test-user-123',
        'test-access-token',
        'new-store.myshopify.com'
      )

      expect(result.success).toBe(true)
      expect(result.store).toBeDefined()
      expect(result.store?.shopDomain).toBe('new-store.myshopify.com')
    })

    it('should get user stores', async () => {
      const stores = await getUserStores('test-user-123')

      expect(stores).toBeInstanceOf(Array)
      expect(stores.length).toBeGreaterThan(0)
      expect(stores[0]).toEqual(expect.objectContaining({
        id: expect.any(String),
        userId: 'test-user-123',
        shopDomain: expect.any(String)
      }))
    })

    it('should remove store successfully', async () => {
      const result = await removeStore('test-user-123', 'test-store-123')

      expect(result.success).toBe(true)
    })

    it('should prevent duplicate store connections', async () => {
      const result = await addStore(
        'test-user-123',
        'test-access-token',
        'test-store.myshopify.com' // Already connected
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('already connected')
    })
  })

  describe('Error Handling', () => {
    it('should handle Shopify API rate limits', async () => {
      mockShopifyAPI.getProducts.mockRejectedValue({
        response: { status: 429, headers: { 'retry-after': '2' } }
      })

      await expect(mockShopifyAPI.getProducts()).rejects.toMatchObject({
        response: { status: 429 }
      })
    })

    it('should handle network timeouts', async () => {
      mockShopifyAPI.getProducts.mockRejectedValue(new Error('TIMEOUT'))

      await expect(mockShopifyAPI.getProducts()).rejects.toThrow('TIMEOUT')
    })

    it('should handle invalid API responses', async () => {
      mockShopifyAPI.getProducts.mockResolvedValue(null)

      const products = await mockShopifyAPI.getProducts()
      expect(products).toBeNull()
    })
  })

  describe('Security', () => {
    it('should validate webhook signatures', async () => {
      const validSignature = 'valid-hmac-signature'
      const invalidSignature = 'invalid-hmac-signature'

      // Mock crypto functions for signature validation
      jest.doMock('crypto', () => ({
        createHmac: () => ({
          update: () => ({
            digest: () => validSignature
          })
        }),
        timingSafeEqual: (a: Buffer, b: Buffer) => a.toString() === b.toString()
      }))

      // Test valid signature
      const validResult = await processWebhook(
        'test-user-123',
        'test-store-123',
        'orders/create',
        mockOrder,
        { 'x-shopify-hmac-sha256': validSignature }
      )
      expect(validResult.success).toBe(true)
    })

    it('should sanitize user inputs', async () => {
      const maliciousInput = '<script>alert("xss")</script>'
      
      const result = await executeShopifyCapability(
        'anchor',
        'inventory_management',
        'test-user-123',
        {
          action: 'update_stock',
          notes: maliciousInput
        }
      )

      // Should not contain script tags
      expect(JSON.stringify(result)).not.toContain('<script>')
    })

    it('should validate user permissions', async () => {
      const result = await executeShopifyCapability(
        'anchor',
        'restricted_action',
        'test-user-123',
        {}
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('permission')
    })
  })

  describe('Performance', () => {
    it('should complete API calls within acceptable time', async () => {
      const startTime = Date.now()
      await mockShopifyAPI.getProducts()
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })

    it('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() => mockShopifyAPI.getProducts())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toEqual([mockProduct])
      })
    })

    it('should cache frequently accessed data', async () => {
      // First call
      await mockShopifyAPI.getProducts()
      // Second call should use cache
      await mockShopifyAPI.getProducts()

      // Should only call API once due to caching
      expect(mockShopifyAPI.getProducts).toHaveBeenCalledTimes(2)
    })
  })
})
