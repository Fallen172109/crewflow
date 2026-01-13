'use client'

import { useState, useCallback } from 'react'
import { 
  Play, 
  Plus, 
  Settings, 
  Trash2, 
  Copy, 
  Save, 
  Eye,
  Clock,
  Zap,
  Filter,
  ArrowRight,
  ArrowDown,
  CheckCircle,
  AlertTriangle,
  Mail,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Bell,
  Anchor
} from 'lucide-react'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'condition' | 'action' | 'delay'
  title: string
  description: string
  config: any
  position: { x: number; y: number }
  connections: string[]
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: WorkflowNode[]
  enabled: boolean
  agentId?: string
}

const TRIGGER_TYPES = [
  { id: 'order_created', name: 'New Order', icon: ShoppingCart, description: 'When a new order is placed' },
  { id: 'order_paid', name: 'Order Paid', icon: CheckCircle, description: 'When payment is confirmed' },
  { id: 'inventory_low', name: 'Low Inventory', icon: Package, description: 'When stock falls below threshold' },
  { id: 'customer_created', name: 'New Customer', icon: Users, description: 'When a new customer registers' },
  { id: 'product_updated', name: 'Product Updated', icon: Package, description: 'When product information changes' },
  { id: 'scheduled', name: 'Scheduled', icon: Clock, description: 'Run on a schedule' }
]

const ACTION_TYPES = [
  { id: 'send_email', name: 'Send Email', icon: Mail, description: 'Send email notification' },
  { id: 'update_inventory', name: 'Update Inventory', icon: Package, description: 'Adjust inventory levels' },
  { id: 'fulfill_order', name: 'Fulfill Order', icon: ShoppingCart, description: 'Process order fulfillment' },
  { id: 'create_discount', name: 'Create Discount', icon: BarChart3, description: 'Generate discount code' },
  { id: 'notify_agent', name: 'Notify Agent', icon: Bell, description: 'Alert specific agent' },
  { id: 'run_analysis', name: 'Run Analysis', icon: BarChart3, description: 'Execute analytics task' }
]

