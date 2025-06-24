// OAuth 2.0 Integration Handler
// Production-ready OAuth flows with comprehensive error handling

import { createSupabaseServerClient } from '../supabase'
import { getIntegration, type IntegrationConfig } from './config'
import { createErrorHandler, withErrorHandling, type OAuthError } from './error-handler'
import { masterOAuth } from './master-oauth'
import crypto from 'crypto'

export interface OAuthState {
  integrationId: string
  userId: string
  returnUrl?: string
  nonce: string
  timestamp: number
  pkceVerifier?: string
  pkceChallenge?: string
}

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  id_token?: string
}

export interface ConnectionStatus {
  connected: boolean
  integration: IntegrationConfig
  connectedAt?: string
  lastSync?: string
  lastUsed?: string
  status: 'connected' | 'disconnected' | 'error' | 'expired' | 'refreshing'
  connectionHealth: 'healthy' | 'warning' | 'error' | 'unknown'
  error?: string
  errorCount?: number
  expiresAt?: string
  scope?: string
  providerUserId?: string
  providerUsername?: string
  providerEmail?: string
}

export interface OAuthError {
  code: string
  message: string
  description?: string
  retryable: boolean
  provider?: string
}

// Production-ready OAuth 2.0 Manager with error handling
export class OAuthManager {
  private baseUrl: string
  private clientConfigs: Map<string, { clientId: string; clientSecret: string }> = new Map()
  private encryptionKey: string
  private errorHandler = createErrorHandler()

  constructor(baseUrl: string, encryptionKey?: string) {
    this.baseUrl = baseUrl
    this.encryptionKey = encryptionKey || process.env.OAUTH_ENCRYPTION_KEY || 'oauth_token_key'
    this.loadClientConfigs()
  }

