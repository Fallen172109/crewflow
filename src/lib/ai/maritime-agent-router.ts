// Maritime Agent Router
// Intelligently routes requests to appropriate CrewFlow maritime agents based on expertise and task complexity

import { Agent, AGENTS } from '@/lib/agents'
import { IntentAnalysis } from './advanced-intent-recognition'

export interface AgentExpertise {
  agentId: string
  agent: Agent
  shopifyCapabilities: string[]
  primaryDomains: string[]
  secondaryDomains: string[]
  complexityLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
  maritimePersonality: string
  preferredTaskTypes: string[]
}

export interface RoutingDecision {
  selectedAgent: Agent
  confidence: number
  reasoning: string
  fallbackAgents: Agent[]
  requiresMultiAgent: boolean
  estimatedComplexity: 'low' | 'medium' | 'high'
}

export class MaritimeAgentRouter {
  private agentExpertiseMap: Map<string, AgentExpertise>

  constructor() {
    this.agentExpertiseMap = new Map()
    this.initializeAgentExpertise()
  }

  private initializeAgentExpertise(): void {
    // Define expertise for each maritime agent with Shopify specializations
    const expertiseDefinitions: AgentExpertise[] = [
      {
        agentId: 'anchor',
        agent: AGENTS.anchor,
        shopifyCapabilities: [
          'inventory_management', 'stock_tracking', 'supplier_management', 
          'purchase_orders', 'cost_optimization', 'supply_chain_analytics'
        ],
        primaryDomains: ['inventory', 'supply_chain', 'procurement', 'logistics'],
        secondaryDomains: ['cost_analysis', 'vendor_management', 'forecasting'],
        complexityLevel: 'expert',
        maritimePersonality: 'Steadfast quartermaster ensuring supplies never run out',
        preferredTaskTypes: ['inventory_update', 'stock_analysis', 'supplier_evaluation']
      },
      {
        agentId: 'sage',
        agent: AGENTS.sage,
        shopifyCapabilities: [
          'product_research', 'market_analysis', 'competitor_research',
          'seo_optimization', 'content_strategy', 'knowledge_management'
        ],
        primaryDomains: ['research', 'knowledge', 'content', 'seo'],
        secondaryDomains: ['market_intelligence', 'documentation', 'training'],
        complexityLevel: 'advanced',
        maritimePersonality: 'Wise navigator charting courses through information seas',
        preferredTaskTypes: ['product_research', 'market_analysis', 'content_optimization']
      },
      {
        agentId: 'helm',
        agent: AGENTS.helm,
        shopifyCapabilities: [
          'store_management', 'workflow_automation', 'process_optimization',
          'system_integration', 'operational_efficiency', 'task_coordination'
        ],
        primaryDomains: ['automation', 'operations', 'workflows', 'integration'],
        secondaryDomains: ['process_improvement', 'system_management', 'coordination'],
        complexityLevel: 'advanced',
        maritimePersonality: 'Skilled helmsman steering operations toward success',
        preferredTaskTypes: ['workflow_setup', 'automation_config', 'process_optimization']
      },
      {
        agentId: 'ledger',
        agent: AGENTS.ledger,
        shopifyCapabilities: [
          'financial_analysis', 'pricing_strategy', 'revenue_optimization',
          'cost_tracking', 'profit_analysis', 'financial_reporting'
        ],
        primaryDomains: ['finance', 'pricing', 'revenue', 'accounting'],
        secondaryDomains: ['budgeting', 'forecasting', 'cost_management'],
        complexityLevel: 'advanced',
        maritimePersonality: 'Meticulous treasurer managing the ship\'s financial course',
        preferredTaskTypes: ['pricing_analysis', 'financial_reporting', 'revenue_optimization']
      },
      {
        agentId: 'patch',
        agent: AGENTS.patch,
        shopifyCapabilities: [
          'technical_support', 'troubleshooting', 'system_maintenance',
          'integration_fixes', 'performance_optimization', 'bug_resolution'
        ],
        primaryDomains: ['technical', 'maintenance', 'troubleshooting', 'support'],
        secondaryDomains: ['performance', 'debugging', 'system_health'],
        complexityLevel: 'expert',
        maritimePersonality: 'Skilled engineer keeping all systems running smoothly',
        preferredTaskTypes: ['technical_issues', 'system_optimization', 'integration_support']
      },
      {
        agentId: 'pearl',
        agent: AGENTS.pearl,
        shopifyCapabilities: [
          'market_research', 'trend_analysis', 'competitive_intelligence',
          'customer_insights', 'real_time_data', 'market_opportunities'
        ],
        primaryDomains: ['research', 'intelligence', 'trends', 'market_data'],
        secondaryDomains: ['customer_analysis', 'opportunity_identification', 'insights'],
        complexityLevel: 'advanced',
        maritimePersonality: 'Deep-sea explorer discovering market treasures and insights',
        preferredTaskTypes: ['market_research', 'trend_analysis', 'competitive_analysis']
      },
      {
        agentId: 'flint',
        agent: AGENTS.flint,
        shopifyCapabilities: [
          'sales_optimization', 'conversion_improvement', 'customer_acquisition',
          'sales_funnel_analysis', 'lead_generation', 'sales_automation'
        ],
        primaryDomains: ['sales', 'conversion', 'customer_acquisition', 'growth'],
        secondaryDomains: ['lead_management', 'funnel_optimization', 'automation'],
        complexityLevel: 'advanced',
        maritimePersonality: 'Strategic first mate driving sales and growth initiatives',
        preferredTaskTypes: ['sales_optimization', 'conversion_analysis', 'growth_strategies']
      },
      {
        agentId: 'beacon',
        agent: AGENTS.beacon,
        shopifyCapabilities: [
          'project_management', 'task_coordination', 'timeline_management',
          'team_collaboration', 'progress_tracking', 'milestone_planning'
        ],
        primaryDomains: ['project_management', 'coordination', 'planning', 'tracking'],
        secondaryDomains: ['team_management', 'scheduling', 'milestone_tracking'],
        complexityLevel: 'intermediate',
        maritimePersonality: 'Guiding lighthouse coordinating all crew activities',
        preferredTaskTypes: ['project_planning', 'task_management', 'progress_tracking']
      },
      {
        agentId: 'splash',
        agent: AGENTS.splash,
        shopifyCapabilities: [
          'product_creation', 'listing_optimization', 'image_generation',
          'content_creation', 'product_photography', 'catalog_management'
        ],
        primaryDomains: ['product_creation', 'content', 'media', 'catalog'],
        secondaryDomains: ['optimization', 'photography', 'creative_content'],
        complexityLevel: 'advanced',
        maritimePersonality: 'Creative artist bringing products to life with visual flair',
        preferredTaskTypes: ['product_creation', 'content_generation', 'media_optimization']
      },
      {
        agentId: 'drake',
        agent: AGENTS.drake,
        shopifyCapabilities: [
          'customer_service', 'order_management', 'dispute_resolution',
          'customer_communication', 'support_automation', 'satisfaction_tracking'
        ],
        primaryDomains: ['customer_service', 'support', 'communication', 'orders'],
        secondaryDomains: ['dispute_resolution', 'satisfaction', 'automation'],
        complexityLevel: 'intermediate',
        maritimePersonality: 'Diplomatic captain ensuring smooth customer relations',
        preferredTaskTypes: ['customer_support', 'order_management', 'communication']
      }
    ]

    // Populate the expertise map
    expertiseDefinitions.forEach(expertise => {
      this.agentExpertiseMap.set(expertise.agentId, expertise)
    })
  }