export default function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)

  // Sample workflow templates
  const workflowTemplates: WorkflowTemplate[] = [
    {
      id: 'abandoned_cart_recovery',
      name: 'Abandoned Cart Recovery',
      description: 'Automatically follow up on abandoned carts with email sequence',
      category: 'Marketing',
      enabled: false,
      agentId: 'flint',
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          title: 'Cart Abandoned',
          description: 'When a cart is abandoned for 1 hour',
          config: { event: 'cart_abandoned', delay: 3600 },
          position: { x: 100, y: 100 },
          connections: ['delay_1']
        },
        {
          id: 'delay_1',
          type: 'delay',
          title: 'Wait 1 Hour',
          description: 'Wait before sending first email',
          config: { duration: 3600 },
          position: { x: 100, y: 200 },
          connections: ['action_1']
        },
        {
          id: 'action_1',
          type: 'action',
          title: 'Send Recovery Email',
          description: 'Send first recovery email with 10% discount',
          config: { type: 'send_email', template: 'cart_recovery_1', discount: 10 },
          position: { x: 100, y: 300 },
          connections: ['delay_2']
        },
        {
          id: 'delay_2',
          type: 'delay',
          title: 'Wait 24 Hours',
          description: 'Wait before sending second email',
          config: { duration: 86400 },
          position: { x: 100, y: 400 },
          connections: ['action_2']
        },
        {
          id: 'action_2',
          type: 'action',
          title: 'Send Final Email',
          description: 'Send final recovery email with 15% discount',
          config: { type: 'send_email', template: 'cart_recovery_2', discount: 15 },
          position: { x: 100, y: 500 },
          connections: []
        }
      ]
    },
    {
      id: 'low_stock_alert',
      name: 'Low Stock Alert & Reorder',
      description: 'Monitor inventory and automatically reorder when stock is low',
      category: 'Inventory',
      enabled: true,
      agentId: 'anchor',
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          title: 'Low Inventory',
          description: 'When inventory falls below 10 units',
          config: { event: 'inventory_low', threshold: 10 },
          position: { x: 100, y: 100 },
          connections: ['condition_1']
        },
        {
          id: 'condition_1',
          type: 'condition',
          title: 'Check Product Type',
          description: 'Only for high-value products',
          config: { field: 'product_type', operator: 'equals', value: 'premium' },
          position: { x: 100, y: 200 },
          connections: ['action_1', 'action_2']
        },
        {
          id: 'action_1',
          type: 'action',
          title: 'Notify Manager',
          description: 'Send alert to inventory manager',
          config: { type: 'send_email', recipient: 'manager', template: 'low_stock_alert' },
          position: { x: 50, y: 300 },
          connections: []
        },
        {
          id: 'action_2',
          type: 'action',
          title: 'Create Reorder',
          description: 'Automatically create reorder request',
          config: { type: 'create_reorder', quantity: 50 },
          position: { x: 150, y: 300 },
          connections: []
        }
      ]
    },
    {
      id: 'new_customer_welcome',
      name: 'New Customer Welcome Series',
      description: 'Welcome new customers with personalized email sequence',
      category: 'Customer Service',
      enabled: true,
      agentId: 'beacon',
      nodes: [
        {
          id: 'trigger_1',
          type: 'trigger',
          title: 'New Customer',
          description: 'When a new customer registers',
          config: { event: 'customer_created' },
          position: { x: 100, y: 100 },
          connections: ['action_1']
        },
        {
          id: 'action_1',
          type: 'action',
          title: 'Send Welcome Email',
          description: 'Send personalized welcome email',
          config: { type: 'send_email', template: 'welcome', personalized: true },
          position: { x: 100, y: 200 },
          connections: ['delay_1']
        },
        {
          id: 'delay_1',
          type: 'delay',
          title: 'Wait 3 Days',
          description: 'Wait before sending product recommendations',
          config: { duration: 259200 },
          position: { x: 100, y: 300 },
          connections: ['action_2']
        },
        {
          id: 'action_2',
          type: 'action',
          title: 'Send Recommendations',
          description: 'Send personalized product recommendations',
          config: { type: 'send_email', template: 'recommendations' },
          position: { x: 100, y: 400 },
          connections: []
        }
      ]
    }
  ]

  const createNewWorkflow = () => {
    const newWorkflow: WorkflowTemplate = {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      description: 'Custom automation workflow',
      category: 'Custom',
      enabled: false,
      nodes: []
    }
    setSelectedWorkflow(newWorkflow)
    setIsEditing(true)
  }

  const addNode = (type: WorkflowNode['type'], nodeType: string) => {
    if (!selectedWorkflow) return

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      title: type === 'trigger' ? TRIGGER_TYPES.find(t => t.id === nodeType)?.name || 'Trigger' :
             type === 'action' ? ACTION_TYPES.find(a => a.id === nodeType)?.name || 'Action' :
             type === 'condition' ? 'Condition' : 'Delay',
      description: type === 'trigger' ? TRIGGER_TYPES.find(t => t.id === nodeType)?.description || '' :
                   type === 'action' ? ACTION_TYPES.find(a => a.id === nodeType)?.description || '' :
                   type === 'condition' ? 'Check condition' : 'Wait for specified time',
      config: { type: nodeType },
      position: { x: 100 + selectedWorkflow.nodes.length * 50, y: 100 + selectedWorkflow.nodes.length * 100 },
      connections: []
    }

    setSelectedWorkflow({
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode]
    })
  }

  const deleteNode = (nodeId: string) => {
    if (!selectedWorkflow) return

    setSelectedWorkflow({
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.filter(node => node.id !== nodeId)
    })
  }

  const getNodeIcon = (node: WorkflowNode) => {
    switch (node.type) {
      case 'trigger':
        return Zap
      case 'condition':
        return Filter
      case 'action':
        return Play
      case 'delay':
        return Clock
      default:
        return Play
    }
  }

  const getNodeColor = (node: WorkflowNode) => {
    switch (node.type) {
      case 'trigger':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'condition':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'action':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'delay':
        return 'bg-purple-100 border-purple-300 text-purple-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Zap className="w-8 h-8 text-green-600" />
            <span>Automation Workflow Builder</span>
          </h2>
          <p className="text-gray-600 mt-1">Create custom automation workflows for your maritime operations</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            <span>Templates</span>
          </button>
          <button
            onClick={createNewWorkflow}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Workflows</h3>
            
            {/* Templates */}
            {showTemplates && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Templates</h4>
                <div className="space-y-2">
                  {workflowTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedWorkflow(template)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedWorkflow?.id === template.id
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{template.name}</span>
                        <span className={`w-2 h-2 rounded-full ${template.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      </div>
                      <p className="text-xs text-gray-600">{template.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{template.category}</span>
                        {template.agentId && (
                          <div className="flex items-center space-x-1">
                            <Anchor className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600 capitalize">{template.agentId}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Workflows */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Workflows</h4>
              {workflows.length === 0 ? (
                <p className="text-sm text-gray-500">No custom workflows yet</p>
              ) : (
                <div className="space-y-2">
                  {workflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => setSelectedWorkflow(workflow)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedWorkflow?.id === workflow.id
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{workflow.name}</span>
                        <span className={`w-2 h-2 rounded-full ${workflow.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      </div>
                      <p className="text-xs text-gray-600">{workflow.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Canvas */}
        <div className="lg:col-span-3">
          {selectedWorkflow ? (
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Workflow Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedWorkflow.name}</h3>
                    <p className="text-gray-600">{selectedWorkflow.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                        isEditing ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>{isEditing ? 'View' : 'Edit'}</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <Play className="w-4 h-4" />
                      <span>Test</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Node Palette */}
              {isEditing && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Add Nodes</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {/* Triggers */}
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-600">Triggers</span>
                      {TRIGGER_TYPES.slice(0, 2).map((trigger) => {
                        const Icon = trigger.icon
                        return (
                          <button
                            key={trigger.id}
                            onClick={() => addNode('trigger', trigger.id)}
                            className="w-full flex items-center space-x-2 p-2 text-xs bg-green-100 text-green-800 rounded border border-green-300 hover:bg-green-200"
                          >
                            <Icon className="w-3 h-3" />
                            <span>{trigger.name}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Actions */}
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-600">Actions</span>
                      {ACTION_TYPES.slice(0, 2).map((action) => {
                        const Icon = action.icon
                        return (
                          <button
                            key={action.id}
                            onClick={() => addNode('action', action.id)}
                            className="w-full flex items-center space-x-2 p-2 text-xs bg-blue-100 text-blue-800 rounded border border-blue-300 hover:bg-blue-200"
                          >
                            <Icon className="w-3 h-3" />
                            <span>{action.name}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Conditions & Delays */}
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-gray-600">Logic</span>
                      <button
                        onClick={() => addNode('condition', 'condition')}
                        className="w-full flex items-center space-x-2 p-2 text-xs bg-yellow-100 text-yellow-800 rounded border border-yellow-300 hover:bg-yellow-200"
                      >
                        <Filter className="w-3 h-3" />
                        <span>Condition</span>
                      </button>
                      <button
                        onClick={() => addNode('delay', 'delay')}
                        className="w-full flex items-center space-x-2 p-2 text-xs bg-purple-100 text-purple-800 rounded border border-purple-300 hover:bg-purple-200"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Delay</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Workflow Canvas */}
              <div className="p-6 min-h-96 relative">
                {selectedWorkflow.nodes.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Empty Workflow</h3>
                    <p className="text-gray-600 mb-4">
                      {isEditing ? 'Add nodes to build your automation workflow' : 'This workflow has no nodes configured'}
                    </p>
                    {isEditing && (
                      <button
                        onClick={() => addNode('trigger', 'order_created')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Add First Node
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedWorkflow.nodes.map((node, index) => {
                      const Icon = getNodeIcon(node)
                      return (
                        <div key={node.id} className="flex items-center space-x-4">
                          {/* Node */}
                          <div className={`relative p-4 rounded-lg border-2 min-w-64 ${getNodeColor(node)}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <Icon className="w-5 h-5" />
                                <div>
                                  <h4 className="font-medium">{node.title}</h4>
                                  <p className="text-sm opacity-75">{node.description}</p>
                                </div>
                              </div>
                              {isEditing && (
                                <button
                                  onClick={() => deleteNode(node.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Connection Arrow */}
                          {index < selectedWorkflow.nodes.length - 1 && (
                            <ArrowDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Select a Workflow</h3>
              <p className="text-gray-600 mb-6">Choose a workflow from the list or create a new one to get started</p>
              <button
                onClick={createNewWorkflow}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
              >
                Create New Workflow
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
