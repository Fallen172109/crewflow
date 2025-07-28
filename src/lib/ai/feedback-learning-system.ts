// AI Feedback and Learning System
// Implements self-learning capabilities based on user feedback

import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ResponseFeedback {
  id?: string
  userId: string
  messageId: string
  agentId: string
  threadId?: string
  rating: number // 1-5 stars
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'star_rating'
  feedbackText?: string
  wasHelpful: boolean
  improvementSuggestions?: string
  responseQualityScore?: number
  createdAt?: Date
}

export interface LearningPattern {
  id: string
  patternType: 'successful_response' | 'failed_response' | 'user_preference' | 'technical_accuracy'
  patternData: any
  confidenceScore: number
  usageFrequency: number
  successImpact: number
  identifiedAt: Date
  lastValidated: Date
}

export interface ResponseImprovement {
  originalPrompt: string
  improvedPrompt: string
  improvementReason: string
  expectedImpact: number
  basedOnFeedback: ResponseFeedback[]
}

export class FeedbackLearningSystem {
  private supabase = createSupabaseServerClient()

  // Submit user feedback for a response
  async submitFeedback(feedback: ResponseFeedback): Promise<{ success: boolean; feedbackId?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_feedback')
        .insert({
          user_id: feedback.userId,
          message_id: feedback.messageId,
          agent_id: feedback.agentId,
          thread_id: feedback.threadId,
          rating: feedback.rating,
          feedback_type: feedback.feedbackType,
          feedback_text: feedback.feedbackText,
          was_helpful: feedback.wasHelpful,
          improvement_suggestions: feedback.improvementSuggestions,
          response_quality_score: feedback.responseQualityScore || this.calculateQualityScore(feedback),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Trigger learning analysis for this feedback
      await this.analyzeFeedbackForLearning(data.id)

      return { success: true, feedbackId: data.id }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      return { success: false }
    }
  }

  // Analyze feedback to identify learning patterns
  private async analyzeFeedbackForLearning(feedbackId: string): Promise<void> {
    try {
      // Get the feedback with related message context
      const { data: feedback } = await this.supabase
        .from('ai_response_feedback')
        .select(`
          *,
          chat_history!inner(content, agent_name, message_type)
        `)
        .eq('id', feedbackId)
        .single()

      if (!feedback) return

      // Analyze for different pattern types
      await Promise.all([
        this.identifySuccessPatterns(feedback),
        this.identifyFailurePatterns(feedback),
        this.identifyUserPreferencePatterns(feedback),
        this.identifyTechnicalAccuracyPatterns(feedback)
      ])

    } catch (error) {
      console.error('Error analyzing feedback for learning:', error)
    }
  }

  // Identify patterns from successful responses
  private async identifySuccessPatterns(feedback: any): Promise<void> {
    if (feedback.rating >= 4 && feedback.was_helpful) {
      const responseContent = feedback.chat_history.content
      
      // Extract successful elements
      const patterns = this.extractResponsePatterns(responseContent)
      
      for (const pattern of patterns) {
        await this.storeOrUpdatePattern({
          patternType: 'successful_response',
          patternData: {
            responseStructure: pattern.structure,
            keyPhrases: pattern.keyPhrases,
            technicalElements: pattern.technicalElements,
            userContext: {
              agentId: feedback.agent_id,
              rating: feedback.rating
            }
          },
          confidenceScore: feedback.rating / 5,
          successImpact: 1.0
        })
      }
    }
  }

  // Identify patterns from failed responses
  private async identifyFailurePatterns(feedback: any): Promise<void> {
    if (feedback.rating <= 2 || !feedback.was_helpful) {
      const responseContent = feedback.chat_history.content
      
      await this.storeOrUpdatePattern({
        patternType: 'failed_response',
        patternData: {
          failureReasons: this.analyzeFailureReasons(feedback),
          responseContent: responseContent.substring(0, 500), // Store sample
          improvementSuggestions: feedback.improvement_suggestions,
          userContext: {
            agentId: feedback.agent_id,
            rating: feedback.rating
          }
        },
        confidenceScore: (5 - feedback.rating) / 5,
        successImpact: -1.0
      })
    }
  }

  // Identify user preference patterns
  private async identifyUserPreferencePatterns(feedback: any): Promise<void> {
    if (feedback.feedback_text) {
      const preferences = this.extractPreferenceIndicators(feedback.feedback_text)
      
      for (const preference of preferences) {
        await this.storeOrUpdatePattern({
          patternType: 'user_preference',
          patternData: {
            preferenceType: preference.type,
            preferenceValue: preference.value,
            userId: feedback.user_id,
            context: preference.context
          },
          confidenceScore: 0.7,
          successImpact: 0.5
        })
      }
    }
  }

  // Identify technical accuracy patterns
  private async identifyTechnicalAccuracyPatterns(feedback: any): Promise<void> {
    const responseContent = feedback.chat_history.content
    const technicalElements = this.extractTechnicalElements(responseContent)
    
    if (technicalElements.length > 0) {
      await this.storeOrUpdatePattern({
        patternType: 'technical_accuracy',
        patternData: {
          technicalElements,
          accuracyRating: feedback.rating,
          wasHelpful: feedback.was_helpful,
          agentId: feedback.agent_id
        },
        confidenceScore: feedback.rating / 5,
        successImpact: feedback.was_helpful ? 1.0 : -0.5
      })
    }
  }

  // Store or update learning patterns
  private async storeOrUpdatePattern(pattern: Omit<LearningPattern, 'id' | 'identifiedAt' | 'lastValidated' | 'usageFrequency'>): Promise<void> {
    try {
      // Check if similar pattern exists
      const { data: existingPattern } = await this.supabase
        .from('ai_learning_patterns')
        .select('*')
        .eq('pattern_type', pattern.patternType)
        .contains('pattern_data', { userContext: pattern.patternData.userContext })
        .single()

      if (existingPattern) {
        // Update existing pattern
        await this.supabase
          .from('ai_learning_patterns')
          .update({
            confidence_score: (existingPattern.confidence_score + pattern.confidenceScore) / 2,
            usage_frequency: existingPattern.usage_frequency + 1,
            success_impact: (existingPattern.success_impact + pattern.successImpact) / 2,
            last_validated: new Date().toISOString()
          })
          .eq('id', existingPattern.id)
      } else {
        // Create new pattern
        await this.supabase
          .from('ai_learning_patterns')
          .insert({
            pattern_type: pattern.patternType,
            pattern_data: pattern.patternData,
            confidence_score: pattern.confidenceScore,
            usage_frequency: 1,
            success_impact: pattern.successImpact,
            identified_at: new Date().toISOString(),
            last_validated: new Date().toISOString()
          })
      }
    } catch (error) {
      console.error('Error storing learning pattern:', error)
    }
  }

  // Generate prompt improvements based on feedback patterns
  async generatePromptImprovements(agentId: string, currentPrompt: string): Promise<ResponseImprovement[]> {
    try {
      // Get recent negative feedback for this agent
      const { data: negativeFeedback } = await this.supabase
        .from('ai_response_feedback')
        .select(`
          *,
          chat_history!inner(content)
        `)
        .eq('agent_id', agentId)
        .lte('rating', 2)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false })
        .limit(10)

      if (!negativeFeedback || negativeFeedback.length === 0) {
        return []
      }

      // Get successful patterns for comparison
      const { data: successPatterns } = await this.supabase
        .from('ai_learning_patterns')
        .select('*')
        .eq('pattern_type', 'successful_response')
        .gte('confidence_score', 0.7)
        .order('success_impact', { ascending: false })
        .limit(5)

      // Generate improvements based on patterns
      const improvements: ResponseImprovement[] = []
      
      // Analyze common failure points
      const failureReasons = this.analyzeCommonFailures(negativeFeedback)
      
      for (const reason of failureReasons) {
        const improvement = await this.generateSpecificImprovement(
          currentPrompt,
          reason,
          successPatterns || [],
          negativeFeedback
        )
        
        if (improvement) {
          improvements.push(improvement)
        }
      }

      return improvements
    } catch (error) {
      console.error('Error generating prompt improvements:', error)
      return []
    }
  }

  // Helper methods for pattern analysis
  private extractResponsePatterns(content: string): any[] {
    // Extract structural patterns, key phrases, and technical elements
    return [
      {
        structure: this.analyzeResponseStructure(content),
        keyPhrases: this.extractKeyPhrases(content),
        technicalElements: this.extractTechnicalElements(content)
      }
    ]
  }

  private analyzeFailureReasons(feedback: any): string[] {
    const reasons = []
    
    if (feedback.improvement_suggestions) {
      if (feedback.improvement_suggestions.includes('more specific')) {
        reasons.push('lack_of_specificity')
      }
      if (feedback.improvement_suggestions.includes('technical')) {
        reasons.push('technical_inaccuracy')
      }
      if (feedback.improvement_suggestions.includes('unclear')) {
        reasons.push('unclear_communication')
      }
    }
    
    if (feedback.rating <= 2) {
      reasons.push('overall_dissatisfaction')
    }
    
    return reasons
  }

  private extractPreferenceIndicators(feedbackText: string): any[] {
    const preferences = []
    const text = feedbackText.toLowerCase()
    
    if (text.includes('too long') || text.includes('verbose')) {
      preferences.push({ type: 'response_length', value: 'shorter', context: 'user_feedback' })
    }
    
    if (text.includes('more detail') || text.includes('explain more')) {
      preferences.push({ type: 'response_length', value: 'longer', context: 'user_feedback' })
    }
    
    if (text.includes('step by step') || text.includes('steps')) {
      preferences.push({ type: 'format', value: 'step_by_step', context: 'user_feedback' })
    }
    
    return preferences
  }

  private extractTechnicalElements(content: string): string[] {
    const technicalTerms = [
      'api', 'webhook', 'liquid', 'graphql', 'rest', 'json', 'shopify',
      'product', 'order', 'customer', 'inventory', 'theme', 'app'
    ]
    
    return technicalTerms.filter(term => 
      content.toLowerCase().includes(term)
    )
  }

  private analyzeResponseStructure(content: string): any {
    return {
      hasSteps: /\d+\.|step \d+/i.test(content),
      hasBulletPoints: /^[\s]*[-•*]/m.test(content),
      hasCodeBlocks: /```/.test(content),
      hasLinks: /https?:\/\//.test(content),
      wordCount: content.split(/\s+/).length
    }
  }

  private extractKeyPhrases(content: string): string[] {
    // Extract important phrases that might contribute to success
    const phrases = content.match(/\b(?:you can|I recommend|here's how|step \d+|first|next|finally)\b[^.!?]*[.!?]/gi)
    return phrases ? phrases.slice(0, 5) : []
  }

  private analyzeCommonFailures(feedbackList: any[]): string[] {
    const failureMap = new Map<string, number>()
    
    feedbackList.forEach(feedback => {
      const reasons = this.analyzeFailureReasons(feedback)
      reasons.forEach(reason => {
        failureMap.set(reason, (failureMap.get(reason) || 0) + 1)
      })
    })
    
    return Array.from(failureMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason]) => reason)
  }

  private async generateSpecificImprovement(
    currentPrompt: string,
    failureReason: string,
    successPatterns: any[],
    negativeFeedback: any[]
  ): Promise<ResponseImprovement | null> {
    // Generate specific improvements based on failure reasons and success patterns
    const improvementMap: Record<string, ResponseImprovement> = {
      'lack_of_specificity': {
        originalPrompt: currentPrompt,
        improvedPrompt: currentPrompt + '\n\n## Specificity Requirements:\n- Always provide specific steps with exact button names and locations\n- Include specific examples and use cases\n- Mention exact API endpoints and parameters when relevant',
        improvementReason: 'Users reported responses were too vague and lacked specific implementation details',
        expectedImpact: 0.8,
        basedOnFeedback: negativeFeedback
      },
      'technical_inaccuracy': {
        originalPrompt: currentPrompt,
        improvedPrompt: currentPrompt + '\n\n## Technical Accuracy Requirements:\n- Verify all API endpoints and methods before mentioning them\n- Double-check Shopify plan limitations and capabilities\n- Provide accurate code examples and configuration steps',
        improvementReason: 'Users reported technical inaccuracies in API usage and Shopify capabilities',
        expectedImpact: 0.9,
        basedOnFeedback: negativeFeedback
      }
    }
    
    return improvementMap[failureReason] || null
  }

  private calculateQualityScore(feedback: ResponseFeedback): number {
    let score = feedback.rating / 5 // Base score from rating
    
    if (feedback.wasHelpful) score += 0.2
    if (feedback.feedbackType === 'thumbs_up') score += 0.1
    if (feedback.improvementSuggestions && feedback.improvementSuggestions.length > 0) {
      score -= 0.1 // Deduct for needing improvements
    }
    
    return Math.max(0, Math.min(1, score)) // Clamp between 0 and 1
  }
}
