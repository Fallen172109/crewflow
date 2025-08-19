# CrewFlow Unified Chat API Architecture

## 🎯 Overview
This document outlines the architecture for consolidating all CrewFlow chat endpoints into a single, intelligent routing system that maintains feature parity while improving maintainability.

## 🏗️ Architecture Design

### **Core Endpoint**
- **Primary Route**: `/api/chat/route.ts`
- **Method**: POST
- **Purpose**: Single entry point for all chat interactions

### **Request Format (Unified)**
```typescript
interface UnifiedChatRequest {
  // Core message data
  message: string
  
  // Routing parameters
  agentId?: string           // For general agents (coral, sage, helm, etc.)
  chatType: 'agent' | 'shopify-ai' | 'ai-store-manager' | 'meal-planning'
  
  // Context parameters
  taskType?: string          // Task context (general, business_automation, etc.)
  threadId: string           // Required for all conversations
  
  // Optional parameters
  attachments?: UploadedFile[]
  userId?: string            // Legacy support
  
  // Meal planning specific (when chatType = 'meal-planning')
  mealPlanningContext?: {
    conversation_history?: any[]
    user_profile?: any
    pantry_items?: any[]
    recent_meal_plans?: any[]
    dietary_restrictions?: any[]
    nutritional_targets?: any
    context_summary?: string
    request_intent?: string
  }
}
```

### **Response Format (Unified)**
```typescript
interface UnifiedChatResponse {
  // Core response
  response: string
  success: boolean
  
  // Context information
  threadId: string
  messageId?: string
  
  // Agent information
  agent?: {
    id: string
    name: string
    framework: string
  }
  
  // Usage tracking
  usage?: number
  limit?: number
  tokensUsed?: number
  
  // Specialized responses
  meal_plan?: any           // For meal planning
  context_used?: boolean    // For meal planning
  
  // Error handling
  error?: string
  details?: any
}
```

## 🧠 Intelligent Routing Logic

### **1. Chat Type Detection**
```typescript
function detectChatType(request: UnifiedChatRequest): string {
  // Explicit chat type provided
  if (request.chatType) return request.chatType
  
  // Agent-based detection
  if (request.agentId) {
    const agent = getAgent(request.agentId)
    if (agent?.shopifySpecialized) return 'shopify-ai'
    return 'agent'
  }
  
  // Context-based detection
  if (request.mealPlanningContext) return 'meal-planning'
  if (request.taskType === 'business_automation') return 'ai-store-manager'
  
  // Default fallback
  return 'agent'
}
```

### **2. Handler Routing**
```typescript
interface ChatHandler {
  canHandle(request: UnifiedChatRequest): boolean
  process(request: UnifiedChatRequest): Promise<UnifiedChatResponse>
}

const handlers: Record<string, ChatHandler> = {
  'agent': new GeneralAgentHandler(),
  'shopify-ai': new ShopifyAIHandler(),
  'ai-store-manager': new AIStoreManagerHandler(),
  'meal-planning': new MealPlanningHandler()
}
```

## 📁 File Structure

### **Core Router**
- `/api/chat/route.ts` - Main unified endpoint
- `/lib/chat/router.ts` - Routing logic and handler management
- `/lib/chat/types.ts` - Unified type definitions

### **Handler Modules**
- `/lib/chat/handlers/general-agent.ts` - General agent chat logic
- `/lib/chat/handlers/shopify-ai.ts` - Shopify AI specialized logic
- `/lib/chat/handlers/ai-store-manager.ts` - AI Store Manager logic
- `/lib/chat/handlers/meal-planning.ts` - Meal planning logic

### **Shared Utilities**
- `/lib/chat/utils/validation.ts` - Request validation
- `/lib/chat/utils/response-formatter.ts` - Response formatting
- `/lib/chat/utils/thread-manager.ts` - Thread management utilities
- `/lib/chat/utils/usage-tracker.ts` - Usage tracking utilities

## 🔄 Migration Strategy

### **Phase 1: Create Unified System**
1. Implement core router and handler architecture
2. Create modular handlers from existing logic
3. Maintain all existing functionality

### **Phase 2: Backward Compatibility**
1. Keep existing endpoints active
2. Add redirect logic to new unified endpoint
3. Update frontend components gradually

### **Phase 3: Deprecation**
1. Update all frontend components
2. Add deprecation warnings to old endpoints
3. Remove old endpoints after transition period

## 🎛️ Handler Specifications

### **GeneralAgentHandler**
- **Purpose**: Handle all general agents (coral, sage, helm, etc.)
- **Framework Support**: LangChain, Perplexity, AutoGen, Hybrid
- **Key Features**: Intelligent routing, referral system, multi-framework support

### **ShopifyAIHandler**
- **Purpose**: Shopify-specific AI interactions
- **Framework**: LangChain with OpenAI
- **Key Features**: Shopify API integration, store context, task-specific prompts

### **AIStoreManagerHandler**
- **Purpose**: AI Store Manager functionality
- **Framework**: LangChain with OpenAI
- **Key Features**: Store management, business automation

### **MealPlanningHandler**
- **Purpose**: Meal planning AI interactions
- **Framework**: LangChain with OpenAI
- **Key Features**: Nutritional analysis, pantry integration, meal plan generation

## 🔒 Security & Validation

### **Request Validation**
- Authentication required for all requests
- Thread ownership validation
- Agent access permission checks
- File attachment security validation

### **Rate Limiting**
- Per-user rate limiting
- Per-agent usage tracking
- Cost-based throttling

## 📊 Analytics & Monitoring

### **Usage Tracking**
- Unified usage analytics across all chat types
- Cost tracking per provider/model
- Performance metrics and latency monitoring

### **Error Handling**
- Centralized error logging
- Graceful degradation
- Detailed error responses for debugging

## 🚀 Benefits

1. **Simplified Architecture**: Single endpoint reduces complexity
2. **Improved Maintainability**: Modular handlers are easier to maintain
3. **Consistent API**: Unified request/response formats
4. **Better Analytics**: Centralized tracking and monitoring
5. **Enhanced Security**: Consistent validation and authentication
6. **Future-Proof**: Easy to add new chat types and handlers
