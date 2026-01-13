'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Zap,
  CheckCircle,
  XCircle,
  Timer,
  Activity,
  BarChart3,
  TrendingUp,
  History,
  RefreshCw,
  ChevronRight,
  AlertOctagon,
  Package,
  DollarSign,
  Users,
  Undo2,
  Info,
  X,
  Loader2,
  Play,
  Pause
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed'

interface EstimatedImpact {
  affectedItems: number
  estimatedCost?: number
  reversible: boolean
  description: string
}

interface ApprovalContext {
  triggerEvent?: string
  relatedData?: any
  userLocation?: string
  deviceInfo?: string
}

interface ApprovalRequest {
  id: string
  userId: string
  agentId: string
  integrationId: string
  actionType: string
  actionDescription: string
  actionData: any
  riskLevel: RiskLevel
  requestedAt: string
  expiresAt: string
  status: ApprovalStatus
  approvedAt?: string
  rejectedAt?: string
  executedAt?: string
  rejectionReason?: string
  estimatedImpact: EstimatedImpact
  context: ApprovalContext
}

interface ApprovalStats {
  pending: number
  approved: number
  rejected: number
  expired: number
  averageResponseTime: number
}

type TabType = 'pending' | 'history'

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const RISK_CONFIG: Record<RiskLevel, {
  label: string
  bgClass: string
  textClass: string
  borderClass: string
  glowClass: string
  hoverClass: string
  icon: typeof AlertTriangle
}> = {
  low: {
    label: 'Low Risk',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    glowClass: 'shadow-emerald-500/20',
    hoverClass: 'hover:shadow-lg hover:shadow-emerald-500/25 hover:border-emerald-500/50',
    icon: Shield
  },
  medium: {
    label: 'Medium Risk',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    glowClass: 'shadow-amber-500/20',
    hoverClass: 'hover:shadow-lg hover:shadow-amber-500/25 hover:border-amber-500/50',
    icon: ShieldAlert
  },
  high: {
    label: 'High Risk',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    glowClass: 'shadow-orange-500/20',
    hoverClass: 'hover:shadow-lg hover:shadow-orange-500/25 hover:border-orange-500/50',
    icon: AlertTriangle
  },
  critical: {
    label: 'Critical',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    glowClass: 'shadow-red-500/20',
    hoverClass: 'hover:shadow-lg hover:shadow-red-500/25 hover:border-red-500/50',
    icon: AlertOctagon
  }
}

const STATUS_CONFIG: Record<ApprovalStatus, {
  label: string
  bgClass: string
  textClass: string
  icon: typeof CheckCircle
}> = {
  pending: {
    label: 'Pending',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    icon: Clock
  },
  approved: {
    label: 'Approved',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    icon: CheckCircle
  },
  rejected: {
    label: 'Rejected',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    icon: XCircle
  },
  expired: {
    label: 'Expired',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-400',
    icon: Timer
  },
  executed: {
    label: 'Executed',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    icon: Zap
  }
}

const formatTimeRemaining = (expiresAt: string): string => {
  const now = new Date().getTime()
  const expiry = new Date(expiresAt).getTime()
  const diff = expiry - now

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatResponseTime = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  return `${hours.toFixed(1)}h`
}

const getActionTypeIcon = (actionType: string) => {
  switch (actionType) {
    case 'price_update':
      return DollarSign
    case 'bulk_operations':
      return Package
    case 'marketing_campaign':
      return Users
    default:
      return Zap
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Stats Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  pulse = false
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: typeof Shield
  variant?: 'default' | 'warning' | 'success' | 'danger'
  pulse?: boolean
}) {
  const variantStyles = {
    default: 'border-slate-700/50 bg-slate-800/30',
    warning: 'border-amber-500/30 bg-amber-500/5',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    danger: 'border-red-500/30 bg-red-500/5'
  }

  const iconStyles = {
    default: 'text-slate-400 bg-slate-700/50',
    warning: 'text-amber-400 bg-amber-500/10',
    success: 'text-emerald-400 bg-emerald-500/10',
    danger: 'text-red-400 bg-red-500/10'
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border p-5
        backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]
        ${variantStyles[variant]}
      `}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white">
              {value}
            </span>
            {pulse && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${iconStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

// Risk Level Badge
function RiskBadge({ level, size = 'default' }: { level: RiskLevel; size?: 'small' | 'default' }) {
  const config = RISK_CONFIG[level]
  const Icon = config.icon

  const sizeClasses = size === 'small'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-3 py-1 text-xs gap-1.5'

  return (
    <div
      className={`
        inline-flex items-center rounded-full border font-medium uppercase tracking-wide
        ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses}
        ${level === 'critical' ? 'animate-pulse' : ''}
      `}
    >
      <Icon className={size === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span>{config.label}</span>
    </div>
  )
}

// Status Badge
function StatusBadge({ status }: { status: ApprovalStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
        ${config.bgClass} ${config.textClass}
      `}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </div>
  )
}

