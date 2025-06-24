// Token Management & Refresh System
// Automated token refresh and lifecycle management

import { createSupabaseServerClient } from '../supabase'
import { createOAuthManager } from './oauth'
import { createErrorHandler, withErrorHandling } from './error-handler'
import { createRecoveryService } from './recovery-service'

export interface TokenInfo {
  userId: string
  integrationId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  isExpired: boolean
  scope?: string
  status: string
}

export interface RefreshResult {
  success: boolean
  integrationId: string
  userId: string
  error?: string
  nextRefreshAt?: Date
}

export interface TokenStats {
  total: number
  active: number
  expired: number
  expiringSoon: number
  refreshed: number
  failed: number
}

export class TokenManager {
  private oauthManager = createOAuthManager()
  private errorHandler = createErrorHandler()
  private recoveryService = createRecoveryService()
  private refreshInterval: NodeJS.Timeout | null = null
  private isRunning = false
  private stats: TokenStats = {
    total: 0,
    active: 0,
    expired: 0,
    expiringSoon: 0,
    refreshed: 0,
    failed: 0
  }

  // Start automatic token refresh service
  start(intervalMinutes: number = 15): void {
    if (this.isRunning) {
      console.warn('Token manager is already running')
      return
    }

    this.isRunning = true
    console.log(`Starting token manager with ${intervalMinutes} minute intervals`)

    // Run immediately
    this.performMaintenanceCycle()

    // Set up recurring maintenance
    this.refreshInterval = setInterval(() => {
      this.performMaintenanceCycle()
    }, intervalMinutes * 60 * 1000)
  }