  private loadClientConfigs(): void {
    // Load OAuth client configurations from Master OAuth Manager
    // This enables one-click connections without users needing to set up API keys
    const availableIntegrations = masterOAuth.getAvailableIntegrations()

    let configuredCount = 0
    availableIntegrations.forEach(integrationId => {
      const credentials = masterOAuth.getCredentials(integrationId)

      if (credentials) {
        this.clientConfigs.set(integrationId, {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret
        })
        configuredCount++

        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Master OAuth configured for ${integrationId} (${credentials.appName})`)
        }
      }
    })

    // Also check for legacy individual environment variables as fallback
    const legacyIntegrations = [
      'salesforce', 'hubspot', 'shopify', 'google-ads', 'facebook-business', 'facebook-ads',
      'mailchimp', 'jira', 'asana', 'monday', 'slack', 'discord', 'twitter', 'linkedin'
    ]

    legacyIntegrations.forEach(integration => {
      // Skip if already configured via master OAuth
      if (this.clientConfigs.has(integration)) return

      const envKey = integration.toUpperCase().replace('-', '_')
      const clientId = process.env[`${envKey}_CLIENT_ID`]
      const clientSecret = process.env[`${envKey}_CLIENT_SECRET`]

      if (clientId && clientSecret) {
        this.clientConfigs.set(integration, { clientId, clientSecret })
        configuredCount++
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Legacy OAuth configured for ${integration}`)
        }
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 OAuth Summary: ${configuredCount} integrations configured (Master OAuth + Legacy)`)
      console.log(`🎯 One-click ready: ${availableIntegrations.length} integrations`)
    }
  }

  // Generate secure PKCE challenge for OAuth 2.0 with PKCE
  private generatePKCE(): { verifier: string; challenge: string; method: string } {
    const verifier = crypto.randomBytes(32).toString('base64url')
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
    return {
      verifier,
      challenge,
      method: 'S256'
    }
  }

  // Generate OAuth authorization URL with enhanced security
  generateAuthUrl(integrationId: string, userId: string, returnUrl?: string): string {
    const integration = getIntegration(integrationId)
    if (!integration || integration.authType !== 'oauth2') {
      throw new Error(`Invalid OAuth integration: ${integrationId}`)
    }

    const clientConfig = this.clientConfigs.get(integrationId)
    if (!clientConfig) {
      const envKey = integrationId.toUpperCase().replace('-', '_')
      throw new Error(`OAuth client not configured for ${integrationId}. Please set ${envKey}_CLIENT_ID and ${envKey}_CLIENT_SECRET in your environment variables. See OAUTH_INTEGRATIONS_SETUP.md for details.`)
    }

    // Generate PKCE for enhanced security (where supported)
    const pkce = this.generatePKCE()
    const state = this.generateState(integrationId, userId, returnUrl, pkce.verifier)
    const redirectUri = `${this.baseUrl}/api/integrations/oauth/callback`

    const params = new URLSearchParams({
      client_id: clientConfig.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: state,
      scope: integration.scopes?.join(' ') || ''
    })

    // Add PKCE parameters for providers that support it
    const pkceProviders = ['google-ads', 'salesforce', 'hubspot']
    if (pkceProviders.includes(integrationId)) {
      params.set('code_challenge', pkce.challenge)
      params.set('code_challenge_method', pkce.method)
    }

    // Handle provider-specific parameters
    switch (integrationId) {
      case 'shopify':
        // Shopify requires shop domain - this should be handled in the UI
        break
      case 'facebook-business':
      case 'facebook-ads':
        params.set('auth_type', 'rerequest')
        break
      case 'google-ads':
        params.set('access_type', 'offline')
        params.set('prompt', 'consent')
        break
      case 'linkedin':
        params.set('response_type', 'code')
        break
    }

    return `${integration.endpoints.auth}?${params.toString()}`
  }

  // Handle OAuth callback and exchange code for tokens with comprehensive error handling
  async handleCallback(code: string, state: string, requestMetadata?: { ip?: string; userAgent?: string }): Promise<{ success: boolean; error?: string; errorCode?: string; oauthError?: OAuthError }> {
    return withErrorHandling(async () => {
      let stateData: OAuthState | null = null

      try {
        // Parse and validate state
        stateData = this.parseState(state)

        // Validate state timestamp (prevent replay attacks)
        const stateAge = Date.now() - stateData.timestamp
        if (stateAge > 10 * 60 * 1000) { // 10 minutes
          const error = this.errorHandler.createError('INVALID_STATE', new Error('OAuth state expired'), {
            stateAge,
            maxAge: 10 * 60 * 1000
          })
          throw error
        }

        const integration = getIntegration(stateData.integrationId)
        if (!integration) {
          const error = this.errorHandler.createError('INVALID_CONFIGURATION', new Error('Invalid integration'), {
            integrationId: stateData.integrationId
          })
          throw error
        }

        // Log connection attempt
        await this.logOAuthEvent(stateData.userId, stateData.integrationId, 'connection_initiated', {
          ip: requestMetadata?.ip,
          userAgent: requestMetadata?.userAgent
        })

        const tokens = await this.exchangeCodeForTokens(integration, code, stateData)
        await this.storeTokensSecurely(stateData.userId, stateData.integrationId, tokens)

        // Log successful connection
        await this.logOAuthEvent(stateData.userId, stateData.integrationId, 'connection_completed', {
          scopes: tokens.scope?.split(' ') || [],
          ip: requestMetadata?.ip,
          userAgent: requestMetadata?.userAgent
        })

        return { success: true }
      } catch (error) {
        let oauthError: OAuthError

        if (error && typeof error === 'object' && 'code' in error) {
          oauthError = error as OAuthError
        } else {
          oauthError = this.errorHandler.parseError(error, {
            userId: stateData?.userId,
            integrationId: stateData?.integrationId,
            ip: requestMetadata?.ip,
            userAgent: requestMetadata?.userAgent
          })
        }

        // Log failed connection
        if (stateData) {
          await this.logOAuthEvent(stateData.userId, stateData.integrationId, 'connection_failed', {
            error: oauthError.message,
            errorCode: oauthError.code,
            ip: requestMetadata?.ip,
            userAgent: requestMetadata?.userAgent
          })
        }

        return {
          success: false,
          error: oauthError.message,
          errorCode: oauthError.code,
          oauthError
        }
      }
    }, {
      operation: 'oauth_callback',
      userId: stateData?.userId,
      integrationId: stateData?.integrationId
    })
  }

  // Exchange authorization code for access tokens with comprehensive error handling
  private async exchangeCodeForTokens(
    integration: IntegrationConfig,
    code: string,
    state: OAuthState
  ): Promise<OAuthTokens> {
    return withErrorHandling(async () => {
      const clientConfig = this.clientConfigs.get(integration.id)
      if (!clientConfig) {
        const error = this.errorHandler.createError('OAUTH_NOT_CONFIGURED',
          new Error(`OAuth client not configured for: ${integration.id}`), {
            integrationId: integration.id
          })
        throw error
      }

      const redirectUri = `${this.baseUrl}/api/integrations/oauth/callback`

      const tokenData: Record<string, string> = {
        grant_type: 'authorization_code',
        client_id: clientConfig.clientId,
        client_secret: clientConfig.clientSecret,
        code: code,
        redirect_uri: redirectUri
      }

      // Add PKCE verifier if present
      if (state.pkceVerifier) {
        tokenData.code_verifier = state.pkceVerifier
      }

      const response = await fetch(integration.endpoints.token!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'CrewFlow/1.0'
        },
        body: new URLSearchParams(tokenData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any = {}

        try {
          errorData = JSON.parse(errorText)
        } catch {
          // If not JSON, use the text as error message
        }

        // Map OAuth error codes to our error system
        let errorCode = 'PROVIDER_ERROR'
        if (errorData.error) {
          switch (errorData.error) {
            case 'invalid_client':
              errorCode = 'INVALID_CLIENT'
              break
            case 'invalid_grant':
              errorCode = 'INVALID_GRANT'
              break
            case 'invalid_scope':
              errorCode = 'INVALID_SCOPE'
              break
            case 'access_denied':
              errorCode = 'ACCESS_DENIED'
              break
            default:
              errorCode = 'PROVIDER_ERROR'
          }
        } else if (response.status === 429) {
          errorCode = 'RATE_LIMITED'
        } else if (response.status >= 500) {
          errorCode = 'PROVIDER_ERROR'
        }

        const error = this.errorHandler.createError(errorCode,
          new Error(errorData.error_description || errorData.error || errorText), {
            httpStatus: response.status,
            provider: integration.id,
            errorData
          })
        throw error
      }

      const tokens = await response.json()

      // Validate required token fields
      if (!tokens.access_token) {
        const error = this.errorHandler.createError('PROVIDER_ERROR',
          new Error('Invalid token response: missing access_token'), {
            provider: integration.id,
            tokenResponse: tokens
          })
        throw error
      }

      return tokens
    }, {
      operation: 'token_exchange',
      integrationId: integration.id,
      userId: state.userId
    })
  }

  // Store tokens securely using database functions
  private async storeTokensSecurely(userId: string, integrationId: string, tokens: OAuthTokens): Promise<void> {
    const supabase = createSupabaseServerClient()

    try {
      // Use the secure database function to store encrypted tokens
      const { data, error } = await supabase.rpc('store_oauth_tokens', {
        p_user_id: userId,
        p_integration_id: integrationId,
        p_access_token: tokens.access_token,
        p_refresh_token: tokens.refresh_token || null,
        p_expires_in: tokens.expires_in || null,
        p_scope: tokens.scope || null,
        p_provider_user_id: null, // Will be populated by provider-specific data later
        p_provider_username: null,
        p_provider_email: null,
        p_provider_metadata: null
      })

      if (error) {
        throw new Error(`Failed to store tokens: ${error.message}`)
      }

      // Fetch additional user info from provider if available
      await this.fetchProviderUserInfo(userId, integrationId, tokens.access_token)

    } catch (error) {
      console.error('Token storage error:', error)
      throw error
    }
  }

  // Fetch additional user information from OAuth provider
  private async fetchProviderUserInfo(userId: string, integrationId: string, accessToken: string): Promise<void> {
    try {
      const integration = getIntegration(integrationId)
      if (!integration?.endpoints?.api) return

      let userInfoEndpoint = ''
      let headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }

      // Provider-specific user info endpoints
      switch (integrationId) {
        case 'facebook-business':
        case 'facebook-ads':
          userInfoEndpoint = `${integration.endpoints.api}/me?fields=id,name,email`
          break
        case 'google-ads':
          userInfoEndpoint = `${integration.endpoints.api}/oauth2/v2/userinfo`
          break
        case 'linkedin':
          userInfoEndpoint = `${integration.endpoints.api}/v2/people/~:(id,firstName,lastName,emailAddress)`
          break
        case 'twitter':
          userInfoEndpoint = `${integration.endpoints.api}/users/me`
          break
        default:
          return // Skip if no user info endpoint defined
      }

      const response = await fetch(userInfoEndpoint, { headers })
      if (response.ok) {
        const userInfo = await response.json()

        // Update the integration record with provider user info
        const supabase = createSupabaseServerClient()
        await supabase
          .from('oauth_integrations')
          .update({
            provider_user_id: userInfo.id || userInfo.sub,
            provider_username: userInfo.name || userInfo.username || `${userInfo.firstName} ${userInfo.lastName}`.trim(),
            provider_email: userInfo.email || userInfo.emailAddress,
            provider_metadata: userInfo
          })
          .eq('user_id', userId)
          .eq('integration_id', integrationId)
      }
    } catch (error) {
      // Don't fail the entire flow if user info fetch fails
      console.warn('Failed to fetch provider user info:', error)
    }
  }

  // Generate secure state parameter with enhanced security
  private generateState(integrationId: string, userId: string, returnUrl?: string, pkceVerifier?: string): string {
    const stateData: OAuthState = {
      integrationId,
      userId,
      returnUrl,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
      pkceVerifier
    }

    return Buffer.from(JSON.stringify(stateData)).toString('base64url')
  }

  // Parse state parameter with validation
  private parseState(state: string): OAuthState {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8')
      const stateData = JSON.parse(decoded)

      // Validate required fields
      if (!stateData.integrationId || !stateData.userId || !stateData.nonce || !stateData.timestamp) {
        throw new Error('Invalid state structure')
      }

      return stateData
    } catch (error) {
      throw new Error('Invalid state parameter')
    }
  }

  // Get error code from error object
  private getErrorCode(error: any): string {
    if (error?.code) return error.code
    if (error?.message?.includes('expired')) return 'TOKEN_EXPIRED'
    if (error?.message?.includes('invalid')) return 'INVALID_REQUEST'
    if (error?.message?.includes('unauthorized')) return 'UNAUTHORIZED'
    if (error?.message?.includes('rate limit')) return 'RATE_LIMITED'
    if (error?.message?.includes('network')) return 'NETWORK_ERROR'
    return 'UNKNOWN_ERROR'
  }

  // Log OAuth events for audit trail
  private async logOAuthEvent(
    userId: string,
    integrationId: string,
    eventType: string,
    metadata?: any
  ): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase
        .from('oauth_audit_log')
        .insert({
          user_id: userId,
          integration_id: integrationId,
          event_type: eventType,
          event_description: `OAuth ${eventType} for ${integrationId}`,
          ip_address: metadata?.ip,
          user_agent: metadata?.userAgent,
          scopes_requested: metadata?.scopes,
          scopes_granted: metadata?.scopes,
          error_code: metadata?.errorCode,
          error_message: metadata?.error,
          metadata: metadata
        })
    } catch (error) {
      // Don't fail the main flow if audit logging fails
      console.warn('Failed to log OAuth event:', error)
    }
  }

  // Get user's connection status for an integration
  async getConnectionStatus(userId: string, integrationId: string): Promise<ConnectionStatus> {
    const integration = getIntegration(integrationId)
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`)
    }

    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('oauth_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .single()

    if (error || !data) {
      return {
        connected: false,
        integration,
        status: 'disconnected',
        connectionHealth: 'unknown'
      }
    }

    // Check if token is expired
    const isExpired = data.expires_at && new Date(data.expires_at) < new Date()
    const actualStatus = isExpired ? 'expired' : data.status

    return {
      connected: data.status === 'connected' && !isExpired,
      integration,
      connectedAt: data.connected_at,
      lastSync: data.last_used_at,
      lastUsed: data.last_used_at,
      status: actualStatus,
      connectionHealth: data.connection_health,
      error: data.last_error,
      errorCount: data.error_count,
      expiresAt: data.expires_at,
      scope: data.scope,
      providerUserId: data.provider_user_id,
      providerUsername: data.provider_username,
      providerEmail: data.provider_email
    }
  }

