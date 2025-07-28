// Enhanced AI Response Quality System
// Focuses on maximizing response quality and functional effectiveness

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getShopifyContextData } from '@/lib/agents/shopify-context'

export interface ResponseQualityContext {
  userId: string
  agentId: string
  threadId?: string
  userExperience: 'beginner' | 'intermediate' | 'expert'
  storeContext?: ShopifyStoreContext
  conversationHistory: ConversationMessage[]
  currentTask: string
  userPreferences: UserResponsePreferences
}

export interface ShopifyStoreContext {
  storeId: string
  storeName: string
  plan: string
  currency: string
  hasProducts: boolean
  productCount: number
  recentActivity: string[]
  connectedApps: string[]
  apiCapabilities: ShopifyAPICapability[]
}

export interface ShopifyAPICapability {
  endpoint: string
  method: string
  description: string
  requiredPermissions: string[]
  limitations: string[]
}

export interface UserResponsePreferences {
  communicationStyle: 'direct' | 'detailed' | 'conversational'
  technicalLevel: 'basic' | 'intermediate' | 'advanced'
  preferredResponseLength: 'concise' | 'moderate' | 'comprehensive'
  wantsExplanations: boolean
  prefersAlternatives: boolean
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  feedback?: ResponseFeedback
}

export interface ResponseFeedback {
  rating: number // 1-5
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'star_rating'
  improvementSuggestions?: string
  wasHelpful: boolean
}

export class EnhancedResponseSystem {
  private supabase = createSupabaseServerClient()

  async generateOptimalPrompt(context: ResponseQualityContext): Promise<string> {
    const basePrompt = this.buildShopifyExpertPrompt(context)
    const behaviorGuidelines = this.getBehaviorGuidelines(context)
    const technicalContext = await this.getShopifyTechnicalContext(context)
    const userContext = this.buildUserContext(context)

    return `${basePrompt}

${behaviorGuidelines}

${technicalContext}

${userContext}

## Response Quality Standards:
- Prioritize actionable, technically accurate advice
- Ask clarifying questions for ambiguous requests
- Recommend optimal solutions even if they differ from user requests
- Explain reasoning when proposing alternatives
- Provide specific, implementable steps
- Verify Shopify API compatibility before suggesting solutions

## Current Context:
${this.formatCurrentContext(context)}`
  }

  private buildShopifyExpertPrompt(context: ResponseQualityContext): string {
    return `You are CrewFlow's expert Shopify automation and advisory AI assistant. You combine maritime professionalism with authoritative e-commerce expertise.

## Core Identity:
- **Primary Role**: Shopify store management expert and automation advisor
- **Personality**: Friendly yet direct, professionally confident, maritime-themed
- **Expertise Level**: Definitive authority on Shopify capabilities and best practices
- **Communication Style**: Proactive, solution-oriented, technically precise

## Your Expertise Areas:
### 🏪 Store Management
- Store setup, configuration, and optimization
- Theme customization and performance optimization
- App ecosystem and integration recommendations
- Multi-store management strategies

### 📦 Product & Inventory Management
- Product creation, optimization, and SEO
- Inventory tracking and automation
- Variant management and pricing strategies
- Bulk operations and data management

### 🚀 Marketing & Sales Automation
- Email marketing automation
- Customer segmentation and targeting
- Abandoned cart recovery
- Upselling and cross-selling strategies

### 📊 Analytics & Reporting
- Performance metrics and KPI tracking
- Sales analysis and forecasting
- Customer behavior insights
- ROI optimization

### 🔧 Technical Integration
- API usage and limitations
- Webhook configuration
- Third-party app integrations
- Custom development guidance`
  }

  private getBehaviorGuidelines(context: ResponseQualityContext): string {
    return `## Behavioral Guidelines:

### Communication Approach:
- **Be Direct**: Get straight to actionable solutions
- **Ask Smart Questions**: Gather necessary context for optimal recommendations
- **Challenge When Needed**: Don't default to "customer is always right" - recommend better approaches
- **Explain Your Reasoning**: When suggesting alternatives, clearly explain why they're superior
- **Stay Professional**: Maintain maritime charm while being authoritative

### Response Structure:
1. **Immediate Action**: Start with what they can do right now
2. **Context Questions**: Ask for missing information if needed
3. **Optimal Solution**: Recommend the best approach, even if different from request
4. **Implementation Steps**: Provide specific, actionable steps
5. **Alternative Options**: Mention other viable approaches when relevant
6. **Next Steps**: Clear guidance on what to do after implementation

### Quality Checks:
- ✅ Is this technically feasible in Shopify?
- ✅ Are the API endpoints and permissions available?
- ✅ Have I provided specific implementation steps?
- ✅ Did I ask for necessary clarification?
- ✅ Is this the optimal solution for their situation?`
  }

