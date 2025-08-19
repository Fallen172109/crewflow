# CrewFlow AI Usage Analytics System

## 🎯 Overview

The CrewFlow AI Usage Analytics System provides comprehensive monitoring and cost tracking for all AI agent interactions across the platform. This system enables administrators to monitor usage patterns, track costs, optimize performance, and make data-driven decisions about AI resource allocation.

## 📊 Features

### Core Analytics
- **Real-time Usage Tracking**: Monitor all AI agent requests with detailed metrics
- **Cost Calculation**: Automatic cost calculation based on current API pricing
- **Performance Monitoring**: Track response times and success rates
- **Multi-Provider Support**: OpenAI, Anthropic, Perplexity, Google, and more
- **Framework Analytics**: Track usage across LangChain, AutoGen, Perplexity, and Hybrid frameworks

### Dashboard Components
- **Usage Summary Cards**: Total requests, costs, tokens, success rates
- **Cost Breakdown**: Spending analysis by provider and framework
- **Agent Performance**: Usage statistics for each AI agent
- **User Analytics**: Top users by consumption and activity
- **Trend Analysis**: Daily, weekly, and monthly usage patterns

### Filtering & Export
- **Advanced Filters**: Date range, user, agent, framework, provider, request type
- **Search Capabilities**: Find specific usage records quickly
- **CSV Export**: Export filtered data for external analysis
- **Real-time Updates**: Live data with automatic refresh

## 🗄️ Database Schema

