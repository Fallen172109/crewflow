'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Package, 
  ShoppingCart,
  Eye,
  Edit3,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ApprovalRequest {
  id: string
  userId: string
  agentId: string
  integrationId: string
  actionType: string
  actionDescription: string
  actionData: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requestedAt: Date
  expiresAt: Date
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed'
  estimatedImpact: {
    affectedItems: number
    estimatedCost?: number
    reversible: boolean
    description: string
  }
  context: any
}

interface ApprovalPromptProps {
  request: ApprovalRequest
  onApprove: (requestId: string, reason?: string, modifiedParams?: any) => void
  onReject: (requestId: string, reason: string) => void
  onPreview?: (request: ApprovalRequest) => void
  isLoading?: boolean
}

export default function ApprovalPrompt({ 
  request, 
  onApprove, 
  onReject, 
  onPreview,
  isLoading = false 
}: ApprovalPromptProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionInput, setShowRejectionInput] = useState(false)
  const [approvalReason, setApprovalReason] = useState('')
  const [showApprovalInput, setShowApprovalInput] = useState(false)

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'critical': return <XCircle className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create_product': return <Package className="w-5 h-5" />
      case 'update_product': return <Edit3 className="w-5 h-5" />
      case 'delete_product': return <XCircle className="w-5 h-5" />
      case 'update_price': return <DollarSign className="w-5 h-5" />
      case 'fulfill_order': return <ShoppingCart className="w-5 h-5" />
      default: return <AlertTriangle className="w-5 h-5" />
    }
  }

  const isProductAction = (actionType: string) => {
    return ['create_product', 'update_product', 'delete_product'].includes(actionType)
  }

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date()
    const timeLeft = expiresAt.getTime() - now.getTime()
    const minutes = Math.floor(timeLeft / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const handleApprove = () => {
    if (request.riskLevel === 'high' || request.riskLevel === 'critical') {
      setShowApprovalInput(true)
    } else {
      onApprove(request.id)
    }
  }

  const handleConfirmApproval = () => {
    onApprove(request.id, approvalReason || undefined)
    setShowApprovalInput(false)
    setApprovalReason('')
  }

  const handleReject = () => {
    setShowRejectionInput(true)
  }

  const handleConfirmRejection = () => {
    if (rejectionReason.trim()) {
      onReject(request.id, rejectionReason)
      setShowRejectionInput(false)
      setRejectionReason('')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white border-2 border-orange-200 rounded-lg p-4 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            {getActionIcon(request.actionType)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Approval Required</h3>
            <p className="text-sm text-gray-600">{request.actionDescription}</p>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getRiskColor(request.riskLevel)}`}>
          {getRiskIcon(request.riskLevel)}
          <span className="capitalize">{request.riskLevel} Risk</span>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Impact:</span>
          <span className="font-medium text-gray-900">{request.estimatedImpact.description}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-600">Affected Items:</span>
          <span className="font-medium text-gray-900">{request.estimatedImpact.affectedItems}</span>
        </div>
        {request.estimatedImpact.estimatedCost && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Estimated Cost:</span>
            <span className="font-medium text-gray-900">${request.estimatedImpact.estimatedCost}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-600">Reversible:</span>
          <span className={`font-medium ${request.estimatedImpact.reversible ? 'text-green-600' : 'text-red-600'}`}>
            {request.estimatedImpact.reversible ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Time Remaining */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>Expires in: {formatTimeRemaining(request.expiresAt)}</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-orange-600 hover:text-orange-700 font-medium"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Detailed Information */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-3 mb-3 text-sm"
          >
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Action Type:</span>
                <span className="ml-2 text-gray-600">{request.actionType}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Requested:</span>
                <span className="ml-2 text-gray-600">{request.requestedAt.toLocaleString()}</span>
              </div>
              {Object.keys(request.actionData).length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Parameters:</span>
                  <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(request.actionData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approval Input */}
      <AnimatePresence>
        {showApprovalInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Approval Reason (Optional)
            </label>
            <textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="Why are you approving this action?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={2}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Input */}
      <AnimatePresence>
        {showRejectionInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain why you're rejecting this action..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={2}
              required
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onPreview && isProductAction(request.actionType) && (
            <button
              onClick={() => onPreview(request)}
              disabled={isLoading}
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Product</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {showRejectionInput ? (
            <>
              <button
                onClick={() => {
                  setShowRejectionInput(false)
                  setRejectionReason('')
                }}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={isLoading || !rejectionReason.trim()}
                className="flex items-center space-x-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Reject</span>
              </button>
            </>
          ) : showApprovalInput ? (
            <>
              <button
                onClick={() => {
                  setShowApprovalInput(false)
                  setApprovalReason('')
                }}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={isLoading}
                className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Approve</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="flex items-center space-x-1 px-4 py-2 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
