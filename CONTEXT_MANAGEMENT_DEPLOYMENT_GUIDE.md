# 🚀 Enhanced Context Management System - Deployment Guide

## 📋 Pre-Deployment Checklist

### Database Requirements
- [ ] PostgreSQL 12+ with UUID extension
- [ ] Supabase project with RLS enabled
- [ ] Backup of existing chat_history and chat_threads tables

### Environment Setup
- [ ] Node.js 18+ environment
- [ ] Next.js 14+ application
- [ ] Supabase client libraries installed
- [ ] LangChain dependencies available

### Code Dependencies
- [ ] `@supabase/supabase-js` v2+
- [ ] `@langchain/openai` for AI summarization
- [ ] `framer-motion` for UI animations
- [ ] `lucide-react` for icons

## 🗄️ Database Migration

### Step 1: Run Database Migration
```sql
-- Execute the enhanced context management migration
\i database/migrations/enhanced_context_management.sql
```

### Step 2: Verify Migration
```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversation_sessions', 'conversation_context', 'context_summaries');

-- Check new columns in existing tables
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'chat_threads' 
AND column_name IN ('session_id', 'context_summary', 'store_context_snapshot');

-- Verify indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('conversation_sessions', 'conversation_context', 'context_summaries');
```

### Step 3: Test RLS Policies
```sql
-- Test as authenticated user
SET ROLE authenticated;
SELECT * FROM conversation_sessions LIMIT 1;
SELECT * FROM conversation_context LIMIT 1;
SELECT * FROM context_summaries LIMIT 1;
```

## 📦 Code Deployment

### Step 1: Deploy Core Services
```bash
# Ensure new files are included in build
git add src/lib/context/ContextManager.ts
git add src/lib/context/SessionManager.ts
git add src/lib/context/__tests__/context-integration.test.ts

# Build and test
npm run build
npm run test src/lib/context/__tests__/context-integration.test.ts
```

### Step 2: Deploy Enhanced Components
```bash
# Verify enhanced SimplifiedShopifyAIChat
git add src/components/shopify/SimplifiedShopifyAIChat.tsx

# Check for TypeScript errors
npx tsc --noEmit

# Test component compilation
npm run build
```

### Step 3: Deploy Enhanced Handlers
```bash
# Verify enhanced AI Store Manager handler
git add src/lib/chat/handlers/ai-store-manager.ts

# Test handler functionality
npm run test -- --testPathPattern=ai-store-manager
```

## 🔧 Configuration

### Environment Variables
```env
# Required for AI summarization
OPENAI_API_KEY=your_openai_api_key

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### AI Configuration
```typescript
// Verify AI config in src/lib/ai/config.ts
export const getAIConfig = () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4', // or 'gpt-3.5-turbo' for cost optimization
    temperature: 0.3, // Lower for more consistent summaries
    maxTokens: 1000
  }
})
```

## 🧪 Testing Deployment

### Step 1: Unit Tests
```bash
# Run context management tests
npm run test src/lib/context/__tests__/

# Run integration tests
npm run test -- --testPathPattern=context-integration
```

### Step 2: Component Tests
```bash
# Test SimplifiedShopifyAIChat component
npm run test -- --testPathPattern=SimplifiedShopifyAIChat

# Test with React Testing Library
npm run test -- --testPathPattern=shopify
```

### Step 3: End-to-End Testing
```bash
# Start development server
npm run dev

# Navigate to http://localhost:3000/dashboard/shopify
# Test the following scenarios:
```

#### Test Scenarios
1. **New Session Creation**
   - Open chat interface
   - Verify session initialization
   - Check context status indicators

2. **Message Sending**
   - Send a test message
   - Verify thread creation
   - Check context storage

3. **Page Refresh**
   - Refresh the page
   - Verify session restoration
   - Check conversation continuity

4. **Store Context**
   - Switch between stores
   - Verify store context updates
   - Check context integration

## 📊 Monitoring Setup

### Database Monitoring
```sql
-- Monitor context table sizes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename IN ('conversation_sessions', 'conversation_context', 'context_summaries');

-- Monitor session activity
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as sessions_created
FROM conversation_sessions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

### Application Monitoring
```typescript
// Add monitoring to ContextManager
export class ContextManager {
  private async logMetrics(operation: string, duration: number, success: boolean) {
    console.log(`🧠 CONTEXT METRICS: ${operation} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`)
    
    // Send to your monitoring service
    // analytics.track('context_operation', { operation, duration, success })
  }
}
```

### Performance Monitoring
```typescript
// Monitor context loading performance
const startTime = Date.now()
const contextResult = await contextManager.getIntelligentContext(userId, threadId)
const duration = Date.now() - startTime

if (duration > 1000) {
  console.warn(`🧠 SLOW CONTEXT LOAD: ${duration}ms for user ${userId}`)
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Session Not Restoring
```typescript
// Check localStorage
console.log('Session storage:', localStorage.getItem(`crewflow_session_${userId}`))

