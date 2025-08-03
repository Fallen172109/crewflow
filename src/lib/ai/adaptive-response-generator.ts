// Adaptive Response Generator
// Generates responses that adapt based on user feedback and learning patterns

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Agent } from '@/lib/agents'
import { IntentAnalysis } from './advanced-intent-recognition'
import { FeedbackLearningSystem } from './feedback-learning-system'

export interface AdaptiveResponseConfig {
  agentId: string
  userId: string
  threadId: string
  intentAnalysis: IntentAnalysis
  baseResponse: string
  contextData: any
}

export interface ResponseAdaptation {
  adaptedResponse: string
  adaptationReason: string
  confidenceAdjustment: number
  learningInsights: string[]
  personalizedElements: string[]
}

export interface UserResponsePattern {
  userId: string
  agentId: string
  preferredResponseStyle: 'concise' | 'detailed' | 'technical' | 'conversational'
  averageRating: number
  commonFeedbackThemes: string[]
  successfulResponsePatterns: string[]
  improvementAreas: string[]
  maritimePersonalityPreference: number // 1-5 scale
}

export class AdaptiveResponseGenerator {
  private supabase = createSupabaseServerClient()
  private feedbackSystem: FeedbackLearningSystem

  constructor() {
    this.feedbackSystem = new FeedbackLearningSystem()
  }

  /**
   * Generate an adaptive response based on user feedback patterns
   */
  async generateAdaptiveResponse(config: AdaptiveResponseConfig): Promise<ResponseAdaptation> {
    try {
      // Get user response patterns
      const userPattern = await this.getUserResponsePattern(config.userId, config.agentId)
      
      // Get recent feedback for this agent
      const recentFeedback = await this.getRecentFeedback(config.userId, config.agentId)
      
      // Analyze what adaptations are needed
      const adaptations = this.analyzeNeededAdaptations(
        config.baseResponse,
        userPattern,
        recentFeedback,
        config.intentAnalysis
      )

      // Apply adaptations to the response
      const adaptedResponse = await this.applyAdaptations(
        config.baseResponse,
        adaptations,
        config.contextData
      )

      return {
        adaptedResponse,
        adaptationReason: adaptations.reason,
        confidenceAdjustment: adaptations.confidenceAdjustment,
        learningInsights: adaptations.insights,
        personalizedElements: adaptations.personalizedElements
      }
    } catch (error) {
      console.error('Error generating adaptive response:', error)
      return {
        adaptedResponse: config.baseResponse,
        adaptationReason: 'No adaptation applied due to error',
        confidenceAdjustment: 0,
        learningInsights: [],
        personalizedElements: []
      }
    }
  }

