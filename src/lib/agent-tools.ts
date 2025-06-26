// Agent Tools System - Specialized capabilities for CrewFlow AI agents
// Terminology: "Agent Tools", "Maritime Skills", "Crew Abilities" (NOT "Power-Ups")

export interface AgentTool {
  id: string
  name: string
  description: string
  category: AgentToolCategory
  icon: string
  estimatedTime: string
  complexity: 'simple' | 'moderate' | 'complex'
  requiresInput: boolean
  inputSchema?: AgentToolInputSchema
  outputFormat: 'text' | 'json' | 'file' | 'action'
  agentId: string
  framework: 'langchain' | 'perplexity' | 'autogen' | 'hybrid'
  tier: 'starter' | 'professional' | 'enterprise'
}

export interface AgentToolInputSchema {
  fields: AgentToolField[]
  validation: ValidationRule[]
}

export interface AgentToolField {
  name: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'file' | 'url' | 'number'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
}

export interface ValidationRule {
  field: string
  rule: 'required' | 'min' | 'max' | 'email' | 'url'
  value?: any
  message?: string
}

export type AgentToolCategory = 
  | 'business_tools'     // Business-specific capabilities
  | 'daily_tools'        // Universal daily-use tools
  | 'creative_tools'     // Creative and content generation
  | 'productivity_tools' // Personal productivity and organization
  | 'analysis_tools'     // Data analysis and insights
  | 'communication_tools' // Communication and collaboration

export interface AgentToolResult {
  success: boolean
  result: any
  tokensUsed: number
  latency: number
  framework: string
  error?: string
  metadata?: any
}