// Check session manager initialization
const sessionManager = getSessionManager(userId)
console.log('Session state:', sessionManager.getSessionState())
```

#### 2. Context Not Loading
```typescript
// Check context manager initialization
const contextManager = getContextManager()
const contextResult = await contextManager.getIntelligentContext(userId, threadId)
console.log('Context result:', contextResult)
```

#### 3. Database Connection Issues
```sql
-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'conversation_sessions';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('conversation_sessions', 'conversation_context');
```

#### 4. AI Summarization Failures
```typescript
// Check AI configuration
const aiConfig = getAIConfig()
console.log('AI config:', { ...aiConfig, openai: { ...aiConfig.openai, apiKey: '[REDACTED]' } })

// Test AI connection
try {
  const model = new ChatOpenAI(aiConfig.openai)
  const response = await model.invoke([new HumanMessage('Test')])
  console.log('AI test successful:', response.content)
} catch (error) {
  console.error('AI test failed:', error)
}
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Add additional indexes for performance
CREATE INDEX CONCURRENTLY idx_conversation_context_user_relevance 
ON conversation_context(user_id, relevance_score DESC, created_at DESC);

CREATE INDEX CONCURRENTLY idx_chat_history_session_importance 
ON chat_history(session_id, message_importance_score DESC, timestamp DESC);

-- Analyze tables for query optimization
ANALYZE conversation_sessions;
ANALYZE conversation_context;
ANALYZE context_summaries;
```

### Application Optimization
```typescript
// Implement context caching
const contextCache = new Map<string, any>()

export class ContextManager {
  private getCachedContext(key: string) {
    return contextCache.get(key)
  }
  
  private setCachedContext(key: string, context: any) {
    contextCache.set(key, context)
    // Expire cache after 5 minutes
    setTimeout(() => contextCache.delete(key), 5 * 60 * 1000)
  }
}
```

## 🔄 Rollback Plan

### Database Rollback
```sql
-- Rollback script (if needed)
DROP TABLE IF EXISTS context_summaries;
DROP TABLE IF EXISTS conversation_context;
DROP TABLE IF EXISTS conversation_sessions;

ALTER TABLE chat_threads 
DROP COLUMN IF EXISTS session_id,
DROP COLUMN IF EXISTS context_summary,
DROP COLUMN IF EXISTS store_context_snapshot,
DROP COLUMN IF EXISTS last_activity_at;

ALTER TABLE chat_history 
DROP COLUMN IF EXISTS session_id,
DROP COLUMN IF EXISTS context_metadata,
DROP COLUMN IF EXISTS message_importance_score;
```

### Code Rollback
```bash
# Revert to previous SimplifiedShopifyAIChat
git checkout HEAD~1 -- src/components/shopify/SimplifiedShopifyAIChat.tsx

# Revert AI Store Manager handler
git checkout HEAD~1 -- src/lib/chat/handlers/ai-store-manager.ts

# Remove context management files
rm -rf src/lib/context/
```

## ✅ Post-Deployment Verification

### Functional Tests
- [ ] New sessions create successfully
- [ ] Messages send and receive properly
- [ ] Context restores after page refresh
- [ ] Store context updates correctly
- [ ] Thread management works
- [ ] AI responses include context

### Performance Tests
- [ ] Context loading < 1 second
- [ ] Session operations < 500ms
- [ ] Database queries optimized
- [ ] Memory usage stable

### User Experience Tests
- [ ] Context status indicators work
- [ ] Session restoration notifications appear
- [ ] Conversation continuity maintained
- [ ] Store switching updates context

## 📞 Support

### Monitoring Dashboards
- Database performance metrics
- Context loading times
- Session restoration rates
- Error rates and logs

### Alerting
- Context loading failures
- Database connection issues
- AI summarization errors
- High memory usage

### Documentation
- [Enhanced Context Management Implementation](./ENHANCED_CONTEXT_MANAGEMENT_IMPLEMENTATION.md)
- [Context Integration Tests](./src/lib/context/__tests__/context-integration.test.ts)
- [Database Migration](./database/migrations/enhanced_context_management.sql)

---

## 🎯 Success Metrics

After successful deployment, monitor these key metrics:

- **Context Restoration Rate**: >95% successful session restorations
- **User Engagement**: Increased session duration and message count
- **Response Quality**: Improved user satisfaction with context-aware responses
- **Performance**: Context loading times under 1 second
- **Reliability**: <1% error rate in context operations

The Enhanced Context Management System transforms CrewFlow's Shopify AI from a stateless chat into an intelligent, memory-enabled assistant that provides truly personalized and context-aware interactions.
