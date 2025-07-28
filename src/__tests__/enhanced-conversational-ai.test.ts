// Comprehensive Tests for Enhanced Conversational AI Features
// Tests memory, intent recognition, smart questions, store intelligence, previews, and enhancements

import './setup'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { EnhancedMemoryManager } from '@/lib/ai/enhanced-memory'
import { AdvancedIntentRecognizer } from '@/lib/ai/advanced-intent-recognition'
import { SmartQuestionGenerator } from '@/lib/ai/smart-questions'
import { EnhancedStoreIntelligence } from '@/lib/ai/enhanced-store-intelligence'
import { LivePreviewSystem } from '@/lib/ai/live-previews'
import { OneClickEnhancementSystem } from '@/lib/ai/one-click-enhancements'
import { EnhancedChatOrchestrator } from '@/lib/ai/enhanced-chat-orchestrator'

// Mock external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/integrations/shopify-admin-api')
jest.mock('@/lib/ai/config')

describe('Enhanced Conversational AI System', () => {
  let mockUserId: string
  let mockAgentId: string
  let mockThreadId: string

  beforeEach(() => {
    mockUserId = 'test-user-123'
    mockAgentId = 'shopify-ai'
    mockThreadId = 'thread-456'
    
    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('Enhanced Memory System', () => {
    it('should initialize with default preferences for new users', async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )

      const context = memoryManager.getContext()
      
      expect(context.userId).toBe(mockUserId)
      expect(context.agentId).toBe(mockAgentId)
      expect(context.preferences.communicationStyle).toBe('friendly')
      expect(context.conversationState.conversationPhase).toBe('greeting')
    })

    it('should update conversation state correctly', async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )

      await memoryManager.updateConversationState({
        currentTopic: 'product_management',
        conversationPhase: 'action',
        lastIntent: 'product_create',
        confidence: 0.9
      })

      const context = memoryManager.getContext()
      expect(context.conversationState.currentTopic).toBe('product_management')
      expect(context.conversationState.conversationPhase).toBe('action')
      expect(context.conversationState.confidence).toBe(0.9)
    })

    it('should record interactions for learning', async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )

      await memoryManager.recordInteraction(
        'product_create',
        'create_product',
        'success',
        'User created a new product successfully',
        5
      )

      const context = memoryManager.getContext()
      expect(context.recentInteractions).toHaveLength(1)
      expect(context.recentInteractions[0].intent).toBe('product_create')
      expect(context.recentInteractions[0].outcome).toBe('success')
    })

    it('should generate contextual memory for AI prompts', async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )

      await memoryManager.updateConversationState({
        currentTopic: 'inventory_management',
        lastIntent: 'inventory_check'
      })

      const contextualMemory = memoryManager.getContextualMemory()
      
      expect(contextualMemory).toContain('inventory_management')
      expect(contextualMemory).toContain('inventory_check')
      expect(contextualMemory).toContain('Communication Style')
    })

    it('should manage pending actions', async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )

      const actionId = await memoryManager.addPendingAction({
        type: 'product_create',
        description: 'Create new product with AI-generated description',
        parameters: { title: 'Test Product' },
        requiresConfirmation: true,
        estimatedImpact: 'medium'
      })

      const context = memoryManager.getContext()
      expect(context.conversationState.pendingActions).toHaveLength(1)
      expect(context.conversationState.pendingActions[0].type).toBe('product_create')

      await memoryManager.removePendingAction(actionId)
      const updatedContext = memoryManager.getContext()
      expect(updatedContext.conversationState.pendingActions).toHaveLength(0)
    })
  })

  describe('Advanced Intent Recognition', () => {
    let intentRecognizer: AdvancedIntentRecognizer
    let mockContext: any

    beforeEach(async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )
      mockContext = memoryManager.getContext()
      intentRecognizer = new AdvancedIntentRecognizer(mockContext)
    })

    it('should recognize product creation intent', async () => {
      const message = 'I want to create a new product called "Wireless Headphones" for $99.99'
      const analysis = await intentRecognizer.analyzeIntent(message)

      expect(analysis.primaryIntent.type).toContain('product')
      expect(analysis.primaryIntent.type).toContain('create')
      expect(analysis.confidence).toBeGreaterThan(0.7)
      expect(analysis.complexity).toBe('moderate')
    })

    it('should recognize inventory management intent', async () => {
      const message = 'Check inventory levels for all products and update low stock items'
      const analysis = await intentRecognizer.analyzeIntent(message)

      expect(analysis.primaryIntent.category).toBe('shopify')
      expect(analysis.primaryIntent.type).toContain('inventory')
      expect(analysis.complexity).toBe('complex')
    })

    it('should identify required information', async () => {
      const message = 'Create a product'
      const analysis = await intentRecognizer.analyzeIntent(message)

      expect(analysis.requiredInformation.length).toBeGreaterThan(0)
      expect(analysis.requiredInformation.some(info => info.field === 'product_title')).toBe(true)
      expect(analysis.requiredInformation.some(info => info.field === 'product_price')).toBe(true)
    })

    it('should determine urgency correctly', async () => {
      const urgentMessage = 'URGENT: Fix inventory error immediately!'
      const normalMessage = 'Update product description when you have time'

      const urgentAnalysis = await intentRecognizer.analyzeIntent(urgentMessage)
      const normalAnalysis = await intentRecognizer.analyzeIntent(normalMessage)

      expect(urgentAnalysis.urgency).toBe('high')
      expect(normalAnalysis.urgency).toBe('low')
    })

    it('should generate suggested actions', async () => {
      const message = 'I need help with my product inventory'
      const analysis = await intentRecognizer.analyzeIntent(message)

      expect(analysis.suggestedActions.length).toBeGreaterThan(0)
      expect(analysis.suggestedActions[0]).toHaveProperty('title')
      expect(analysis.suggestedActions[0]).toHaveProperty('confidence')
    })
  })

  describe('Smart Questions System', () => {
    let questionGenerator: SmartQuestionGenerator
    let mockIntentAnalysis: any

    beforeEach(async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )
      const mockContext = memoryManager.getContext()
      
      mockIntentAnalysis = {
        primaryIntent: {
          type: 'shopify_product_create',
          category: 'shopify',
          confidence: 0.8
        },
        requiredInformation: [
          {
            field: 'product_title',
            description: 'Product title or name',
            type: 'text',
            priority: 'critical'
          },
          {
            field: 'product_price',
            description: 'Product price',
            type: 'number',
            priority: 'critical'
          }
        ],
        complexity: 'moderate',
        confidence: 0.8
      }

      questionGenerator = new SmartQuestionGenerator(mockContext, mockIntentAnalysis)
    })

    it('should generate question flow for missing information', async () => {
      const questionFlow = await questionGenerator.generateQuestionFlow()

      expect(questionFlow.questions.length).toBeGreaterThan(0)
      expect(questionFlow.currentQuestionIndex).toBe(0)
      expect(questionFlow.canProceed).toBe(false)
      expect(questionFlow.completionPercentage).toBe(0)
    })

    it('should prioritize critical questions first', async () => {
      const questionFlow = await questionGenerator.generateQuestionFlow()
      const criticalQuestions = questionFlow.questions.filter(q => q.priority === 'critical')
      
      expect(criticalQuestions.length).toBeGreaterThan(0)
      expect(questionFlow.questions[0].priority).toBe('critical')
    })

    it('should update question flow with answers', async () => {
      const questionFlow = await questionGenerator.generateQuestionFlow()
      const firstQuestion = questionFlow.questions[0]

      const updatedFlow = SmartQuestionGenerator.updateQuestionFlow(
        questionFlow,
        firstQuestion.id,
        'Test Product Title'
      )

      expect(updatedFlow.collectedAnswers[firstQuestion.id]).toBe('Test Product Title')
      expect(updatedFlow.currentQuestionIndex).toBe(1)
      expect(updatedFlow.completionPercentage).toBeGreaterThan(0)
    })

    it('should determine when flow is complete', async () => {
      const questionFlow = await questionGenerator.generateQuestionFlow()
      
      // Answer all critical questions
      let updatedFlow = questionFlow
      const criticalQuestions = questionFlow.questions.filter(q => q.priority === 'critical')
      
      for (const question of criticalQuestions) {
        updatedFlow = SmartQuestionGenerator.updateQuestionFlow(
          updatedFlow,
          question.id,
          'test answer'
        )
      }

      expect(SmartQuestionGenerator.isFlowComplete(updatedFlow)).toBe(true)
      expect(updatedFlow.canProceed).toBe(true)
    })

    it('should generate contextual help text and examples', async () => {
      const questionFlow = await questionGenerator.generateQuestionFlow()
      const productTitleQuestion = questionFlow.questions.find(q => 
        q.id.includes('product_title') || q.question.toLowerCase().includes('title')
      )

      if (productTitleQuestion) {
        expect(productTitleQuestion.helpText).toBeDefined()
        expect(productTitleQuestion.examples).toBeDefined()
        expect(productTitleQuestion.examples!.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Enhanced Store Intelligence', () => {
    let storeIntelligence: EnhancedStoreIntelligence

    beforeEach(() => {
      storeIntelligence = new EnhancedStoreIntelligence(mockUserId)
    })

    it('should generate comprehensive store intelligence', async () => {
      const intelligence = await storeIntelligence.generateStoreIntelligence()

      expect(intelligence).toHaveProperty('storeProfile')
      expect(intelligence).toHaveProperty('salesPatterns')
      expect(intelligence).toHaveProperty('inventoryInsights')
      expect(intelligence).toHaveProperty('customerBehavior')
      expect(intelligence).toHaveProperty('recommendations')
      expect(intelligence).toHaveProperty('predictiveAnalytics')
    })

    it('should analyze sales patterns correctly', async () => {
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      expect(intelligence.salesPatterns.length).toBeGreaterThan(0)
      expect(intelligence.salesPatterns[0]).toHaveProperty('period')
      expect(intelligence.salesPatterns[0]).toHaveProperty('pattern')
      expect(intelligence.salesPatterns[0]).toHaveProperty('trend')
      expect(intelligence.salesPatterns[0]).toHaveProperty('confidence')
    })

    it('should provide inventory insights with recommendations', async () => {
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      if (intelligence.inventoryInsights.length > 0) {
        const insight = intelligence.inventoryInsights[0]
        expect(insight).toHaveProperty('productId')
        expect(insight).toHaveProperty('currentStock')
        expect(insight).toHaveProperty('optimalStock')
        expect(insight).toHaveProperty('recommendation')
        expect(insight).toHaveProperty('urgency')
      }
    })

    it('should generate actionable recommendations', async () => {
      const intelligence = await storeIntelligence.generateStoreIntelligence()
      
      expect(intelligence.recommendations.length).toBeGreaterThan(0)
      const recommendation = intelligence.recommendations[0]
      expect(recommendation).toHaveProperty('title')
      expect(recommendation).toHaveProperty('description')
      expect(recommendation).toHaveProperty('actionItems')
      expect(recommendation).toHaveProperty('expectedImpact')
      expect(recommendation).toHaveProperty('confidence')
    })
  })

  describe('Live Previews System', () => {
    let previewSystem: LivePreviewSystem

    beforeEach(() => {
      previewSystem = new LivePreviewSystem(mockUserId)
    })

    it('should generate product creation preview', async () => {
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
    })

    it('should validate required fields and show errors', async () => {
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

    it('should provide warnings and recommendations', async () => {
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

    it('should manage preview expiration', async () => {
      const action = {
        id: 'test-preview-4',
        type: 'product_create' as const,
        title: 'Expiration Test',
        description: 'Test preview expiration',
        parameters: { title: 'Test Product', price: 29.99 },
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
      
      // Should be able to retrieve immediately
      const retrieved = previewSystem.getPreview(action.id)
      expect(retrieved).toBeDefined()
      
      // Manually expire the preview
      preview.expiresAt = new Date(Date.now() - 1000)
      
      // Should not be retrievable after expiration
      const expiredRetrieved = previewSystem.getPreview(action.id)
      expect(expiredRetrieved).toBeUndefined()
    })
  })

  describe('One-Click Enhancements System', () => {
    let enhancementSystem: OneClickEnhancementSystem
    let mockContext: any
    let mockStoreIntelligence: any

    beforeEach(async () => {
      const memoryManager = await EnhancedMemoryManager.initialize(
        mockUserId,
        mockAgentId,
        mockThreadId
      )
      mockContext = memoryManager.getContext()
      
      mockStoreIntelligence = {
        inventoryInsights: [
          {
            productId: 123,
            title: 'Test Product',
            urgency: 'high',
            currentStock: 2,
            optimalStock: 50
          }
        ],
        recommendations: [
          {
            type: 'pricing',
            priority: 'medium',
            title: 'Optimize Pricing'
          }
        ]
      }

      enhancementSystem = new OneClickEnhancementSystem(
        mockUserId,
        mockContext,
        mockStoreIntelligence
      )
    })

    it('should generate contextual enhancement suggestions', async () => {
      const suggestions = await enhancementSystem.generateEnhancementSuggestions('inventory')
      
      expect(suggestions.buttons.length).toBeGreaterThan(0)
      expect(suggestions.contextualMessage).toBeDefined()
      expect(suggestions.totalPotentialImpact).toBeDefined()
      expect(suggestions.recommendedOrder.length).toBeGreaterThan(0)
    })

    it('should prioritize high-impact enhancements', async () => {
      const suggestions = await enhancementSystem.generateEnhancementSuggestions()
      
      if (suggestions.buttons.length > 1) {
        const firstButton = suggestions.buttons[0]
        const secondButton = suggestions.buttons[1]
        
        // First button should have higher or equal priority
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        expect(priorityOrder[firstButton.priority]).toBeGreaterThanOrEqual(
          priorityOrder[secondButton.priority]
        )
      }
    })

    it('should generate product-specific enhancements', async () => {
      const productData = {
        id: 123,
        title: 'Test Product',
        description: 'Short', // Should trigger description enhancement
        images: [], // Should trigger image enhancement
        variants: [{ id: 1 }] // Single variant should trigger variant suggestion
      }

      const suggestions = await enhancementSystem.generateEnhancementSuggestions('product', productData)
      
      expect(suggestions.buttons.some(b => b.id.includes('description'))).toBe(true)
      expect(suggestions.buttons.some(b => b.id.includes('image'))).toBe(true)
    })

    it('should execute enhancements successfully', async () => {
      const result = await enhancementSystem.executeEnhancement('test-enhancement')
      
      expect(result.success).toBe(true)
      expect(result.message).toBeDefined()
      expect(result.affectedItems).toBeGreaterThan(0)
    })
  })

  describe('Enhanced Chat Orchestrator Integration', () => {
    let orchestrator: EnhancedChatOrchestrator

    beforeEach(() => {
      orchestrator = new EnhancedChatOrchestrator()
    })

    it('should process complete chat workflow', async () => {
      const request = {
        message: 'I want to create a new product for my store',
        userId: mockUserId,
        agentId: mockAgentId,
        threadId: mockThreadId,
        sessionId: 'session-123'
      }

      const response = await orchestrator.processMessage(request)
      
      expect(response.response).toBeDefined()
      expect(response.intentAnalysis).toBeDefined()
      expect(response.confidence).toBeGreaterThan(0)
      expect(response.suggestedActions.length).toBeGreaterThan(0)
    })

    it('should handle complex multi-step workflows', async () => {
      const request = {
        message: 'Create a product, update inventory, and optimize pricing for my electronics category',
        userId: mockUserId,
        agentId: mockAgentId,
        threadId: mockThreadId
      }

      const response = await orchestrator.processMessage(request)
      
      expect(response.intentAnalysis.complexity).toBe('complex')
      expect(response.requiresFollowUp).toBe(true)
      expect(response.questionFlow).toBeDefined()
    })

    it('should provide contextual enhancements based on intent', async () => {
      const request = {
        message: 'Help me optimize my store performance',
        userId: mockUserId,
        agentId: mockAgentId,
        threadId: mockThreadId
      }

      const response = await orchestrator.processMessage(request)
      
      expect(response.enhancements).toBeDefined()
      expect(response.enhancements!.buttons.length).toBeGreaterThan(0)
    })

    it('should maintain conversation context across messages', async () => {
      // First message
      const firstRequest = {
        message: 'I want to create a product',
        userId: mockUserId,
        agentId: mockAgentId,
        threadId: mockThreadId
      }

      const firstResponse = await orchestrator.processMessage(firstRequest)
      
      // Second message in same conversation
      const secondRequest = {
        message: 'The product title is "Wireless Headphones"',
        userId: mockUserId,
        agentId: mockAgentId,
        threadId: mockThreadId
      }

      const secondResponse = await orchestrator.processMessage(secondRequest)
      
      // Should maintain context from first message
      expect(secondResponse.conversationState.currentTopic).toContain('product')
    })

    it('should handle question answering workflow', async () => {
      const result = await orchestrator.answerQuestion(
        mockUserId,
        'test-question-id',
        'Test Answer'
      )

      expect(result.success).toBe(true)
      expect(result.canProceed).toBeDefined()
    })

    it('should execute enhancements through orchestrator', async () => {
      const result = await orchestrator.executeEnhancement(
        mockUserId,
        'test-enhancement-id'
      )

      expect(result.success).toBeDefined()
      expect(result.message).toBeDefined()
    })

    it('should generate previews through orchestrator', async () => {
      const result = await orchestrator.generatePreview(
        mockUserId,
        'test-preview-id',
        {
          type: 'product_create',
          title: 'Test Product',
          price: 29.99
        }
      )

      expect(result.success).toBeDefined()
      expect(result.message).toBeDefined()
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
})
