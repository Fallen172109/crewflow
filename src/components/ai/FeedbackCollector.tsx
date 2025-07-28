'use client'

// AI Response Feedback Collector Component
// Allows users to rate and provide feedback on AI responses

import React, { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react'

interface FeedbackCollectorProps {
  messageId: string
  agentId: string
  threadId?: string
  onFeedbackSubmitted?: (feedback: any) => void
  compact?: boolean
}

interface FeedbackState {
  rating: number
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'star_rating' | null
  feedbackText: string
  improvementSuggestions: string
  isSubmitting: boolean
  isSubmitted: boolean
  showDetailedForm: boolean
}

export default function FeedbackCollector({
  messageId,
  agentId,
  threadId,
  onFeedbackSubmitted,
  compact = false
}: FeedbackCollectorProps) {
  const [feedback, setFeedback] = useState<FeedbackState>({
    rating: 0,
    feedbackType: null,
    feedbackText: '',
    improvementSuggestions: '',
    isSubmitting: false,
    isSubmitted: false,
    showDetailedForm: false
  })

  const handleQuickFeedback = async (type: 'thumbs_up' | 'thumbs_down') => {
    const rating = type === 'thumbs_up' ? 5 : 2
    
    setFeedback(prev => ({ ...prev, isSubmitting: true }))

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId,
          agentId,
          threadId,
          rating,
          feedbackType: type,
          wasHelpful: type === 'thumbs_up'
        })
      })

      const result = await response.json()

      if (result.success) {
        setFeedback(prev => ({
          ...prev,
          isSubmitted: true,
          feedbackType: type,
          rating
        }))
        
        onFeedbackSubmitted?.(result)
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
          setFeedback(prev => ({ ...prev, isSubmitted: false }))
        }, 2000)
      } else {
        console.error('Failed to submit feedback:', result.error)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setFeedback(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleStarRating = (rating: number) => {
    setFeedback(prev => ({
      ...prev,
      rating,
      feedbackType: 'star_rating',
      showDetailedForm: rating <= 3 // Show detailed form for low ratings
    }))
  }

  const handleDetailedSubmit = async () => {
    if (feedback.rating === 0) return

    setFeedback(prev => ({ ...prev, isSubmitting: true }))

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId,
          agentId,
          threadId,
          rating: feedback.rating,
          feedbackType: 'star_rating',
          feedbackText: feedback.feedbackText,
          improvementSuggestions: feedback.improvementSuggestions,
          wasHelpful: feedback.rating >= 4
        })
      })

      const result = await response.json()

      if (result.success) {
        setFeedback(prev => ({
          ...prev,
          isSubmitted: true,
          showDetailedForm: false
        }))
        
        onFeedbackSubmitted?.(result)
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          setFeedback(prev => ({ ...prev, isSubmitted: false }))
        }, 3000)
      } else {
        console.error('Failed to submit feedback:', result.error)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setFeedback(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  if (feedback.isSubmitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
        <ThumbsUp className="w-4 h-4" />
        <span>Thank you for your feedback!</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleQuickFeedback('thumbs_up')}
          disabled={feedback.isSubmitting}
          className="p-1 hover:bg-green-100 rounded transition-colors"
          title="This was helpful"
        >
          <ThumbsUp className="w-4 h-4 text-gray-500 hover:text-green-600" />
        </button>
        <button
          onClick={() => handleQuickFeedback('thumbs_down')}
          disabled={feedback.isSubmitting}
          className="p-1 hover:bg-red-100 rounded transition-colors"
          title="This needs improvement"
        >
          <ThumbsDown className="w-4 h-4 text-gray-500 hover:text-red-600" />
        </button>
        <button
          onClick={() => setFeedback(prev => ({ ...prev, showDetailedForm: true }))}
          className="p-1 hover:bg-blue-100 rounded transition-colors"
          title="Provide detailed feedback"
        >
          <MessageSquare className="w-4 h-4 text-gray-500 hover:text-blue-600" />
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      {!feedback.showDetailedForm ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              How was this response?
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleQuickFeedback('thumbs_up')}
                disabled={feedback.isSubmitting}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                title="Helpful"
              >
                <ThumbsUp className="w-5 h-5 text-gray-400 hover:text-green-600" />
              </button>
              <button
                onClick={() => handleQuickFeedback('thumbs_down')}
                disabled={feedback.isSubmitting}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                title="Not helpful"
              >
                <ThumbsDown className="w-5 h-5 text-gray-400 hover:text-red-600" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rate this response:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleStarRating(star)}
                  disabled={feedback.isSubmitting}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= feedback.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {feedback.rating > 0 && !feedback.showDetailedForm && (
              <button
                onClick={handleDetailedSubmit}
                disabled={feedback.isSubmitting}
                className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                {feedback.isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Your rating:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= feedback.rating
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What could be improved? (Optional)
            </label>
            <textarea
              value={feedback.feedbackText}
              onChange={(e) => setFeedback(prev => ({ ...prev, feedbackText: e.target.value }))}
              placeholder="Tell us what you think about this response..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specific suggestions (Optional)
            </label>
            <textarea
              value={feedback.improvementSuggestions}
              onChange={(e) => setFeedback(prev => ({ ...prev, improvementSuggestions: e.target.value }))}
              placeholder="How could this response be more helpful?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDetailedSubmit}
              disabled={feedback.isSubmitting || feedback.rating === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {feedback.isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <button
              onClick={() => setFeedback(prev => ({ ...prev, showDetailedForm: false }))}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
