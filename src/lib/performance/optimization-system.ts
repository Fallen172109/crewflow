// Performance Optimization System
// Handles caching, background jobs, and performance monitoring

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createShopifyAPI } from '@/lib/integrations/shopify-admin-api'

export interface PerformanceMetrics {
  apiResponseTime: number
  cacheHitRate: number
  backgroundJobsQueued: number
  backgroundJobsCompleted: number
  errorRate: number
  memoryUsage: number
  cpuUsage: number
  activeConnections: number
}

export interface CacheEntry {
  key: string
  value: any
  expiresAt: Date
  tags: string[]
  hitCount: number
  lastAccessed: Date
}

export interface BackgroundJob {
  id: string
  type: string
  userId: string
  payload: any
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying'
  priority: 'low' | 'medium' | 'high' | 'critical'
  scheduledFor: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  retryCount: number
  maxRetries: number
  metadata: any
}

// Cache Management
class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private readonly defaultTTL = 60 * 60 * 1000 // 1 hour

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key)
      return null
    }
    
    // Update access stats
    entry.hitCount++
    entry.lastAccessed = new Date()
    
    return entry.value as T
  }

  async set(key: string, value: any, ttl?: number, tags: string[] = []): Promise<void> {
    const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL))
    
    const entry: CacheEntry = {
      key,
      value,
      expiresAt,
      tags,
      hitCount: 0,
      lastAccessed: new Date()
    }
    
    this.cache.set(key, entry)
    
    // Store in database for persistence
    await this.persistCacheEntry(entry)
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key)
    
    const supabase = createSupabaseServerClient()
    await supabase.from('cache_entries').delete().eq('key', key)
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key)
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
    
    // Delete from database
    const supabase = createSupabaseServerClient()
    await supabase.from('cache_entries').delete().overlaps('tags', tags)
  }

  async cleanup(): Promise<void> {
    const now = new Date()
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        keysToDelete.push(key)
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
    
    // Cleanup database
    const supabase = createSupabaseServerClient()
    await supabase.from('cache_entries').delete().lt('expires_at', now.toISOString())
  }

  getStats(): { size: number; hitRate: number; totalHits: number } {
    let totalHits = 0
    let totalAccesses = 0
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount
      totalAccesses += entry.hitCount + 1 // +1 for initial set
    }
    
    return {
      size: this.cache.size,
      hitRate: totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0,
      totalHits
    }
  }

  private async persistCacheEntry(entry: CacheEntry): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('cache_entries').upsert({
        key: entry.key,
        value: entry.value,
        expires_at: entry.expiresAt.toISOString(),
        tags: entry.tags,
        hit_count: entry.hitCount,
        last_accessed: entry.lastAccessed.toISOString()
      })
    } catch (error) {
      console.error('Error persisting cache entry:', error)
    }
  }
}

// Background Job Queue
class JobQueue {
  private jobs = new Map<string, BackgroundJob>()
  private isProcessing = false

  async addJob(
    type: string,
    userId: string,
    payload: any,
    options: {
      priority?: BackgroundJob['priority']
      scheduledFor?: Date
      maxRetries?: number
      metadata?: any
    } = {}
  ): Promise<string> {
    const job: BackgroundJob = {
      id: crypto.randomUUID(),
      type,
      userId,
      payload,
      status: 'pending',
      priority: options.priority || 'medium',
      scheduledFor: options.scheduledFor || new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      metadata: options.metadata || {}
    }
    
    this.jobs.set(job.id, job)
    
    // Persist to database
    await this.persistJob(job)
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processJobs()
    }
    
