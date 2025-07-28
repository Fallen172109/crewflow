// Simplified Agent Routing for Shopify-Focused System
// Routes requests to the appropriate specialized agent based on intent

import { Agent } from '@/lib/agents'
import { SIMPLIFIED_AGENTS } from '@/lib/agents-simplified'

export interface RoutingDecision {
  targetAgent: Agent
  confidence: number
  reason: string
  suggestedActions: string[]
}

export interface DomainAnalysis {
  primaryDomain: string
  confidence: number
  keywords: string[]
  complexity: 'basic' | 'intermediate' | 'advanced'
  requiresSpecialist: boolean
}

// Simplified agent specializations for Shopify focus
const SIMPLIFIED_AGENT_SPECIALIZATIONS = {
  morgan: {
    domain: 'ecommerce',
    expertise: ['product management', 'store setup', 'order processing', 'inventory', 'shopify'],
    keywords: ['product', 'store', 'shop', 'inventory', 'order', 'listing', 'price', 'variant', 'collection', 'checkout', 'payment', 'shipping', 'fulfillment', 'ecommerce', 'shopify']
  },
  anchor: {
    domain: 'supply',
    expertise: ['inventory management', 'supply chain', 'stock levels', 'suppliers', 'procurement'],
    keywords: ['inventory', 'stock', 'supply', 'supplier', 'procurement', 'reorder', 'warehouse', 'fulfillment', 'logistics', 'shipping', 'delivery', 'tracking']
  },
  splash: {
    domain: 'marketing',
    expertise: ['social media', 'marketing campaigns', 'content creation', 'brand promotion'],
    keywords: ['social', 'marketing', 'campaign', 'promotion', 'brand', 'content', 'post', 'engagement', 'followers', 'hashtag', 'instagram', 'facebook', 'twitter', 'tiktok']
  },
  pearl: {
    domain: 'content',
    expertise: ['content creation', 'SEO', 'product descriptions', 'copywriting'],
    keywords: ['content', 'description', 'seo', 'copy', 'text', 'write', 'optimize', 'keywords', 'meta', 'title', 'blog', 'article', 'copywriting']
  }
}

/**
 * Analyze the domain and intent of a user message
 */
export function analyzeMessageDomain(message: string): DomainAnalysis {
  const lowerMessage = message.toLowerCase()
  const domainScores: Record<string, number> = {}
  const foundKeywords: string[] = []

  // Score each domain based on keyword matches
  Object.entries(SIMPLIFIED_AGENT_SPECIALIZATIONS).forEach(([agentId, spec]) => {
    let score = 0
    spec.keywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        score += 1
        foundKeywords.push(keyword)
      }
    })
    domainScores[spec.domain] = score
  })

  // Find the domain with the highest score
  const primaryDomain = Object.entries(domainScores).reduce((a, b) => 
    domainScores[a[0]] > domainScores[b[0]] ? a : b
  )[0]

  const maxScore = domainScores[primaryDomain] || 0
  const confidence = Math.min(maxScore / 3, 1) // Normalize confidence score

  // Determine complexity based on message length and technical terms
  const complexity = determineComplexity(message, foundKeywords)

  // Determine if specialist is required
  const requiresSpecialist = confidence > 0.4 && complexity !== 'basic'

  return {
    primaryDomain,
    confidence,
    keywords: foundKeywords,
    complexity,
    requiresSpecialist
  }
}

/**
 * Determine message complexity
 */
function determineComplexity(message: string, keywords: string[]): 'basic' | 'intermediate' | 'advanced' {
  const wordCount = message.split(' ').length
  const keywordCount = keywords.length

  if (wordCount < 10 && keywordCount < 2) {
    return 'basic'
  } else if (wordCount < 30 && keywordCount < 5) {
    return 'intermediate'
  } else {
    return 'advanced'
  }
}

/**
 * Route a message to the most appropriate simplified agent
 */
