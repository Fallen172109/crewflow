// Error Handling and Recovery System
// Comprehensive error handling, retry mechanisms, and graceful degradation

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/agents/notification-system'

export interface ErrorLog {
  id: string
  userId?: string
  component: string
  operation: string
  errorType: string
  errorMessage: string
  errorStack?: string
  context: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  retryCount: number
  maxRetries: number
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

export interface CircuitBreakerState {
  id: string
  service: string
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  failureThreshold: number
  timeout: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
}

// Error types and classifications
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  WEBHOOK_ERROR = 'WEBHOOK_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Custom error classes
export class CrewFlowError extends Error {
  public readonly type: ErrorType
  public readonly severity: 'low' | 'medium' | 'high' | 'critical'
  public readonly context: any
  public readonly retryable: boolean
  public readonly userMessage: string

  constructor(
    type: ErrorType,
    message: string,
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical'
      context?: any
      retryable?: boolean
      userMessage?: string
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'CrewFlowError'
    this.type = type
    this.severity = options.severity || 'medium'
    this.context = options.context || {}
    this.retryable = options.retryable || false
    this.userMessage = options.userMessage || 'An unexpected error occurred'
    
    if (options.cause) {
      this.cause = options.cause
    }
  }
}

export class ShopifyAPIError extends CrewFlowError {
  public readonly statusCode?: number
  public readonly rateLimitRemaining?: number
  public readonly rateLimitResetTime?: Date

  constructor(
    message: string,
    statusCode?: number,
    options: {
      rateLimitRemaining?: number
      rateLimitResetTime?: Date
      context?: any
    } = {}
  ) {
    const retryable = statusCode ? [429, 500, 502, 503, 504].includes(statusCode) : false
    const severity = statusCode && statusCode >= 500 ? 'high' : 'medium'
    
    super(ErrorType.API_ERROR, message, {
      severity,
      retryable,
      context: { statusCode, ...options.context },
      userMessage: statusCode === 429 ? 'Service is temporarily busy. Please try again in a moment.' : 
                   statusCode && statusCode >= 500 ? 'Service is temporarily unavailable. Please try again later.' :
                   'Unable to complete the request. Please try again.'
    })
    
    this.statusCode = statusCode
    this.rateLimitRemaining = options.rateLimitRemaining
    this.rateLimitResetTime = options.rateLimitResetTime
  }
}

// Retry mechanism with exponential backoff
export class RetryManager {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR
    ]
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    let lastError: Error
    
    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on last attempt
        if (attempt === finalConfig.maxRetries) {
          break
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(error, finalConfig.retryableErrors)) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        )
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000
        
        await this.sleep(jitteredDelay)
      }
    }
    
    throw lastError!
  }

  private static isRetryableError(error: any, retryableErrors: string[]): boolean {
    if (error instanceof CrewFlowError) {
      return error.retryable
    }
    
    if (error instanceof ShopifyAPIError) {
      return error.retryable
    }
    
    // Check for network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true
    }
    
    return false
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private static breakers = new Map<string, CircuitBreakerState>()

  static async execute<T>(
    serviceId: string,
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number
      timeout?: number
    } = {}
  ): Promise<T> {
    const breaker = this.getOrCreateBreaker(serviceId, options)
    
    // Check circuit breaker state
    if (breaker.state === 'open') {
      if (Date.now() < (breaker.nextAttemptTime?.getTime() || 0)) {
        throw new CrewFlowError(
          ErrorType.API_ERROR,
          `Service ${serviceId} is temporarily unavailable`,
          {
            severity: 'medium',
            userMessage: 'Service is temporarily unavailable. Please try again later.',
            context: { circuitBreakerOpen: true }
          }
        )
      } else {
        // Try to transition to half-open
        breaker.state = 'half-open'
      }
    }
    
    try {
      const result = await operation()
      
      // Success - reset or close circuit
      if (breaker.state === 'half-open') {
        breaker.state = 'closed'
        breaker.failureCount = 0
      }
      
      return result
    } catch (error) {
      // Failure - increment counter and potentially open circuit
      breaker.failureCount++
      breaker.lastFailureTime = new Date()
      
      if (breaker.failureCount >= breaker.failureThreshold) {
        breaker.state = 'open'
        breaker.nextAttemptTime = new Date(Date.now() + breaker.timeout)
      }
      
      throw error
    }
  }

  private static getOrCreateBreaker(
    serviceId: string,
    options: { failureThreshold?: number; timeout?: number }
  ): CircuitBreakerState {
    if (!this.breakers.has(serviceId)) {
      this.breakers.set(serviceId, {
        id: serviceId,
        service: serviceId,
        state: 'closed',
        failureCount: 0,
        failureThreshold: options.failureThreshold || 5,
        timeout: options.timeout || 60000 // 1 minute
      })
    }
    
    return this.breakers.get(serviceId)!
  }

  static getState(serviceId: string): CircuitBreakerState | null {
    return this.breakers.get(serviceId) || null
  }

  static reset(serviceId: string): void {
    const breaker = this.breakers.get(serviceId)
    if (breaker) {
      breaker.state = 'closed'
      breaker.failureCount = 0
      breaker.lastFailureTime = undefined
      breaker.nextAttemptTime = undefined
    }
  }
}