  /**
   * Route a request to the most appropriate maritime agent
   */
  public routeToAgent(
    message: string,
    intentAnalysis: IntentAnalysis,
    context?: any
  ): RoutingDecision {
    const candidates = this.findCandidateAgents(message, intentAnalysis)
    const selectedAgent = this.selectBestAgent(candidates, intentAnalysis, context)
    
    return {
      selectedAgent: selectedAgent.agent,
      confidence: selectedAgent.confidence,
      reasoning: selectedAgent.reasoning,
      fallbackAgents: candidates.slice(1, 4).map(c => c.agent),
      requiresMultiAgent: this.shouldUseMultiAgent(intentAnalysis),
      estimatedComplexity: this.estimateComplexity(intentAnalysis)
    }
  }

  private findCandidateAgents(
    message: string,
    intentAnalysis: IntentAnalysis
  ): Array<{ agent: Agent; score: number; reasoning: string }> {
    const candidates: Array<{ agent: Agent; score: number; reasoning: string }> = []
    const messageLower = message.toLowerCase()
    const primaryIntent = intentAnalysis.primaryIntent

    this.agentExpertiseMap.forEach((expertise, agentId) => {
      let score = 0
      let reasoning = []

      // Check primary domain match
      if (expertise.primaryDomains.some(domain => 
        primaryIntent.category.includes(domain) || primaryIntent.type.includes(domain)
      )) {
        score += 40
        reasoning.push('Primary domain expertise match')
      }

      // Check secondary domain match
      if (expertise.secondaryDomains.some(domain => 
        primaryIntent.category.includes(domain) || primaryIntent.type.includes(domain)
      )) {
        score += 20
        reasoning.push('Secondary domain expertise')
      }

      // Check Shopify capability match
      const matchingCapabilities = expertise.shopifyCapabilities.filter(capability =>
        messageLower.includes(capability.replace('_', ' ')) ||
        primaryIntent.type.includes(capability) ||
        primaryIntent.category.includes(capability)
      )
      score += matchingCapabilities.length * 15
      if (matchingCapabilities.length > 0) {
        reasoning.push(`Shopify capabilities: ${matchingCapabilities.join(', ')}`)
      }

      // Check preferred task types
      if (expertise.preferredTaskTypes.some(taskType =>
        primaryIntent.type.includes(taskType) || messageLower.includes(taskType.replace('_', ' '))
      )) {
        score += 25
        reasoning.push('Preferred task type match')
      }

      // Complexity bonus
      const complexityBonus = this.getComplexityBonus(expertise.complexityLevel, intentAnalysis)
      score += complexityBonus
      if (complexityBonus > 0) {
        reasoning.push(`Complexity level: ${expertise.complexityLevel}`)
      }

      if (score > 0) {
        candidates.push({
          agent: expertise.agent,
          score,
          reasoning: reasoning.join('; ')
        })
      }
    })

    return candidates.sort((a, b) => b.score - a.score)
  }

