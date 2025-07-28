// AI Feedback API Endpoint
// Handles user feedback submission and retrieval for AI response improvement

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { FeedbackLearningSystem, ResponseFeedback } from '@/lib/ai/feedback-learning-system'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const {
      messageId,
      agentId,
      threadId,
      rating,
      feedbackType,
      feedbackText,
      wasHelpful,
      improvementSuggestions
    } = body

    // Validate required fields
    if (!messageId || !agentId || rating === undefined || feedbackType === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: messageId, agentId, rating, feedbackType'
      }, { status: 400 })
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
      }, { status: 400 })
    }

    // Validate feedback type
    if (!['thumbs_up', 'thumbs_down', 'star_rating'].includes(feedbackType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid feedback type'
      }, { status: 400 })
    }

    const feedbackSystem = new FeedbackLearningSystem()

    const feedback: ResponseFeedback = {
      userId: user.id,
      messageId,
      agentId,
      threadId,
      rating,
      feedbackType,
      feedbackText,
      wasHelpful: wasHelpful ?? (rating >= 4),
      improvementSuggestions
    }

    const result = await feedbackSystem.submitFeedback(feedback)

    if (result.success) {
      console.log('✅ Feedback submitted successfully:', {
        feedbackId: result.feedbackId,
        userId: user.id,
        agentId,
        rating,
        feedbackType
      })

      return NextResponse.json({
        success: true,
        feedbackId: result.feedbackId,
        message: 'Feedback submitted successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to submit feedback'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in feedback API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const feedbackSystem = new FeedbackLearningSystem()
    
    // Get user's feedback history
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()

    let query = supabase
      .from('ai_response_feedback')
      .select(`
        id,
        message_id,
        agent_id,
        thread_id,
        rating,
        feedback_type,
        feedback_text,
        was_helpful,
        improvement_suggestions,
        response_quality_score,
        created_at,
        chat_history!inner(content)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: feedback, error } = await query

    if (error) {
      throw error
    }

    // Get feedback summary statistics
    const { data: summaryData } = await supabase
      .rpc('get_user_feedback_summary', {
        p_user_id: user.id,
        p_agent_id: agentId
      })

    const summary = summaryData?.[0] || {
      total_feedback: 0,
      average_rating: 0,
      positive_feedback_rate: 0,
      recent_trend: 'stable',
      most_common_improvement: 'No feedback yet'
    }

    return NextResponse.json({
      success: true,
      feedback: feedback || [],
      summary: {
        totalFeedback: summary.total_feedback,
        averageRating: summary.average_rating,
        positiveFeedbackRate: summary.positive_feedback_rate,
        recentTrend: summary.recent_trend,
        mostCommonImprovement: summary.most_common_improvement
      },
      pagination: {
        limit,
        offset,
        hasMore: (feedback?.length || 0) === limit
      }
    })

  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch feedback'
    }, { status: 500 })
  }
}

// Analytics endpoint for admins
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Check if user is admin
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const action = searchParams.get('action')

    if (action === 'generate_improvements') {
      const feedbackSystem = new FeedbackLearningSystem()
      
      if (!agentId) {
        return NextResponse.json({
          success: false,
          error: 'Agent ID required for generating improvements'
        }, { status: 400 })
      }

      // Get current prompt for the agent
      const { data: currentPrompt } = await supabase
        .from('prompt_versions')
        .select('prompt_content')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .single()

      const improvements = await feedbackSystem.generatePromptImprovements(
        agentId,
        currentPrompt?.prompt_content || 'Default prompt'
      )

      return NextResponse.json({
        success: true,
        improvements,
        message: `Generated ${improvements.length} improvement suggestions`
      })
    }

    if (action === 'learning_patterns') {
      const { data: patterns } = await supabase
        .rpc('get_learning_pattern_insights', {
          p_agent_id: agentId
        })

      return NextResponse.json({
        success: true,
        patterns: patterns || [],
        message: 'Learning patterns retrieved successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Error in feedback analytics:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