export function routeToSimplifiedAgent(message: string, currentAgentId?: string): RoutingDecision {
  const domainAnalysis = analyzeMessageDomain(message)
  
  // Find the best agent for this domain
  const targetAgentId = Object.entries(SIMPLIFIED_AGENT_SPECIALIZATIONS).find(
    ([agentId, spec]) => spec.domain === domainAnalysis.primaryDomain
  )?.[0] || 'morgan' // Default to Morgan (e-commerce captain)

  const targetAgent = SIMPLIFIED_AGENTS[targetAgentId]

  // If we're already talking to the right agent, don't route
  if (currentAgentId === targetAgentId) {
    return {
      targetAgent,
      confidence: domainAnalysis.confidence,
      reason: `Already speaking with the right specialist for ${domainAnalysis.primaryDomain}`,
      suggestedActions: generateSuggestedActions(domainAnalysis.primaryDomain, message)
    }
  }

  // Generate routing reason
  const reason = generateRoutingReason(domainAnalysis, targetAgent)

  return {
    targetAgent,
    confidence: domainAnalysis.confidence,
    reason,
    suggestedActions: generateSuggestedActions(domainAnalysis.primaryDomain, message)
  }
}

/**
 * Generate routing reason
 */
function generateRoutingReason(analysis: DomainAnalysis, targetAgent: Agent): string {
  const domainMap = {
    ecommerce: 'e-commerce and store management',
    supply: 'inventory and supply chain management',
    marketing: 'marketing and social media',
    content: 'content creation and SEO'
  }

  const domainName = domainMap[analysis.primaryDomain as keyof typeof domainMap] || analysis.primaryDomain

  return `${targetAgent.name} specializes in ${domainName} and can provide expert assistance with your request.`
}

/**
 * Generate suggested actions based on domain
 */
function generateSuggestedActions(domain: string, message: string): string[] {
  const actions: string[] = []

  switch (domain) {
    case 'ecommerce':
      actions.push('Review your product catalog')
      actions.push('Optimize product listings')
      actions.push('Check order status and fulfillment')
      actions.push('Analyze store performance')
      break

    case 'supply':
      actions.push('Check inventory levels')
      actions.push('Set up reorder alerts')
      actions.push('Review supplier performance')
      actions.push('Optimize supply chain costs')
      break

    case 'marketing':
      actions.push('Create social media campaigns')
      actions.push('Generate marketing content')
      actions.push('Analyze engagement metrics')
      actions.push('Plan promotional strategies')
      break

    case 'content':
      actions.push('Optimize product descriptions')
      actions.push('Improve SEO rankings')
      actions.push('Create compelling copy')
      actions.push('Audit existing content')
      break

    default:
      actions.push('Get personalized assistance')
      actions.push('Explore available tools')
      actions.push('Ask specific questions')
  }

  return actions
}

/**
 * Check if a message should be routed to a different agent
 */
export function shouldRouteToSpecialist(
  message: string,
  currentAgentId: string
): { shouldRoute: boolean; decision?: RoutingDecision } {
  const routingDecision = routeToSimplifiedAgent(message, currentAgentId)
  
  // Route if confidence is high and it's a different agent
  const shouldRoute = routingDecision.confidence > 0.5 && 
                     routingDecision.targetAgent.id !== currentAgentId

  return {
    shouldRoute,
    decision: shouldRoute ? routingDecision : undefined
  }
}

/**
 * Generate a referral message for routing
 */
export function generateReferralMessage(decision: RoutingDecision): string {
  return `I think ${decision.targetAgent.name} would be better suited to help you with this request. ${decision.reason} Would you like me to connect you with ${decision.targetAgent.name}?`
}

/**
 * Get the default agent for general inquiries
 */
export function getDefaultAgent(): Agent {
  return SIMPLIFIED_AGENTS.morgan // Morgan is the primary e-commerce captain
}
