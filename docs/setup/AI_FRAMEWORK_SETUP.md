# CrewFlow AI Framework Setup Guide

## Overview
This document outlines the complete setup requirements for CrewFlow's AI framework infrastructure, including all required API keys, environment variables, and configuration steps.

## ✅ Core AI Framework Infrastructure Status

### Completed Components:
1. **AI Configuration System** (`src/lib/ai/config.ts`)
   - Centralized configuration for all AI frameworks
   - Environment variable management
   - Model selection and parameter tuning
   - Error handling configuration

2. **LangChain Framework** (`src/lib/ai/langchain-working.ts`)
   - Complete implementation using @langchain/openai
   - Support for OpenAI GPT models
   - System prompt management
   - Preset action handling
   - Error handling and token tracking

3. **Perplexity AI Framework** (`src/lib/ai/perplexity.ts`)
   - Real-time web research capabilities
   - Source citation and fact-checking
   - Market research and trend analysis
   - Competitive intelligence features

4. **AutoGen Framework** (`src/lib/ai/autogen.ts`)
   - Multi-agent workflow orchestration
   - Planning, execution, review, and coordination agents
   - Complex task breakdown and management
   - Agent step tracking and token estimation

5. **Hybrid Agent System** (`src/lib/ai/index.ts`)
   - Intelligent framework selection based on request type
   - Unified response interface across all frameworks
   - Agent factory and caching system
   - Framework routing and error handling

## 🔑 Required API Keys and Environment Variables

### Essential API Keys (Required for Core Functionality):

```bash
# OpenAI API Key (Required for LangChain and AutoGen)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Perplexity AI API Key (Required for Perplexity agents)
PERPLEXITY_API_KEY=pplx-your-perplexity-api-key-here

# Anthropic API Key (Optional - for Claude models in LangChain)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

### Optional Model Configuration:
```bash
# Override default models (optional)
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
PERPLEXITY_MODEL=llama-3.1-sonar-large-128k-online
```

### Integration Hub OAuth Configuration:
```bash
# Salesforce
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret

# HubSpot
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret

# Shopify
SHOPIFY_CLIENT_ID=your-shopify-client-id
SHOPIFY_CLIENT_SECRET=your-shopify-client-secret

# Google Ads
GOOGLE_ADS_CLIENT_ID=your-google-ads-client-id
GOOGLE_ADS_CLIENT_SECRET=your-google-ads-client-secret

# Facebook Ads
FACEBOOK_ADS_CLIENT_ID=your-facebook-ads-client-id
FACEBOOK_ADS_CLIENT_SECRET=your-facebook-ads-client-secret

# Slack
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# And more... (see src/lib/integrations/config.ts for full list)
```

## 🚀 Framework Capabilities

### LangChain Framework
- **Best for**: Customer support, HR, finance, IT service desk
- **Capabilities**: 
  - Deep integration with business systems
  - Memory management and conversation context
  - Custom agent development
  - Task orchestration

### Perplexity AI Framework  
- **Best for**: Content creation, market research, competitive analysis
- **Capabilities**:
  - Real-time web search and research
  - Source citation and fact-checking
  - Trend analysis and market intelligence
  - Current events and news analysis

### AutoGen Framework
- **Best for**: Workflow automation, project management, complex processes
- **Capabilities**:
  - Multi-agent collaboration
  - Complex task breakdown
  - Process optimization
  - Workflow coordination

### Hybrid Framework
- **Intelligent Routing**: Automatically selects the best framework based on:
  - Research keywords → Perplexity AI
  - Workflow/automation keywords → AutoGen  
  - General business tasks → LangChain

## 🔧 Framework Selection Logic

The hybrid agent system automatically routes requests:

```typescript
// Research, trends, current events → Perplexity AI
if (message.includes('research') || message.includes('trend') || message.includes('current')) {
  return 'perplexity'
}

// Workflows, automation, processes → AutoGen
if (message.includes('workflow') || message.includes('automate') || message.includes('process')) {
  return 'autogen'
}

// Default to LangChain for general tasks
return 'langchain'
```

## 📋 Setup Checklist

### Phase 1: Core AI Setup (Required)
- [ ] Set `OPENAI_API_KEY` environment variable
- [ ] Set `PERPLEXITY_API_KEY` environment variable  
- [ ] Test basic agent functionality
- [ ] Verify framework routing works

### Phase 2: Enhanced Features (Optional)
- [ ] Set `ANTHROPIC_API_KEY` for Claude models
- [ ] Configure OAuth clients for integrations
- [ ] Test integration hub functionality
- [ ] Set up monitoring and analytics

### Phase 3: Production Deployment
- [ ] Secure API key storage (Supabase Vault)
- [ ] Set up rate limiting and usage tracking
- [ ] Configure error monitoring
- [ ] Implement backup/fallback systems

## 🧪 Testing the Framework

### Basic Framework Test:
```typescript
import { processAgentMessage } from '@/lib/ai'
import { getAgent } from '@/lib/agents'

// Test LangChain agent
const coral = getAgent('coral')
const response = await processAgentMessage(
  coral!, 
  "Help me create a customer support response template",
  undefined,
  "You are a helpful customer support specialist."
)

console.log('LangChain Response:', response)
```

### Framework Routing Test:
```typescript
// Should route to Perplexity AI
const researchResponse = await processAgentMessage(
  pearl!, 
  "Research the latest trends in AI automation"
)

// Should route to AutoGen  
const workflowResponse = await processAgentMessage(
  flint!,
  "Create an automated workflow for customer onboarding"
)
```

## ⚠️ Known Limitations

1. **LangChain Dependencies**: Some advanced LangChain features require additional packages that have version conflicts. Current implementation uses core functionality only.

2. **Token Estimation**: Token usage tracking is estimated rather than exact for some frameworks.

3. **Rate Limiting**: API rate limiting is handled by the underlying services but not enforced at the framework level.

## 🔄 Next Steps

1. **Test Core Functionality**: Verify all three frameworks work with provided API keys
2. **Implement Individual Agents**: Build specific agent implementations (Coral, Mariner, Pearl, etc.)
3. **Add Integration Testing**: Create comprehensive tests for all framework combinations
4. **Optimize Performance**: Add caching, connection pooling, and performance monitoring

## 📞 Support

If you encounter issues:
1. Check API key validity and permissions
2. Verify environment variables are loaded correctly
3. Check network connectivity to AI services
4. Review error logs for specific framework issues

The core AI framework infrastructure is now complete and ready for agent implementation!
