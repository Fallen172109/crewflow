'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useShopifyStore } from '@/contexts/ShopifyStoreContext'
import ProductPreviewPanel from './ProductPreviewPanel'
import {
  Package,
  Store,
  Settings,
  AlertCircle,
  Plus,
  Wrench,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ProductPreview {
  title?: string
  description?: string
  price?: number
  images?: string[]
  category?: string
  tags?: string[]
}

interface BottomManagementPanelProps {
  className?: string
  onQuickAction?: (action: string, message: string) => void
  productPreview?: ProductPreview | null
  isGeneratingProduct?: boolean
  onPublishToShopify?: (product: ProductPreview) => void
  // Enhanced orchestrator integration
  selectedAgent?: any
  agentSuggestions?: any[]
  onAgentAction?: (actionId: string, parameters: any) => void
  maritimePersonality?: {
    shouldIntroduce: boolean
    personalityMessage?: string
    agentSwitchMessage?: string
  }
}

interface EssentialAction {
  label: string
  description: string
  icon: React.ComponentType<any>
  color: 'green' | 'blue' | 'purple' | 'red'
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  actions: Array<{
    label: string
    message: string
    icon: React.ComponentType<any>
    primary?: boolean
  }>
}

export default function BottomManagementPanel({
  className = '',
  onQuickAction,
  productPreview,
  isGeneratingProduct = false,
  onPublishToShopify,
  selectedAgent,
  agentSuggestions = [],
  onAgentAction,
  maritimePersonality
}: BottomManagementPanelProps) {
  const { selectedStore } = useShopifyStore()
  const [recentProducts, setRecentProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Fetch recent products when store is selected
  useEffect(() => {
    const fetchRecentProducts = async () => {
      if (!selectedStore) {
        setRecentProducts([])
        return
      }

      setLoadingProducts(true)
      try {
        const response = await fetch(`/api/shopify/stores/${selectedStore.id}/products?limit=3`)
        if (response.ok) {
          const data = await response.json()
          setRecentProducts(data.products || [])
        }
      } catch (error) {
        console.error('Failed to fetch recent products:', error)
        setRecentProducts([])
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchRecentProducts()
  }, [selectedStore])

  // Essential store setup actions - memoized for performance
  const essentialActions: EssentialAction[] = useMemo(() => [
    {
      label: 'Product Creation',
      description: 'Create and manage product listings',
      icon: Plus,
      color: 'green',
      status: 'pending',
      priority: 'high',
      actions: [
        {
          label: 'Create New Product',
          message: 'Help me create a new product listing with optimized title, description, pricing, and SEO tags',
          icon: Plus,
          primary: true
        },
        {
          label: 'Bulk Import Products',
          message: 'Guide me through importing multiple products from a CSV file or spreadsheet',
          icon: Package
        }
      ]
    },
    {
      label: 'Store Setup',
      description: 'Essential store configuration',
      icon: Store,
      color: 'blue',
      status: 'in-progress',
      priority: 'high',
      actions: [
        {
          label: 'Configure Store Settings',
          message: 'Help me set up my store settings including payment methods, shipping zones, and tax configuration',
          icon: Settings,
          primary: true
        },
        {
          label: 'Setup Store Policies',
          message: 'Create professional store policies including privacy policy, terms of service, and return policy',
          icon: CheckCircle
        }
      ]
    },
    {
      label: 'Product Management',
      description: 'Manage existing inventory',
      icon: Package,
      color: 'green',
      status: 'completed',
      priority: 'medium',
      actions: [
        {
          label: 'Update Inventory',
          message: 'Help me update inventory levels, set low stock alerts, and manage product variants',
          icon: Wrench,
          primary: true
        },
        {
          label: 'Optimize Listings',
          message: 'Analyze and optimize my existing product listings for better SEO and conversion rates',
          icon: Zap
        }
      ]
    }
  ], [])

  const handleQuickAction = (action: string, message: string) => {
    onQuickAction?.(action, message)
  }

  const handleAgentAction = (actionId: string, parameters: any) => {
    onAgentAction?.(actionId, parameters)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'in-progress': return 'text-green-600'
      case 'pending': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'in-progress': return Settings
      case 'pending': return AlertCircle
      default: return AlertCircle
    }
  }

  if (!selectedStore) {
    return (
      <div className={`p-6 bg-gray-50 ${className}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-gray-900 text-lg font-semibold mb-2">No Store Connected</h3>
            <p className="text-gray-600">Connect your Shopify store to see management tools</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 bg-gray-50 overflow-hidden ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 text-xl font-bold mb-2">Essential Store Setup</h2>
              <p className="text-gray-600">
                {selectedAgent ?
                  `⚓ ${selectedAgent.name} (${selectedAgent.title}) is navigating your store operations` :
                  `Focus on getting your store operational with ${selectedStore.storeName}`
                }
              </p>
            </div>
            {selectedAgent && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{selectedAgent.name} Active</span>
              </div>
            )}
          </div>

          {/* Maritime Personality Messages */}
          {maritimePersonality?.agentSwitchMessage && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{
                __html: maritimePersonality.agentSwitchMessage.replace(/\n/g, '<br/>')
              }} />
            </div>
          )}
        </div>

        {/* Main Content Grid: Essential Actions (Left) + Product Preview (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Left Side - Essential Actions (Spotlight Cards) */}
          <div className="xl:col-span-2 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {essentialActions.map((action, index) => {
            const Icon = action.icon
            const StatusIcon = getStatusIcon(action.status)
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="h-full"
              >
                <div className={`w-full h-80 cursor-pointer transition-all duration-200 hover:scale-[1.02] rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl relative overflow-hidden group ${
                  action.color === 'green' ? 'hover:border-green-300 hover:shadow-green-100' :
                  action.color === 'blue' ? 'hover:border-blue-300 hover:shadow-blue-100' :
                  action.color === 'green' ? 'hover:border-green-300 hover:shadow-green-100' :
                  action.color === 'purple' ? 'hover:border-purple-300 hover:shadow-purple-100' :
                  'hover:border-red-300 hover:shadow-red-100'
                }`}>
                  <div className="flex flex-col h-full p-1">
                    {/* Header with Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-5 h-5 ${
                          action.color === 'green' ? 'text-green-600' :
                          action.color === 'blue' ? 'text-blue-600' :
                          action.color === 'green' ? 'text-green-600' :
                          action.color === 'purple' ? 'text-purple-600' :
                          'text-red-600'
                        }`} />
                        <span className="text-gray-900 text-sm font-semibold">{action.label}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <StatusIcon className={`w-4 h-4 ${getStatusColor(action.status)}`} />
                        <span className={`text-xs font-medium capitalize ${getStatusColor(action.status)}`}>
                          {action.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                      <p className="text-gray-600 text-sm leading-relaxed">{action.description}</p>
                    </div>

                    {/* Priority Badge */}
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        action.priority === 'high' ? 'bg-red-100 text-red-800' :
                        action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {action.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div className="space-y-2">
                        {action.actions.map((actionItem) => {
                          const ActionIcon = actionItem.icon
                          return (
                            <button
                              key={actionItem.label}
                              onClick={() => handleQuickAction(actionItem.label, actionItem.message)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm border ${
                                actionItem.primary
                                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <ActionIcon className="w-3 h-3" />
                                <span>{actionItem.label}</span>
                              </div>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
            </div>

            {/* Agent Suggestions Section */}
            {agentSuggestions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 text-green-600 mr-2" />
                  Maritime Agent Suggestions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agentSuggestions.slice(0, 4).map((suggestion, index) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleAgentAction(suggestion.id, suggestion.parameters)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{suggestion.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                              suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {suggestion.priority} priority
                            </span>
                            <span className="text-xs text-gray-500">{suggestion.type}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Product Preview Panel */}
          <div className="xl:col-span-1">
            <ProductPreviewPanel
              className="h-[500px]"
              productPreview={productPreview}
              isGenerating={isGeneratingProduct}
              onPublishToShopify={onPublishToShopify}
              recentProducts={recentProducts}
              loadingProducts={loadingProducts}
            />
          </div>
        </div>

        {/* Setup Progress Tracker - Simplified */}
        <div className="mt-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 text-lg font-semibold">Store Setup Progress</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-sm font-medium">2 of 3 completed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {essentialActions.map((action) => {
                const StatusIcon = getStatusIcon(action.status)
                return (
                  <div key={action.label} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      action.status === 'completed' ? 'bg-green-100' :
                      action.status === 'in-progress' ? 'bg-green-100' :
                      'bg-gray-100'
                    }`}>
                      <StatusIcon className={`w-4 h-4 ${getStatusColor(action.status)}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm font-medium">{action.label}</p>
                      <p className="text-gray-600 text-xs">{action.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