// Error logging and monitoring
export class ErrorLogger {
  static async logError(
    error: Error,
    context: {
      userId?: string
      component: string
      operation: string
      additionalContext?: any
    }
  ): Promise<string> {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      userId: context.userId,
      component: context.component,
      operation: context.operation,
      errorType: this.classifyError(error),
      errorMessage: error.message,
      errorStack: error.stack,
      context: {
        ...context.additionalContext,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      },
      severity: this.determineSeverity(error),
      timestamp: new Date(),
      resolved: false,
      retryCount: 0,
      maxRetries: 3
    }

    try {
      const supabase = createSupabaseServerClient()
      
      await supabase.from('error_logs').insert({
        id: errorLog.id,
        user_id: errorLog.userId,
        component: errorLog.component,
        operation: errorLog.operation,
        error_type: errorLog.errorType,
        error_message: errorLog.errorMessage,
        error_stack: errorLog.errorStack,
        context: errorLog.context,
        severity: errorLog.severity,
        timestamp: errorLog.timestamp.toISOString(),
        resolved: false,
        retry_count: 0,
        max_retries: 3
      })

      // Send notification for critical errors
      if (errorLog.severity === 'critical' && errorLog.userId) {
        await createNotification(
          errorLog.userId,
          'system_alert',
          'Critical System Error',
          `A critical error occurred in ${errorLog.component}: ${errorLog.errorMessage}`,
          {
            priority: 'critical',
            category: 'system',
            actionRequired: true,
            metadata: { errorId: errorLog.id }
          }
        )
      }

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }

    return errorLog.id
  }

  private static classifyError(error: Error): string {
    if (error instanceof CrewFlowError) {
      return error.type
    }
    
    if (error.message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR
    }
    
    if (error.message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR
    }
    
    if (error.message.includes('rate limit')) {
      return ErrorType.RATE_LIMIT_ERROR
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return ErrorType.AUTHENTICATION_ERROR
    }
    
    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return ErrorType.AUTHORIZATION_ERROR
    }
    
    return ErrorType.UNKNOWN_ERROR
  }

  private static determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof CrewFlowError) {
      return error.severity
    }
    
    // Network and timeout errors are usually medium severity
    if (error.message.includes('fetch') || error.message.includes('timeout')) {
      return 'medium'
    }
    
    // Authentication/authorization errors are high severity
    if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      return 'high'
    }
    
    // Database errors are critical
    if (error.message.includes('database') || error.message.includes('sql')) {
      return 'critical'
    }
    
    return 'medium'
  }
}