  private selectBestAgent(
    candidates: Array<{ agent: Agent; score: number; reasoning: string }>,
    intentAnalysis: IntentAnalysis,
    context?: any
  ): { agent: Agent; confidence: number; reasoning: string } {
    if (candidates.length === 0) {
      // Default to Anchor for general Shopify management
      return {
        agent: AGENTS.anchor,
        confidence: 0.3,
        reasoning: 'Default routing to Anchor for general store management'
      }
    }

    const bestCandidate = candidates[0]
    const confidence = Math.min(bestCandidate.score / 100, 0.95)

    return {
      agent: bestCandidate.agent,
      confidence,
      reasoning: bestCandidate.reasoning
    }
  }

  private getComplexityBonus(agentComplexity: string, intentAnalysis: IntentAnalysis): number {
    const intentComplexity = this.estimateComplexity(intentAnalysis)
    
    const complexityMap = {
      'basic': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4
    }

    const intentComplexityMap = {
      'low': 1,
      'medium': 2,
      'high': 3
    }

    const agentLevel = complexityMap[agentComplexity] || 2
    const intentLevel = intentComplexityMap[intentComplexity] || 2

    // Bonus for matching complexity levels
    if (Math.abs(agentLevel - intentLevel) <= 1) {
      return 10
    }

    return 0
  }

  private shouldUseMultiAgent(intentAnalysis: IntentAnalysis): boolean {
    // Multi-agent scenarios
    const multiAgentKeywords = [
      'comprehensive', 'complete', 'full', 'entire', 'all aspects',
      'end-to-end', 'holistic', 'integrated', 'coordinated'
    ]

    return multiAgentKeywords.some(keyword => 
      intentAnalysis.primaryIntent.type.includes(keyword) ||
      intentAnalysis.primaryIntent.category.includes(keyword)
    ) || intentAnalysis.requiredInformation.length > 3
  }

  private estimateComplexity(intentAnalysis: IntentAnalysis): 'low' | 'medium' | 'high' {
    const complexityIndicators = {
      high: ['integration', 'automation', 'optimization', 'analysis', 'strategy'],
      medium: ['management', 'tracking', 'monitoring', 'reporting'],
      low: ['simple', 'basic', 'quick', 'single']
    }

    const intent = intentAnalysis.primaryIntent.type.toLowerCase()
    
    if (complexityIndicators.high.some(indicator => intent.includes(indicator))) {
      return 'high'
    }
    if (complexityIndicators.medium.some(indicator => intent.includes(indicator))) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Get agent expertise information
   */
  public getAgentExpertise(agentId: string): AgentExpertise | undefined {
    return this.agentExpertiseMap.get(agentId)
  }

  /**
   * Get all available maritime agents with their expertise
   */
  public getAllAgentExpertise(): AgentExpertise[] {
    return Array.from(this.agentExpertiseMap.values())
  }
}
