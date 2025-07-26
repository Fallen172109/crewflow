'use client'

import { 
  Crown, 
  Star, 
  Zap, 
  Store, 
  CheckCircle, 
  XCircle, 
  Info,
  TrendingUp,
  Users,
  Package,
  BarChart3,
  Globe,
  Truck,
  CreditCard,
  Shield,
  Smartphone
} from 'lucide-react'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'

interface PlanFeature {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
  premium?: boolean
}

interface PlanInfo {
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  features: PlanFeature[]
  agentSuggestion: string
}

const PLAN_FEATURES: Record<string, PlanInfo> = {
  'basic': {
    name: 'Shopify Basic',
    icon: Store,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    features: [
      {
        id: 'products',
        name: 'Product Management',
        description: 'Create and manage up to unlimited products',
        icon: Package,
        available: true
      },
      {
        id: 'orders',
        name: 'Order Processing',
        description: 'Process and fulfill customer orders',
        icon: Truck,
        available: true
      },
      {
        id: 'customers',
        name: 'Customer Management',
        description: 'Manage customer profiles and data',
        icon: Users,
        available: true
      },
      {
        id: 'basic_analytics',
        name: 'Basic Analytics',
        description: 'View basic sales and traffic reports',
        icon: BarChart3,
        available: true
      },
      {
        id: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Detailed reports and custom analytics',
        icon: TrendingUp,
        available: false,
        premium: true
      },
      {
        id: 'pos',
        name: 'Point of Sale',
        description: 'In-person selling capabilities',
        icon: CreditCard,
        available: false,
        premium: true
      }
    ],
    agentSuggestion: "You're on Shopify Basic. I can help you manage products, process orders, and handle customers. For advanced analytics and reporting, consider upgrading to get more detailed insights."
  },
  'shopify': {
    name: 'Shopify',
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    features: [
      {
        id: 'products',
        name: 'Product Management',
        description: 'Create and manage unlimited products',
        icon: Package,
        available: true
      },
      {
        id: 'orders',
        name: 'Order Processing',
        description: 'Advanced order processing and fulfillment',
        icon: Truck,
        available: true
      },
      {
        id: 'customers',
        name: 'Customer Management',
        description: 'Advanced customer segmentation and profiles',
        icon: Users,
        available: true
      },
      {
        id: 'analytics',
        name: 'Professional Analytics',
        description: 'Professional reports and insights',
        icon: BarChart3,
        available: true
      },
      {
        id: 'pos',
        name: 'Point of Sale',
        description: 'Professional POS features',
        icon: CreditCard,
        available: true
      },
      {
        id: 'gift_cards',
        name: 'Gift Cards',
        description: 'Create and manage gift cards',
        icon: CreditCard,
        available: true
      },
      {
        id: 'advanced_features',
        name: 'Advanced Features',
        description: 'Shopify Plus exclusive features',
        icon: Crown,
        available: false,
        premium: true
      }
    ],
    agentSuggestion: "You're on Shopify Standard. I can help with comprehensive store management including products, orders, customers, and professional analytics. You have access to most features I can assist with."
  },
  'advanced': {
    name: 'Shopify Advanced',
    icon: Star,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    features: [
      {
        id: 'products',
        name: 'Product Management',
        description: 'Advanced product management and variants',
        icon: Package,
        available: true
      },
      {
        id: 'orders',
        name: 'Advanced Order Processing',
        description: 'Advanced order processing and automation',
        icon: Truck,
        available: true
      },
      {
        id: 'customers',
        name: 'Advanced Customer Management',
        description: 'Advanced customer analytics and segmentation',
        icon: Users,
        available: true
      },
      {
        id: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Advanced reports and custom analytics',
        icon: TrendingUp,
        available: true
      },
      {
        id: 'pos',
        name: 'Advanced POS',
        description: 'Advanced point of sale features',
        icon: CreditCard,
        available: true
      },
      {
        id: 'third_party',
        name: 'Third-party Integrations',
        description: 'Advanced third-party calculated shipping',
        icon: Globe,
        available: true
      },
      {
        id: 'plus_features',
        name: 'Shopify Plus Features',
        description: 'Enterprise-level features and automation',
        icon: Crown,
        available: false,
        premium: true
      }
    ],
    agentSuggestion: "You're on Shopify Advanced. I can help with all standard features plus advanced analytics, reporting, and third-party integrations. You have access to most of my capabilities."
  },
  'shopify plus': {
    name: 'Shopify Plus',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    features: [
      {
        id: 'products',
        name: 'Enterprise Product Management',
        description: 'Unlimited products with advanced management',
        icon: Package,
        available: true
      },
      {
        id: 'orders',
        name: 'Enterprise Order Processing',
        description: 'Advanced automation and bulk operations',
        icon: Truck,
        available: true
      },
      {
        id: 'customers',
        name: 'Enterprise Customer Management',
        description: 'Advanced customer analytics and automation',
        icon: Users,
        available: true
      },
      {
        id: 'advanced_analytics',
        name: 'Enterprise Analytics',
        description: 'Custom reports and advanced insights',
        icon: TrendingUp,
        available: true
      },
      {
        id: 'automation',
        name: 'Advanced Automation',
        description: 'Shopify Flow and advanced workflows',
        icon: Zap,
        available: true
      },
      {
        id: 'api_access',
        name: 'Enhanced API Access',
        description: 'Higher API limits and advanced integrations',
        icon: Globe,
        available: true
      },
      {
        id: 'security',
        name: 'Enterprise Security',
        description: 'Advanced security and compliance features',
        icon: Shield,
        available: true
      }
    ],
    agentSuggestion: "You're on Shopify Plus! I have access to all enterprise features including advanced automation, enhanced API limits, and custom workflows. I can help with complex operations and integrations."
  }
}

