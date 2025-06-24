'use client'

// Error Recovery Component
// User interface for OAuth error recovery and troubleshooting

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Settings,
  ExternalLink,
  Info,
  AlertCircle,
  Wrench
} from 'lucide-react'

interface RecoveryResult {
  success: boolean
  action: string
  message: string
  error?: string
  retryAfter?: number
}

interface HealthIssue {
  integrationId: string
  issue: string
  severity: 'low' | 'medium' | 'high'
}

interface ErrorRecoveryProps {
  integrationId?: string
  errorCode?: string
  errorMessage?: string
  onRecoveryComplete?: (success: boolean) => void
  className?: string
}

export default function ErrorRecovery({
  integrationId,
  errorCode,
  errorMessage,
  onRecoveryComplete,
  className = ''
}: ErrorRecoveryProps) {
  const [recovering, setRecovering] = useState(false)
  const [bulkRecovering, setBulkRecovering] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(null)
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([])
  const [showHealthCheck, setShowHealthCheck] = useState(false)
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null)

  useEffect(() => {
    if (!integrationId) {
      performHealthCheck()
    }
  }, [integrationId])

  const performHealthCheck = async () => {
    try {
      const response = await fetch('/api/integrations/recover')
      if (response.ok) {
        const data = await response.json()
        setHealthIssues(data.health.issues || [])
        setLastHealthCheck(new Date())
      }
    } catch (error) {
      console.error('Health check failed:', error)
    }
  }

  const attemptRecovery = async (targetIntegrationId?: string) => {
    if (!targetIntegrationId && !integrationId) return

    setRecovering(true)
    setRecoveryResult(null)

    try {
      const response = await fetch('/api/integrations/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: targetIntegrationId || integrationId,
          errorCode,
          errorMessage
        })
      })

      if (response.ok) {
        const data = await response.json()
        setRecoveryResult(data.recovery)
        onRecoveryComplete?.(data.recovery.success)
        
        // Refresh health check if bulk recovery
        if (!targetIntegrationId) {
          await performHealthCheck()
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setRecoveryResult({
          success: false,
          action: 'error',
          message: 'Recovery request failed',
          error: errorData.error || 'Unknown error'
        })
        onRecoveryComplete?.(false)
      }
    } catch (error) {
      setRecoveryResult({
        success: false,
        action: 'error',
        message: 'Network error during recovery',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      onRecoveryComplete?.(false)
    } finally {
      setRecovering(false)
    }
  }

  const attemptBulkRecovery = async () => {
    setBulkRecovering(true)

    try {
      const response = await fetch('/api/integrations/recover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.bulkRecovery
        
        setRecoveryResult({
          success: result.recovered > 0,
          action: 'bulk_recovery',
          message: `Processed ${result.processed} integrations. ${result.recovered} recovered, ${result.failed} failed.`
        })
        
        await performHealthCheck()
        onRecoveryComplete?.(result.recovered > 0)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setRecoveryResult({
          success: false,
          action: 'bulk_recovery',
          message: 'Bulk recovery failed',
          error: errorData.error || 'Unknown error'
        })
        onRecoveryComplete?.(false)
      }
    } catch (error) {
      setRecoveryResult({
        success: false,
        action: 'bulk_recovery',
        message: 'Network error during bulk recovery',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      onRecoveryComplete?.(false)
    } finally {
      setBulkRecovering(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-4 h-4" />
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />
      case 'low':
        return <Info className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  if (integrationId) {
    // Single integration recovery
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Integration Issue Detected
            </h3>
            {errorMessage && (
              <p className="text-sm text-gray-600 mb-3">{errorMessage}</p>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => attemptRecovery()}
                disabled={recovering}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
              >
                {recovering ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wrench className="w-4 h-4" />
                )}
                <span>{recovering ? 'Recovering...' : 'Auto-Recover'}</span>
              </button>
            </div>

            <AnimatePresence>
              {recoveryResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mt-3 p-3 rounded-lg border ${
                    recoveryResult.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {recoveryResult.success ? (
                      <CheckCircle className="w-4 h-4 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{recoveryResult.message}</p>
                      {recoveryResult.error && (
                        <p className="text-xs mt-1 opacity-80">{recoveryResult.error}</p>
                      )}
                      {recoveryResult.retryAfter && (
                        <p className="text-xs mt-1 opacity-80">
                          Retry after {Math.ceil(recoveryResult.retryAfter / 1000)} seconds
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // Bulk recovery interface
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Integration Health</h3>
            <p className="text-sm text-gray-600">
              Monitor and recover failed integrations
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={performHealthCheck}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Health</span>
            </button>
            {healthIssues.length > 0 && (
              <button
                onClick={attemptBulkRecovery}
                disabled={bulkRecovering}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
              >
                {bulkRecovering ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>{bulkRecovering ? 'Recovering...' : 'Auto-Recover All'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {healthIssues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">All Integrations Healthy</h4>
            <p className="text-gray-600">No issues detected with your connected integrations.</p>
            {lastHealthCheck && (
              <p className="text-xs text-gray-500 mt-2">
                Last checked: {lastHealthCheck.toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">
                {healthIssues.length} Issue{healthIssues.length !== 1 ? 's' : ''} Found
              </h4>
              {lastHealthCheck && (
                <p className="text-xs text-gray-500">
                  Last checked: {lastHealthCheck.toLocaleTimeString()}
                </p>
              )}
            </div>

            {healthIssues.map((issue, index) => (
              <div
                key={`${issue.integrationId}-${index}`}
                className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {getSeverityIcon(issue.severity)}
                    <div>
                      <p className="font-medium text-sm">{issue.integrationId}</p>
                      <p className="text-sm opacity-80">{issue.issue}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => attemptRecovery(issue.integrationId)}
                    disabled={recovering}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-white bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
                  >
                    {recovering ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wrench className="w-3 h-3" />
                    )}
                    <span>Fix</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {recoveryResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 p-3 rounded-lg border ${
                recoveryResult.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {recoveryResult.success ? (
                  <CheckCircle className="w-4 h-4 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium">{recoveryResult.message}</p>
                  {recoveryResult.error && (
                    <p className="text-xs mt-1 opacity-80">{recoveryResult.error}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
