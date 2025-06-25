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
  category: 'support' | 'marketing' | 'content' | 'ecommerce' | 'analytics' | 'social' | 'automation' | 'business' | 'knowledge' | 'supply' | 'project' | 'hr' | 'finance' | 'it'
  presetActions: PresetAction[]
  integrations: string[]
  costPerRequest: number
  requiresApiConnection: boolean
  optimalAiModules: string[]
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
    description: 'Handles customer queries, provides policy-compliant help, and manages support workflows',
    avatar: '/agents/coral.png',
    color: '#f97316',
    framework: 'langchain',
    tier: 'starter',
    category: 'support',
    costPerRequest: 0.02,
    requiresApiConnection: true,
    optimalAiModules: ['Agent Module', 'Memory System', 'Language Model Interface', 'Task Orchestration Engine'],
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
    description: 'Runs multi-channel campaigns, tracks analytics, and performs market research',
    avatar: '/agents/mariner.png',
    color: '#0ea5e9',
    framework: 'hybrid',
    tier: 'starter',
    category: 'marketing',
    costPerRequest: 0.04,
    requiresApiConnection: true,
    optimalAiModules: ['LangChain Task Orchestration', 'Perplexity AI Claude 3.5 Sonnet'],
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
    description: 'Creates and optimizes web content, performing real-time SEO research and fact-checking',
    avatar: '/agents/pearl.png',
    color: '#14b8a6',
    framework: 'perplexity',
    tier: 'starter',
    category: 'content',
    costPerRequest: 0.06,
    requiresApiConnection: false,
    optimalAiModules: ['Default Model', 'Claude 3.5 Sonnet', 'GPT-4 Omni', '32k token context windows'],
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
    description: 'Manages product listings, inventory, and order automation on e-commerce platforms',
    avatar: '/agents/morgan.png',
    color: '#8b5cf6',
    framework: 'langchain',
    tier: 'professional',
    category: 'ecommerce',
    costPerRequest: 0.03,
    requiresApiConnection: true,
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
    description: 'Processes datasets, generates reports, and identifies business trends and anomalies',
    avatar: '/agents/tide.png',
    color: '#06b6d4',
    framework: 'autogen',
    tier: 'starter',
    category: 'analytics',
    costPerRequest: 0.025,
    requiresApiConnection: false,
    optimalAiModules: ['AssistantAgent', 'Code Executor', 'Tool Call Summary Format', 'Memory components'],
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
  splash: {
    id: 'splash',
    name: 'Splash',
    title: 'Social Media',
    description: 'Schedules posts, monitors trends, and manages engagement across social media platforms',
    avatar: '/agents/splash.png',
    color: '#ec4899',
    framework: 'hybrid',
    tier: 'professional',
    category: 'social',
    costPerRequest: 0.035,
    requiresApiConnection: true,
    optimalAiModules: ['LangChain automation', 'Perplexity AI Default Model', 'Claude 3.5 Haiku for trend research'],
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
  },
  flint: {
    id: 'flint',
    name: 'Flint',
    title: 'Workflow Automation',
    description: 'Orchestrates multi-step business processes and handoffs across agents and tools',
    avatar: '/agents/flint.png',
    color: '#f59e0b',
    framework: 'autogen',
    tier: 'professional',
    category: 'automation',
    costPerRequest: 0.03,
    requiresApiConnection: false,
    optimalAiModules: ['BaseChatAgent', 'AssistantAgent', 'Handoffs system', 'Model Context management'],
    presetActions: [
      {
        id: 'create_workflow',
        label: 'Create Automation Workflow',
        description: 'Design multi-step business process automation',
        icon: 'Workflow',
        category: 'creation',
        estimatedTime: '3 minutes'
      },
      {
        id: 'optimize_process',
        label: 'Optimize Business Process',
        description: 'Analyze and improve existing workflows',
        icon: 'Zap',
        category: 'optimization',
        estimatedTime: '2 minutes'
      },
      {
        id: 'schedule_tasks',
        label: 'Schedule Automated Tasks',
        description: 'Set up recurring business processes',
        icon: 'Clock',
        category: 'scheduling',
        estimatedTime: '90 seconds'
      },
      {
        id: 'monitor_workflows',
        label: 'Monitor Workflow Performance',
        description: 'Track automation success and failures',
        icon: 'Activity',
        category: 'monitoring',
        estimatedTime: '60 seconds'
      }
    ],
    integrations: ['zapier', 'microsoft-power-automate', 'ifttt', 'integromat', 'n8n']
  },
  drake: {
    id: 'drake',
    name: 'Drake',
    title: 'Business Development',
    description: 'Manages sales leads, automates outreach, and gathers competitive intelligence',
    avatar: '/agents/drake.png',
    color: '#dc2626',
    framework: 'hybrid',
    tier: 'professional',
    category: 'business',
    costPerRequest: 0.045,
    requiresApiConnection: true,
    optimalAiModules: ['AutoGen Workflow', 'Perplexity AI Intelligence', 'LangChain CRM data'],
    presetActions: [
      {
        id: 'generate_leads',
        label: 'Generate Sales Leads',
        description: 'Find and qualify potential customers',
        icon: 'Target',
        category: 'prospecting',
        estimatedTime: '4 minutes'
      },
      {
        id: 'automate_outreach',
        label: 'Automate Sales Outreach',
        description: 'Create personalized outreach campaigns',
        icon: 'Mail',
        category: 'outreach',
        estimatedTime: '2 minutes'
      },
      {
        id: 'competitive_analysis',
        label: 'Competitive Intelligence',
        description: 'Research competitors and market positioning',
        icon: 'Search',
        category: 'research',
        estimatedTime: '5 minutes'
      },
      {
        id: 'proposal_generation',
        label: 'Generate Sales Proposals',
        description: 'Create customized business proposals',
        icon: 'FileText',
        category: 'proposals',
        estimatedTime: '3 minutes'
      }
    ],
    integrations: ['salesforce', 'hubspot', 'pipedrive', 'linkedin-sales', 'apollo']
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    title: 'Knowledge Management',
    description: 'Searches, summarizes, and answers questions from internal company documents and data',
    avatar: '/agents/sage.png',
    color: '#7c3aed',
    framework: 'langchain',
    tier: 'professional',
    category: 'knowledge',
    costPerRequest: 0.025,
    requiresApiConnection: false,
    optimalAiModules: ['Agent Module with NER', 'Memory System', 'Custom Agent Development for retrieval'],
    presetActions: [
      {
        id: 'search_documents',
        label: 'Search Company Documents',
        description: 'Find relevant information across all documents',
        icon: 'Search',
        category: 'search',
        estimatedTime: '30 seconds'
      },
      {
        id: 'summarize_content',
        label: 'Summarize Documents',
        description: 'Create concise summaries of long documents',
        icon: 'FileText',
        category: 'summarization',
        estimatedTime: '90 seconds'
      },
      {
        id: 'create_knowledge_base',
        label: 'Build Knowledge Base',
        description: 'Organize and structure company knowledge',
        icon: 'Database',
        category: 'organization',
        estimatedTime: '5 minutes'
      },
      {
        id: 'answer_questions',
        label: 'Answer Knowledge Questions',
        description: 'Provide answers based on company data',
        icon: 'HelpCircle',
        category: 'qa',
        estimatedTime: '45 seconds'
      }
    ],
    integrations: ['notion', 'confluence', 'sharepoint', 'google-drive', 'dropbox']
  },
  anchor: {
    id: 'anchor',
    name: 'Anchor',
    title: 'Supply Chain/Inventory',
    description: 'Tracks inventory, predicts shortages, and monitors suppliers in real-time',
    avatar: '/agents/anchor.png',
    color: '#059669',
    framework: 'hybrid',
    tier: 'enterprise',
    category: 'supply',
    costPerRequest: 0.04,
    requiresApiConnection: true,
    optimalAiModules: ['LangChain Decision-Making', 'Perplexity AI Default Model for market intelligence'],
    presetActions: [
      {
        id: 'track_inventory',
        label: 'Track Inventory Levels',
        description: 'Monitor stock levels across all locations',
        icon: 'Package',
        category: 'tracking',
        estimatedTime: '60 seconds'
      },
      {
        id: 'predict_shortages',
        label: 'Predict Stock Shortages',
        description: 'Forecast inventory needs and shortages',
        icon: 'AlertTriangle',
        category: 'forecasting',
        estimatedTime: '2 minutes'
      },
      {
        id: 'monitor_suppliers',
        label: 'Monitor Supplier Performance',
        description: 'Track supplier reliability and performance',
        icon: 'Truck',
        category: 'monitoring',
        estimatedTime: '90 seconds'
      },
      {
        id: 'optimize_orders',
        label: 'Optimize Purchase Orders',
        description: 'Optimize ordering quantities and timing',
        icon: 'ShoppingCart',
        category: 'optimization',
        estimatedTime: '3 minutes'
      }
    ],
    integrations: ['sap', 'oracle-scm', 'netsuite', 'fishbowl', 'cin7']
  },
  beacon: {
    id: 'beacon',
    name: 'Beacon',
    title: 'Project Management',
    description: 'Assigns tasks, tracks progress, sends reminders, and generates project status reports',
    avatar: '/agents/beacon.png',
    color: '#0891b2',
    framework: 'hybrid',
    tier: 'enterprise',
    category: 'project',
    costPerRequest: 0.035,
    requiresApiConnection: true,
    optimalAiModules: ['LangChain integration', 'AutoGen workflow orchestration'],
    presetActions: [
      {
        id: 'create_project',
        label: 'Create Project Plan',
        description: 'Set up new projects with tasks and timelines',
        icon: 'FolderPlus',
        category: 'planning',
        estimatedTime: '4 minutes'
      },
      {
        id: 'assign_tasks',
        label: 'Assign Team Tasks',
        description: 'Distribute tasks to team members',
        icon: 'UserPlus',
        category: 'assignment',
        estimatedTime: '90 seconds'
      },
      {
        id: 'track_progress',
        label: 'Track Project Progress',
        description: 'Monitor project milestones and deadlines',
        icon: 'BarChart3',
        category: 'tracking',
        estimatedTime: '60 seconds'
      },
      {
        id: 'generate_reports',
        label: 'Generate Status Reports',
        description: 'Create comprehensive project reports',
        icon: 'FileText',
        category: 'reporting',
        estimatedTime: '2 minutes'
      }
    ],
    integrations: ['jira', 'asana', 'monday', 'trello', 'microsoft-project']
  },
  helm: {
    id: 'helm',
    name: 'Helm',
    title: 'HR & Hiring',
    description: 'Screens candidates, schedules interviews, and automates employee onboarding processes',
    avatar: '/agents/helm.png',
    color: '#be185d',
    framework: 'langchain',
    tier: 'enterprise',
    category: 'hr',
    costPerRequest: 0.04,
    requiresApiConnection: true,
    optimalAiModules: ['Custom Agent Development', 'Task Orchestration Engine'],
    presetActions: [
      {
        id: 'screen_candidates',
        label: 'Screen Job Candidates',
        description: 'Evaluate resumes and candidate qualifications',
        icon: 'Users',
        category: 'screening',
        estimatedTime: '3 minutes'
      },
      {
        id: 'schedule_interviews',
        label: 'Schedule Interviews',
        description: 'Coordinate interview schedules with candidates',
        icon: 'Calendar',
        category: 'scheduling',
        estimatedTime: '2 minutes'
      },
      {
        id: 'onboard_employees',
        label: 'Automate Employee Onboarding',
        description: 'Guide new employees through onboarding process',
        icon: 'UserCheck',
        category: 'onboarding',
        estimatedTime: '5 minutes'
      },
      {
        id: 'manage_benefits',
        label: 'Manage Employee Benefits',
        description: 'Handle benefits enrollment and queries',
        icon: 'Heart',
        category: 'benefits',
        estimatedTime: '90 seconds'
      }
    ],
    integrations: ['workday', 'bamboohr', 'greenhouse', 'lever', 'adp']
  },
  ledger: {
    id: 'ledger',
    name: 'Ledger',
    title: 'Finance & Accounting',
    description: 'Processes invoices, matches expenses, and provides cash flow insights',
    avatar: '/agents/ledger.png',
    color: '#16a34a',
    framework: 'langchain',
    tier: 'enterprise',
    category: 'finance',
    costPerRequest: 0.035,
    requiresApiConnection: true,
    optimalAiModules: ['Integration components', 'Decision-Making Module'],
    presetActions: [
      {
        id: 'process_invoices',
        label: 'Process Invoices',
        description: 'Automate invoice processing and approval',
        icon: 'Receipt',
        category: 'invoicing',
        estimatedTime: '2 minutes'
      },
      {
        id: 'match_expenses',
        label: 'Match Expenses',
        description: 'Reconcile expenses with receipts and budgets',
        icon: 'CreditCard',
        category: 'reconciliation',
        estimatedTime: '90 seconds'
      },
      {
        id: 'cash_flow_analysis',
        label: 'Cash Flow Analysis',
        description: 'Analyze and forecast cash flow patterns',
        icon: 'TrendingUp',
        category: 'analysis',
        estimatedTime: '3 minutes'
      },
      {
        id: 'generate_reports',
        label: 'Generate Financial Reports',
        description: 'Create comprehensive financial statements',
        icon: 'FileBarChart',
        category: 'reporting',
        estimatedTime: '4 minutes'
      }
    ],
    integrations: ['quickbooks', 'xero', 'sage', 'netsuite', 'freshbooks']
  },
  patch: {
    id: 'patch',
    name: 'Patch',
    title: 'IT Service Desk',
    description: 'Triages support tickets, automates common IT fixes, and manages incident escalation',
    avatar: '/agents/patch.png',
    color: '#6366f1',
    framework: 'langchain',
    tier: 'enterprise',
    category: 'it',
    costPerRequest: 0.03,
    requiresApiConnection: true,
    optimalAiModules: ['Agent Module', 'Task Orchestration Engine'],
    presetActions: [
      {
        id: 'triage_tickets',
        label: 'Triage Support Tickets',
        description: 'Categorize and prioritize IT support requests',
        icon: 'AlertCircle',
        category: 'triage',
        estimatedTime: '45 seconds'
      },
      {
        id: 'automate_fixes',
        label: 'Automate Common Fixes',
        description: 'Apply standard solutions to common IT issues',
        icon: 'Wrench',
        category: 'automation',
        estimatedTime: '2 minutes'
      },
      {
        id: 'escalate_incidents',
        label: 'Escalate Critical Incidents',
        description: 'Route complex issues to appropriate specialists',
        icon: 'ArrowUp',
        category: 'escalation',
        estimatedTime: '30 seconds'
      },
      {
        id: 'monitor_systems',
        label: 'Monitor System Health',
        description: 'Track system performance and identify issues',
        icon: 'Activity',
        category: 'monitoring',
        estimatedTime: '60 seconds'
      }
    ],
    integrations: ['servicenow', 'jira-service-desk', 'freshservice', 'zendesk', 'remedy']
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

  // Enterprise tier should have access to all agents
  if (userTier === 'enterprise') return true

  const availableAgents = getAgentsForTier(userTier)
  return availableAgents.some(a => a.id === agentId)
}
