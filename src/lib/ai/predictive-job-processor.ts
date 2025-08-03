// Predictive Job Processor ⚡
// Background job processor for predictive response pre-loading

import { jobQueue } from '@/lib/performance/optimization-system'
import { responsePreloader } from './response-preloader'
import { PredictedQuestion } from './predictive-response-system'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface PredictiveJobData {
  jobId: string
  prediction: PredictedQuestion
  context: {
    userId: string
    threadId: string
    sessionId: string
    agentId: string
    storeContext?: any
  }
}

export interface JobMetrics {
  jobId: string
  startTime: number
  endTime: number
  success: boolean
  error?: string
  tokensUsed: number
  cacheHit: boolean
  predictionAccuracy?: number
}

export class PredictiveJobProcessor {
  private supabase = createSupabaseServerClient()
  private jobMetrics = new Map<string, JobMetrics>()
  private isProcessing = false

  constructor() {
    this.initializeJobProcessor()
  }

  /**
   * Initialize the job processor and register handlers
   */
  private initializeJobProcessor(): void {
    console.log('⚡ PREDICTIVE JOBS: Initializing job processor')

    // Register the predictive preload job handler
    jobQueue.process('predictive-preload', async (job) => {
      return await this.processPredictivePreloadJob(job.data as PredictiveJobData)
    })

    // Register cleanup job handler
    jobQueue.process('predictive-cleanup', async (job) => {
      return await this.processCleanupJob(job.data)
    })

    // Register analytics job handler
    jobQueue.process('predictive-analytics', async (job) => {
      return await this.processAnalyticsJob(job.data)
    })

    // Schedule periodic cleanup
    this.schedulePeriodicCleanup()

    console.log('⚡ PREDICTIVE JOBS: Job processor initialized')
  }

  /**
   * Process a predictive preload job
   */
  private async processPredictivePreloadJob(jobData: PredictiveJobData): Promise<any> {
    const startTime = Date.now()
    const { jobId, prediction, context } = jobData

    console.log(`⚡ PREDICTIVE JOBS: Processing job ${jobId} for prediction: ${prediction.question}`)

    const metrics: JobMetrics = {
      jobId,
      startTime,
      endTime: 0,
      success: false,
      tokensUsed: 0,
      cacheHit: false
    }

    try {
      // Check if response is already cached
      const existingResponse = await responsePreloader.getPreloadedResponse(
        prediction.question, 
        context
      )

      if (existingResponse) {
        console.log(`⚡ PREDICTIVE JOBS: Response already cached for ${prediction.question}`)
        metrics.cacheHit = true
        metrics.success = true
        metrics.endTime = Date.now()
        this.jobMetrics.set(jobId, metrics)
        return { success: true, cached: true }
      }

      // Generate the response
      const result = await responsePreloader.preloadResponse(prediction, context)

      metrics.success = result.success
      metrics.tokensUsed = result.metrics.tokensUsed
      metrics.endTime = Date.now()

      if (!result.success) {
        metrics.error = result.error
        console.error(`⚡ PREDICTIVE JOBS: Job ${jobId} failed:`, result.error)
      } else {
        console.log(`⚡ PREDICTIVE JOBS: Job ${jobId} completed successfully (${metrics.endTime - startTime}ms)`)
      }

      this.jobMetrics.set(jobId, metrics)

      // Store job completion in database
      await this.storeJobMetrics(metrics, prediction, context)

      return {
        success: result.success,
        error: result.error,
        metrics: result.metrics
      }

    } catch (error) {
      metrics.error = error instanceof Error ? error.message : 'Unknown error'
      metrics.endTime = Date.now()
      metrics.success = false
      this.jobMetrics.set(jobId, metrics)

      console.error(`⚡ PREDICTIVE JOBS: Job ${jobId} threw error:`, error)

      await this.storeJobMetrics(metrics, prediction, context)

      throw error
    }
  }

  /**
   * Process cleanup job to remove expired predictions and responses
   */
  private async processCleanupJob(jobData: any): Promise<any> {
    console.log('⚡ PREDICTIVE JOBS: Running cleanup job')

    try {
      const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)) // 24 hours ago

