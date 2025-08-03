// Enhanced Context Management Integration Tests
// Tests the complete context management system integration

import { ContextManager } from '../ContextManager'
import { SessionManager } from '../SessionManager'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-session' }, error: null }))
        }))
      })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}))

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-session' }, error: null }))
        }))
      })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}))

// Mock AI Config
jest.mock('@/lib/ai/config', () => ({
  getAIConfig: jest.fn(() => ({
    openai: {
      apiKey: 'test-key',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1000
    }
  }))
}))

// Mock LangChain
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(() => Promise.resolve({ content: 'Test AI response' }))
  }))
}))

// Mock localStorage for SessionManager
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-user-agent'
  }
})

// Mock location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/test-path'
  }
})

describe('Enhanced Context Management Integration', () => {
  let contextManager: ContextManager
  let sessionManager: SessionManager
  const testUserId = 'test-user-123'

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    sessionStorageMock.getItem.mockReturnValue(null)
  })

  describe('ContextManager Integration', () => {
    beforeEach(() => {
      contextManager = new ContextManager(true)
    })

    test('should create and retrieve session', async () => {
      const sessionData = {
        store_id: 'test-store',
        store_name: 'Test Store',
        currency: 'USD'
      }

      const session = await contextManager.createOrUpdateSession(
        testUserId,
        'test-session-123',
        sessionData
      )

      expect(session).toBeDefined()
      expect(session.id).toBe('test-session')
    })

    test('should store and retrieve context', async () => {
      const contextId = await contextManager.storeContext(
        testUserId,
        'intent',
        { userMessage: 'Test message', intent: 'product_creation' },
        {
          threadId: 'test-thread',
          sessionId: 'test-session',
          relevanceScore: 8,
          priorityLevel: 'high'
        }
      )

      expect(contextId).toBe('test-id')
    })

    test('should get intelligent context with prioritization', async () => {
      const contextResult = await contextManager.getIntelligentContext(
        testUserId,
        'test-thread',
        'test-session',
        {
          includeStoreContext: true,
          includeHistoricalSummaries: true,
          maxMessages: 10
        }
      )

      expect(contextResult).toBeDefined()
      expect(contextResult.immediateContext).toEqual([])
      expect(contextResult.sessionContext).toEqual([])
      expect(contextResult.historicalSummaries).toEqual([])
      expect(contextResult.contextPriority).toBeDefined()
      expect(contextResult.totalRelevanceScore).toBe(0)
    })

    test('should generate conversation summary', async () => {
      // Mock messages for summarization
      const mockMessages = [
        {
          id: '1',
          user_id: testUserId,
          agent_name: 'ai-store-manager',
          message_type: 'user',
          content: 'I want to create a new product',
          timestamp: new Date().toISOString(),
          message_importance_score: 7
        },
        {
          id: '2',
          user_id: testUserId,
          agent_name: 'ai-store-manager',
          message_type: 'agent',
          content: 'I can help you create a new product. What type of product are you looking to add?',
          timestamp: new Date().toISOString(),
          message_importance_score: 6
        }
      ]

      // Mock the getRecentMessages method to return test messages
      jest.spyOn(contextManager as any, 'getRecentMessages').mockResolvedValue(mockMessages)

      const summary = await contextManager.generateConversationSummary(
        testUserId,
        'test-thread',
        2
      )

      expect(summary).toBe('Test AI response')
    })
  })

  describe('SessionManager Integration', () => {
    beforeEach(() => {
      sessionManager = new SessionManager(testUserId)
    })

    afterEach(() => {
      sessionManager.destroy()
    })

    test('should initialize new session', () => {
      expect(sessionManager.getSessionId()).toBeDefined()
      expect(sessionManager.getSessionId()).toMatch(/^session_\d+_/)
    })

    test('should update store context', async () => {
      const storeContext = {
        store_id: 'test-store',
        store_name: 'Test Store',
        currency: 'USD'
      }

      await sessionManager.updateStoreContext(storeContext)
      
      const sessionState = sessionManager.getSessionState()
      expect(sessionState?.storeContext).toEqual(storeContext)
    })

    test('should record interactions', async () => {
      await sessionManager.recordInteraction('message_sent', {
        messageLength: 50,
        hasAttachments: false
      })

      const sessionState = sessionManager.getSessionState()
      expect(sessionState?.metadata.interactionCount).toBe(1)
    })

    test('should update conversation phase', async () => {
      await sessionManager.updateConversationPhase('working')
      
      const phase = sessionManager.getConversationPhase()
      expect(phase).toBe('working')
    })

    test('should set active thread', async () => {
      const threadId = 'test-thread-123'
      await sessionManager.setActiveThread(threadId)
      
      const activeThread = sessionManager.getActiveThreadId()
      expect(activeThread).toBe(threadId)
    })
  })

  describe('Cross-System Integration', () => {
    beforeEach(() => {
      contextManager = new ContextManager(true)
      sessionManager = new SessionManager(testUserId)
    })

    afterEach(() => {
      sessionManager.destroy()
    })

    test('should integrate session and context managers', async () => {
      // Create session with store context
      const storeContext = {
        store_id: 'test-store',
        store_name: 'Test Store'
      }
      
      await sessionManager.updateStoreContext(storeContext)
      const sessionState = sessionManager.getSessionState()
      
      // Create context session in ContextManager
      const session = await contextManager.createOrUpdateSession(
        testUserId,
        sessionState!.sessionId,
        storeContext
      )

      expect(session.session_id).toBe(sessionState!.sessionId)
    })

    test('should handle context-aware conversation flow', async () => {
      // Set up session
      await sessionManager.updateConversationPhase('working')
      await sessionManager.setActiveThread('test-thread')
      
      // Store interaction context
      await contextManager.storeContext(
        testUserId,
        'intent',
        { userMessage: 'Create product', intent: 'product_creation' },
        {
          threadId: 'test-thread',
          sessionId: sessionManager.getSessionId(),
          relevanceScore: 8
        }
      )

      // Get intelligent context
      const contextResult = await contextManager.getIntelligentContext(
        testUserId,
        'test-thread',
        sessionManager.getSessionId()
      )

      expect(contextResult).toBeDefined()
      expect(contextResult.contextPriority).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should handle context manager errors gracefully', async () => {
      const contextManager = new ContextManager(true)
      
      // Test with invalid user ID
      const contextResult = await contextManager.getIntelligentContext(
        '',
        'test-thread',
        'test-session'
      )

      expect(contextResult.immediateContext).toEqual([])
      expect(contextResult.sessionContext).toEqual([])
    })

    test('should handle session manager errors gracefully', () => {
      // Test with invalid user ID
      expect(() => new SessionManager('')).not.toThrow()
    })
  })

  describe('Performance Tests', () => {
    test('should handle large context efficiently', async () => {
      const contextManager = new ContextManager(true)
      
      const startTime = Date.now()
      
      const contextResult = await contextManager.getIntelligentContext(
        testUserId,
        'test-thread',
        'test-session',
        {
          maxMessages: 100,
          maxContextItems: 50
        }
      )
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      expect(contextResult).toBeDefined()
    })

    test('should handle session operations efficiently', async () => {
      const sessionManager = new SessionManager(testUserId)
      
      const startTime = Date.now()
      
      // Perform multiple session operations
      await sessionManager.recordInteraction('test1')
      await sessionManager.recordInteraction('test2')
      await sessionManager.recordInteraction('test3')
      await sessionManager.updateConversationPhase('working')
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(500) // Should complete within 500ms
      
      sessionManager.destroy()
    })
  })
})
