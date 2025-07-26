'use client'

import { useState, useCallback, useRef } from 'react'
import { 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  Settings, 
  Save, 
  Download, 
  Upload,
  Zap,
  GitBranch,
  Clock,
  Database,
  Mail,
  ShoppingCart,
  BarChart3,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Copy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'agent'
  position: { x: number; y: number }
  data: {
    title: string
    description: string
    config: any
    agentId?: string
    icon: any
    color: string
  }
  connections: string[]
}

interface WorkflowConnection {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

interface Workflow {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  triggers: any[]
  variables: Record<string, any>
}

const nodeTypes = {
  trigger: {
    icon: Zap,
    color: 'bg-green-500',
    category: 'Triggers',
    items: [
      { id: 'schedule', title: 'Schedule', description: 'Run on a schedule', icon: Clock },
      { id: 'webhook', title: 'Webhook', description: 'Trigger via HTTP webhook', icon: Zap },
      { id: 'data_change', title: 'Data Change', description: 'When data changes', icon: Database },
      { id: 'order_created', title: 'New Order', description: 'When order is created', icon: ShoppingCart },
      { id: 'inventory_low', title: 'Low Inventory', description: 'When stock is low', icon: AlertTriangle }
    ]
  },
  action: {
    icon: Play,
    color: 'bg-blue-500',
    category: 'Actions',
    items: [
      { id: 'send_email', title: 'Send Email', description: 'Send notification email', icon: Mail },
      { id: 'update_product', title: 'Update Product', description: 'Modify product details', icon: ShoppingCart },
      { id: 'create_report', title: 'Create Report', description: 'Generate analytics report', icon: BarChart3 },
      { id: 'notify_team', title: 'Notify Team', description: 'Send team notification', icon: Users },
      { id: 'log_event', title: 'Log Event', description: 'Record event in logs', icon: Database }
    ]
  },
  condition: {
    icon: GitBranch,
    color: 'bg-yellow-500',
    category: 'Logic',
    items: [
      { id: 'if_condition', title: 'If/Then', description: 'Conditional logic', icon: GitBranch },
      { id: 'filter', title: 'Filter', description: 'Filter data', icon: GitBranch },
      { id: 'switch', title: 'Switch', description: 'Multiple conditions', icon: GitBranch }
    ]
  },
  delay: {
    icon: Clock,
    color: 'bg-purple-500',
    category: 'Timing',
    items: [
      { id: 'wait', title: 'Wait', description: 'Pause execution', icon: Clock },
      { id: 'schedule_delay', title: 'Schedule', description: 'Wait until time', icon: Clock }
    ]
  },
  agent: {
    icon: Users,
    color: 'bg-orange-500',
    category: 'Agents',
    items: [
      { id: 'anchor', title: 'Anchor', description: 'Shopify management', icon: Users },
      { id: 'pearl', title: 'Pearl', description: 'Data analysis', icon: Users },
      { id: 'flint', title: 'Flint', description: 'Marketing automation', icon: Users },
      { id: 'splash', title: 'Splash', description: 'Customer service', icon: Users },
      { id: 'drake', title: 'Drake', description: 'Financial analysis', icon: Users }
    ]
  }
}

export default function WorkflowBuilder() {
  const [workflow, setWorkflow] = useState<Workflow>({
    id: '',
    name: 'New Workflow',
    description: '',
    category: 'custom',
    enabled: false,
    nodes: [],
    connections: [],
    triggers: [],
    variables: {}
  })

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [draggedNode, setDraggedNode] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showNodePanel, setShowNodePanel] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)

  const addNode = useCallback((nodeType: any, position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType.category.toLowerCase().slice(0, -1) as any,
      position,
      data: {
        title: nodeType.title,
        description: nodeType.description,
        config: {},
        agentId: nodeType.id.includes('agent') ? nodeType.id : undefined,
        icon: nodeType.icon,
        color: nodeTypes[nodeType.category.toLowerCase().slice(0, -1) as keyof typeof nodeTypes]?.color || 'bg-gray-500'
      },
      connections: []
    }

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }))
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(conn => 
        conn.source !== nodeId && conn.target !== nodeId
      )
    }))
    setSelectedNode(null)
  }, [])

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }))
  }, [])

  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    const connectionId = `conn_${sourceId}_${targetId}`
    
    // Check if connection already exists
    const exists = workflow.connections.some(conn => 
      conn.source === sourceId && conn.target === targetId
    )

    if (!exists) {
      const newConnection: WorkflowConnection = {
        id: connectionId,
        source: sourceId,
        target: targetId
      }

      setWorkflow(prev => ({
        ...prev,
        connections: [...prev.connections, newConnection]
      }))
    }
  }, [workflow.connections])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    if (!draggedNode || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const position = {
      x: e.clientX - rect.left - 100, // Center the node
      y: e.clientY - rect.top - 50
    }

    addNode(draggedNode, position)
    setDraggedNode(null)
  }, [draggedNode, addNode])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const runWorkflow = async () => {
    setIsRunning(true)
    
    try {
      // Simulate workflow execution
      console.log('Running workflow:', workflow)
      
      // Here you would send the workflow to the backend for execution
      const response = await fetch('/api/automation/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      })

      if (!response.ok) {
        throw new Error('Failed to execute workflow')
      }

      const result = await response.json()
      console.log('Workflow execution result:', result)
      
    } catch (error) {
      console.error('Error running workflow:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const saveWorkflow = async () => {
    try {
      const response = await fetch('/api/automation/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      })

      if (!response.ok) {
        throw new Error('Failed to save workflow')
      }

      const result = await response.json()
      console.log('Workflow saved:', result)
      
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Node Panel */}
      <AnimatePresence>
        {showNodePanel && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 bg-white border-r border-gray-200 flex flex-col"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Workflow Nodes</h2>
                <button
                  onClick={() => setShowNodePanel(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {Object.entries(nodeTypes).map(([key, category]) => (
                <div key={key} className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <category.icon className="w-4 h-4 mr-2" />
                    {category.category}
                  </h3>
                  
                  <div className="space-y-2">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggedNode({ ...item, category: category.category })}
                        className="p-3 border border-gray-200 rounded-lg cursor-move hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${category.color} text-white`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-500 truncate">{item.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                className="text-lg font-semibold bg-transparent border-none outline-none text-gray-900"
                placeholder="Workflow Name"
              />
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={runWorkflow}
                  disabled={isRunning || workflow.nodes.length === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run</span>
                    </>
                  )}
                </button>

                <button
                  onClick={saveWorkflow}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!showNodePanel && (
                <button
                  onClick={() => setShowNodePanel(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              
              <button className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
              </button>
              
              <button className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-gray-50"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            backgroundImage: `
              radial-gradient(circle, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        >
          {/* Workflow Nodes */}
          {workflow.nodes.map((node) => (
            <motion.div
              key={node.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute w-48 bg-white rounded-lg border-2 shadow-sm cursor-pointer ${
                selectedNode?.id === node.id ? 'border-blue-500' : 'border-gray-200'
              }`}
              style={{
                left: node.position.x,
                top: node.position.y
              }}
              onClick={() => setSelectedNode(node)}
              onDoubleClick={() => {
                // Open node configuration
                console.log('Configure node:', node)
              }}
            >
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg ${node.data.color} text-white`}>
                    <node.data.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {node.data.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {node.data.description}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNode(node.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Connection Points */}
                <div className="flex justify-between">
                  <div className="w-3 h-3 bg-gray-300 rounded-full border-2 border-white -ml-1.5"></div>
                  <div className="w-3 h-3 bg-gray-300 rounded-full border-2 border-white -mr-1.5"></div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Connections */}
          <svg className="absolute inset-0 pointer-events-none">
            {workflow.connections.map((connection) => {
              const sourceNode = workflow.nodes.find(n => n.id === connection.source)
              const targetNode = workflow.nodes.find(n => n.id === connection.target)
              
              if (!sourceNode || !targetNode) return null

              const startX = sourceNode.position.x + 192 // Node width
              const startY = sourceNode.position.y + 50  // Node center
              const endX = targetNode.position.x
              const endY = targetNode.position.y + 50

              return (
                <g key={connection.id}>
                  <path
                    d={`M ${startX} ${startY} C ${startX + 50} ${startY} ${endX - 50} ${endY} ${endX} ${endY}`}
                    stroke="#6b7280"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              )
            })}
            
            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6b7280"
                />
              </marker>
            </defs>
          </svg>

          {/* Empty State */}
          {workflow.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start Building Your Workflow
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag nodes from the panel to create your automation workflow
                </p>
                <button
                  onClick={() => setShowNodePanel(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Node</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <motion.div
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          className="w-80 bg-white border-l border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Node Properties</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={selectedNode.data.title}
                onChange={(e) => updateNode(selectedNode.id, {
                  data: { ...selectedNode.data, title: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={selectedNode.data.description}
                onChange={(e) => updateNode(selectedNode.id, {
                  data: { ...selectedNode.data, description: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuration
              </label>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  Node-specific configuration options would appear here based on the node type.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
