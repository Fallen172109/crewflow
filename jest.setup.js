import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'sk-test-openai-key'
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-anthropic-key'
process.env.PERPLEXITY_API_KEY = 'pplx-test-perplexity-key'
process.env.SHOPIFY_CLIENT_ID = 'test-shopify-client-id'
process.env.SHOPIFY_CLIENT_SECRET = 'test-shopify-client-secret'
process.env.SHOPIFY_WEBHOOK_SECRET = 'test-webhook-secret'

// Mock fetch globally
global.fetch = jest.fn()

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
    createHmac: () => ({
      update: () => ({
        digest: () => 'test-hmac-signature'
      })
    }),
    timingSafeEqual: () => true
  }
})

// Mock window object for browser-specific code
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000'
  }
})

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})