      // Clean up expired preloaded responses
      const { data: expiredResponses, error: responseError } = await this.supabase
        .from('preloaded_responses')
        .delete()
        .lt('expires_at', cutoffTime.toISOString())
        .select('id')

      if (responseError) {
        console.error('⚡ PREDICTIVE JOBS: Error cleaning responses:', responseError)
      } else {
        console.log(`⚡ PREDICTIVE JOBS: Cleaned ${expiredResponses?.length || 0} expired responses`)
      }

      // Clean up old prediction analytics
      const analyticscutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) // 7 days ago
      const { data: expiredAnalytics, error: analyticsError } = await this.supabase
        .from('prediction_analytics')
        .delete()
        .lt('generated_at', analyticscutoff.toISOString())
        .select('id')

      if (analyticsError) {
        console.error('⚡ PREDICTIVE JOBS: Error cleaning analytics:', analyticsError)
      } else {
        console.log(`⚡ PREDICTIVE JOBS: Cleaned ${expiredAnalytics?.length || 0} old analytics`)
      }

      // Clean up old job metrics
      const metricsToDelete: string[] = []
      for (const [jobId, metrics] of this.jobMetrics.entries()) {
        if (metrics.endTime < cutoffTime.getTime()) {
          metricsToDelete.push(jobId)
        }
      }

      metricsToDelete.forEach(jobId => this.jobMetrics.delete(jobId))
      console.log(`⚡ PREDICTIVE JOBS: Cleaned ${metricsToDelete.length} old job metrics`)

      return {
        success: true,
        cleaned: {
          responses: expiredResponses?.length || 0,
          analytics: expiredAnalytics?.length || 0,
          jobMetrics: metricsToDelete.length
        }
      }

    } catch (error) {
      console.error('⚡ PREDICTIVE JOBS: Cleanup job error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Process analytics job to analyze prediction accuracy
   */
  private async processAnalyticsJob(jobData: any): Promise<any> {
    console.log('⚡ PREDICTIVE JOBS: Running analytics job')

    try {
      const { userId, timeRange = 24 } = jobData
      const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000))

      // Get prediction analytics
      const { data: predictions, error: predError } = await this.supabase
        .from('prediction_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('generated_at', since.toISOString())

      if (predError) throw predError

      // Get actual user questions from chat history
      const { data: actualQuestions, error: chatError } = await this.supabase
        .from('chat_history')
        .select('content, created_at')
        .eq('user_id', userId)
        .eq('message_type', 'user')
        .gte('created_at', since.toISOString())

      if (chatError) throw chatError

      // Analyze prediction accuracy
      const accuracy = this.calculatePredictionAccuracy(predictions, actualQuestions)

      // Store analytics results
      await this.supabase.from('prediction_accuracy_analytics').insert({
        user_id: userId,
        time_range_hours: timeRange,
        total_predictions: predictions.length,
        total_actual_questions: actualQuestions.length,
        accuracy_score: accuracy.overallAccuracy,
        category_accuracy: accuracy.categoryAccuracy,
        analyzed_at: new Date().toISOString()
      })

      console.log(`⚡ PREDICTIVE JOBS: Analytics completed - ${accuracy.overallAccuracy}% accuracy`)

      return {
        success: true,
        analytics: accuracy
      }

    } catch (error) {
      console.error('⚡ PREDICTIVE JOBS: Analytics job error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Calculate prediction accuracy by comparing predictions with actual questions
   */
  private calculatePredictionAccuracy(predictions: any[], actualQuestions: any[]): any {
    if (predictions.length === 0 || actualQuestions.length === 0) {
      return {
        overallAccuracy: 0,
        categoryAccuracy: {},
        matchedPredictions: 0,
        totalPredictions: predictions.length
      }
    }

    let matchedPredictions = 0
    const categoryMatches: Record<string, { matched: number; total: number }> = {}

    // Flatten all predictions
    const allPredictions = predictions.flatMap(p => p.predictions || [])

    for (const prediction of allPredictions) {
      const category = prediction.category
      if (!categoryMatches[category]) {
        categoryMatches[category] = { matched: 0, total: 0 }
      }
      categoryMatches[category].total++

      // Check if any actual question matches this prediction
      const isMatched = actualQuestions.some(q => 
        this.calculateQuestionSimilarity(prediction.question, q.content) > 0.7
      )

      if (isMatched) {
        matchedPredictions++
        categoryMatches[category].matched++
      }
    }

    const overallAccuracy = (matchedPredictions / allPredictions.length) * 100

    const categoryAccuracy: Record<string, number> = {}
    for (const [category, stats] of Object.entries(categoryMatches)) {
      categoryAccuracy[category] = (stats.matched / stats.total) * 100
    }

    return {
      overallAccuracy: Math.round(overallAccuracy * 100) / 100,
      categoryAccuracy,
      matchedPredictions,
      totalPredictions: allPredictions.length
    }
  }

  /**
   * Calculate similarity between two questions
   */
  private calculateQuestionSimilarity(q1: string, q2: string): number {
    const words1 = q1.toLowerCase().split(' ').filter(w => w.length > 2)
    const words2 = q2.toLowerCase().split(' ').filter(w => w.length > 2)
    
    const commonWords = words1.filter(word => words2.includes(word))
    const totalWords = new Set([...words1, ...words2]).size
    
    return totalWords > 0 ? commonWords.length / totalWords : 0
  }

  /**
   * Store job metrics in database
   */
  private async storeJobMetrics(
    metrics: JobMetrics, 
    prediction: PredictedQuestion, 
    context: any
  ): Promise<void> {
    try {
      await this.supabase.from('predictive_job_metrics').insert({
        job_id: metrics.jobId,
        user_id: context.userId,
        agent_id: context.agentId,
        prediction_id: prediction.id,
        prediction_question: prediction.question,
        prediction_category: prediction.category,
        prediction_probability: prediction.probability,
        start_time: new Date(metrics.startTime).toISOString(),
        end_time: new Date(metrics.endTime).toISOString(),
        duration_ms: metrics.endTime - metrics.startTime,
        success: metrics.success,
        error_message: metrics.error,
        tokens_used: metrics.tokensUsed,
        cache_hit: metrics.cacheHit
      })
    } catch (error) {
      console.error('⚡ PREDICTIVE JOBS: Error storing job metrics:', error)
    }
  }

  /**
   * Schedule periodic cleanup jobs
   */
  private schedulePeriodicCleanup(): void {
    // Schedule cleanup every 6 hours
    setInterval(async () => {
      await jobQueue.add('predictive-cleanup', {}, {
        priority: 3, // Low priority
        delay: 0
      })
    }, 6 * 60 * 60 * 1000)

    console.log('⚡ PREDICTIVE JOBS: Scheduled periodic cleanup every 6 hours')
  }

  /**
   * Get job processing statistics
   */
  getJobStats(): any {
    const metrics = Array.from(this.jobMetrics.values())
    
    if (metrics.length === 0) {
      return {
        totalJobs: 0,
        successRate: 0,
        averageDuration: 0,
        totalTokensUsed: 0,
        cacheHitRate: 0
      }
    }

    const successful = metrics.filter(m => m.success).length
    const totalDuration = metrics.reduce((sum, m) => sum + (m.endTime - m.startTime), 0)
    const totalTokens = metrics.reduce((sum, m) => sum + m.tokensUsed, 0)
    const cacheHits = metrics.filter(m => m.cacheHit).length

    return {
      totalJobs: metrics.length,
      successRate: Math.round((successful / metrics.length) * 100),
      averageDuration: Math.round(totalDuration / metrics.length),
      totalTokensUsed: totalTokens,
      cacheHitRate: Math.round((cacheHits / metrics.length) * 100)
    }
  }

  /**
   * Queue analytics job for a user
   */
  async queueAnalyticsJob(userId: string, timeRange: number = 24): Promise<void> {
    await jobQueue.add('predictive-analytics', {
      userId,
      timeRange
    }, {
      priority: 2,
      delay: 5000 // 5 second delay
    })

    console.log(`⚡ PREDICTIVE JOBS: Queued analytics job for user ${userId}`)
  }
}

// Export singleton instance
export const predictiveJobProcessor = new PredictiveJobProcessor()
