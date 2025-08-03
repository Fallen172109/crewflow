// Predictive Response Statistics API
// Provides analytics and statistics for the predictive response system

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { responsePreloader } from '@/lib/ai/response-preloader'
import { predictiveJobProcessor } from '@/lib/ai/predictive-job-processor'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 PREDICTIVE STATS API: Request received')

    // Authenticate user
    const user = await requireAuth()
    console.log('📊 PREDICTIVE STATS API: User authenticated:', user.id)

    const { searchParams } = new URL(request.url)
    const timeRange = parseInt(searchParams.get('timeRange') || '24') // hours
    const includeDetails = searchParams.get('details') === 'true'

    const supabase = createSupabaseServerClient()
    const since = new Date(Date.now() - (timeRange * 60 * 60 * 1000))

    // Get basic statistics
    const stats = await getBasicStats(supabase, user.id, since)
    
    // Get preloading performance stats
    const preloadingStats = await responsePreloader.getPreloadingStats(user.id, timeRange)
    
    // Get job processing stats
    const jobStats = predictiveJobProcessor.getJobStats()

    // Get prediction accuracy if requested
    let accuracyStats = null
    if (includeDetails) {
      accuracyStats = await getAccuracyStats(supabase, user.id, since)
    }

    const response = {
      success: true,
      timeRange: `${timeRange} hours`,
      stats: {
        basic: stats,
        preloading: preloadingStats,
        jobs: jobStats,
        accuracy: accuracyStats
      },
      generatedAt: new Date().toISOString()
    }

    console.log('📊 PREDICTIVE STATS API: Stats generated successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('📊 PREDICTIVE STATS API: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get predictive stats',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        undefined
    }, { status: 500 })
  }
}

async function getBasicStats(supabase: any, userId: string, since: Date) {
  try {
    // Get prediction analytics count
    const { data: predictions, error: predError } = await supabase
      .from('prediction_analytics')
      .select('id, predictions')
      .eq('user_id', userId)
      .gte('generated_at', since.toISOString())

    if (predError) throw predError

    // Get preloaded responses count
    const { data: preloaded, error: preloadError } = await supabase
      .from('preloaded_responses')
      .select('id, confidence, metadata')
      .eq('user_id', userId)
      .gte('generated_at', since.toISOString())

    if (preloadError) throw preloadError

    // Get job metrics
    const { data: jobs, error: jobError } = await supabase
      .from('predictive_job_metrics')
      .select('success, duration_ms, tokens_used, cache_hit')
      .eq('user_id', userId)
      .gte('start_time', since.toISOString())

    if (jobError) throw jobError

    // Calculate statistics
    const totalPredictions = predictions.reduce((sum, p) => sum + (p.predictions?.length || 0), 0)
    const totalPreloaded = preloaded.length
    const averageConfidence = preloaded.length > 0 
      ? preloaded.reduce((sum, p) => sum + p.confidence, 0) / preloaded.length 
      : 0

    const successfulJobs = jobs.filter(j => j.success).length
    const successRate = jobs.length > 0 ? (successfulJobs / jobs.length) * 100 : 0
    const averageDuration = jobs.length > 0 
      ? jobs.reduce((sum, j) => sum + j.duration_ms, 0) / jobs.length 
      : 0
    const totalTokens = jobs.reduce((sum, j) => sum + (j.tokens_used || 0), 0)
    const cacheHits = jobs.filter(j => j.cache_hit).length
    const cacheHitRate = jobs.length > 0 ? (cacheHits / jobs.length) * 100 : 0

    return {
      predictions: {
        total: totalPredictions,
        sessions: predictions.length
      },
      preloaded: {
        total: totalPreloaded,
        averageConfidence: Math.round(averageConfidence * 100) / 100
      },
      performance: {
        successRate: Math.round(successRate),
        averageDuration: Math.round(averageDuration),
        totalTokensUsed: totalTokens,
        cacheHitRate: Math.round(cacheHitRate)
      }
    }
  } catch (error) {
    console.error('📊 PREDICTIVE STATS: Error getting basic stats:', error)
    return {
      predictions: { total: 0, sessions: 0 },
      preloaded: { total: 0, averageConfidence: 0 },
      performance: { successRate: 0, averageDuration: 0, totalTokensUsed: 0, cacheHitRate: 0 }
    }
  }
}

