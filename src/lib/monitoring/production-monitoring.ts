// Production Monitoring and Alerting System
// Comprehensive monitoring, alerting, and health checks for production deployment

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/agents/notification-system'

export interface MonitoringMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: Date
  tags: Record<string, string>
  threshold?: {
    warning: number
    critical: number
  }
}

export interface Alert {
  id: string
  type: 'performance' | 'error' | 'security' | 'business' | 'system'
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  title: string
  description: string
  source: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  metadata: any
  actions: string[]
}

export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  lastCheck: Date
  error?: string
  details?: any
}

// Monitoring service for collecting and analyzing metrics
export class MonitoringService {
  private static instance: MonitoringService
  private metrics: Map<string, MonitoringMetric[]> = new Map()
  private alerts: Alert[] = []
  private healthChecks: Map<string, HealthCheck> = new Map()

  static getInstance(): MonitoringService {
    if (!this.instance) {
      this.instance = new MonitoringService()
    }
    return this.instance
  }

  // Record a metric
  async recordMetric(
    name: string,
    value: number,
    unit: string = 'count',
    tags: Record<string, string> = {}
  ): Promise<void> {
    const metric: MonitoringMetric = {
      id: crypto.randomUUID(),
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    }

    // Store in memory for immediate access
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(metric)

    // Keep only last 1000 metrics per type
    const metrics = this.metrics.get(name)!
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000)
    }

    // Store in database for persistence
    await this.persistMetric(metric)

    // Check thresholds and trigger alerts if needed
    await this.checkThresholds(metric)
  }

  // Get metrics for a specific name
  getMetrics(name: string, since?: Date): MonitoringMetric[] {
    const metrics = this.metrics.get(name) || []
    if (since) {
      return metrics.filter(m => m.timestamp >= since)
    }
    return metrics
  }

  // Get aggregated metrics
  getAggregatedMetrics(
    name: string,
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count',
    timeWindow: number = 300000 // 5 minutes
  ): number {
    const since = new Date(Date.now() - timeWindow)
    const metrics = this.getMetrics(name, since)
    
    if (metrics.length === 0) return 0

    const values = metrics.map(m => m.value)
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0)
      case 'min':
        return Math.min(...values)
      case 'max':
        return Math.max(...values)
      case 'count':
        return values.length
      default:
        return 0
    }
  }

  // Create an alert
  async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    description: string,
    source: string,
    metadata: any = {},
    actions: string[] = []
  ): Promise<string> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type,
      severity,
      title,
      description,
      source,
      timestamp: new Date(),
      resolved: false,
      metadata,
      actions
    }

    this.alerts.push(alert)

    // Store in database
    await this.persistAlert(alert)

    // Send notifications based on severity
    await this.sendAlertNotifications(alert)

    return alert.id
  }

  // Resolve an alert
  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      alert.metadata.resolution = resolution

      // Update in database
      await this.updateAlert(alert)
    }
  }

  // Update health check status
  async updateHealthCheck(
    service: string,
    status: HealthCheck['status'],
    responseTime?: number,
    error?: string,
    details?: any
  ): Promise<void> {
    const healthCheck: HealthCheck = {
      service,
      status,
      responseTime,
      lastCheck: new Date(),
      error,
      details
    }

    this.healthChecks.set(service, healthCheck)

    // Store in database
    await this.persistHealthCheck(healthCheck)

    // Create alerts for unhealthy services
    if (status === 'unhealthy') {
      await this.createAlert(
        'system',
        'critical',
        `Service ${service} is unhealthy`,
        error || 'Service health check failed',
        'health_monitor',
        { service, responseTime, details },
        ['Check service logs', 'Restart service if needed', 'Contact on-call engineer']
      )
    }
  }

  // Get current health status
  getHealthStatus(): Record<string, HealthCheck> {
    const status: Record<string, HealthCheck> = {}
    for (const [service, check] of this.healthChecks.entries()) {
      status[service] = check
    }
    return status
  }

  // Get active alerts
  getActiveAlerts(severity?: Alert['severity']): Alert[] {
    let alerts = this.alerts.filter(a => !a.resolved)
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity)
    }
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Private methods
  private async persistMetric(metric: MonitoringMetric): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('monitoring_metrics').insert({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        timestamp: metric.timestamp.toISOString(),
        tags: metric.tags
      })
    } catch (error) {
      console.error('Failed to persist metric:', error)
    }
  }

  private async persistAlert(alert: Alert): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('monitoring_alerts').insert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        source: alert.source,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved,
        metadata: alert.metadata,
        actions: alert.actions
      })
    } catch (error) {
      console.error('Failed to persist alert:', error)
    }
  }

  private async updateAlert(alert: Alert): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('monitoring_alerts').update({
        resolved: alert.resolved,
        resolved_at: alert.resolvedAt?.toISOString(),
        metadata: alert.metadata
      }).eq('id', alert.id)
    } catch (error) {
      console.error('Failed to update alert:', error)
    }
  }

  private async persistHealthCheck(check: HealthCheck): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('health_checks').upsert({
        service: check.service,
        status: check.status,
        response_time: check.responseTime,
        last_check: check.lastCheck.toISOString(),
        error: check.error,
        details: check.details
      })
    } catch (error) {
      console.error('Failed to persist health check:', error)
    }
  }

  private async checkThresholds(metric: MonitoringMetric): Promise<void> {
    // Define thresholds for different metrics
    const thresholds: Record<string, { warning: number; critical: number }> = {
      'api.response_time': { warning: 1000, critical: 5000 },
      'api.error_rate': { warning: 5, critical: 10 },
      'database.response_time': { warning: 500, critical: 2000 },
      'cache.hit_rate': { warning: 70, critical: 50 },
      'memory.usage_percent': { warning: 80, critical: 95 },
      'cpu.usage_percent': { warning: 80, critical: 95 },
      'disk.usage_percent': { warning: 85, critical: 95 }
    }

    const threshold = thresholds[metric.name]
    if (!threshold) return

    if (metric.value >= threshold.critical) {
      await this.createAlert(
        'performance',
        'critical',
        `Critical threshold exceeded: ${metric.name}`,
        `${metric.name} is ${metric.value}${metric.unit}, exceeding critical threshold of ${threshold.critical}${metric.unit}`,
        'threshold_monitor',
        { metric: metric.name, value: metric.value, threshold: threshold.critical },
        ['Investigate immediately', 'Scale resources if needed', 'Check for anomalies']
      )
    } else if (metric.value >= threshold.warning) {
      await this.createAlert(
        'performance',
        'warning',
        `Warning threshold exceeded: ${metric.name}`,
        `${metric.name} is ${metric.value}${metric.unit}, exceeding warning threshold of ${threshold.warning}${metric.unit}`,
        'threshold_monitor',
        { metric: metric.name, value: metric.value, threshold: threshold.warning },
        ['Monitor closely', 'Prepare for scaling', 'Review recent changes']
      )
    }
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    try {
      // Send to system administrators
      const adminUsers = await this.getAdminUsers()
      
      for (const userId of adminUsers) {
        await createNotification(
          userId,
          'system_alert',
          alert.title,
          alert.description,
          {
            priority: alert.severity === 'emergency' ? 'critical' : 
                     alert.severity === 'critical' ? 'high' : 'medium',
            category: 'system',
            actionRequired: alert.severity === 'critical' || alert.severity === 'emergency',
            metadata: { alertId: alert.id, alertType: alert.type }
          }
        )
      }

      // For critical/emergency alerts, also send external notifications
      if (alert.severity === 'critical' || alert.severity === 'emergency') {
        await this.sendExternalAlerts(alert)
      }
    } catch (error) {
      console.error('Failed to send alert notifications:', error)
    }
  }

  private async getAdminUsers(): Promise<string[]> {
    try {
      const supabase = createSupabaseServerClient()
      const { data, error } = await supabase
        .from('user_permissions')
        .select('user_id')
        .eq('permissions->admin', true)
      
      if (error) throw error
      return (data || []).map(row => row.user_id)
    } catch (error) {
      console.error('Failed to get admin users:', error)
      return []
    }
  }

  private async sendExternalAlerts(alert: Alert): Promise<void> {
    // TODO: Implement external alerting (Slack, PagerDuty, email, SMS)
    console.log(`CRITICAL ALERT: ${alert.title} - ${alert.description}`)
  }
}

