/**
 * Intelligent Agent Routing and Specialization System
 * Handles domain detection and cross-agent referrals for CrewFlow AI agents
 */

import type { Agent } from '../agents'

export interface DomainAnalysis {
  primaryDomain: string
  confidence: number
  keywords: string[]
  complexity: 'basic' | 'intermediate' | 'advanced'
  requiresSpecialist: boolean
}

export interface ReferralDecision {
  shouldRefer: boolean
  targetAgent?: Agent
  reason?: string
  confidence: number
}

export interface ReferralResponse {
  response: string
  targetAgentId: string
  targetAgentName: string
  referralReason: string
}

// Domain keyword mappings for each agent specialization
const DOMAIN_KEYWORDS = {
  social: [
    'social media', 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube',
    'content calendar', 'engagement', 'followers', 'hashtags', 'viral', 'influencer',
    'brand awareness', 'social strategy', 'community management', 'social advertising',
    'post scheduling', 'social analytics', 'social listening', 'brand monitoring'
  ],
  finance: [
    'budget', 'financial', 'accounting', 'revenue', 'profit', 'expense', 'cost analysis',
    'roi', 'cash flow', 'financial planning', 'investment', 'tax', 'payroll',
    'financial reporting', 'balance sheet', 'income statement', 'financial forecast',
    'pricing strategy', 'financial metrics', 'bookkeeping', 'audit'
  ],
  technical: [
    'technical', 'IT', 'software', 'hardware', 'server', 'database', 'API', 'integration',
    'troubleshooting', 'bug', 'system', 'network', 'security', 'backup', 'deployment',
    'coding', 'programming', 'development', 'infrastructure', 'cloud', 'DevOps'
  ],
  research: [
    'research', 'analysis', 'data', 'statistics', 'market research', 'competitive analysis',
    'trends', 'insights', 'analytics', 'reporting', 'metrics', 'KPI', 'dashboard',
    'survey', 'study', 'investigation', 'intelligence', 'benchmarking'
  ],
  content: [
    'content', 'writing', 'blog', 'article', 'copywriting', 'editing', 'proofreading',
    'content strategy', 'SEO', 'content marketing', 'storytelling', 'brand voice',
    'content creation', 'editorial', 'publishing', 'content calendar'
  ],
  project: [
    'project', 'task', 'deadline', 'timeline', 'milestone', 'project management',
    'team coordination', 'resource allocation', 'project planning', 'workflow',
    'collaboration', 'project tracking', 'deliverables', 'project status'
  ],
  supply: [
    'inventory', 'supply chain', 'procurement', 'supplier', 'logistics', 'warehouse',
    'stock', 'ordering', 'fulfillment', 'distribution', 'supply management',
    'vendor management', 'inventory tracking', 'demand forecasting'
  ],
  marketing: [
    'marketing', 'campaign', 'lead generation', 'email marketing', 'automation',
    'CRM', 'customer acquisition', 'marketing strategy', 'brand marketing',
    'digital marketing', 'advertising', 'promotion', 'marketing funnel'
  ],
  ecommerce: [
    'ecommerce', 'online store', 'product catalog', 'shopping cart', 'checkout',
    'payment processing', 'order management', 'product listing', 'inventory management',
    'customer reviews', 'product recommendations', 'sales optimization'
  ],
  support: [
    'customer support', 'help desk', 'customer service', 'ticket', 'complaint',
    'customer satisfaction', 'support workflow', 'escalation', 'customer query',
    'support documentation', 'FAQ', 'customer communication'
  ],
  knowledge: [
    'documentation', 'knowledge base', 'information', 'search', 'knowledge management',
    'document search', 'information retrieval', 'company documents', 'knowledge sharing',
    'internal documentation', 'training materials', 'procedures'
  ]
}

// Agent specialization mapping
const AGENT_SPECIALIZATIONS = {
  coral: { domain: 'support', expertise: ['customer service', 'support workflows', 'customer communication'] },
  splash: { domain: 'social', expertise: ['social media strategy', 'content creation', 'community management'] },
  anchor: { domain: 'supply', expertise: ['supply chain', 'inventory management', 'procurement'] },
  sage: { domain: 'knowledge', expertise: ['knowledge management', 'document search', 'information retrieval'] },
  helm: { domain: 'content', expertise: ['content creation', 'copywriting', 'content strategy'] },
  ledger: { domain: 'finance', expertise: ['financial analysis', 'budgeting', 'financial reporting'] },
  patch: { domain: 'technical', expertise: ['IT support', 'technical troubleshooting', 'system integration'] },
  pearl: { domain: 'research', expertise: ['research & analytics', 'data analysis', 'market intelligence'] },
  flint: { domain: 'marketing', expertise: ['marketing automation', 'campaign management', 'lead generation'] },
  beacon: { domain: 'project', expertise: ['project management', 'task coordination', 'workflow optimization'] },
  drake: { domain: 'ecommerce', expertise: ['e-commerce optimization', 'online sales', 'product management'] }
}

/**
 * Analyze the domain and complexity of a user's question
 */
