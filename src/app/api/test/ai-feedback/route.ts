// Test API endpoint for AI feedback system
// This endpoint helps test the feedback and learning system functionality

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { FeedbackLearningSystem } from '@/lib/ai/feedback-learning-system'
import { EnhancedResponseSystem } from '@/lib/ai/enhanced-response-system'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { action } = body

    const supabase = createSupabaseServerClient()

    if (action === 'create_test_message') {
      // Create a test chat message for feedback testing
      const { data: testMessage } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          agent_name: 'shopify-ai',
          message_type: 'agent',
          content: 'This is a test response for feedback system testing. It includes step-by-step instructions:\n\n1. First, navigate to your Shopify admin\n2. Go to Products section\n3. Click "Add product"\n4. Fill in the required fields\n\nThis response demonstrates the enhanced AI system with direct, actionable advice.',
          task_type: 'shopify_management'
        })
        .select()
        .single()

      if (testMessage) {
        // Store quality metrics for this test message
        await supabase.from('response_quality_metrics').insert({
          message_id: testMessage.id,
          agent_id: 'shopify-ai',
          user_id: user.id,
          response_length: testMessage.content.length,
          has_code_examples: false,
          has_step_by_step: true,
          has_links: false,
          technical_terms_count: 3,
          user_experience_level: 'intermediate',
          task_complexity: 'moderate'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Test message created',
        messageId: testMessage?.id,
        testMessage
      })
    }

    if (action === 'test_feedback_submission') {
      const { messageId, rating, feedbackType } = body

      if (!messageId) {
        return NextResponse.json({
          success: false,
          error: 'Message ID required for feedback testing'
        }, { status: 400 })
      }

      const feedbackSystem = new FeedbackLearningSystem()
      
      const result = await feedbackSystem.submitFeedback({
        userId: user.id,
        messageId,
        agentId: 'shopify-ai',
        rating: rating || 4,
        feedbackType: feedbackType || 'star_rating',
        wasHelpful: (rating || 4) >= 4,
        feedbackText: 'This is a test feedback submission',
        improvementSuggestions: rating < 4 ? 'Could be more specific about the steps' : undefined
      })

      return NextResponse.json({
        success: result.success,
        message: 'Test feedback submitted',
        feedbackId: result.feedbackId
      })
    }

    if (action === 'test_enhanced_prompt') {
      // Test the enhanced prompt system
      const responseSystem = new EnhancedResponseSystem()
      
      try {
        const context = await responseSystem.loadUserContext(user.id, 'shopify-ai')
        const enhancedPrompt = await responseSystem.generateOptimalPrompt(context)

        return NextResponse.json({
          success: true,
          message: 'Enhanced prompt generated successfully',
          promptLength: enhancedPrompt.length,
          hasQualityStandards: enhancedPrompt.includes('Response Quality Standards'),
          hasBehaviorGuidelines: enhancedPrompt.includes('Behavioral Guidelines'),
          hasShopifyExpertise: enhancedPrompt.includes('Shopify'),
          userExperience: context.userExperience,
          preview: enhancedPrompt.substring(0, 500) + '...'
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to generate enhanced prompt',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (action === 'test_learning_patterns') {
      // Test learning pattern analysis
      const { data: patterns } = await supabase
        .rpc('get_learning_pattern_insights', {
          p_agent_id: 'shopify-ai'
        })

      const { data: feedbackSummary } = await supabase
        .rpc('get_user_feedback_summary', {
          p_user_id: user.id,
          p_agent_id: 'shopify-ai'
        })

      return NextResponse.json({
        success: true,
        message: 'Learning patterns retrieved',
        patterns: patterns || [],
        feedbackSummary: feedbackSummary?.[0] || null
      })
    }

    if (action === 'test_quality_metrics') {
      // Get quality metrics for user
      const { data: metrics } = await supabase
        .from('response_quality_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', 'shopify-ai')
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: preferences } = await supabase
        .from('user_communication_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', 'shopify-ai')
        .single()

      return NextResponse.json({
        success: true,
        message: 'Quality metrics retrieved',
        metrics: metrics || [],
        preferences: preferences || null
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified',
      availableActions: [
        'create_test_message',
        'test_feedback_submission', 
        'test_enhanced_prompt',
        'test_learning_patterns',
        'test_quality_metrics'
      ]
    }, { status: 400 })

  } catch (error) {
    console.error('Error in AI feedback test:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'system_status') {
      const supabase = createSupabaseServerClient()
      
      // Check if all required tables exist
      const tables = [
        'ai_response_feedback',
        'ai_learning_patterns', 
        'prompt_versions',
        'response_quality_metrics',
        'user_communication_preferences'
      ]

      const tableChecks = await Promise.all(
        tables.map(async (table) => {
          try {
            const { count } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true })
            return { table, exists: true, count }
          } catch (error) {
            return { table, exists: false, error: error instanceof Error ? error.message : 'Unknown' }
          }
        })
      )

      return NextResponse.json({
        success: true,
        message: 'AI feedback system status',
        userId: user.id,
        tables: tableChecks,
        systemReady: tableChecks.every(check => check.exists)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'AI Feedback Test API is available',
      endpoints: {
        'POST /api/test/ai-feedback': 'Test various feedback system functions',
        'GET /api/test/ai-feedback?action=system_status': 'Check system status'
      },
      availableActions: [
        'create_test_message',
        'test_feedback_submission',
        'test_enhanced_prompt', 
        'test_learning_patterns',
        'test_quality_metrics'
      ]
    })

  } catch (error) {
    console.error('Error in AI feedback test GET:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