interface PlanAwareFeaturesProps {
  className?: string
  showSuggestion?: boolean
  compact?: boolean
}

export default function PlanAwareFeatures({ 
  className = '', 
  showSuggestion = true,
  compact = false 
}: PlanAwareFeaturesProps) {
  const { selectedStore } = useShopifyStore()

  if (!selectedStore) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Store className="w-8 h-8 mx-auto mb-2" />
          <p>Select a store to view plan features</p>
        </div>
      </div>
    )
  }

  const planKey = selectedStore.plan_name?.toLowerCase().replace(' ', '_') || 'basic'
  const planInfo = PLAN_FEATURES[planKey] || PLAN_FEATURES['basic']
  const PlanIcon = planInfo.icon

  if (compact) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 ${planInfo.bgColor} rounded-lg flex items-center justify-center`}>
            <PlanIcon className={`w-4 h-4 ${planInfo.color}`} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{planInfo.name}</h3>
            <p className="text-sm text-gray-600">
              {planInfo.features.filter(f => f.available).length} features available
            </p>
          </div>
        </div>
        
        {showSuggestion && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{planInfo.agentSuggestion}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${planInfo.bgColor} rounded-lg flex items-center justify-center`}>
            <PlanIcon className={`w-5 h-5 ${planInfo.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{planInfo.name}</h2>
            <p className="text-sm text-gray-600">
              Available features for {selectedStore.store_name}
            </p>
          </div>
        </div>
      </div>

      {/* AI Suggestion */}
      {showSuggestion && (
        <div className="p-6 border-b border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900 mb-1">AI Agent Capabilities</h3>
                <p className="text-sm text-blue-800">{planInfo.agentSuggestion}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planInfo.features.map((feature) => {
            const FeatureIcon = feature.icon
            return (
              <div
                key={feature.id}
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  feature.available 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  feature.available 
                    ? 'bg-green-100' 
                    : 'bg-gray-100'
                }`}>
                  <FeatureIcon className={`w-4 h-4 ${
                    feature.available 
                      ? 'text-green-600' 
                      : 'text-gray-400'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${
                      feature.available 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                    }`}>
                      {feature.name}
                    </h4>
                    {feature.available ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    {feature.premium && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-medium">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${
                    feature.available 
                      ? 'text-gray-600' 
                      : 'text-gray-400'
                  }`}>
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
