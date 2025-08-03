# AI Response Caching System

## Overview

CrewFlow now includes an intelligent AI response caching system that significantly reduces API costs and improves response times by caching AI model responses and serving them for similar queries.

## Key Benefits

- **Cost Reduction**: Eliminates duplicate API calls to expensive models (GPT-4, Perplexity)
- **Performance Improvement**: Cached responses are served in milliseconds vs seconds
- **Better User Experience**: Faster responses for repeated or similar queries
- **Scalability**: Reduces load on AI providers and improves system scalability

## How It Works

### 1. Cache Key Generation
The system generates unique cache keys based on:
- Message content hash (SHA-256)
- Agent ID and framework
- System prompt hash
- Model configuration (temperature, max tokens, etc.)
- User context (for personalized responses)

### 2. Intelligent TTL (Time To Live)
Different types of queries have different cache durations:

- **General queries**: 2 hours
- **Personalized queries**: 30 minutes
- **Time-sensitive queries**: 15 minutes
- **Knowledge-based queries**: 6 hours

### 3. Agent-Specific Configuration
Each agent has optimized cache settings:

- **Shopify agents** (shopify-ai, ai-store-manager): 15 minutes
- **Research agents** (pearl, anchor): 45-60 minutes
- **Creative agents** (splash, drake): 2 hours
- **Multi-agent workflows** (flint, beacon): 2 hours

## Implementation

### Automatic Integration
The caching system is automatically integrated into all AI frameworks:

```typescript
// LangChain agents
const response = await withAICache(params, () => model.invoke(prompt))

// Perplexity agents
const response = await withAICache(params, () => callPerplexityAPI(message))

// AutoGen workflows
const response = await withAICache(params, () => executeWorkflow(message))
```

### Cache Configuration
Configure caching behavior in `src/lib/ai/cache-config.ts`:

```typescript
export const AI_CACHE_CONFIG = {
  enabled: true,
  defaultTTL: 1 * HOUR,
  queryTypeTTL: {
    general: 2 * HOUR,
    personalized: 30 * MINUTE,
    time_sensitive: 15 * MINUTE,
    knowledge: 6 * HOUR
  }
}
```

## Query Type Detection

The system automatically detects query types:

- **Time-sensitive**: Contains "today", "now", "current", "latest"
- **Personalized**: Contains "my", "I", "me" or Shopify-related queries
- **Knowledge**: Contains "what is", "how to", "explain", "define"
- **General**: All other queries

## Cache Storage

- **In-memory**: Fast access for active cache entries
- **Database persistence**: Supabase storage for cache durability
- **Automatic cleanup**: Expired entries are automatically removed

## Monitoring & Analytics

### Cache Statistics
Track cache performance:
- Hit rate percentage
- Total hits vs misses
- Cost savings estimates
- Performance improvements

### Admin Interface
Use the AI Cache Monitor component:
```typescript
import AICacheMonitor from '@/components/admin/AICacheMonitor'
```

### Test Endpoint
Test cache performance:
```bash
POST /api/test/ai-cache
{
  "action": "test_cache_performance",
  "agentId": "anchor",
  "message": "Test message"
}
```

## Environment Configuration

Control caching behavior with environment variables:

```env
# Disable caching (default: enabled)
AI_CACHE_ENABLED=false

# Custom cache settings can be added as needed
```

## Cache Invalidation

### Automatic Invalidation
- Time-based expiration (TTL)
- LRU eviction for memory management

### Manual Invalidation
```typescript
// Clear all AI cache
await aiCacheManager.invalidateByTags(['ai_response'])

// Clear cache for specific agent
await aiCacheManager.invalidateByTags(['agent:anchor'])

// Clear cache for specific user
await aiCacheManager.invalidateByTags(['user:user-id'])
```

## Performance Impact

### Before Caching
- Every query hits AI APIs
- 2-5 second response times
- High API costs
- Poor scalability

### After Caching
- Cache hit rates of 30-70% typical
- Sub-second response times for cached queries
- Significant cost reduction
- Better scalability

### Example Performance Gains
- **First call**: 2.5 seconds (API call)
- **Second call**: 50ms (cache hit)
- **Speed improvement**: 98% faster
- **Cost savings**: $0.006 per cached request

## Best Practices

### For Developers
1. Use appropriate query types for optimal caching
2. Consider user context for personalized responses
3. Monitor cache hit rates and adjust TTL as needed
4. Use cache invalidation strategically

### For Administrators
1. Monitor cache performance regularly
2. Adjust TTL settings based on usage patterns
3. Clear cache when deploying prompt changes
4. Track cost savings and performance improvements

## Troubleshooting

### Low Cache Hit Rate
- Check if queries are too personalized
- Verify TTL settings aren't too short
- Ensure cache keys are consistent

### High Memory Usage
- Reduce cache size limits
- Implement more aggressive cleanup
- Consider shorter TTL for large responses

### Stale Responses
- Reduce TTL for time-sensitive queries
- Implement cache invalidation triggers
- Use appropriate query type detection

## Future Enhancements

- **Semantic similarity**: Cache similar (not just identical) queries
- **Predictive caching**: Pre-cache likely queries
- **Distributed caching**: Redis integration for multi-instance deployments
- **Advanced analytics**: Detailed cost and performance tracking
