// OAuth Recovery Service
// Automatic recovery and healing for OAuth integrations

import { createOAuthManager } from './oauth'
import { createErrorHandler, type OAuthError } from './error-handler'
import { createSupabaseServerClient } from '../supabase'

export interface RecoveryResult {
  success: boolean
  action: string
  message: string
  error?: string
  retryAfter?: number
}

export interface RecoveryStats {
  totalAttempts: number
  successfulRecoveries: number
  failedRecoveries: number
  byErrorType: Record<string, { attempts: number; successes: number }>
}

export class OAuthRecoveryService {
  private oauthManager = createOAuthManager()
  private errorHandler = createErrorHandler()
  private recoveryStats: RecoveryStats = {
    totalAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    byErrorType: {}
  }

  // Attempt to recover from an OAuth error
  async attemptRecovery(
    userId: string,
    integrationId: string,
    error: OAuthError
  ): Promise<RecoveryResult> {
    this.updateStats(error.code, 'attempt')
    
    try {
      const recoveryActions = this.errorHandler.getRecoveryActions(error)
      const primaryAction = recoveryActions[0]
      
      if (!primaryAction) {
        return {
          success: false,
          action: 'none',
          message: 'No recovery action available for this error',
          error: error.message
        }
      }

      let result: RecoveryResult

      switch (primaryAction.type) {
        case 'refresh_token':
          result = await this.refreshToken(userId, integrationId)
          break
        
        case 'retry':
          result = await this.retryOperation(userId, integrationId, error)
          break
        
        case 'reconnect':
          result = await this.initiateReconnection(userId, integrationId)
          break
        
        case 'manual_intervention':
          result = this.requireManualIntervention(error)
          break
        
        default:
          result = {
            success: false,
            action: 'unknown',
            message: 'Unknown recovery action',
            error: 'Unsupported recovery action type'
          }
      }

      if (result.success) {
        this.updateStats(error.code, 'success')
      } else {
        this.updateStats(error.code, 'failure')
      }

      // Log recovery attempt
      await this.logRecoveryAttempt(userId, integrationId, error, result)

      return result
    } catch (recoveryError) {
      this.updateStats(error.code, 'failure')
      
      return {
        success: false,
        action: 'error',
        message: 'Recovery attempt failed',
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error'
      }
    }
  }