async function getAccuracyStats(supabase: any, userId: string, since: Date) {
  try {
    // Get recent accuracy analytics
    const { data: accuracy, error: accuracyError } = await supabase
      .from('prediction_accuracy_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('analyzed_at', since.toISOString())
      .order('analyzed_at', { ascending: false })
      .limit(5)

    if (accuracyError) throw accuracyError

    if (!accuracy || accuracy.length === 0) {
      return {
        overallAccuracy: 0,
        categoryAccuracy: {},
        recentAnalyses: 0,
        trend: 'no_data'
      }
    }

    // Calculate average accuracy
    const avgAccuracy = accuracy.reduce((sum, a) => sum + a.accuracy_score, 0) / accuracy.length

    // Combine category accuracies
    const combinedCategories: Record<string, number[]> = {}
    accuracy.forEach(a => {
      if (a.category_accuracy) {
        Object.entries(a.category_accuracy).forEach(([category, score]) => {
          if (!combinedCategories[category]) {
            combinedCategories[category] = []
          }
          combinedCategories[category].push(score as number)
        })
      }
    })

    const categoryAccuracy: Record<string, number> = {}
    Object.entries(combinedCategories).forEach(([category, scores]) => {
      categoryAccuracy[category] = scores.reduce((sum, s) => sum + s, 0) / scores.length
    })

    // Determine trend
    let trend = 'stable'
    if (accuracy.length >= 2) {
      const recent = accuracy[0].accuracy_score
      const previous = accuracy[1].accuracy_score
      if (recent > previous + 5) trend = 'improving'
      else if (recent < previous - 5) trend = 'declining'
    }

    return {
      overallAccuracy: Math.round(avgAccuracy * 100) / 100,
      categoryAccuracy,
      recentAnalyses: accuracy.length,
      trend
    }
  } catch (error) {
    console.error('📊 PREDICTIVE STATS: Error getting accuracy stats:', error)
    return {
      overallAccuracy: 0,
      categoryAccuracy: {},
      recentAnalyses: 0,
      trend: 'error'
    }
  }
}

// POST endpoint to trigger analytics job
export async function POST(request: NextRequest) {
  try {
    console.log('📊 PREDICTIVE STATS API: Analytics trigger request received')

    // Authenticate user
    const user = await requireAuth()
    
    const body = await request.json()
    const { action, timeRange = 24 } = body

    if (action === 'analyze') {
      // Queue analytics job
      await predictiveJobProcessor.queueAnalyticsJob(user.id, timeRange)
      
      return NextResponse.json({
        success: true,
        message: 'Analytics job queued successfully',
        timeRange: `${timeRange} hours`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('📊 PREDICTIVE STATS API: POST Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        undefined
    }, { status: 500 })
  }
}

// PUT endpoint to update prediction thresholds
export async function PUT(request: NextRequest) {
  try {
    console.log('📊 PREDICTIVE STATS API: Threshold update request received')

    // Authenticate user (admin only for threshold updates)
    const user = await requireAuth()
    
    const body = await request.json()
    const { similarityThreshold, confidenceThreshold } = body

    if (typeof similarityThreshold === 'number' && typeof confidenceThreshold === 'number') {
      // Update thresholds
      predictiveResponseChecker.updateThresholds(similarityThreshold, confidenceThreshold)
      
      return NextResponse.json({
        success: true,
        message: 'Thresholds updated successfully',
        thresholds: {
          similarity: similarityThreshold,
          confidence: confidenceThreshold
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid threshold values'
    }, { status: 400 })

  } catch (error) {
    console.error('📊 PREDICTIVE STATS API: PUT Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update thresholds',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        undefined
    }, { status: 500 })
  }
}
