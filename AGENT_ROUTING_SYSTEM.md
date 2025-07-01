# CrewFlow Intelligent Agent Routing System

## Overview

The CrewFlow platform now features an intelligent agent routing and specialization system that automatically detects when a user's question falls outside an agent's domain expertise and provides contextual referrals to specialist agents.

## Key Features

### 🎯 Smart Domain Detection
- Analyzes user messages using keyword matching and context understanding
- Identifies primary domain (social media, finance, technical, etc.)
- Calculates confidence scores for routing decisions
- Determines question complexity (basic, intermediate, advanced)

### 🚢 Maritime-Themed Referrals
- Maintains CrewFlow's maritime personality during referrals
- Uses nautical terminology ("navigator", "chart course", "crew member")
- Provides contextual explanations for why specialists are better suited

### 📊 Analytics & Optimization
- Tracks all referral events in the database
- Provides admin dashboard with referral analytics
- Monitors referral effectiveness and success rates
- Identifies top performing agent pairs

### 🧠 Intelligent Decision Making
- Only refers when truly necessary (not for basic questions)
- Considers agent specializations and available tools
- Maintains conversation continuity
- Avoids over-referrals that could frustrate users

## Agent Specialization Matrix

| Agent | Domain | Expertise Areas |
|-------|--------|----------------|
| **Coral** | Customer Support | Support workflows, customer communication, help desk |
| **Splash** | Social Media | Social strategy, content creation, community management |
| **Anchor** | Supply Chain | Inventory management, procurement, logistics |
| **Sage** | Knowledge | Document search, information retrieval, knowledge management |
| **Helm** | Content | Content creation, copywriting, content strategy |
| **Ledger** | Finance | Financial analysis, budgeting, financial reporting |
| **Patch** | Technical | IT support, troubleshooting, system integration |
| **Pearl** | Research | Research & analytics, data analysis, market intelligence |
| **Flint** | Marketing | Marketing automation, campaigns, lead generation |
| **Beacon** | Project Management | Task coordination, workflow optimization, project planning |
| **Drake** | E-commerce | Online sales, product management, e-commerce optimization |

## How It Works

### 1. Domain Analysis
When a user sends a message, the system:
- Analyzes the message for domain-specific keywords
- Calculates confidence scores for each domain
- Determines the primary domain and complexity level
- Decides if specialist expertise is required

### 2. Referral Decision
The system evaluates:
- Current agent's specialization vs. detected domain
- Question complexity and confidence level
- Availability of suitable specialist agents
- Whether the question requires specialized tools/knowledge

### 3. Response Generation
If referral is needed:
- Generates maritime-themed referral response
- Explains why the specialist is better suited
- Provides clear call-to-action to visit specialist
- Tracks the referral for analytics

### 4. Analytics Tracking
All referrals are tracked with:
- Source and target agent information
- Original message and detected domain
- Confidence scores and referral reasons
- Timestamp and user context

## Example Referral Responses

### Social Media Question to Coral
**User**: "I need help creating a comprehensive Instagram marketing strategy with content calendar and engagement optimization"

**Coral's Response**: 
> "Ahoy! While I can provide some guidance on this topic, our specialist **Splash** is your best navigator for specialized social media expertise and tools. They have the maritime skills and specialized tools designed specifically for this type of challenge. You can find Splash in your crew dashboard - they'll chart the perfect course for your social media needs!"

### Financial Question to Splash
**User**: "Can you help me analyze our quarterly budget and create financial forecasts?"

**Splash's Response**:
> "I can offer some initial direction, but **Ledger** is the crew member you want for this voyage! They specialize in specialized finance expertise and tools and have the right tools to help you navigate these waters successfully. Set sail to Ledger's station in your dashboard for expert guidance."

## Configuration

### Domain Keywords
The system uses comprehensive keyword mappings for each domain:

```typescript
const DOMAIN_KEYWORDS = {
  social: ['social media', 'facebook', 'instagram', 'content calendar', ...],
  finance: ['budget', 'financial', 'roi', 'cash flow', ...],
  technical: ['API', 'integration', 'troubleshooting', 'system', ...],
  // ... more domains
}
```

### Referral Thresholds
- **Minimum Confidence**: 0.5 (50%)
- **Complexity Requirement**: Not 'basic'
- **Domain Mismatch**: Required for referral
- **Specialist Availability**: Must have matching specialist

## Admin Analytics

### Key Metrics
- **Total Referrals**: Overall referral volume
- **Success Rate**: High-confidence referrals percentage
- **Average Confidence**: Mean confidence score
- **Active Agents**: Number of agents participating in referrals

### Analytics Views
- **Top Referring Agents**: Which agents make most referrals
- **Most Referred-To Agents**: Which specialists receive most referrals
- **Domain Distribution**: Most common referral domains
- **Top Performing Pairs**: Most successful agent-to-agent referrals
- **Time-based Trends**: Referral patterns over time

## Database Schema

### agent_referrals Table
```sql
CREATE TABLE agent_referrals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source_agent_id TEXT NOT NULL,
  target_agent_id TEXT NOT NULL,
  original_message TEXT NOT NULL,
  domain_detected TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  referral_reason TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  thread_id TEXT,
  session_id TEXT
);
```

## API Endpoints

### Analytics Endpoints
- `GET /api/admin/referral-analytics` - Get referral analytics
- `GET /api/admin/referral-effectiveness` - Get effectiveness metrics

### Parameters
- `startDate`: Start date for analytics (YYYY-MM-DD)
- `endDate`: End date for analytics (YYYY-MM-DD)
- `userId`: Optional user filter

## Testing

The system includes comprehensive tests covering:
- Domain detection accuracy
- Referral decision logic
- Response generation quality
- Edge cases and error handling
- Integration workflows

Run tests with:
```bash
npm test src/lib/ai/__tests__/agent-routing.test.ts
```

## Benefits

### For Users
- **Better Expertise**: Directed to the right specialist for their needs
- **Faster Resolution**: Specialists have the right tools and knowledge
- **Consistent Experience**: Maritime theming maintained throughout
- **No Dead Ends**: Always get helpful guidance, even during referrals

### For Administrators
- **Usage Insights**: Understand how agents are being used
- **Optimization Data**: Identify gaps in agent capabilities
- **Performance Metrics**: Track referral success rates
- **User Behavior**: Analyze cross-agent usage patterns

### For the Platform
- **Improved Efficiency**: Users reach the right expertise faster
- **Better User Experience**: Reduced frustration from mismatched agents
- **Data-Driven Optimization**: Analytics inform agent improvements
- **Scalable Architecture**: Easy to add new agents and domains

## Future Enhancements

- **Machine Learning**: Train models on referral success patterns
- **Dynamic Routing**: Real-time adjustment based on agent availability
- **User Preferences**: Learn individual user routing preferences
- **Cross-Agent Collaboration**: Enable agents to work together on complex tasks
- **Predictive Routing**: Anticipate user needs based on conversation context