  // Get all user connections
  async getUserConnections(userId: string): Promise<ConnectionStatus[]> {
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('oauth_integrations')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'disconnected')

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`)
    }

    return (data || []).map(connection => {
      const integration = getIntegration(connection.integration_id)
      if (!integration) return null

      const isExpired = connection.expires_at && new Date(connection.expires_at) < new Date()
      const actualStatus = isExpired ? 'expired' : connection.status

      return {
        connected: connection.status === 'connected' && !isExpired,
        integration,
        connectedAt: connection.connected_at,
        lastSync: connection.last_used_at,
        lastUsed: connection.last_used_at,
        status: actualStatus,
        connectionHealth: connection.connection_health,
        error: connection.last_error,
        errorCount: connection.error_count,
        expiresAt: connection.expires_at,
        scope: connection.scope,
        providerUserId: connection.provider_user_id,
        providerUsername: connection.provider_username,
        providerEmail: connection.provider_email
      }
    }).filter(Boolean) as ConnectionStatus[]
  }

  // Disconnect an integration using secure database function
  async disconnect(userId: string, integrationId: string): Promise<void> {
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase.rpc('disconnect_integration', {
      p_user_id: userId,
      p_integration_id: integrationId
    })

    if (error) {
      throw new Error(`Failed to disconnect: ${error.message}`)
    }

    if (!data) {
      throw new Error('Integration not found or already disconnected')
    }
  }

  // Refresh expired tokens with comprehensive error handling
  async refreshTokens(userId: string, integrationId: string): Promise<boolean> {
    return withErrorHandling(async () => {
      const supabase = createSupabaseServerClient()

      // Mark as refreshing
      await supabase.rpc('update_connection_status', {
        p_user_id: userId,
        p_integration_id: integrationId,
        p_status: 'refreshing',
        p_health: 'warning'
      })

      // Get encrypted tokens using secure function
      const { data: tokenData } = await supabase.rpc('get_oauth_tokens', {
        p_user_id: userId,
        p_integration_id: integrationId
      })

      if (!tokenData || tokenData.length === 0 || !tokenData[0].refresh_token) {
        const error = this.errorHandler.createError('TOKEN_EXPIRED',
          new Error('No refresh token available'), {
            userId,
            integrationId
          })

        await this.logOAuthEvent(userId, integrationId, 'token_refresh_failed', {
          error: error.message
        })
        throw error
      }

      const connection = tokenData[0]
      const integration = getIntegration(integrationId)
      if (!integration) {
        const error = this.errorHandler.createError('INVALID_CONFIGURATION',
          new Error('Integration not found'), {
            userId,
            integrationId
          })
        throw error
      }

      const clientConfig = this.clientConfigs.get(integrationId)
      if (!clientConfig) {
        const error = this.errorHandler.createError('OAUTH_NOT_CONFIGURED',
          new Error('OAuth client not configured'), {
            userId,
            integrationId
          })
        throw error
      }

      const refreshData = {
        grant_type: 'refresh_token',
        client_id: clientConfig.clientId,
        client_secret: clientConfig.clientSecret,
        refresh_token: connection.refresh_token
      }

      const response = await fetch(integration.endpoints.token!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'CrewFlow/1.0'
        },
        body: new URLSearchParams(refreshData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any = {}

        try {
          errorData = JSON.parse(errorText)
        } catch {
          // If not JSON, use the text as error message
        }

        // Map refresh token errors
        let errorCode = 'PROVIDER_ERROR'
        if (errorData.error === 'invalid_grant') {
          errorCode = 'INVALID_GRANT'
        } else if (response.status === 429) {
          errorCode = 'RATE_LIMITED'
        }

        const error = this.errorHandler.createError(errorCode,
          new Error(errorData.error_description || errorData.error || errorText), {
            userId,
            integrationId,
            httpStatus: response.status,
            errorData
          })

        await supabase.rpc('update_connection_status', {
          p_user_id: userId,
          p_integration_id: integrationId,
          p_status: 'error',
          p_health: 'error',
          p_error_message: error.message
        })

        await this.logOAuthEvent(userId, integrationId, 'token_refresh_failed', {
          error: error.message,
          errorCode: error.code,
          statusCode: response.status
        })

        throw error
      }

      const tokens: OAuthTokens = await response.json()
      await this.storeTokensSecurely(userId, integrationId, tokens)

      await this.logOAuthEvent(userId, integrationId, 'token_refreshed', {
        expiresIn: tokens.expires_in
      })

      return true
    }, {
      operation: 'token_refresh',
      userId,
      integrationId
    }).catch((error: OAuthError) => {
      // Convert error to boolean return for backward compatibility
      console.error('Token refresh failed:', error.message)
      return false
    })
  }
  // Test connection health for an integration
  async testConnection(userId: string, integrationId: string): Promise<{ healthy: boolean; error?: string }> {
    try {
      const supabase = createSupabaseServerClient()
      const { data: tokenData } = await supabase.rpc('get_oauth_tokens', {
        p_user_id: userId,
        p_integration_id: integrationId
      })

      if (!tokenData || tokenData.length === 0 || !tokenData[0].access_token) {
        return { healthy: false, error: 'No access token available' }
      }

      const connection = tokenData[0]
      const integration = getIntegration(integrationId)
      if (!integration?.testEndpoint) {
        return { healthy: true } // No test endpoint defined, assume healthy
      }

      // Test the connection with a simple API call
      const response = await fetch(`${integration.endpoints.api}${integration.testEndpoint}`, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'CrewFlow/1.0'
        }
      })

      const isHealthy = response.ok

      // Update connection health
      await supabase.rpc('update_connection_status', {
        p_user_id: userId,
        p_integration_id: integrationId,
        p_status: connection.status,
        p_health: isHealthy ? 'healthy' : 'error',
        p_error_message: isHealthy ? null : `API test failed: ${response.status}`
      })

      return {
        healthy: isHealthy,
        error: isHealthy ? undefined : `API test failed: ${response.status}`
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  // Get OAuth configuration status
  getConfigurationStatus(): { configured: string[]; missing: string[] } {
    const allIntegrations = [
      'salesforce', 'hubspot', 'shopify', 'google-ads', 'facebook-business', 'facebook-ads',
      'mailchimp', 'jira', 'asana', 'monday', 'slack', 'discord', 'twitter', 'linkedin'
    ]

    const configured = Array.from(this.clientConfigs.keys())
    const missing = allIntegrations.filter(id => !this.clientConfigs.has(id))

    return { configured, missing }
  }

  // Bulk refresh expired tokens
  async refreshExpiredTokens(): Promise<{ refreshed: number; failed: number }> {
    const supabase = createSupabaseServerClient()

    // Mark expired tokens
    await supabase.rpc('mark_tokens_expired')

    // Get all expired tokens
    const { data: expiredConnections } = await supabase
      .from('oauth_integrations')
      .select('user_id, integration_id')
      .eq('status', 'expired')
      .not('refresh_token_encrypted', 'is', null)

    let refreshed = 0
    let failed = 0

    if (expiredConnections) {
      for (const connection of expiredConnections) {
        const success = await this.refreshTokens(connection.user_id, connection.integration_id)
        if (success) {
          refreshed++
        } else {
          failed++
        }
      }
    }

    return { refreshed, failed }
  }
}

// Create OAuth manager instance
export function createOAuthManager(): OAuthManager {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return new OAuthManager(baseUrl)
}