export function analyzeDomain(message: string): DomainAnalysis {
  const messageLower = message.toLowerCase()
  const domainScores: Record<string, number> = {}
  const foundKeywords: string[] = []

  // Calculate domain scores based on keyword matches
  Object.entries(DOMAIN_KEYWORDS).forEach(([domain, keywords]) => {
    let score = 0
    keywords.forEach(keyword => {
      if (messageLower.includes(keyword.toLowerCase())) {
        score += 1
        foundKeywords.push(keyword)
      }
    })
    domainScores[domain] = score
  })

  // Find the domain with the highest score
  const primaryDomain = Object.entries(domainScores)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'general'

  const maxScore = domainScores[primaryDomain] || 0
  const confidence = Math.min(maxScore / 3, 1) // Normalize confidence score

  // Determine complexity based on message length and technical terms
  const complexity = determineComplexity(message, foundKeywords)

  // Determine if specialist is required
  const requiresSpecialist = confidence > 0.6 && complexity !== 'basic'

  return {
    primaryDomain,
    confidence,
    keywords: foundKeywords,
    complexity,
    requiresSpecialist
  }
}

/**
 * Determine if an agent should refer a question to a specialist
 */
export function shouldReferToSpecialist(
  currentAgent: Agent,
  domainAnalysis: DomainAnalysis,
  availableAgents: Agent[]
): ReferralDecision {
  const currentAgentSpec = AGENT_SPECIALIZATIONS[currentAgent.id as keyof typeof AGENT_SPECIALIZATIONS]
  
  if (!currentAgentSpec) {
    return { shouldRefer: false, confidence: 0 }
  }

  // Don't refer if the question is in the current agent's domain
  if (currentAgentSpec.domain === domainAnalysis.primaryDomain) {
    return { shouldRefer: false, confidence: 0 }
  }

  // Don't refer basic questions - any agent can handle them
  if (domainAnalysis.complexity === 'basic' || domainAnalysis.confidence < 0.5) {
    return { shouldRefer: false, confidence: 0 }
  }

  // Find the best specialist for this domain
  const targetAgent = availableAgents.find(agent => {
    const agentSpec = AGENT_SPECIALIZATIONS[agent.id as keyof typeof AGENT_SPECIALIZATIONS]
    return agentSpec?.domain === domainAnalysis.primaryDomain
  })

  if (!targetAgent) {
    return { shouldRefer: false, confidence: 0 }
  }

  const reason = `specialized ${domainAnalysis.primaryDomain} expertise and tools`

  return {
    shouldRefer: true,
    targetAgent,
    reason,
    confidence: domainAnalysis.confidence
  }
}

/**
 * Generate a maritime-themed referral response
 */
export function generateReferralResponse(
  currentAgent: Agent,
  referralDecision: ReferralDecision,
  originalMessage: string
): ReferralResponse {
  if (!referralDecision.targetAgent || !referralDecision.reason) {
    throw new Error('Invalid referral decision')
  }

  const targetAgent = referralDecision.targetAgent
  const maritimeTemplates = [
    `Ahoy! While I can provide some guidance on this topic, our specialist **${targetAgent.name}** is your best navigator for ${referralDecision.reason}. They have the maritime skills and specialized tools designed specifically for this type of challenge. You can find ${targetAgent.name} in your crew dashboard - they'll chart the perfect course for your needs!`,
    
    `I can offer some initial direction, but **${targetAgent.name}** is the crew member you want for this voyage! They specialize in ${referralDecision.reason} and have the right tools to help you navigate these waters successfully. Set sail to ${targetAgent.name}'s station in your dashboard for expert guidance.`,
    
    `While I'm happy to help where I can, **${targetAgent.name}** is the specialist who can really anchor down the details for you. Their expertise in ${referralDecision.reason} makes them the ideal crew member for this task. Navigate to ${targetAgent.name} in your crew dashboard for comprehensive assistance!`
  ]

  const template = maritimeTemplates[Math.floor(Math.random() * maritimeTemplates.length)]

  return {
    response: template,
    targetAgentId: targetAgent.id,
    targetAgentName: targetAgent.name,
    referralReason: referralDecision.reason
  }
}

/**
 * Determine the complexity of a message
 */
function determineComplexity(message: string, keywords: string[]): 'basic' | 'intermediate' | 'advanced' {
  const messageLength = message.length
  const keywordCount = keywords.length
  
  // Technical indicators
  const technicalTerms = ['API', 'integration', 'automation', 'workflow', 'analytics', 'optimization']
  const hasTechnicalTerms = technicalTerms.some(term => 
    message.toLowerCase().includes(term.toLowerCase())
  )

  if (messageLength > 200 || keywordCount > 5 || hasTechnicalTerms) {
    return 'advanced'
  } else if (messageLength > 100 || keywordCount > 2) {
    return 'intermediate'
  } else {
    return 'basic'
  }
}

/**
 * Get agent by ID from available agents
 */
export function getAgentById(agentId: string, availableAgents: Agent[]): Agent | undefined {
  return availableAgents.find(agent => agent.id === agentId)
}