// Countdown Timer Component
function CountdownTimer({ expiresAt, compact = false }: { expiresAt: string; compact?: boolean }) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(expiresAt))
  const [isExpired, setIsExpired] = useState(false)
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeRemaining('Expired')
        return
      }

      // Calculate urgency based on time remaining
      const hoursRemaining = diff / (1000 * 60 * 60)
      if (hoursRemaining < 0.5) {
        setUrgency('critical')
      } else if (hoursRemaining < 2) {
        setUrgency('warning')
      } else {
        setUrgency('normal')
      }

      setTimeRemaining(formatTimeRemaining(expiresAt))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const urgencyStyles = {
    normal: 'text-slate-400',
    warning: 'text-amber-400',
    critical: 'text-red-400 animate-pulse'
  }

  if (compact) {
    return (
      <span className={`font-mono text-xs ${isExpired ? 'text-slate-500' : urgencyStyles[urgency]}`}>
        {timeRemaining}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${isExpired ? 'text-slate-500' : urgencyStyles[urgency]}`}>
      <Timer className="h-4 w-4" />
      <span className="font-mono text-sm font-medium">{timeRemaining}</span>
    </div>
  )
}

// Approval Card Component
function ApprovalCard({
  request,
  onApprove,
  onReject,
  isProcessing
}: {
  request: ApprovalRequest
  onApprove: (id: string, conditions?: string) => void
  onReject: (id: string, reason?: string) => void
  isProcessing: boolean
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showApproveInput, setShowApproveInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveConditions, setApproveConditions] = useState('')

  const riskConfig = RISK_CONFIG[request.riskLevel]
  const ActionIcon = getActionTypeIcon(request.actionType)

  const handleApprove = () => {
    if (request.riskLevel === 'high' || request.riskLevel === 'critical') {
      setShowApproveInput(true)
    } else {
      onApprove(request.id)
    }
  }

  const handleReject = () => {
    setShowRejectInput(true)
  }

  const confirmApprove = () => {
    onApprove(request.id, approveConditions || undefined)
    setShowApproveInput(false)
    setApproveConditions('')
  }

  const confirmReject = () => {
    onReject(request.id, rejectReason || undefined)
    setShowRejectInput(false)
    setRejectReason('')
  }

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl border backdrop-blur-sm
        transition-all duration-300
        ${riskConfig.borderClass} ${riskConfig.bgClass}
        ${riskConfig.hoverClass}
      `}
    >
      {/* Risk level indicator bar */}
      <div
        className={`absolute left-0 top-0 h-full w-1 ${riskConfig.textClass.replace('text-', 'bg-')}`}
      />

      {/* Critical risk pulsing border effect */}
      {request.riskLevel === 'critical' && (
        <div className="absolute inset-0 rounded-xl border-2 border-red-500/50 animate-pulse pointer-events-none" />
      )}

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${riskConfig.bgClass} ${riskConfig.textClass}`}>
              <ActionIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {request.actionDescription}
              </h3>
              <p className="mt-0.5 text-sm text-slate-400">
                Agent: <span className="text-slate-300">{request.agentId}</span>
              </p>
            </div>
          </div>
          <RiskBadge level={request.riskLevel} />
        </div>

        {/* Impact Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Affected</p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {request.estimatedImpact.affectedItems}
              <span className="text-sm text-slate-400 ml-1">items</span>
            </p>
          </div>
          {request.estimatedImpact.estimatedCost !== undefined && request.estimatedImpact.estimatedCost > 0 && (
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Est. Cost</p>
              <p className="mt-1 font-mono text-lg font-semibold text-white">
                ${request.estimatedImpact.estimatedCost.toLocaleString()}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Reversible</p>
            <div className="mt-1 flex items-center gap-1.5">
              {request.estimatedImpact.reversible ? (
                <>
                  <Undo2 className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium text-emerald-400">Yes</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="font-medium text-red-400">No</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expiration */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-4">
          <div className="flex items-center gap-4">
            <CountdownTimer expiresAt={request.expiresAt} />
            <span className="text-xs text-slate-500">
              Requested {formatTimeAgo(request.requestedAt)}
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            {showDetails ? 'Hide' : 'Details'}
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${showDetails ? 'rotate-90' : ''}`}
            />
          </button>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 rounded-lg bg-slate-900/50 p-4 border border-slate-700/30">
            <p className="text-sm text-slate-300">{request.estimatedImpact.description}</p>
            {request.context.triggerEvent && (
              <div className="mt-3 flex items-start gap-2">
                <Zap className="h-4 w-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Trigger Event</p>
                  <p className="text-sm text-slate-300">{request.context.triggerEvent}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approval/Reject Inputs */}
        {showApproveInput && (
          <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
            <label className="block text-sm font-medium text-emerald-400 mb-2">
              Add conditions (optional)
            </label>
            <textarea
              value={approveConditions}
              onChange={(e) => setApproveConditions(e.target.value)}
              placeholder="Enter any conditions for this approval..."
              className="w-full rounded-lg bg-slate-900/80 border border-emerald-500/30 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              rows={2}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirmApprove}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirm Approval
              </button>
              <button
                onClick={() => setShowApproveInput(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showRejectInput && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-4">
            <label className="block text-sm font-medium text-red-400 mb-2">
              Rejection reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter a reason for rejection..."
              className="w-full rounded-lg bg-slate-900/80 border border-red-500/30 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              rows={2}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirmReject}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Confirm Rejection
              </button>
              <button
                onClick={() => setShowRejectInput(false)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showApproveInput && !showRejectInput && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500 hover:text-white disabled:opacity-50 transition-all duration-200"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50 transition-all duration-200"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// History Item Component
function HistoryItem({ request }: { request: ApprovalRequest }) {
  const statusConfig = STATUS_CONFIG[request.status]
  const riskConfig = RISK_CONFIG[request.riskLevel]
  const ActionIcon = getActionTypeIcon(request.actionType)

  const getTimestamp = () => {
    switch (request.status) {
      case 'approved':
        return request.approvedAt ? formatTimeAgo(request.approvedAt) : formatTimeAgo(request.requestedAt)
      case 'rejected':
        return request.rejectedAt ? formatTimeAgo(request.rejectedAt) : formatTimeAgo(request.requestedAt)
      case 'executed':
        return request.executedAt ? formatTimeAgo(request.executedAt) : formatTimeAgo(request.requestedAt)
      case 'expired':
        return formatTimeAgo(request.expiresAt)
      default:
        return formatTimeAgo(request.requestedAt)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
      <div className={`rounded-lg p-2 ${riskConfig.bgClass} ${riskConfig.textClass}`}>
        <ActionIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {request.actionDescription}
        </p>
        <p className="text-xs text-slate-500">
          {request.agentId} - {getTimestamp()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <RiskBadge level={request.riskLevel} size="small" />
        <StatusBadge status={request.status} />
      </div>
    </div>
  )
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-700/50" />
              <div>
                <div className="h-5 w-48 rounded bg-slate-700/50" />
                <div className="mt-2 h-4 w-32 rounded bg-slate-700/50" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-700/50" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-16 rounded-lg bg-slate-700/50" />
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <div className="flex-1 h-10 rounded-lg bg-slate-700/50" />
            <div className="flex-1 h-10 rounded-lg bg-slate-700/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty State Component
function EmptyState({ type }: { type: 'pending' | 'history' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 blur-xl bg-emerald-500/20 rounded-full" />
        <div className="relative rounded-full bg-slate-800/80 border border-emerald-500/30 p-6">
          {type === 'pending' ? (
            <ShieldCheck className="h-12 w-12 text-emerald-400" />
          ) : (
            <History className="h-12 w-12 text-slate-400" />
          )}
        </div>
      </div>
      <h3 className="mt-6 text-lg font-semibold text-white">
        {type === 'pending' ? 'All Clear' : 'No History Yet'}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        {type === 'pending'
          ? 'No pending approval requests. AI actions that require your authorization will appear here.'
          : 'Your approval history will appear here once you start reviewing requests.'
        }
      </p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ApprovalsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([])
  const [historyApprovals, setHistoryApprovals] = useState<ApprovalRequest[]>([])
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch all data
  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [pendingRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/approvals?type=pending'),
        fetch('/api/approvals?type=history&limit=20'),
        fetch('/api/approvals?type=stats')
      ])

      const pendingData = await pendingRes.json()
      const historyData = await historyRes.json()
      const statsData = await statsRes.json()

      if (pendingData.success) {
        setPendingApprovals(pendingData.data || [])
      }
      if (historyData.success) {
        setHistoryApprovals(historyData.data || [])
      }
      if (statsData.success) {
        setStats(statsData.data)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching approvals:', err)
      setError('Failed to load approval data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Handle approve action
  const handleApprove = async (requestId: string, conditions?: string) => {
    setProcessingId(requestId)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          decision: 'approve',
          conditions: conditions ? [conditions] : undefined
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Request approved successfully')
        await fetchData(true)
      } else {
        setError(data.error || 'Failed to approve request')
      }
    } catch (err) {
      setError('Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  // Handle reject action
  const handleReject = async (requestId: string, reason?: string) => {
    setProcessingId(requestId)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          decision: 'reject',
          reason
        })
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Request rejected successfully')
        await fetchData(true)
      } else {
        setError(data.error || 'Failed to reject request')
      }
    } catch (err) {
      setError('Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  // Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-green-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Shield className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Approval Workflows
              </h1>
              <p className="text-sm text-slate-400">
                Mission Control for AI-initiated high-risk actions
              </p>
            </div>
          </div>
        </div>

        {/* Notification Messages */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 animate-in slide-in-from-top-2 duration-300">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-emerald-400 hover:text-emerald-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/30 p-4 animate-in slide-in-from-top-2 duration-300">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Pending Approvals"
            value={stats?.pending ?? 0}
            subtitle="Awaiting your decision"
            icon={Clock}
            variant={stats?.pending && stats.pending > 0 ? 'warning' : 'default'}
            pulse={stats?.pending !== undefined && stats.pending > 0}
          />
          <StatCard
            title="Approved"
            value={stats?.approved ?? 0}
            subtitle="Last 30 days"
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Rejected"
            value={stats?.rejected ?? 0}
            subtitle="Last 30 days"
            icon={XCircle}
            variant="danger"
          />
          <StatCard
            title="Avg Response Time"
            value={stats?.averageResponseTime ? formatResponseTime(stats.averageResponseTime) : '0h'}
            subtitle="Time to decision"
            icon={Activity}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <button
              onClick={() => setActiveTab('pending')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${activeTab === 'pending'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }
              `}
            >
              <Clock className="h-4 w-4" />
              Pending
              {stats?.pending !== undefined && stats.pending > 0 && (
                <span className={`
                  ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                  ${activeTab === 'pending'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/20 text-amber-400'
                  }
                `}>
                  {stats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${activeTab === 'history'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }
              `}
            >
              <History className="h-4 w-4" />
              History
            </button>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 border border-slate-700/50 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <LoadingSkeleton />
          ) : activeTab === 'pending' ? (
            pendingApprovals.length > 0 ? (
              <div className="space-y-4">
                {pendingApprovals.map((request) => (
                  <ApprovalCard
                    key={request.id}
                    request={request}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={processingId === request.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="pending" />
            )
          ) : (
            historyApprovals.length > 0 ? (
              <div className="space-y-2">
                {historyApprovals.map((request) => (
                  <HistoryItem key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <EmptyState type="history" />
            )
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Activity className="h-3.5 w-3.5" />
          <span>Auto-refreshes every 30 seconds</span>
          <span className="mx-2">|</span>
          <span>Critical approvals expire in 1 hour</span>
        </div>
      </div>
    </div>
  )
}