### agent_usage_detailed
Primary table for detailed usage tracking:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to users)
- agent_id: TEXT (Agent identifier)
- agent_name: TEXT (Human-readable agent name)
- framework: TEXT (langchain, perplexity, autogen, hybrid)
- provider: TEXT (openai, anthropic, perplexity, google, other)
- message_type: TEXT (chat, preset_action, tool_execution)
- input_tokens: INTEGER
- output_tokens: INTEGER
- total_tokens: INTEGER (Generated column)
- cost_usd: DECIMAL(10,6)
- response_time_ms: INTEGER
- success: BOOLEAN
- error_message: TEXT
- request_metadata: JSONB
- timestamp: TIMESTAMP WITH TIME ZONE
```

### agent_performance_metrics
Daily aggregated performance metrics:
```sql
- id: UUID (Primary Key)
- user_id: UUID
- agent_id: TEXT
- agent_name: TEXT
- framework: TEXT
- provider: TEXT
- date: DATE
- total_requests: INTEGER
- successful_requests: INTEGER
- failed_requests: INTEGER
- total_input_tokens: INTEGER
- total_output_tokens: INTEGER
- total_tokens: INTEGER
- total_cost_usd: DECIMAL(10,6)
- avg_response_time_ms: INTEGER
- popular_actions: JSONB
```

### system_analytics
System-wide daily analytics:
```sql
- id: UUID (Primary Key)
- date: DATE
- total_users: INTEGER
- active_users: INTEGER
- new_users: INTEGER
- total_requests: INTEGER
- successful_requests: INTEGER
- failed_requests: INTEGER
- total_input_tokens: INTEGER
- total_output_tokens: INTEGER
- total_tokens: INTEGER
- total_cost_usd: DECIMAL(12,6)
- cost_by_provider: JSONB
- avg_response_time_ms: INTEGER
- success_rate: DECIMAL(5,2)
- popular_agents: JSONB
- framework_usage: JSONB
- provider_usage: JSONB
- top_users_by_usage: JSONB
```

## 💰 Cost Calculation

### Supported Providers & Models

**OpenAI**
- GPT-4o: $0.0025/$0.01 per 1K tokens (input/output)
- GPT-4o Mini: $0.00015/$0.0006 per 1K tokens
- GPT-4 Turbo: $0.01/$0.03 per 1K tokens
- GPT-3.5 Turbo: $0.0005/$0.0015 per 1K tokens

**Anthropic**
- Claude 3.5 Sonnet: $0.003/$0.015 per 1K tokens
- Claude 3 Opus: $0.015/$0.075 per 1K tokens
- Claude 3 Haiku: $0.00025/$0.00125 per 1K tokens

**Perplexity**
- Llama 3.1 Sonar Small: $0.0002/$0.0002 per 1K tokens
- Llama 3.1 Sonar Large: $0.001/$0.001 per 1K tokens
- Llama 3.1 Sonar Huge: $0.005/$0.005 per 1K tokens

**Google**
- Gemini 1.5 Pro: $0.00125/$0.005 per 1K tokens
- Gemini 1.5 Flash: $0.000075/$0.0003 per 1K tokens

### Cost Calculation Features
- Real-time cost calculation based on current pricing
- Automatic model detection and pricing lookup
- Support for different input/output token pricing
- Cost aggregation by provider, agent, and user
- Historical cost tracking and trend analysis

## 🔐 Security & Access Control

### Row Level Security (RLS)
- Users can only view their own usage data
- Admins have full access to all analytics data
- System analytics restricted to admin users only

### Admin Authentication
- Multi-layer admin verification
- Secure admin promotion system
- Audit logging for all admin actions
- Session-based authentication with middleware protection

## 📈 Usage Tracking Integration

### Agent API Integration
All agent APIs automatically track:
```typescript
await trackDetailedUsage(
  userId,
  agentId,
  agentName,
  framework,
  provider,
  messageType,
  inputTokens,
  outputTokens,
  responseTimeMs,
  success,
  errorMessage,
  requestMetadata,
  model
)
```

### Automatic Tracking
- Request start/end time measurement
- Token consumption tracking
- Error handling and logging
- Metadata collection for analysis
- Cost calculation and storage

## 🚀 API Endpoints

### Admin Analytics API
- `GET /admin/usage-analytics` - Main analytics dashboard
- `GET /admin/usage-analytics/export` - CSV export functionality
- `GET /admin/usage-analytics/test` - System testing page

### Usage Analytics Functions
- `getUsageRecords(filters, limit, offset)` - Fetch detailed records
- `getUsageSummary(filters)` - Get aggregated metrics
- `trackDetailedUsage(...)` - Record new usage data
- `exportUsageToCSV(records)` - Export data to CSV format

## 🎨 UI Components

### Dashboard Components
- `UsageAnalyticsSummary` - Summary cards and metrics
- `UsageAnalyticsTable` - Detailed usage records table
- `UsageAnalyticsFilters` - Advanced filtering interface
- `CostByProviderChart` - Provider cost breakdown
- `UsageByAgentChart` - Agent usage distribution
- `DailyUsageChart` - Usage trends over time

### Features
- Responsive design for all screen sizes
- Real-time data updates
- Interactive filtering and sorting
- Export functionality with progress indicators
- Maritime-themed design consistent with CrewFlow

## 🔧 Configuration

### Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Default Models
The system uses default models for cost calculation when specific models aren't provided:
- OpenAI: gpt-4o-mini
- Anthropic: claude-3-haiku
- Perplexity: llama-3.1-sonar-small-128k-online
- Google: gemini-1.5-flash

## 📊 Analytics Insights

### Key Metrics Tracked
1. **Usage Volume**: Total requests, tokens processed
2. **Cost Analysis**: Spending by provider, agent, user
3. **Performance**: Response times, success rates
4. **User Behavior**: Most active users, popular agents
5. **Trends**: Daily/weekly/monthly patterns
6. **Efficiency**: Cost per request, tokens per dollar

### Business Intelligence
- Identify high-cost users and usage patterns
- Optimize agent performance and costs
- Track ROI of different AI providers
- Monitor system health and reliability
- Plan capacity and budget allocation

## 🧪 Testing

### Test Coverage
- Cost calculation accuracy
- Database query performance
- Filter functionality
- Export capabilities
- Access control verification
- Real-time data updates

### Test Page
Visit `/admin/usage-analytics/test` to run system tests and verify functionality.

## 🚀 Future Enhancements

### Planned Features
- Real-time alerts for high usage/costs
- Predictive cost modeling
- Advanced visualization charts
- API rate limiting based on usage
- Automated cost optimization recommendations
- Integration with billing systems
- Custom reporting and dashboards

### Scalability Considerations
- Database partitioning for large datasets
- Caching for frequently accessed data
- Background aggregation jobs
- API rate limiting and throttling
- Data archival and cleanup policies

## 📞 Support

For questions or issues with the AI Usage Analytics System:
1. Check the test page for system status
2. Review the admin audit logs
3. Contact the development team
4. Submit issues through the admin dashboard

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Compatibility**: CrewFlow v2.0+