// Graceful degradation strategies
export class GracefulDegradation {
  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    options: {
      fallbackDelay?: number
      logFallback?: boolean
    } = {}
  ): Promise<T> {
    try {
      return await primaryOperation()
    } catch (error) {
      if (options.logFallback) {
        await ErrorLogger.logError(error as Error, {
          component: 'GracefulDegradation',
          operation: 'withFallback',
          additionalContext: { fallbackUsed: true }
        })
      }
      
      if (options.fallbackDelay) {
        await new Promise(resolve => setTimeout(resolve, options.fallbackDelay))
      }
      
      return await fallbackOperation()
    }
  }

  static async withCachedFallback<T>(
    operation: () => Promise<T>,
    cacheKey: string,
    options: {
      maxAge?: number
      logCacheUsage?: boolean
    } = {}
  ): Promise<T> {
    try {
      const result = await operation()
      
      // Cache successful result
      await this.setCachedValue(cacheKey, result, options.maxAge)
      
      return result
    } catch (error) {
      // Try to get cached value
      const cachedValue = await this.getCachedValue<T>(cacheKey, options.maxAge)
      
      if (cachedValue !== null) {
        if (options.logCacheUsage) {
          await ErrorLogger.logError(error as Error, {
            component: 'GracefulDegradation',
            operation: 'withCachedFallback',
            additionalContext: { cacheUsed: true, cacheKey }
          })
        }
        
        return cachedValue
      }
      
      throw error
    }
  }

  private static async setCachedValue<T>(key: string, value: T, maxAge?: number): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      const expiresAt = maxAge ? new Date(Date.now() + maxAge) : null
      
      await supabase.from('cache_entries').upsert({
        key,
        value: JSON.stringify(value),
        expires_at: expiresAt?.toISOString(),
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to cache value:', error)
    }
  }

  private static async getCachedValue<T>(key: string, maxAge?: number): Promise<T | null> {
    try {
      const supabase = createSupabaseServerClient()
      
      let query = supabase
        .from('cache_entries')
        .select('value, created_at')
        .eq('key', key)
        .single()
      
      if (maxAge) {
        const cutoff = new Date(Date.now() - maxAge)
        query = query.gte('created_at', cutoff.toISOString())
      }
      
      const { data, error } = await query
      
      if (error || !data) {
        return null
      }
      
      return JSON.parse(data.value)
    } catch (error) {
      console.error('Failed to get cached value:', error)
      return null
    }
  }
}

// Health check system
export class HealthChecker {
  static async checkSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy'
    services: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy'
      responseTime?: number
      error?: string
    }>
  }> {
    const services = {
      database: await this.checkDatabase(),
      shopify: await this.checkShopifyAPI(),
      cache: await this.checkCache(),
      notifications: await this.checkNotifications()
    }
    
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length
    const totalCount = Object.values(services).length
    
    let overall: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyCount === totalCount) {
      overall = 'healthy'
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded'
    } else {
      overall = 'unhealthy'
    }
    
    return { overall, services }
  }

  private static async checkDatabase(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime?: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('health_check').select('id').limit(1)
      
      const responseTime = Date.now() - startTime
      return { status: 'healthy', responseTime }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private static async checkShopifyAPI(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime?: number; error?: string }> {
    // This would check Shopify API connectivity
    // For now, return healthy if no circuit breaker is open
    const breakerState = CircuitBreaker.getState('shopify')
    
    if (breakerState?.state === 'open') {
      return { status: 'unhealthy', error: 'Circuit breaker open' }
    }
    
    return { status: 'healthy' }
  }

  private static async checkCache(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime?: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      // Simple cache test
      const testKey = 'health_check_' + Date.now()
      await GracefulDegradation['setCachedValue'](testKey, 'test', 1000)
      await GracefulDegradation['getCachedValue'](testKey, 1000)
      
      const responseTime = Date.now() - startTime
      return { status: 'healthy', responseTime }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private static async checkNotifications(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime?: number; error?: string }> {
    // Simple check - assume healthy for now
    return { status: 'healthy' }
  }
}

// Export utility functions
export const ErrorHandling = {
  withRetry: RetryManager.withRetry.bind(RetryManager),
  withCircuitBreaker: CircuitBreaker.execute.bind(CircuitBreaker),
  withFallback: GracefulDegradation.withFallback.bind(GracefulDegradation),
  withCachedFallback: GracefulDegradation.withCachedFallback.bind(GracefulDegradation),
  logError: ErrorLogger.logError.bind(ErrorLogger),
  checkHealth: HealthChecker.checkSystemHealth.bind(HealthChecker)
}
