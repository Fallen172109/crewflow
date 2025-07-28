// Simplified Agent System for Shopify Store Manager Focus
// Reduced from 14 agents to 4 specialized Shopify-focused agents

export interface Agent {
  id: string
  name: string
  title: string
  description: string
  avatar: string
  color: string
  framework: 'langchain' | 'autogen' | 'perplexity' | 'hybrid'
  tier: 'starter' | 'professional' | 'enterprise'
  category: 'support' | 'marketing' | 'content' | 'ecommerce' | 'analytics' | 'social' | 'automation' | 'business' | 'knowledge' | 'supply' | 'project' | 'hr' | 'finance' | 'it'
  presetActions: PresetAction[]
  integrations: string[]
  costPerRequest: number
  requiresApiConnection: boolean
  optimalAiModules: string[]
  shopifySpecialized: boolean
}

export interface PresetAction {
  id: string
  label: string
  description: string
  icon: string
  category: string
  estimatedTime: string
}

// Simplified agent system focused on Shopify store management
export const SIMPLIFIED_AGENTS: Record<string, Agent> = {
  morgan: {
    id: 'morgan',
    name: 'Morgan',
    title: 'E-commerce Captain',
    description: 'Your primary Shopify store manager. Handles product listings, inventory, orders, and store optimization with deep e-commerce expertise.',
    avatar: '/agents/morgan.png',
    color: '#3b82f6',
    framework: 'langchain',
    tier: 'professional',
    category: 'ecommerce',
    costPerRequest: 0.03,
    requiresApiConnection: true,
    shopifySpecialized: true,
    optimalAiModules: ['Custom Agent Development', 'Decision-Making Module', 'Seamless Integration components'],
    presetActions: [
      {
        id: 'setup_store',
        label: 'Setup Shopify Store',
        description: 'Configure and optimize e-commerce store',
        icon: 'Store',
        category: 'setup',
        estimatedTime: '5 minutes'
      },
      {
        id: 'create_product',
        label: 'Create Product Listing',
        description: 'Add new products with optimized descriptions and pricing',
        icon: 'Package',
        category: 'products',
        estimatedTime: '3 minutes'
      },
      {
        id: 'manage_inventory',
        label: 'Manage Inventory',
        description: 'Track stock levels and update inventory',
        icon: 'BarChart3',
        category: 'inventory',
        estimatedTime: '2 minutes'
      },
      {
        id: 'process_orders',
        label: 'Process Orders',
        description: 'Handle order fulfillment and customer communications',
        icon: 'ShoppingCart',
        category: 'orders',
        estimatedTime: '90 seconds'
      },
      {
        id: 'optimize_store',
        label: 'Store Optimization',
        description: 'Analyze and improve store performance',
        icon: 'TrendingUp',
        category: 'analytics',
        estimatedTime: '4 minutes'
      }
    ],
    integrations: ['shopify', 'woocommerce', 'bigcommerce', 'stripe', 'paypal']
  },

  anchor: {
    id: 'anchor',
    name: 'Anchor',
    title: 'Supply Chain Admiral',
    description: 'Your inventory and supply chain specialist. Manages stock levels, supplier relationships, and ensures your store never runs out of products.',
    avatar: '/agents/anchor.png',
    color: '#059669',
    framework: 'hybrid',
    tier: 'enterprise',
    category: 'supply',
    costPerRequest: 0.04,
    requiresApiConnection: false,
    shopifySpecialized: true,
    optimalAiModules: ['LangChain Decision-Making', 'Perplexity AI Market Intelligence', 'Hybrid Supply Chain Orchestration'],
    presetActions: [
      {
        id: 'inventory_check',
        label: 'Inventory Health Check',
        description: 'Analyze stock levels and identify low inventory items',
        icon: 'Package',
        category: 'inventory',
        estimatedTime: '2 minutes'
      },
      {
        id: 'reorder_alerts',
        label: 'Reorder Alerts',
        description: 'Set up automated reorder points and supplier notifications',
        icon: 'Bell',
        category: 'automation',
        estimatedTime: '3 minutes'
      },
      {
        id: 'supplier_analysis',
        label: 'Supplier Performance',
        description: 'Evaluate supplier reliability and cost efficiency',
        icon: 'Users',
        category: 'analysis',
        estimatedTime: '4 minutes'
      },
      {
        id: 'cost_optimization',
        label: 'Cost Optimization',
        description: 'Find cost-saving opportunities in supply chain',
        icon: 'DollarSign',
        category: 'cost_analysis',
        estimatedTime: '3 minutes'
      }
    ],
    integrations: ['shopify', 'sap', 'oracle-scm', 'netsuite', 'fishbowl']
  },

  splash: {
    id: 'splash',
    name: 'Splash',
    title: 'Marketing Mate',
    description: 'Your social media and marketing specialist. Creates engaging content, manages social campaigns, and drives traffic to your Shopify store.',
    avatar: '/agents/splash.png',
    color: '#ec4899',
    framework: 'autogen',
    tier: 'professional',
    category: 'social',
    costPerRequest: 0.025,
    requiresApiConnection: true,
    shopifySpecialized: true,
    optimalAiModules: ['AutoGen Multi-Agent Collaboration', 'Social Media APIs', 'Content Generation'],
    presetActions: [
      {
        id: 'create_campaign',
        label: 'Create Marketing Campaign',
        description: 'Design and launch social media campaigns for products',
        icon: 'Megaphone',
        category: 'campaigns',
        estimatedTime: '5 minutes'
      },
      {
        id: 'product_posts',
        label: 'Product Social Posts',
        description: 'Generate engaging social media posts for new products',
        icon: 'Image',
        category: 'content',
        estimatedTime: '2 minutes'
      },
      {
        id: 'trend_analysis',
        label: 'Social Trend Analysis',
        description: 'Identify trending topics and hashtags for your niche',
        icon: 'TrendingUp',
        category: 'analysis',
        estimatedTime: '3 minutes'
      },
      {
        id: 'engagement_boost',
        label: 'Engagement Optimization',
        description: 'Optimize posting times and content for maximum engagement',
        icon: 'Heart',
        category: 'optimization',
        estimatedTime: '4 minutes'
      }
    ],
    integrations: ['shopify', 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok']
  },

  pearl: {
    id: 'pearl',
    name: 'Pearl',
    title: 'Content Curator',
    description: 'Your content and SEO specialist. Creates compelling product descriptions, optimizes for search engines, and ensures your store content converts visitors to customers.',
    avatar: '/agents/pearl.png',
    color: '#8b5cf6',
    framework: 'perplexity',
    tier: 'professional',
    category: 'content',
    costPerRequest: 0.035,
    requiresApiConnection: true,
    shopifySpecialized: true,
    optimalAiModules: ['Perplexity AI Real-time Research', 'SEO Optimization', 'Content Generation'],
    presetActions: [
      {
        id: 'product_descriptions',
        label: 'Product Descriptions',
        description: 'Create compelling, SEO-optimized product descriptions',
        icon: 'FileText',
        category: 'content',
        estimatedTime: '3 minutes'
      },
      {
        id: 'seo_optimization',
        label: 'SEO Optimization',
        description: 'Optimize product pages and store content for search engines',
        icon: 'Search',
        category: 'seo',
        estimatedTime: '4 minutes'
      },
      {
        id: 'content_audit',
        label: 'Content Audit',
        description: 'Review and improve existing store content',
        icon: 'CheckCircle',
        category: 'audit',
        estimatedTime: '5 minutes'
      },
      {
        id: 'competitor_research',
        label: 'Competitor Content Analysis',
        description: 'Research competitor content strategies and identify opportunities',
        icon: 'Eye',
        category: 'research',
        estimatedTime: '6 minutes'
      }
    ],
    integrations: ['shopify', 'wordpress', 'semrush', 'ahrefs', 'google-search-console']
  }
}

// Get agents available for a subscription tier (simplified)
export function getSimplifiedAgentsForTier(tier: string | null): Agent[] {
  if (!tier) return []
  
  return Object.values(SIMPLIFIED_AGENTS).filter(agent => {
    switch (tier) {
      case 'starter':
        return agent.tier === 'starter' || agent.tier === 'professional' // Give starter users access to professional agents
      case 'professional':
        return agent.tier === 'starter' || agent.tier === 'professional'
      case 'enterprise':
        return true
      default:
        return false
    }
  })
}

// Get agent by ID (simplified)
export function getSimplifiedAgent(id: string): Agent | null {
  return SIMPLIFIED_AGENTS[id] || null
}

// Check if user can access agent (simplified - more permissive)
export function canUserAccessSimplifiedAgent(userTier: string | null, agentId: string): boolean {
  const agent = getSimplifiedAgent(agentId)
  if (!agent) return false
  
  const availableAgents = getSimplifiedAgentsForTier(userTier)
  return availableAgents.some(a => a.id === agentId)
}

// Get all Shopify-specialized agents
export function getShopifySpecializedAgents(): Agent[] {
  return Object.values(SIMPLIFIED_AGENTS).filter(agent => agent.shopifySpecialized)
}