// Specific monitoring functions
export class ShopifyMonitoring {
  private static monitoring = MonitoringService.getInstance()

  static async recordAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string
  ): Promise<void> {
    await this.monitoring.recordMetric('shopify.api.response_time', responseTime, 'ms', {
      endpoint,
      method,
      status: statusCode.toString(),
      user_id: userId || 'unknown'
    })

    await this.monitoring.recordMetric('shopify.api.requests', 1, 'count', {
      endpoint,
      method,
      status: statusCode.toString()
    })

    // Record errors
    if (statusCode >= 400) {
      await this.monitoring.recordMetric('shopify.api.errors', 1, 'count', {
        endpoint,
        method,
        status: statusCode.toString()
      })
    }
  }

  static async recordWebhookProcessing(
    topic: string,
    processingTime: number,
    success: boolean,
    userId?: string
  ): Promise<void> {
    await this.monitoring.recordMetric('shopify.webhook.processing_time', processingTime, 'ms', {
      topic,
      success: success.toString(),
      user_id: userId || 'unknown'
    })

    await this.monitoring.recordMetric('shopify.webhook.processed', 1, 'count', {
      topic,
      success: success.toString()
    })

    if (!success) {
      await this.monitoring.recordMetric('shopify.webhook.errors', 1, 'count', {
        topic
      })
    }
  }

  static async recordAgentAction(
    agentId: string,
    action: string,
    duration: number,
    success: boolean,
    userId?: string
  ): Promise<void> {
    await this.monitoring.recordMetric('agent.action.duration', duration, 'ms', {
      agent_id: agentId,
      action,
      success: success.toString(),
      user_id: userId || 'unknown'
    })

    await this.monitoring.recordMetric('agent.actions', 1, 'count', {
      agent_id: agentId,
      action,
      success: success.toString()
    })

    if (!success) {
      await this.monitoring.recordMetric('agent.errors', 1, 'count', {
        agent_id: agentId,
        action
      })
    }
  }
}

