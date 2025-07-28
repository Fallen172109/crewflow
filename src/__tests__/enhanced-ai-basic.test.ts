// Basic Tests for Enhanced Conversational AI Features
// Simplified tests to verify core functionality

import './setup'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { LivePreviewSystem } from '@/lib/ai/live-previews'
import { EnhancedStoreIntelligence } from '@/lib/ai/enhanced-store-intelligence'

describe('Enhanced Conversational AI - Basic Tests', () => {
  let mockUserId: string

  beforeEach(() => {
    mockUserId = 'test-user-123'
    jest.clearAllMocks()
  })

  describe('Live Previews System', () => {
    it('should create preview system instance', () => {
      const previewSystem = new LivePreviewSystem(mockUserId)
      expect(previewSystem).toBeDefined()
    })

    it('should generate product creation preview', async () => {
      const previewSystem = new LivePreviewSystem(mockUserId)
      
      const action = {
        id: 'test-preview-1',
        type: 'product_create' as const,
        title: 'Preview New Product',
        description: 'Test product creation preview',
        parameters: {
          title: 'Test Product',
          price: 29.99,
          description: 'A test product for preview'
        },
        estimatedImpact: {
          scope: 'single_item' as const,
          affectedItems: 1,
          timeToComplete: '2 minutes',
          confidence: 0.8
        },
        risks: [],
        dependencies: [],
        reversible: true,
        previewData: null
      }

      const preview = await previewSystem.generatePreview(action)
      
      expect(preview.result.success).toBe(true)
      expect(preview.result.preview).toBeDefined()
      expect(preview.result.canProceed).toBe(true)
      expect(preview.result.preview.title).toBe('Test Product')
      expect(preview.result.preview.price).toBe(29.99)
    })

    it('should validate required fields', async () => {
      const previewSystem = new LivePreviewSystem(mockUserId)
      
      const action = {
        id: 'test-preview-2',
        type: 'product_create' as const,
        title: 'Invalid Product Preview',
        description: 'Test validation',
        parameters: {
          // Missing required title
          price: 29.99
        },
        estimatedImpact: {
          scope: 'single_item' as const,
          affectedItems: 1,
          timeToComplete: '2 minutes',
          confidence: 0.8
        },
        risks: [],
        dependencies: [],
        reversible: true,
        previewData: null
      }

      const preview = await previewSystem.generatePreview(action)
      
      expect(preview.result.success).toBe(false)
      expect(preview.result.errors.length).toBeGreaterThan(0)
      expect(preview.result.canProceed).toBe(false)
    })

    it('should provide warnings for potential issues', async () => {
      const previewSystem = new LivePreviewSystem(mockUserId)
      
      const action = {
        id: 'test-preview-3',
        type: 'product_create' as const,
        title: 'Product with Warnings',
        description: 'Test warnings',
        parameters: {
          title: 'Short', // Short title should trigger warning
          price: 0.50, // Low price should trigger warning
          description: 'Short desc' // Short description should trigger warning
        },
        estimatedImpact: {
          scope: 'single_item' as const,
          affectedItems: 1,
          timeToComplete: '2 minutes',
          confidence: 0.8
        },
        risks: [],
        dependencies: [],
        reversible: true,
        previewData: null
      }

      const preview = await previewSystem.generatePreview(action)
      
      expect(preview.result.success).toBe(true)
      expect(preview.result.warnings.length).toBeGreaterThan(0)
      expect(preview.result.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('Enhanced Store Intelligence', () => {
    it('should create store intelligence instance', () => {
      const storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
      expect(storeIntelligence).toBeDefined()
    })

    it('should generate comprehensive store intelligence', async () => {
      const storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
      const intelligence = await storeIntelligence.generateStoreIntelligence()

      expect(intelligence).toHaveProperty('storeProfile')
      expect(intelligence).toHaveProperty('salesPatterns')
      expect(intelligence).toHaveProperty('inventoryInsights')
      expect(intelligence).toHaveProperty('customerBehavior')
      expect(intelligence).toHaveProperty('recommendations')
      expect(intelligence).toHaveProperty('predictiveAnalytics')
      expect(intelligence).toHaveProperty('realTimeMetrics')
    })

    it('should analyze sales patterns', async () => {
      const storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      expect(intelligence.salesPatterns.length).toBeGreaterThan(0)
      
      const dailyPattern = intelligence.salesPatterns.find(p => p.period === 'daily')
      expect(dailyPattern).toBeDefined()
      expect(dailyPattern!.pattern).toHaveLength(7) // 7 days
      expect(dailyPattern!.confidence).toBeGreaterThan(0)
    })

    it('should provide actionable recommendations', async () => {
      const storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      expect(intelligence.recommendations.length).toBeGreaterThan(0)
      
      const recommendation = intelligence.recommendations[0]
      expect(recommendation).toHaveProperty('title')
      expect(recommendation).toHaveProperty('description')
      expect(recommendation).toHaveProperty('actionItems')
      expect(recommendation).toHaveProperty('expectedImpact')
      expect(recommendation).toHaveProperty('confidence')
      expect(recommendation.actionItems.length).toBeGreaterThan(0)
    })

    it('should calculate store profile correctly', async () => {
      const storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      expect(intelligence.storeProfile.storeName).toBe('Test Store')
      expect(intelligence.storeProfile.averageOrderValue).toBeGreaterThan(0)
      expect(intelligence.storeProfile.topCategories.length).toBeGreaterThan(0)
      expect(['startup', 'growth', 'mature', 'enterprise']).toContain(intelligence.storeProfile.growthStage)
    })

    it('should provide real-time metrics', async () => {
      const storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      expect(intelligence.realTimeMetrics.length).toBeGreaterThan(0)
      
      const metric = intelligence.realTimeMetrics[0]
      expect(metric).toHaveProperty('name')
      expect(metric).toHaveProperty('value')
      expect(metric).toHaveProperty('change')
      expect(metric).toHaveProperty('changeDirection')
      expect(metric).toHaveProperty('timestamp')
    })
  })

  describe('Integration Tests', () => {
    it('should handle error cases gracefully', async () => {
      const previewSystem = new LivePreviewSystem(mockUserId)
      
      const invalidAction = {
        id: 'invalid-test',
        type: 'invalid_type' as any,
        title: 'Invalid Action',
        description: 'Test error handling',
        parameters: {},
        estimatedImpact: {
          scope: 'single_item' as const,
          affectedItems: 1,
          timeToComplete: '2 minutes',
          confidence: 0.8
        },
        risks: [],
        dependencies: [],
        reversible: true,
        previewData: null
      }

      const preview = await previewSystem.generatePreview(invalidAction)
      
      expect(preview.result.success).toBe(false)
      expect(preview.result.errors.length).toBeGreaterThan(0)
    })

    it('should maintain data consistency', async () => {
      const storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      // Check that all required properties exist and have valid types
      expect(typeof intelligence.storeProfile.storeName).toBe('string')
      expect(typeof intelligence.storeProfile.averageOrderValue).toBe('number')
      expect(Array.isArray(intelligence.storeProfile.topCategories)).toBe(true)
      expect(Array.isArray(intelligence.salesPatterns)).toBe(true)
      expect(Array.isArray(intelligence.recommendations)).toBe(true)
    })

    it('should provide meaningful error messages', async () => {
      const previewSystem = new LivePreviewSystem(mockUserId)
      
      const action = {
        id: 'error-test',
        type: 'product_create' as const,
        title: 'Error Test',
        description: 'Test error messages',
        parameters: {
          title: '', // Empty title should trigger specific error
          price: -10 // Negative price should trigger specific error
        },
        estimatedImpact: {
          scope: 'single_item' as const,
          affectedItems: 1,
          timeToComplete: '2 minutes',
          confidence: 0.8
        },
        risks: [],
        dependencies: [],
        reversible: true,
        previewData: null
      }

      const preview = await previewSystem.generatePreview(action)
      
      expect(preview.result.success).toBe(false)
      expect(preview.result.errors.some(error => 
        error.toLowerCase().includes('title') || error.toLowerCase().includes('required')
      )).toBe(true)
    })
  })
})