  // Refresh expired tokens
  private async refreshToken(userId: string, integrationId: string): Promise<RecoveryResult> {
    try {
      const success = await this.oauthManager.refreshTokens(userId, integrationId)
      
      if (success) {
        return {
          success: true,
          action: 'refresh_token',
          message: 'Access token refreshed successfully'
        }
      } else {
        return {
          success: false,
          action: 'refresh_token',
          message: 'Failed to refresh access token',
          error: 'Token refresh failed - may need to reconnect'
        }
      }
    } catch (error) {
      return {
        success: false,
        action: 'refresh_token',
        message: 'Token refresh failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Retry the operation with backoff
  private async retryOperation(
    userId: string, 
    integrationId: string, 
    originalError: OAuthError
  ): Promise<RecoveryResult> {
    try {
      // Test the connection to see if the issue is resolved
      const testResult = await this.oauthManager.testConnection(userId, integrationId)
      
      if (testResult.healthy) {
        return {
          success: true,
          action: 'retry',
          message: 'Connection test passed after retry'
        }
      } else {
        return {
          success: false,
          action: 'retry',
          message: 'Connection still failing after retry',
          error: testResult.error,
          retryAfter: this.calculateRetryDelay(originalError.code)
        }
      }
    } catch (error) {
      return {
        success: false,
        action: 'retry',
        message: 'Retry operation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryAfter: this.calculateRetryDelay(originalError.code)
      }
    }
  }

  // Initiate reconnection process
  private async initiateReconnection(userId: string, integrationId: string): Promise<RecoveryResult> {
    try {
      // First disconnect the existing connection
      await this.oauthManager.disconnect(userId, integrationId)
      
      return {
        success: true,
        action: 'reconnect',
        message: 'Integration disconnected. Please reconnect to restore functionality.'
      }
    } catch (error) {
      return {
        success: false,
        action: 'reconnect',
        message: 'Failed to initiate reconnection',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Handle cases requiring manual intervention
  private requireManualIntervention(error: OAuthError): RecoveryResult {
    const userMessage = this.errorHandler.getUserMessage(error)
    
    return {
      success: false,
      action: 'manual_intervention',
      message: userMessage.message,
      error: 'Manual intervention required'
    }
  }

  // Calculate retry delay based on error type
  private calculateRetryDelay(errorCode: string): number {
    switch (errorCode) {
      case 'RATE_LIMITED':
        return 60000 // 1 minute
      case 'NETWORK_ERROR':
        return 30000 // 30 seconds
      case 'TIMEOUT':
        return 15000 // 15 seconds
      default:
        return 60000 // 1 minute default
    }
  }

  // Update recovery statistics
  private updateStats(errorCode: string, type: 'attempt' | 'success' | 'failure'): void {
    if (!this.recoveryStats.byErrorType[errorCode]) {
      this.recoveryStats.byErrorType[errorCode] = { attempts: 0, successes: 0 }
    }

    switch (type) {
      case 'attempt':
        this.recoveryStats.totalAttempts++
        this.recoveryStats.byErrorType[errorCode].attempts++
        break
      case 'success':
        this.recoveryStats.successfulRecoveries++
        this.recoveryStats.byErrorType[errorCode].successes++
        break
      case 'failure':
        this.recoveryStats.failedRecoveries++
        break
    }
  }

  // Log recovery attempt for audit trail
  private async logRecoveryAttempt(
    userId: string,
    integrationId: string,
    error: OAuthError,
    result: RecoveryResult
  ): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      
      await supabase
        .from('oauth_audit_log')
        .insert({
          user_id: userId,
          integration_id: integrationId,
          event_type: 'recovery_attempt',
          event_description: `Recovery attempt for ${error.code}: ${result.action}`,
          error_code: error.code,
          error_message: result.message,
          metadata: {
            originalError: error,
            recoveryResult: result,
            timestamp: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.error('Failed to log recovery attempt:', logError)
    }
  }

  // Bulk recovery for multiple failed connections
  async bulkRecovery(userId: string): Promise<{ 
    processed: number
    recovered: number
    failed: number
    results: Array<{ integrationId: string; result: RecoveryResult }>
  }> {
    const connections = await this.oauthManager.getUserConnections(userId)
    const failedConnections = connections.filter(
      conn => conn.status === 'error' || conn.status === 'expired'
    )

    const results: Array<{ integrationId: string; result: RecoveryResult }> = []
    let recovered = 0
    let failed = 0

    for (const connection of failedConnections) {
      try {
        // Create error object based on connection status
        const error = this.errorHandler.createError(
          connection.status === 'expired' ? 'TOKEN_EXPIRED' : 'PROVIDER_ERROR',
          undefined,
          { integrationId: connection.integration.id, userId }
        )

        const result = await this.attemptRecovery(userId, connection.integration.id, error)
        results.push({ integrationId: connection.integration.id, result })

        if (result.success) {
          recovered++
        } else {
          failed++
        }
      } catch (error) {
        failed++
        results.push({
          integrationId: connection.integration.id,
          result: {
            success: false,
            action: 'error',
            message: 'Recovery failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }

    return {
      processed: failedConnections.length,
      recovered,
      failed,
      results
    }
  }

  // Get recovery statistics
  getStats(): RecoveryStats {
    return { ...this.recoveryStats }
  }

  // Reset statistics
  resetStats(): void {
    this.recoveryStats = {
      totalAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      byErrorType: {}
    }
  }

  // Health check for all user integrations
  async healthCheck(userId: string): Promise<{
    healthy: number
    unhealthy: number
    total: number
    issues: Array<{ integrationId: string; issue: string; severity: string }>
  }> {
    const connections = await this.oauthManager.getUserConnections(userId)
    const issues: Array<{ integrationId: string; issue: string; severity: string }> = []
    
    let healthy = 0
    let unhealthy = 0

    for (const connection of connections) {
      if (connection.connected && connection.connectionHealth === 'healthy') {
        healthy++
      } else {
        unhealthy++
        
        let issue = 'Unknown issue'
        let severity = 'medium'
        
        if (connection.status === 'expired') {
          issue = 'Access token expired'
          severity = 'low'
        } else if (connection.status === 'error') {
          issue = connection.error || 'Connection error'
          severity = 'high'
        } else if (!connection.connected) {
          issue = 'Not connected'
          severity = 'medium'
        }
        
        issues.push({
          integrationId: connection.integration.id,
          issue,
          severity
        })
      }
    }

    return {
      healthy,
      unhealthy,
      total: connections.length,
      issues
    }
  }
}

// Create recovery service instance
export function createRecoveryService(): OAuthRecoveryService {
  return new OAuthRecoveryService()
}