// Health check runners
export class HealthCheckRunner {
  private static monitoring = MonitoringService.getInstance()

  static async runAllHealthChecks(): Promise<void> {
    await Promise.all([
      this.checkDatabase(),
      this.checkShopifyAPI(),
      this.checkCache(),
      this.checkNotifications(),
      this.checkWebhooks()
    ])
  }

  private static async checkDatabase(): Promise<void> {
    const startTime = Date.now()
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('health_check').select('id').limit(1)
      
      const responseTime = Date.now() - startTime
      await this.monitoring.updateHealthCheck('database', 'healthy', responseTime)
    } catch (error) {
      await this.monitoring.updateHealthCheck(
        'database',
        'unhealthy',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private static async checkShopifyAPI(): Promise<void> {
    try {
      // Simple connectivity check
      const response = await fetch('https://shopify.dev/api', { method: 'HEAD' })
      const status = response.ok ? 'healthy' : 'degraded'
      await this.monitoring.updateHealthCheck('shopify_api', status)
    } catch (error) {
      await this.monitoring.updateHealthCheck(
        'shopify_api',
        'unhealthy',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private static async checkCache(): Promise<void> {
    const startTime = Date.now()
    try {
      // Test cache read/write
      const testKey = `health_check_${Date.now()}`
      // This would use your cache implementation
      const responseTime = Date.now() - startTime
      await this.monitoring.updateHealthCheck('cache', 'healthy', responseTime)
    } catch (error) {
      await this.monitoring.updateHealthCheck(
        'cache',
        'unhealthy',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private static async checkNotifications(): Promise<void> {
    try {
      // Test notification system
      await this.monitoring.updateHealthCheck('notifications', 'healthy')
    } catch (error) {
      await this.monitoring.updateHealthCheck(
        'notifications',
        'unhealthy',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private static async checkWebhooks(): Promise<void> {
    try {
      // Check webhook endpoint availability
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/health`, {
        method: 'GET'
      })
      const status = response.ok ? 'healthy' : 'degraded'
      await this.monitoring.updateHealthCheck('webhooks', status)
    } catch (error) {
      await this.monitoring.updateHealthCheck(
        'webhooks',
        'unhealthy',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}

// Initialize monitoring
export function initializeMonitoring(): void {
  const monitoring = MonitoringService.getInstance()

  // Run health checks every 5 minutes
  setInterval(async () => {
    await HealthCheckRunner.runAllHealthChecks()
  }, 5 * 60 * 1000)

  // Record system metrics every minute
  setInterval(async () => {
    // Record memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage()
      await monitoring.recordMetric('system.memory.used', memory.heapUsed, 'bytes')
      await monitoring.recordMetric('system.memory.total', memory.heapTotal, 'bytes')
    }

    // Record active connections (would need actual implementation)
    await monitoring.recordMetric('system.connections.active', 0, 'count')
  }, 60 * 1000)

  console.log('Production monitoring initialized')
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance()