  private async getShopifyTechnicalContext(context: ResponseQualityContext): Promise<string> {
    if (!context.storeContext) {
      return `## Technical Context:
⚠️ **Store Connection Required**: To provide accurate technical guidance, I need access to your store information. Please connect your Shopify store first.`
    }

    const capabilities = await this.getShopifyAPICapabilities(context.storeContext.plan)
    
    return `## Technical Context:
### Store Information:
- **Store**: ${context.storeContext.storeName}
- **Plan**: ${context.storeContext.plan}
- **Products**: ${context.storeContext.productCount} products
- **Currency**: ${context.storeContext.currency}

### Available API Capabilities:
${capabilities.map(cap => `- **${cap.endpoint}**: ${cap.description}`).join('\n')}

### Current Limitations:
${this.getStorePlanLimitations(context.storeContext.plan)}`
  }

  private buildUserContext(context: ResponseQualityContext): string {
    const prefs = context.userPreferences
    return `## User Context:
- **Experience Level**: ${context.userExperience}
- **Communication Style**: ${prefs.communicationStyle}
- **Technical Level**: ${prefs.technicalLevel}
- **Prefers Explanations**: ${prefs.wantsExplanations ? 'Yes' : 'No'}
- **Wants Alternatives**: ${prefs.prefersAlternatives ? 'Yes' : 'No'}
- **Response Length**: ${prefs.preferredResponseLength}`
  }

  private formatCurrentContext(context: ResponseQualityContext): string {
    const recentMessages = context.conversationHistory.slice(-3)
    return `**Current Task**: ${context.currentTask}
**Recent Conversation**:
${recentMessages.map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`).join('\n')}`
  }

  private async getShopifyAPICapabilities(plan: string): Promise<ShopifyAPICapability[]> {
    // Return plan-specific API capabilities
    const basicCapabilities: ShopifyAPICapability[] = [
      {
        endpoint: 'products',
        method: 'GET/POST/PUT',
        description: 'Full product management',
        requiredPermissions: ['read_products', 'write_products'],
        limitations: []
      },
      {
        endpoint: 'orders',
        method: 'GET/PUT',
        description: 'Order management and fulfillment',
        requiredPermissions: ['read_orders', 'write_orders'],
        limitations: []
      }
    ]

    if (plan === 'shopify_plus') {
      basicCapabilities.push({
        endpoint: 'flow',
        method: 'POST',
        description: 'Shopify Flow automation',
        requiredPermissions: ['write_flow'],
        limitations: []
      })
    }

    return basicCapabilities
  }

  private getStorePlanLimitations(plan: string): string {
    const limitations: Record<string, string[]> = {
      'basic': [
        'Limited to 2 staff accounts',
        'No advanced report builder',
        'Basic shipping rates only'
      ],
      'shopify': [
        'Limited to 5 staff accounts',
        'Standard reporting features'
      ],
      'advanced': [
        'Limited to 15 staff accounts',
        'Advanced reporting available'
      ],
      'shopify_plus': [
        'Unlimited staff accounts',
        'Full API access',
        'Custom checkout scripts'
      ]
    }

    return limitations[plan]?.map(limit => `- ${limit}`).join('\n') || 'No specific limitations identified'
  }

  async loadUserContext(userId: string, agentId: string): Promise<ResponseQualityContext> {
    // Load user preferences and conversation history
    const { data: userPrefs } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: recentHistory } = await this.supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_name', agentId)
      .order('timestamp', { ascending: false })
      .limit(10)

    // Load store context if available
    const storeContext = await getShopifyContextData(userId)

    return {
      userId,
      agentId,
      userExperience: this.determineUserExperience(recentHistory || []),
      storeContext,
      conversationHistory: this.formatConversationHistory(recentHistory || []),
      currentTask: 'general_assistance',
      userPreferences: this.parseUserPreferences(userPrefs)
    }
  }

  private determineUserExperience(history: any[]): 'beginner' | 'intermediate' | 'expert' {
    if (history.length < 5) return 'beginner'
    
    const technicalTerms = ['api', 'webhook', 'liquid', 'graphql', 'rest', 'json']
    const technicalMessages = history.filter(msg => 
      technicalTerms.some(term => msg.content.toLowerCase().includes(term))
    )

    if (technicalMessages.length > history.length * 0.3) return 'expert'
    if (technicalMessages.length > history.length * 0.1) return 'intermediate'
    return 'beginner'
  }

  private formatConversationHistory(history: any[]): ConversationMessage[] {
    return history.map(msg => ({
      role: msg.message_type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }))
  }

  private parseUserPreferences(prefs: any): UserResponsePreferences {
    return {
      communicationStyle: prefs?.preferences?.communicationStyle || 'direct',
      technicalLevel: prefs?.preferences?.technicalLevel || 'intermediate',
      preferredResponseLength: prefs?.preferences?.responseLength || 'moderate',
      wantsExplanations: prefs?.preferences?.wantsExplanations ?? true,
      prefersAlternatives: prefs?.preferences?.prefersAlternatives ?? true
    }
  }
}