// Anchor Agent's Specialized Tools
export const ANCHOR_AGENT_TOOLS: AgentTool[] = [
  // Business Tools
  {
    id: 'supply_navigator',
    name: 'Supply Navigator',
    description: 'Track inventory levels across all locations with predictive analytics',
    category: 'business_tools',
    icon: 'Package',
    estimatedTime: '60 seconds',
    complexity: 'moderate',
    requiresInput: true,
    inputSchema: {
      fields: [
        { name: 'locations', type: 'multiselect', label: 'Locations to Monitor', required: true, options: ['Warehouse A', 'Warehouse B', 'Store 1', 'Store 2'] },
        { name: 'products', type: 'textarea', label: 'Product SKUs (one per line)', required: true, placeholder: 'Enter product SKUs...' },
        { name: 'threshold', type: 'number', label: 'Low Stock Threshold', required: false, placeholder: '10' }
      ],
      validation: [{ field: 'threshold', rule: 'min', value: 0 }]
    },
    outputFormat: 'json',
    agentId: 'anchor',
    framework: 'hybrid',
    tier: 'enterprise'
  },
  {
    id: 'shortage_predictor',
    name: 'Shortage Predictor',
    description: 'Forecast supply needs and potential shortages using AI analysis',
    category: 'business_tools',
    icon: 'AlertTriangle',
    estimatedTime: '2 minutes',
    complexity: 'complex',
    requiresInput: true,
    inputSchema: {
      fields: [
        { name: 'timeframe', type: 'select', label: 'Prediction Timeframe', required: true, options: ['1 week', '2 weeks', '1 month', '3 months'] },
        { name: 'historical_data', type: 'file', label: 'Historical Sales Data (CSV)', required: false },
        { name: 'seasonal_factors', type: 'textarea', label: 'Seasonal Considerations', required: false, placeholder: 'Holiday seasons, weather patterns, etc.' }
      ],
      validation: []
    },
    outputFormat: 'json',
    agentId: 'anchor',
    framework: 'hybrid',
    tier: 'enterprise'
  },
  
  // Daily Tools
  {
    id: 'crew_meal_planner',
    name: 'Crew Meal Planner',
    description: 'Plan nutritious meals and manage food supplies for the crew',
    category: 'daily_tools',
    icon: 'ChefHat',
    estimatedTime: '2 minutes',
    complexity: 'simple',
    requiresInput: true,
    inputSchema: {
      fields: [
        { name: 'crew_size', type: 'number', label: 'Number of People', required: true, placeholder: '4' },
        { name: 'dietary_restrictions', type: 'multiselect', label: 'Dietary Restrictions', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb'] },
        { name: 'meal_duration', type: 'select', label: 'Planning Duration', required: true, options: ['1 day', '3 days', '1 week', '2 weeks'] },
        { name: 'budget', type: 'number', label: 'Budget per Person per Day ($)', required: false, placeholder: '15' }
      ],
      validation: [
        { field: 'crew_size', rule: 'min', value: 1 },
        { field: 'budget', rule: 'min', value: 0 }
      ]
    },
    outputFormat: 'json',
    agentId: 'anchor',
    framework: 'langchain',
    tier: 'starter'
  },
  {
    id: 'budget_navigator',
    name: 'Budget Navigator',
    description: 'Track personal or business expenses and optimize spending',
    category: 'daily_tools',
    icon: 'Calculator',
    estimatedTime: '90 seconds',
    complexity: 'moderate',
    requiresInput: true,
    inputSchema: {
      fields: [
        { name: 'budget_type', type: 'select', label: 'Budget Type', required: true, options: ['Personal', 'Business', 'Project', 'Event'] },
        { name: 'monthly_income', type: 'number', label: 'Monthly Income/Budget ($)', required: true, placeholder: '5000' },
        { name: 'expenses', type: 'textarea', label: 'Current Expenses (one per line)', required: true, placeholder: 'Rent: $1200\nFood: $400\nUtilities: $150' },
        { name: 'savings_goal', type: 'number', label: 'Savings Goal (%)', required: false, placeholder: '20' }
      ],
      validation: [
        { field: 'monthly_income', rule: 'min', value: 0 },
        { field: 'savings_goal', rule: 'min', value: 0 },
        { field: 'savings_goal', rule: 'max', value: 100 }
      ]
    },
    outputFormat: 'json',
    agentId: 'anchor',
    framework: 'langchain',
    tier: 'starter'
  },
  {
    id: 'home_quartermaster',
    name: 'Home Quartermaster',
    description: 'Organize household supplies and maintenance schedules',
    category: 'daily_tools',
    icon: 'Home',
    estimatedTime: '2 minutes',
    complexity: 'simple',
    requiresInput: true,
    inputSchema: {
      fields: [
        { name: 'home_type', type: 'select', label: 'Home Type', required: true, options: ['Apartment', 'House', 'Condo', 'Townhouse'] },
        { name: 'rooms', type: 'multiselect', label: 'Rooms to Organize', required: true, options: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Garage', 'Basement', 'Office'] },
        { name: 'maintenance_focus', type: 'select', label: 'Maintenance Focus', required: true, options: ['Cleaning Schedule', 'Repair Tracking', 'Supply Inventory', 'Seasonal Tasks'] },
        { name: 'household_size', type: 'number', label: 'Household Size', required: false, placeholder: '3' }
      ],
      validation: [
        { field: 'household_size', rule: 'min', value: 1 }
      ]
    },
    outputFormat: 'json',
    agentId: 'anchor',
    framework: 'langchain',
    tier: 'starter'
  }
]

// Get tools for specific agent
export function getAgentTools(agentId: string): AgentTool[] {
  return ANCHOR_AGENT_TOOLS.filter(tool => tool.agentId === agentId)
}

// Get tools by category
export function getToolsByCategory(category: AgentToolCategory): AgentTool[] {
  return ANCHOR_AGENT_TOOLS.filter(tool => tool.category === category)
}

// Check if user can access tool based on tier
export function canUserAccessTool(userTier: string | null, toolTier: string): boolean {
  if (!userTier) return false
  
  switch (userTier) {
    case 'starter':
      return toolTier === 'starter'
    case 'professional':
      return toolTier === 'starter' || toolTier === 'professional'
    case 'enterprise':
      return true
    default:
      return false
  }
}

// Get tool by ID
export function getAgentTool(toolId: string): AgentTool | null {
  return ANCHOR_AGENT_TOOLS.find(tool => tool.id === toolId) || null
}