  // Stop automatic token refresh service
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
    this.isRunning = false
    console.log('Token manager stopped')
  }

  // Main maintenance cycle
  private async performMaintenanceCycle(): Promise<void> {
    try {
      console.log('Starting token maintenance cycle...')
      
      // Reset stats for this cycle
      this.resetStats()
      
      // Mark expired tokens
      await this.markExpiredTokens()
      
      // Refresh tokens that are expired or expiring soon
      await this.refreshExpiredTokens()
      
      // Clean up old audit logs
      await this.cleanupAuditLogs()
      
      console.log('Token maintenance cycle completed:', this.stats)
    } catch (error) {
      console.error('Token maintenance cycle failed:', error)
    }
  }

  // Mark expired tokens in the database
  private async markExpiredTokens(): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      const { data, error } = await supabase.rpc('mark_tokens_expired')
      
      if (error) {
        throw new Error(`Failed to mark expired tokens: ${error.message}`)
      }
      
      console.log(`Marked ${data || 0} tokens as expired`)
    } catch (error) {
      console.error('Failed to mark expired tokens:', error)
    }
  }

  // Refresh expired and expiring tokens
  private async refreshExpiredTokens(): Promise<void> {
    try {
      const expiredTokens = await this.getExpiredTokens()
      const expiringSoonTokens = await this.getExpiringSoonTokens()
      
      this.stats.total = expiredTokens.length + expiringSoonTokens.length
      this.stats.expired = expiredTokens.length
      this.stats.expiringSoon = expiringSoonTokens.length
      
      // Refresh expired tokens first (higher priority)
      for (const token of expiredTokens) {
        await this.refreshToken(token)
      }
      
      // Then refresh tokens expiring soon
      for (const token of expiringSoonTokens) {
        await this.refreshToken(token)
      }
      
    } catch (error) {
      console.error('Failed to refresh tokens:', error)
    }
  }

  // Get tokens that have expired
  private async getExpiredTokens(): Promise<TokenInfo[]> {
    const supabase = createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('oauth_integrations')
      .select('user_id, integration_id, expires_at, scope, status')
      .eq('status', 'expired')
      .not('refresh_token_encrypted', 'is', null)
    
    if (error) {
      throw new Error(`Failed to get expired tokens: ${error.message}`)
    }
    
    return (data || []).map(row => ({
      userId: row.user_id,
      integrationId: row.integration_id,
      accessToken: '', // Not needed for refresh
      refreshToken: '', // Will be fetched securely
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      isExpired: true,
      scope: row.scope,
      status: row.status
    }))
  }

  // Get tokens expiring within the next hour
  private async getExpiringSoonTokens(): Promise<TokenInfo[]> {
    const supabase = createSupabaseServerClient()
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from('oauth_integrations')
      .select('user_id, integration_id, expires_at, scope, status')
      .eq('status', 'connected')
      .not('refresh_token_encrypted', 'is', null)
      .not('expires_at', 'is', null)
      .lt('expires_at', oneHourFromNow.toISOString())
    
    if (error) {
      throw new Error(`Failed to get expiring tokens: ${error.message}`)
    }
    
    return (data || []).map(row => ({
      userId: row.user_id,
      integrationId: row.integration_id,
      accessToken: '', // Not needed for refresh
      refreshToken: '', // Will be fetched securely
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      isExpired: false,
      scope: row.scope,
      status: row.status
    }))
  }

  // Refresh a single token
  private async refreshToken(token: TokenInfo): Promise<RefreshResult> {
    try {
      const success = await this.oauthManager.refreshTokens(token.userId, token.integrationId)
      
      if (success) {
        this.stats.refreshed++
        this.stats.active++
        
        return {
          success: true,
          integrationId: token.integrationId,
          userId: token.userId,
          nextRefreshAt: new Date(Date.now() + 50 * 60 * 1000) // 50 minutes from now
        }
      } else {
        this.stats.failed++
        
        // Attempt recovery for failed refresh
        const error = this.errorHandler.createError('TOKEN_EXPIRED', 
          new Error('Token refresh failed'), {
            userId: token.userId,
            integrationId: token.integrationId
          })
        
        const recoveryResult = await this.recoveryService.attemptRecovery(
          token.userId, 
          token.integrationId, 
          error
        )
        
        return {
          success: false,
          integrationId: token.integrationId,
          userId: token.userId,
          error: `Refresh failed. Recovery ${recoveryResult.success ? 'succeeded' : 'failed'}: ${recoveryResult.message}`
        }
      }
    } catch (error) {
      this.stats.failed++
      
      return {
        success: false,
        integrationId: token.integrationId,
        userId: token.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Clean up old audit logs (keep last 30 days)
  private async cleanupAuditLogs(): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const { error } = await supabase
        .from('oauth_audit_log')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
      
      if (error) {
        console.warn('Failed to cleanup audit logs:', error.message)
      } else {
        console.log('Cleaned up old audit logs')
      }
    } catch (error) {
      console.warn('Audit log cleanup failed:', error)
    }
  }

  // Manual token refresh for specific user/integration
  async refreshUserToken(userId: string, integrationId: string): Promise<RefreshResult> {
    const token: TokenInfo = {
      userId,
      integrationId,
      accessToken: '',
      isExpired: true,
      status: 'expired'
    }
    
    return this.refreshToken(token)
  }

  // Get token statistics
  getStats(): TokenStats {
    return { ...this.stats }
  }

  // Reset statistics
  private resetStats(): void {
    this.stats = {
      total: 0,
      active: 0,
      expired: 0,
      expiringSoon: 0,
      refreshed: 0,
      failed: 0
    }
  }

  // Check if service is running
  isServiceRunning(): boolean {
    return this.isRunning
  }

  // Get next maintenance time
  getNextMaintenanceTime(): Date | null {
    if (!this.isRunning || !this.refreshInterval) {
      return null
    }
    
    // This is an approximation since we don't track the exact next execution time
    return new Date(Date.now() + 15 * 60 * 1000) // Assume 15 minute intervals
  }

  // Force immediate maintenance cycle
  async forceMaintenanceCycle(): Promise<TokenStats> {
    await this.performMaintenanceCycle()
    return this.getStats()
  }

  // Get health status of token management
  async getHealthStatus(): Promise<{
    serviceRunning: boolean
    lastCycleStats: TokenStats
    nextMaintenance: Date | null
    issues: string[]
  }> {
    const issues: string[] = []
    
    if (!this.isRunning) {
      issues.push('Token refresh service is not running')
    }
    
    if (this.stats.failed > this.stats.refreshed) {
      issues.push('More token refreshes are failing than succeeding')
    }
    
    return {
      serviceRunning: this.isRunning,
      lastCycleStats: this.getStats(),
      nextMaintenance: this.getNextMaintenanceTime(),
      issues
    }
  }
}

// Global token manager instance
let tokenManagerInstance: TokenManager | null = null

// Get or create token manager instance
export function getTokenManager(): TokenManager {
  if (!tokenManagerInstance) {
    tokenManagerInstance = new TokenManager()
  }
  return tokenManagerInstance
}

// Start token management service
export function startTokenManagement(intervalMinutes: number = 15): void {
  const manager = getTokenManager()
  manager.start(intervalMinutes)
}

// Stop token management service
export function stopTokenManagement(): void {
  if (tokenManagerInstance) {
    tokenManagerInstance.stop()
  }
}
