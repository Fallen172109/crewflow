// Agent configurations and utilities

export interface Agent {
  id: string
  name: string
  title: string
  description: string
  avatar: string
  color: string
  framework: 'langchain' | 'autogen' | 'perplexity' | 'hybrid'
  tier: 'starter' | 'professional' | 'enterprise'
  category: 'support' | 'marketing' | 'content' | 'ecommerce' | 'analytics' | 'social' | 'automation' | 'business' | 'knowledge' | 'supply'
  presetActions: PresetAction[]
  integrations: string[]
  costPerRequest: number
}

export interface PresetAction {
  id: string
  label: string
  description: string
  icon: string
  category: string
  estimatedTime: string
}

export const AGENTS: Record<string, Agent> = {
  coral: {
    id: 'coral',
    name: 'Coral',
    title: 'Customer Support',
    description: 'Expert in customer service, ticket management, and support automation',
    avatar: '/agents/coral.png',
    color: '#f97316',
    framework: 'langchain',
    tier: 'starter',
    category: 'support',
    costPerRequest: 0.02,
    presetActions: [
      {
        id: 'generate_response',
        label: 'Generate Response Template',
        description: 'Create professional customer support responses',
        icon: 'MessageSquare',
        category: 'templates',
        estimatedTime: '30 seconds'
      },
      {
        id: 'escalate_ticket',
        label: 'Escalate to Human Agent',
        description: 'Prepare escalation summary for complex issues',
        icon: 'ArrowUp',
        category: 'escalation',
        estimatedTime: '15 seconds'
      },
      {
        id: 'update_customer',
        label: 'Update Customer Record',
        description: 'Sync customer information across systems',
        icon: 'UserCheck',
        category: 'data',
        estimatedTime: '20 seconds'
      },
      {
        id: 'analyze_sentiment',
        label: 'Analyze Customer Sentiment',
        description: 'Evaluate customer satisfaction and mood',
        icon: 'Heart',
        category: 'analysis',
        estimatedTime: '10 seconds'
      },
      {
        id: 'create_knowledge',
        label: 'Create Knowledge Base Entry',
        description: 'Document solutions for future reference',
        icon: 'BookOpen',
        category: 'knowledge',
        estimatedTime: '45 seconds'
      }
    ],
    integrations: ['zendesk', 'intercom', 'salesforce', 'hubspot', 'slack']
  },
  mariner: {
    id: 'mariner',
    name: 'Mariner',
    title: 'Marketing Automation',
    description: 'Specialized in campaign creation, lead generation, and marketing analytics',
    avatar: '/agents/mariner.png',
    color: '#0ea5e9',
    framework: 'hybrid',
    tier: 'starter',
    category: 'marketing',
    costPerRequest: 0.04,
    presetActions: [
      {
        id: 'create_campaign',
        label: 'Create Campaign Strategy',
        description: 'Develop comprehensive marketing campaigns',
        icon: 'Target',
        category: 'strategy',
        estimatedTime: '2 minutes'
      },
      {
        id: 'generate_content_calendar',
        label: 'Generate Content Calendar',
        description: 'Plan content across multiple channels',
        icon: 'Calendar',
        category: 'planning',
        estimatedTime: '90 seconds'
      },
      {
        id: 'analyze_competitors',
        label: 'Analyze Competitor Activity',
        description: 'Research and analyze competitor strategies',
        icon: 'Search',
        category: 'research',
        estimatedTime: '3 minutes'
      },
      {
        id: 'optimize_ads',
        label: 'Optimize Ad Performance',
        description: 'Improve ad targeting and performance',
        icon: 'TrendingUp',
        category: 'optimization',
        estimatedTime: '45 seconds'
      },
      {
        id: 'segment_audience',
        label: 'Segment Audience',
        description: 'Create targeted customer segments',
        icon: 'Users',
        category: 'targeting',
        estimatedTime: '60 seconds'
      }
    ],
    integrations: ['google-ads', 'facebook-ads', 'mailchimp', 'hubspot', 'google-analytics']
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    title: 'Content & SEO',
    description: 'Content creation, SEO optimization, and trend analysis specialist',
    avatar: '/agents/pearl.png',
    color: '#14b8a6',
    framework: 'perplexity',
    tier: 'starter',
    category: 'content',
    costPerRequest: 0.06,
    presetActions: [
      {
        id: 'optimize_content',
        label: 'Optimize Website Content',
        description: 'Improve SEO and readability of existing content',
        icon: 'FileText',
        category: 'optimization',
        estimatedTime: '2 minutes'
      },
      {
        id: 'generate_blog_post',
        label: 'Generate Blog Posts',
        description: 'Create engaging, SEO-optimized blog content',
        icon: 'PenTool',
        category: 'creation',
        estimatedTime: '3 minutes'
      },
      {
        id: 'research_trends',
        label: 'Research Trending Topics',
        description: 'Find current trends and content opportunities',
        icon: 'TrendingUp',
        category: 'research',
        estimatedTime: '90 seconds'
      },
      {
        id: 'keyword_analysis',
        label: 'Keyword Analysis',
        description: 'Research and analyze keyword opportunities',
        icon: 'Key',
        category: 'seo',
        estimatedTime: '60 seconds'
      },
      {
        id: 'content_audit',
        label: 'Content Performance Audit',
        description: 'Analyze content performance and suggest improvements',
        icon: 'BarChart',
        category: 'analysis',
        estimatedTime: '2 minutes'
      }
    ],
    integrations: ['wordpress', 'ghost', 'semrush', 'ahrefs', 'google-search-console']
  },
  morgan: {
    id: 'morgan',
    name: 'Morgan',
    title: 'E-commerce Management',
    description: 'E-commerce optimization, inventory management, and sales automation',
    avatar: '/agents/morgan.png',
    color: '#8b5cf6',
    framework: 'langchain',
    tier: 'professional',
    category: 'ecommerce',
    costPerRequest: 0.03,
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
        id: 'update_inventory',
        label: 'Update Product Listings',
        description: 'Sync and optimize product information',
        icon: 'Package',
        category: 'inventory',
        estimatedTime: '90 seconds'
      },
      {
        id: 'optimize_pricing',
        label: 'Optimize Pricing Strategy',
        description: 'Analyze and adjust product pricing',
        icon: 'DollarSign',
        category: 'pricing',
        estimatedTime: '2 minutes'
      },
      {
        id: 'generate_descriptions',
        label: 'Generate Product Descriptions',
        description: 'Create compelling product descriptions',
        icon: 'FileText',
        category: 'content',
        estimatedTime: '60 seconds'
      },
      {
        id: 'analyze_sales',
        label: 'Analyze Sales Performance',
        description: 'Review sales data and identify trends',
        icon: 'TrendingUp',
        category: 'analytics',
        estimatedTime: '2 minutes'
      }
    ],
    integrations: ['shopify', 'woocommerce', 'bigcommerce', 'stripe', 'paypal']
  },
  tide: {
    id: 'tide',
    name: 'Tide',
    title: 'Data Analysis',
    description: 'Advanced analytics, reporting, and business intelligence',
    avatar: '/agents/tide.png',
    color: '#06b6d4',
    framework: 'autogen',
    tier: 'professional',
    category: 'analytics',
    costPerRequest: 0.025,
    presetActions: [
      {
        id: 'generate_report',
        label: 'Generate Performance Reports',
        description: 'Create comprehensive business reports',
        icon: 'FileBarChart',
        category: 'reporting',
        estimatedTime: '3 minutes'
      },
      {
        id: 'identify_trends',
        label: 'Identify Trends and Patterns',
        description: 'Analyze data for insights and patterns',
        icon: 'TrendingUp',
        category: 'analysis',
        estimatedTime: '2 minutes'
      },
      {
        id: 'create_dashboard',
        label: 'Create Analytics Dashboard',
        description: 'Build interactive data visualizations',
        icon: 'BarChart3',
        category: 'visualization',
        estimatedTime: '4 minutes'
      },
      {
        id: 'predictive_model',
        label: 'Create Predictive Models',
        description: 'Build forecasting and prediction models',
        icon: 'Brain',
        category: 'modeling',
        estimatedTime: '5 minutes'
      },
      {
        id: 'data_cleanup',
        label: 'Clean and Prepare Data',
        description: 'Process and clean raw data for analysis',
        icon: 'Filter',
        category: 'preparation',
        estimatedTime: '2 minutes'
      }
    ],
    integrations: ['google-analytics', 'mixpanel', 'amplitude', 'tableau', 'powerbi']
  },
  compass: {
    id: 'compass',
    name: 'Compass',
    title: 'Social Media',
    description: 'Social media management, content scheduling, and engagement tracking',
    avatar: '/agents/compass.png',
    color: '#ec4899',
    framework: 'hybrid',
    tier: 'professional',
    category: 'social',
    costPerRequest: 0.035,
    presetActions: [
      {
        id: 'schedule_posts',
        label: 'Schedule Social Posts',
        description: 'Plan and schedule content across platforms',
        icon: 'Calendar',
        category: 'scheduling',
        estimatedTime: '90 seconds'
      },
      {
        id: 'generate_content',
        label: 'Generate Social Content',
        description: 'Create engaging social media posts',
        icon: 'PenTool',
        category: 'content',
        estimatedTime: '60 seconds'
      },
      {
        id: 'analyze_engagement',
        label: 'Analyze Engagement',
        description: 'Track and analyze social media performance',
        icon: 'Heart',
        category: 'analytics',
        estimatedTime: '2 minutes'
      },
      {
        id: 'monitor_mentions',
        label: 'Monitor Brand Mentions',
        description: 'Track brand mentions and sentiment',
        icon: 'Search',
        category: 'monitoring',
        estimatedTime: '90 seconds'
      },
      {
        id: 'competitor_analysis',
        label: 'Social Competitor Analysis',
        description: 'Analyze competitor social media strategies',
        icon: 'Users',
        category: 'research',
        estimatedTime: '3 minutes'
      }
    ],
    integrations: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube']
  }
}

// Get agents available for a subscription tier
export function getAgentsForTier(tier: string | null): Agent[] {
  if (!tier) return []
  
  return Object.values(AGENTS).filter(agent => {
    switch (tier) {
      case 'starter':
        return agent.tier === 'starter'
      case 'professional':
        return agent.tier === 'starter' || agent.tier === 'professional'
      case 'enterprise':
        return true
      default:
        return false
    }
  })
}

// Get agent by ID
export function getAgent(id: string): Agent | null {
  return AGENTS[id] || null
}

// Check if user can access agent
export function canUserAccessAgent(userTier: string | null, agentId: string): boolean {
  const agent = getAgent(agentId)
  if (!agent) return false
  
  const availableAgents = getAgentsForTier(userTier)
  return availableAgents.some(a => a.id === agentId)
}