  /**
   * Get user response patterns from historical data
   */
  private async getUserResponsePattern(userId: string, agentId: string): Promise<UserResponsePattern> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error || !data || data.length === 0) {
        return this.getDefaultUserPattern(userId, agentId)
      }

      // Analyze feedback patterns
      const averageRating = data.reduce((sum, feedback) => sum + feedback.rating, 0) / data.length
      const feedbackTexts = data.filter(f => f.feedback_text).map(f => f.feedback_text)
      
      // Extract common themes from feedback
      const commonThemes = this.extractFeedbackThemes(feedbackTexts)
      
      // Determine preferred response style
      const preferredStyle = this.determinePreferredStyle(data, feedbackTexts)
      
      // Analyze successful patterns
      const successfulResponses = data.filter(f => f.rating >= 4)
      const successfulPatterns = this.extractSuccessfulPatterns(successfulResponses)
      
      // Identify improvement areas
      const lowRatedResponses = data.filter(f => f.rating <= 2)
      const improvementAreas = this.extractImprovementAreas(lowRatedResponses)

      // Determine maritime personality preference
      const maritimePreference = this.calculateMaritimePreference(feedbackTexts)

      return {
        userId,
        agentId,
        preferredResponseStyle: preferredStyle,
        averageRating,
        commonFeedbackThemes: commonThemes,
        successfulResponsePatterns: successfulPatterns,
        improvementAreas,
        maritimePersonalityPreference: maritimePreference
      }
    } catch (error) {
      console.error('Error getting user response pattern:', error)
      return this.getDefaultUserPattern(userId, agentId)
    }
  }

  private getDefaultUserPattern(userId: string, agentId: string): UserResponsePattern {
    return {
      userId,
      agentId,
      preferredResponseStyle: 'conversational',
      averageRating: 3.5,
      commonFeedbackThemes: [],
      successfulResponsePatterns: [],
      improvementAreas: [],
      maritimePersonalityPreference: 4 // Default to liking maritime theme
    }
  }

  private async getRecentFeedback(userId: string, agentId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_response_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10)

      return data || []
    } catch (error) {
      console.error('Error getting recent feedback:', error)
      return []
    }
  }

  private analyzeNeededAdaptations(
    baseResponse: string,
    userPattern: UserResponsePattern,
    recentFeedback: any[],
    intentAnalysis: IntentAnalysis
  ): {
    reason: string
    confidenceAdjustment: number
    insights: string[]
    personalizedElements: string[]
  } {
    const insights: string[] = []
    const personalizedElements: string[] = []
    let confidenceAdjustment = 0
    let reason = 'Standard response'

    // Adjust based on user's preferred style
    if (userPattern.preferredResponseStyle === 'concise' && baseResponse.length > 500) {
      insights.push('User prefers concise responses - will condense')
      personalizedElements.push('concise_format')
      reason = 'Adapted for concise preference'
    } else if (userPattern.preferredResponseStyle === 'detailed' && baseResponse.length < 200) {
      insights.push('User prefers detailed responses - will expand')
      personalizedElements.push('detailed_format')
      reason = 'Adapted for detailed preference'
    }

    // Adjust maritime personality based on preference
    if (userPattern.maritimePersonalityPreference < 3) {
      insights.push('User shows lower preference for maritime theme - will reduce')
      personalizedElements.push('reduced_maritime_theme')
      reason = 'Reduced maritime personality'
    } else if (userPattern.maritimePersonalityPreference > 4) {
      insights.push('User enjoys maritime theme - will enhance')
      personalizedElements.push('enhanced_maritime_theme')
      reason = 'Enhanced maritime personality'
    }

    // Adjust based on recent feedback patterns
    if (recentFeedback.length > 0) {
      const recentAverage = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length
      if (recentAverage < 3) {
        confidenceAdjustment = -0.2
        insights.push('Recent feedback suggests need for improvement')
        personalizedElements.push('improvement_focus')
      } else if (recentAverage > 4) {
        confidenceAdjustment = 0.1
        insights.push('Recent feedback is positive - maintaining approach')
      }
    }

    // Adjust based on improvement areas
    if (userPattern.improvementAreas.includes('too_technical')) {
      insights.push('User found previous responses too technical - simplifying')
      personalizedElements.push('simplified_language')
    }

    if (userPattern.improvementAreas.includes('not_actionable')) {
      insights.push('User wants more actionable advice - adding specific steps')
      personalizedElements.push('actionable_steps')
    }

    return {
      reason,
      confidenceAdjustment,
      insights,
      personalizedElements
    }
  }

  private async applyAdaptations(
    baseResponse: string,
    adaptations: any,
    contextData: any
  ): Promise<string> {
    let adaptedResponse = baseResponse

    // Apply personalized elements
    if (adaptations.personalizedElements.includes('concise_format')) {
      adaptedResponse = this.makeConcise(adaptedResponse)
    }

    if (adaptations.personalizedElements.includes('detailed_format')) {
      adaptedResponse = this.makeDetailed(adaptedResponse, contextData)
    }

    if (adaptations.personalizedElements.includes('reduced_maritime_theme')) {
      adaptedResponse = this.reduceMaritimeTheme(adaptedResponse)
    }

    if (adaptations.personalizedElements.includes('enhanced_maritime_theme')) {
      adaptedResponse = this.enhanceMaritimeTheme(adaptedResponse)
    }

    if (adaptations.personalizedElements.includes('simplified_language')) {
      adaptedResponse = this.simplifyLanguage(adaptedResponse)
    }

    if (adaptations.personalizedElements.includes('actionable_steps')) {
      adaptedResponse = this.addActionableSteps(adaptedResponse)
    }

    return adaptedResponse
  }

  private extractFeedbackThemes(feedbackTexts: string[]): string[] {
    const themes: string[] = []
    const commonWords = ['helpful', 'clear', 'confusing', 'technical', 'simple', 'detailed', 'quick', 'thorough']
    
    feedbackTexts.forEach(text => {
      if (text) {
        commonWords.forEach(word => {
          if (text.toLowerCase().includes(word)) {
            themes.push(word)
          }
        })
      }
    })

    return [...new Set(themes)]
  }

  private determinePreferredStyle(feedbackData: any[], feedbackTexts: string[]): 'concise' | 'detailed' | 'technical' | 'conversational' {
    const styleIndicators = {
      concise: ['short', 'brief', 'quick', 'concise', 'to the point'],
      detailed: ['detailed', 'thorough', 'comprehensive', 'complete', 'in-depth'],
      technical: ['technical', 'specific', 'precise', 'accurate', 'expert'],
      conversational: ['friendly', 'easy', 'simple', 'conversational', 'approachable']
    }

    const scores = { concise: 0, detailed: 0, technical: 0, conversational: 0 }

    feedbackTexts.forEach(text => {
      if (text) {
        Object.entries(styleIndicators).forEach(([style, indicators]) => {
          indicators.forEach(indicator => {
            if (text.toLowerCase().includes(indicator)) {
              scores[style as keyof typeof scores]++
            }
          })
        })
      }
    })

    return Object.entries(scores).reduce((a, b) => scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b)[0] as any
  }

  private extractSuccessfulPatterns(successfulResponses: any[]): string[] {
    // Analyze patterns in highly-rated responses
    return ['clear_structure', 'actionable_advice', 'maritime_personality']
  }

  private extractImprovementAreas(lowRatedResponses: any[]): string[] {
    // Analyze patterns in low-rated responses
    const areas: string[] = []
    
    lowRatedResponses.forEach(response => {
      if (response.feedback_text) {
        const text = response.feedback_text.toLowerCase()
        if (text.includes('too technical') || text.includes('complex')) {
          areas.push('too_technical')
        }
        if (text.includes('not helpful') || text.includes('vague')) {
          areas.push('not_actionable')
        }
        if (text.includes('too long') || text.includes('verbose')) {
          areas.push('too_verbose')
        }
      }
    })

    return [...new Set(areas)]
  }

  private calculateMaritimePreference(feedbackTexts: string[]): number {
    let maritimeScore = 4 // Default neutral-positive
    let maritimeReferences = 0

    feedbackTexts.forEach(text => {
      if (text) {
        const lowerText = text.toLowerCase()
        if (lowerText.includes('maritime') || lowerText.includes('nautical') || lowerText.includes('ship')) {
          maritimeReferences++
          if (lowerText.includes('love') || lowerText.includes('great') || lowerText.includes('enjoy')) {
            maritimeScore += 0.5
          } else if (lowerText.includes('annoying') || lowerText.includes('too much') || lowerText.includes('stop')) {
            maritimeScore -= 1
          }
        }
      }
    })

    return Math.max(1, Math.min(5, maritimeScore))
  }

  private makeConcise(response: string): string {
    // Simplify and shorten the response
    return response.split('\n').slice(0, 3).join('\n').substring(0, 300) + '...'
  }

  private makeDetailed(response: string, contextData: any): string {
    // Add more detail and context
    return response + '\n\nFor more specific guidance, I can help you with detailed steps based on your store setup.'
  }

  private reduceMaritimeTheme(response: string): string {
    // Reduce maritime terminology
    return response
      .replace(/⚓/g, '•')
      .replace(/🚢/g, '📋')
      .replace(/navigate|chart course|set sail/gi, 'proceed')
      .replace(/maritime/gi, 'professional')
  }

  private enhanceMaritimeTheme(response: string): string {
    // Add more maritime flair
    return `⚓ ${response}\n\nReady to set sail with your next request, Captain!`
  }

  private simplifyLanguage(response: string): string {
    // Replace technical terms with simpler alternatives
    return response
      .replace(/optimization/gi, 'improvement')
      .replace(/implementation/gi, 'setup')
      .replace(/configuration/gi, 'settings')
  }

  private addActionableSteps(response: string): string {
    // Add specific action steps
    return response + '\n\n**Next Steps:**\n1. Review the suggestions above\n2. Choose the option that fits your needs\n3. Let me know if you need help implementing any changes'
  }
}