    return job.id
  }

  async getJob(jobId: string): Promise<BackgroundJob | null> {
    return this.jobs.get(jobId) || null
  }

  async getJobsByUser(userId: string): Promise<BackgroundJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId)
  }

  async getJobsByStatus(status: BackgroundJob['status']): Promise<BackgroundJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === status)
  }

  private async processJobs(): Promise<void> {
    this.isProcessing = true
    
    while (true) {
      const pendingJobs = Array.from(this.jobs.values())
        .filter(job => job.status === 'pending' && job.scheduledFor <= new Date())
        .sort((a, b) => {
          // Sort by priority, then by scheduled time
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
          if (priorityDiff !== 0) return priorityDiff
          return a.scheduledFor.getTime() - b.scheduledFor.getTime()
        })
      
      if (pendingJobs.length === 0) {
        // No pending jobs, wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
      
      const job = pendingJobs[0]
      await this.executeJob(job)
    }
  }

  private async executeJob(job: BackgroundJob): Promise<void> {
    try {
      job.status = 'running'
      job.startedAt = new Date()
      await this.persistJob(job)
      
      // Execute job based on type
      await this.executeJobByType(job)
      
      job.status = 'completed'
      job.completedAt = new Date()
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.retryCount++
      
      if (job.retryCount < job.maxRetries) {
        job.status = 'retrying'
        job.scheduledFor = new Date(Date.now() + Math.pow(2, job.retryCount) * 60000) // Exponential backoff
      } else {
        job.status = 'failed'
        job.completedAt = new Date()
      }
    }
    
    await this.persistJob(job)
  }

  private async executeJobByType(job: BackgroundJob): Promise<void> {
    switch (job.type) {
      case 'sync_shopify_data':
        await this.syncShopifyData(job)
        break
      case 'generate_analytics':
        await this.generateAnalytics(job)
        break
      case 'send_notification':
        await this.sendNotification(job)
        break
      case 'cleanup_cache':
        await this.cleanupCache(job)
        break
      case 'process_webhook':
        await this.processWebhook(job)
        break
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  }

  private async syncShopifyData(job: BackgroundJob): Promise<void> {
    const { userId, dataType } = job.payload
    const shopifyAPI = await createShopifyAPI(userId)
    
    if (!shopifyAPI) {
      throw new Error('Shopify API not available')
    }
    
    switch (dataType) {
      case 'products':
        const products = await shopifyAPI.getProducts(500)
        await cache.set(`shopify:products:${userId}`, products, 30 * 60 * 1000, ['shopify', 'products', userId])
        break
      case 'orders':
        const orders = await shopifyAPI.getOrders(500)
        await cache.set(`shopify:orders:${userId}`, orders, 15 * 60 * 1000, ['shopify', 'orders', userId])
        break
      case 'customers':
        const customers = await shopifyAPI.getCustomers(500)
        await cache.set(`shopify:customers:${userId}`, customers, 60 * 60 * 1000, ['shopify', 'customers', userId])
        break
    }
  }

  private async generateAnalytics(job: BackgroundJob): Promise<void> {
    const { userId, timeframe } = job.payload
    // This would call the analytics engine
    console.log(`Generating analytics for user ${userId} with timeframe ${timeframe}`)
  }

  private async sendNotification(job: BackgroundJob): Promise<void> {
    const { userId, type, message } = job.payload
    // This would send the notification
    console.log(`Sending ${type} notification to user ${userId}: ${message}`)
  }

  private async cleanupCache(job: BackgroundJob): Promise<void> {
    await cache.cleanup()
  }

  private async processWebhook(job: BackgroundJob): Promise<void> {
    const { webhookData } = job.payload
    // Process webhook data
    console.log('Processing webhook:', webhookData)
  }

  private async persistJob(job: BackgroundJob): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('background_jobs').upsert({
        id: job.id,
        type: job.type,
        user_id: job.userId,
        payload: job.payload,
        status: job.status,
        priority: job.priority,
        scheduled_for: job.scheduledFor.toISOString(),
        started_at: job.startedAt?.toISOString(),
        completed_at: job.completedAt?.toISOString(),
        error: job.error,
        retry_count: job.retryCount,
        max_retries: job.maxRetries,
        metadata: job.metadata
      })
    } catch (error) {
      console.error('Error persisting job:', error)
    }
  }
}

