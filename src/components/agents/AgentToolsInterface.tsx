'use client'

import { useState } from 'react'
import { Send, Loader2, X } from 'lucide-react'
import { type AgentTool, type AgentToolResult } from '@/lib/agent-tools'

interface AgentToolsInterfaceProps {
  tools: AgentTool[]
  agentId: string
  agentName: string
  agentColor: string
  onToolExecute: (toolId: string, inputs: Record<string, any>) => Promise<AgentToolResult>
  loading?: boolean
}

export default function AgentToolsInterface({
  tools,
  agentId,
  agentName,
  agentColor,
  onToolExecute,
  loading = false
}: AgentToolsInterfaceProps) {
  const [selectedTool, setSelectedTool] = useState<AgentTool | null>(null)
  const [toolInputs, setToolInputs] = useState<Record<string, any>>({})
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<AgentToolResult | null>(null)

  const handleToolSelect = (tool: AgentTool) => {
    setSelectedTool(tool)
    setToolInputs({})
    setResult(null)
  }

  const handleToolExecute = async () => {
    if (!selectedTool) return

    setExecuting(true)
    try {
      const result = await onToolExecute(selectedTool.id, toolInputs)
      setResult(result)
    } catch (error) {
      console.error('Tool execution error:', error)
      setResult({
        success: false,
        result: 'An error occurred while executing the tool.',
        tokensUsed: 0,
        latency: 0,
        framework: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setExecuting(false)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'business_tools': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'daily_tools': return 'bg-green-50 text-green-700 border-green-200'
      case 'creative_tools': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'productivity_tools': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'analysis_tools': return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'communication_tools': return 'bg-pink-50 text-pink-700 border-pink-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getFrameworkBadge = (framework: string) => {
    switch (framework) {
      case 'langchain': return 'bg-blue-100 text-blue-800'
      case 'perplexity': return 'bg-purple-100 text-purple-800'
      case 'autogen': return 'bg-orange-100 text-orange-800'
      case 'hybrid': return 'bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Group tools by category
  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = []
    }
    acc[tool.category].push(tool)
    return acc
  }, {} as Record<string, AgentTool[]>)

  return (
    <div className="space-y-6">
      {/* Tools Grid */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{agentName}'s Maritime Skills</h2>
        
        {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
          <div key={category} className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3 capitalize">
              {category.replace('_', ' ')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  isSelected={selectedTool?.id === tool.id}
                  onSelect={() => handleToolSelect(tool)}
                  getCategoryColor={getCategoryColor}
                  getFrameworkBadge={getFrameworkBadge}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tool Execution Interface */}
      {selectedTool && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Execute: {selectedTool.name}</h2>
            <button
              onClick={() => setSelectedTool(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className={`bg-${agentColor}-50 border border-${agentColor}-200 rounded-lg p-3 mb-4`}>
            <p className={`text-${agentColor}-800 text-sm`}>
              <strong>⚓ {agentName}:</strong> "{selectedTool.description}"
            </p>
          </div>

          {selectedTool.requiresInput && selectedTool.inputSchema && (
            <ToolInputForm
              schema={selectedTool.inputSchema}
              inputs={toolInputs}
              onChange={setToolInputs}
            />
          )}

          <button
            onClick={handleToolExecute}
            disabled={executing || loading}
            className={`w-full px-4 py-2 bg-${agentColor}-600 text-white rounded-md hover:bg-${agentColor}-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-4`}
          >
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Execute Maritime Skill</span>
          </button>

          {/* Results Display */}
          {result && (
            <ToolResultDisplay result={result} agentName={agentName} />
          )}
        </div>
      )}
    </div>
  )
}

// Tool Card Component
interface ToolCardProps {
  tool: AgentTool
  isSelected: boolean
  onSelect: () => void
  getCategoryColor: (category: string) => string
  getFrameworkBadge: (framework: string) => string
}

function ToolCard({ tool, isSelected, onSelect, getCategoryColor, getFrameworkBadge }: ToolCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 text-left hover:shadow-md transition-all duration-200 ${getCategoryColor(tool.category)} ${
        isSelected ? 'ring-2 ring-emerald-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="w-5 h-5 mt-0.5 flex-shrink-0">
          {/* Icon placeholder - will be replaced with actual icons */}
          <div className="w-5 h-5 bg-gray-400 rounded"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium text-sm">{tool.name}</h3>
            <span className={`px-1.5 py-0.5 text-xs rounded ${getFrameworkBadge(tool.framework)}`}>
              {tool.framework}
            </span>
          </div>
          <p className="text-xs opacity-75 mb-2">{tool.description}</p>
          <div className="flex items-center justify-between text-xs">
            <span className={`px-2 py-1 rounded-full ${getCategoryColor(tool.category)}`}>
              {tool.category.replace('_', ' ')}
            </span>
            <span className="text-gray-500">{tool.estimatedTime}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// Tool Input Form Component
interface ToolInputFormProps {
  schema: any
  inputs: Record<string, any>
  onChange: (inputs: Record<string, any>) => void
}

function ToolInputForm({ schema, inputs, onChange }: ToolInputFormProps) {
  const handleInputChange = (fieldName: string, value: any) => {
    onChange({ ...inputs, [fieldName]: value })
  }

  return (
    <div className="space-y-4 mb-4">
      {schema.fields.map((field: any) => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              value={inputs[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={3}
            />
          ) : field.type === 'select' ? (
            <select
              value={inputs[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : field.type === 'number' ? (
            <input
              type="number"
              value={inputs[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          ) : (
            <input
              type="text"
              value={inputs[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Tool Result Display Component
interface ToolResultDisplayProps {
  result: AgentToolResult
  agentName: string
}

function ToolResultDisplay({ result, agentName }: ToolResultDisplayProps) {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{agentName}'s Response</h3>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>Framework: {result.framework}</span>
          <span>•</span>
          <span>Tokens: {result.tokensUsed}</span>
          <span>•</span>
          <span>Time: {result.latency}ms</span>
        </div>
      </div>
      
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap text-gray-700">
          {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
        </div>
      </div>

      {!result.success && result.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">Error: {result.error}</p>
        </div>
      )}
    </div>
  )
}
