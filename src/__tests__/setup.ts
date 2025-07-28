// Test Setup Configuration
// Sets up environment variables and mocks for testing

// Set up environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.PERPLEXITY_API_KEY = 'test-perplexity-key'

// Mock Supabase with proper chaining
const createMockSupabaseChain = () => {
  const mockChain = {
    select: jest.fn(() => mockChain),
    eq: jest.fn(() => mockChain),
    order: jest.fn(() => mockChain),
    limit: jest.fn(() => mockChain),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => mockChain),
    delete: jest.fn(() => mockChain),
    then: jest.fn(() => Promise.resolve({ data: [], error: null }))
  }
  return mockChain
}

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => createMockSupabaseChain())
  }))
}))

// Mock Shopify API
jest.mock('@/lib/integrations/shopify-admin-api', () => ({
  createShopifyAPI: jest.fn(() => Promise.resolve({
    getShop: jest.fn(() => Promise.resolve({
      id: 1,
      name: 'Test Store',
      domain: 'test-store.myshopify.com',
      email: 'test@example.com',
      currency: 'USD',
      timezone: 'UTC',
      plan_name: 'Basic',
      country_name: 'United States'
    })),
    getProducts: jest.fn(() => Promise.resolve([
      {
        id: 1,
        title: 'Test Product',
        product_type: 'Electronics',
        variants: [{
          id: 1,
          price: '29.99',
          inventory_item_id: 1,
          sku: 'TEST-001'
        }],
        images: []
      }
    ])),
    getOrders: jest.fn(() => Promise.resolve([
      {
        id: 1,
        total_price: '29.99',
        created_at: new Date().toISOString(),
        customer: { id: 1 }
      }
    ])),
    getCustomers: jest.fn(() => Promise.resolve([
      {
        id: 1,
        email: 'customer@example.com',
        created_at: new Date().toISOString()
      }
    ])),
    getInventoryLevels: jest.fn(() => Promise.resolve([
      {
        location_id: 1,
        available: 10,
        inventory_item_id: 1
      }
    ])),
    updateInventoryLevel: jest.fn(() => Promise.resolve({
      location_id: 1,
      available: 20,
      inventory_item_id: 1
    })),
    getProduct: jest.fn((id) => Promise.resolve({
      id,
      title: 'Test Product',
      product_type: 'Electronics',
      variants: [{
        id: 1,
        price: '29.99',
        inventory_item_id: 1,
        sku: 'TEST-001'
      }],
      images: []
    })),
    createProduct: jest.fn(() => Promise.resolve({
      id: 2,
      title: 'New Product',
      product_type: 'General'
    })),
    updateProduct: jest.fn(() => Promise.resolve({
      id: 1,
      title: 'Updated Product'
    }))
  }))
}))

// Mock AI Config
jest.mock('@/lib/ai/config', () => ({
  getAIConfig: jest.fn(() => ({
    openai: {
      apiKey: 'test-openai-key',
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7
    },
    anthropic: {
      apiKey: 'test-anthropic-key',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 2000,
      temperature: 0.7
    },
    perplexity: {
      apiKey: 'test-perplexity-key',
      model: 'llama-3.1-sonar-large-128k-online',
      maxTokens: 2000,
      temperature: 0.7
    }
  })),
  validateAIConfig: jest.fn(() => true),
  AI_ERROR_CONFIG: {
    fallbackResponse: 'I apologize, but I encountered an error. Please try again.'
  }
}))

// Mock LangChain
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn((prompt) => Promise.resolve({
      content: JSON.stringify({
        primary_intent: {
          type: 'shopify_product_create',
          category: 'shopify',
          confidence: 0.8,
          description: 'User wants to create a new product'
        },
        complexity: 'moderate',
        urgency: 'medium',
        missing_information: ['product_title', 'product_price'],
        user_goal: 'Create a new product for their store'
      })
    })),
    modelName: 'gpt-4'
  }))
}))

// Mock other LangChain modules (only mock what's actually installed)

jest.mock('langchain/chains', () => ({
  ConversationChain: jest.fn().mockImplementation(() => ({
    call: jest.fn(() => Promise.resolve({ response: 'Test response' }))
  }))
}))

jest.mock('langchain/memory', () => ({
  BufferMemory: jest.fn().mockImplementation(() => ({
    clear: jest.fn(),
    chatHistory: {
      getMessages: jest.fn(() => Promise.resolve([]))
    }
  }))
}))

jest.mock('@langchain/core/prompts', () => ({
  PromptTemplate: {
    fromTemplate: jest.fn(() => ({}))
  }
}))

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
}

// Suppress console output during tests
beforeEach(() => {
  jest.clearAllMocks()
})

export {}