// Performance Monitor
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    apiResponseTime: 0,
    cacheHitRate: 0,
    backgroundJobsQueued: 0,
    backgroundJobsCompleted: 0,
    errorRate: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    activeConnections: 0
  }

  async recordApiCall(duration: number, success: boolean): Promise<void> {
    // Update response time (moving average)
    this.metrics.apiResponseTime = (this.metrics.apiResponseTime * 0.9) + (duration * 0.1)
    
    // Update error rate
    if (!success) {
      this.metrics.errorRate = (this.metrics.errorRate * 0.9) + (1 * 0.1)
    } else {
      this.metrics.errorRate = this.metrics.errorRate * 0.9
    }
    
    // Store metrics
    await this.persistMetrics()
  }

  async updateCacheMetrics(): Promise<void> {
    const cacheStats = cache.getStats()
    this.metrics.cacheHitRate = cacheStats.hitRate
  }

  async updateJobMetrics(): Promise<void> {
    const queuedJobs = await jobQueue.getJobsByStatus('pending')
    const completedJobs = await jobQueue.getJobsByStatus('completed')
    
    this.metrics.backgroundJobsQueued = queuedJobs.length
    this.metrics.backgroundJobsCompleted = completedJobs.length
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  private async persistMetrics(): Promise<void> {
    try {
      const supabase = createSupabaseServerClient()
      await supabase.from('performance_metrics').insert({
        timestamp: new Date().toISOString(),
        api_response_time: this.metrics.apiResponseTime,
        cache_hit_rate: this.metrics.cacheHitRate,
        background_jobs_queued: this.metrics.backgroundJobsQueued,
        background_jobs_completed: this.metrics.backgroundJobsCompleted,
        error_rate: this.metrics.errorRate,
        memory_usage: this.metrics.memoryUsage,
        cpu_usage: this.metrics.cpuUsage,
        active_connections: this.metrics.activeConnections
      })
    } catch (error) {
      console.error('Error persisting metrics:', error)
    }
  }
}

// Global instances
export const cache = new CacheManager()
export const jobQueue = new JobQueue()
export const performanceMonitor = new PerformanceMonitor()

// Utility functions
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number,
  tags?: string[]
): Promise<T> {
  const cached = await cache.get<T>(key)
  if (cached !== null) {
    return cached
  }
  
  const result = await fetcher()
  await cache.set(key, result, ttl, tags)
  return result
}

export async function withPerformanceTracking<T>(
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  let success = true
  
  try {
    const result = await operation()
    return result
  } catch (error) {
    success = false
    throw error
  } finally {
    const duration = Date.now() - startTime
    await performanceMonitor.recordApiCall(duration, success)
  }
}

// Background job helpers
export const JobHelpers = {
  scheduleShopifySync: (userId: string, dataType: string, delay = 0) =>
    jobQueue.addJob('sync_shopify_data', userId, { userId, dataType }, {
      priority: 'medium',
      scheduledFor: new Date(Date.now() + delay)
    }),

  scheduleAnalyticsGeneration: (userId: string, timeframe: string) =>
    jobQueue.addJob('generate_analytics', userId, { userId, timeframe }, {
      priority: 'low',
      scheduledFor: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes delay
    }),

  scheduleNotification: (userId: string, type: string, message: string, delay = 0) =>
    jobQueue.addJob('send_notification', userId, { userId, type, message }, {
      priority: 'high',
      scheduledFor: new Date(Date.now() + delay)
    }),

  scheduleCacheCleanup: () =>
    jobQueue.addJob('cleanup_cache', 'system', {}, {
      priority: 'low',
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000) // 1 hour delay
    })
}

// Initialize performance monitoring
setInterval(async () => {
  await performanceMonitor.updateCacheMetrics()
  await performanceMonitor.updateJobMetrics()
}, 60000) // Update every minute

// Initialize cache cleanup
setInterval(async () => {
  await cache.cleanup()
}, 5 * 60 * 1000) // Cleanup every 5 minutes
