'use client'

// Action Execution Panel
// Displays detected actions and allows users to execute them with confirmation

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Zap,
  Eye,
  Settings
} from 'lucide-react'
import { ShopifyAction, ActionResult } from '@/lib/ai/shopify-action-executor'

interface ActionExecutionPanelProps {
  actions: ShopifyAction[]
  onExecuteAction: (action: ShopifyAction, confirmed: boolean) => Promise<ActionResult>
  onPreviewAction: (action: ShopifyAction) => Promise<any>
  className?: string
}

interface ActionState {
  actionId: string
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'previewing'
  result?: ActionResult
  preview?: any
  error?: string
}

export default function ActionExecutionPanel({
  actions,
  onExecuteAction,
  onPreviewAction,
  className = ''
}: ActionExecutionPanelProps) {
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({})
  const [expandedAction, setExpandedAction] = useState<string | null>(null)

  const updateActionState = (actionId: string, updates: Partial<ActionState>) => {
    setActionStates(prev => ({
      ...prev,
      [actionId]: { ...prev[actionId], actionId, ...updates }
    }))
  }

  const handleExecuteAction = async (action: ShopifyAction) => {
    updateActionState(action.id, { status: 'executing' })

    try {
      const result = await onExecuteAction(action, true)
      updateActionState(action.id, {
        status: result.success ? 'completed' : 'failed',
        result,
        error: result.error
      })
    } catch (error) {
      updateActionState(action.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const handlePreviewAction = async (action: ShopifyAction) => {
    updateActionState(action.id, { status: 'previewing' })

    try {
      const preview = await onPreviewAction(action)
      updateActionState(action.id, {
        status: 'pending',
        preview
      })
    } catch (error) {
      updateActionState(action.id, {
        status: 'pending',
        error: error instanceof Error ? error.message : 'Preview failed'
      })
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-orange-600 bg-orange-50'
      case 'high': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executing': return <Play className="w-4 h-4 animate-spin" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
      case 'previewing': return <Eye className="w-4 h-4 animate-pulse" />
      default: return <Pause className="w-4 h-4 text-gray-400" />
    }
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Detected Actions</h3>
          <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded-full">
            {actions.length} action{actions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Review and execute the actions detected in the AI response
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {actions.map((action) => {
          const state = actionStates[action.id] || { actionId: action.id, status: 'pending' }
          const isExpanded = expandedAction === action.id

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(state.status)}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {action.description}
                      </h4>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(action.riskLevel)}`}>
                          {action.riskLevel.toUpperCase()} RISK
                        </span>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {action.estimatedTime}
                        </div>
                        <span className="text-xs text-gray-500">
                          {action.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Status Messages */}
                  <AnimatePresence>
                    {state.result && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        {state.result.success ? (
                          <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-green-800">Action Completed</p>
                              {state.result.maritimeMessage && (
                                <p className="text-sm text-green-700 mt-1">
                                  {state.result.maritimeMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                            <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-800">Action Failed</p>
                              <p className="text-sm text-red-700 mt-1">
                                {state.result.error || 'Unknown error occurred'}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {state.error && !state.result && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Error</p>
                            <p className="text-sm text-red-700 mt-1">{state.error}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handlePreviewAction(action)}
                    disabled={state.status === 'executing' || state.status === 'previewing'}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Eye className="w-3 h-3 mr-1 inline" />
                    Preview
                  </button>

                  {action.requiresConfirmation ? (
                    <button
                      onClick={() => handleExecuteAction(action)}
                      disabled={state.status === 'executing' || state.status === 'completed'}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {state.status === 'executing' ? (
                        <>
                          <Play className="w-3 h-3 mr-1 inline animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1 inline" />
                          Confirm & Execute
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExecuteAction(action)}
                      disabled={state.status === 'executing' || state.status === 'completed'}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {state.status === 'executing' ? (
                        <>
                          <Play className="w-3 h-3 mr-1 inline animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1 inline" />
                          Execute
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Parameters</h5>
                        <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(action.parameters, null, 2)}
                        </pre>
                      </div>
                      {state.preview && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Preview</h5>
                          <pre className="text-xs text-gray-600 bg-blue-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(state.preview, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
