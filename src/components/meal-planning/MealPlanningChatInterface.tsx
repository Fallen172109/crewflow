'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, ChefHat, Loader2, User, Bot } from 'lucide-react'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MealPlanningChatInterfaceProps {
  userProfile?: any
  onMealPlanGenerated?: (mealPlan: any) => void
  pantryItems?: any[]
  recentMealPlans?: any[]
  dietaryRestrictions?: any[]
  nutritionalTargets?: any
}

// Helper function to detect request intent for better AI routing
function detectRequestIntent(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('generate') || lowerMessage.includes('create') || lowerMessage.includes('make') && (lowerMessage.includes('plan') || lowerMessage.includes('meal'))) {
    return 'meal_plan_generation'
  }

  if (lowerMessage.includes('modify') || lowerMessage.includes('change') || lowerMessage.includes('replace') || lowerMessage.includes('substitute')) {
    return 'meal_modification'
  }

  if (lowerMessage.includes('nutrition') || lowerMessage.includes('calorie') || lowerMessage.includes('macro') || lowerMessage.includes('protein')) {
    return 'nutritional_guidance'
  }

  if (lowerMessage.includes('pantry') || lowerMessage.includes('ingredient') || lowerMessage.includes('shopping')) {
    return 'pantry_management'
  }

  if (lowerMessage.includes('recipe') || lowerMessage.includes('cook') || lowerMessage.includes('prepare')) {
    return 'recipe_guidance'
  }

  return 'general_inquiry'
}

export default function MealPlanningChatInterface({
  userProfile,
  onMealPlanGenerated,
  pantryItems = [],
  recentMealPlans = [],
  dietaryRestrictions = [],
  nutritionalTargets
}: MealPlanningChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Create a contextual welcome message based on user data
    let welcomeContent = `Ahoy! I'm your dedicated Meal Planning Assistant. I can help you create personalized meal plans, manage your pantry, and provide nutritional guidance.`

    // Add contextual information based on user profile and data
    const contextualInfo = []

    // Enhanced context based on profile completeness
    if (userProfile) {
      contextualInfo.push(`✅ Profile: ${userProfile.primary_goal?.replace('_', ' ')} goal, ${userProfile.activity_level?.replace('_', ' ')} activity`)
      if (userProfile.weight_value && userProfile.height_value) {
        contextualInfo.push(`📊 Physical stats recorded for accurate calculations`)
      }
      if (userProfile.household_size > 1) {
        contextualInfo.push(`👥 Planning for ${userProfile.household_size} people`)
      }
    }

    if (nutritionalTargets) {
      contextualInfo.push(`🎯 Daily targets: ${nutritionalTargets.calories} cal, ${nutritionalTargets.protein}g protein`)
    }

    if (userProfile) {
      contextualInfo.push(`I see you're working towards **${userProfile.primary_goal?.replace('_', ' ')}** with a **${userProfile.activity_level?.replace('_', ' ')}** lifestyle.`)

      if (userProfile.household_size > 1) {
        contextualInfo.push(`I'll keep in mind you're cooking for **${userProfile.household_size} people**.`)
      }
    }

    // Add nutritional targets if available
    if (nutritionalTargets) {
      contextualInfo.push(`Your daily targets: **${nutritionalTargets.calories} calories**, **${nutritionalTargets.protein}g protein**, **${nutritionalTargets.carbs}g carbs**, **${nutritionalTargets.fat}g fat**.`)
    }

    // Add dietary restrictions summary
    if (dietaryRestrictions.length > 0) {
      const allergies = dietaryRestrictions.filter(r => r.restriction_type === 'allergy')
      const preferences = dietaryRestrictions.filter(r => r.restriction_type === 'dietary_preference')

      if (allergies.length > 0) {
        contextualInfo.push(`⚠️ I'll avoid your allergies: **${allergies.map(a => a.restriction_value).join(', ')}**.`)
      }

      if (preferences.length > 0) {
        const dietTypes = preferences.filter(p => ['vegetarian', 'vegan', 'keto', 'paleo'].includes(p.restriction_value))
        const dislikes = preferences.filter(p => !['vegetarian', 'vegan', 'keto', 'paleo'].includes(p.restriction_value))

        if (dietTypes.length > 0) {
          contextualInfo.push(`I'll follow your **${dietTypes.map(d => d.restriction_value).join(', ')}** dietary approach.`)
        }

        if (dislikes.length > 0) {
          contextualInfo.push(`I'll avoid ingredients you dislike: **${dislikes.map(d => d.restriction_value).join(', ')}**.`)
        }
      }
    }

    if (pantryItems.length > 0) {
      const availableItems = pantryItems.filter(item => item.status === 'available').length
      const expiringItems = pantryItems.filter(item => {
        if (!item.expiration_date) return false
        const expDate = new Date(item.expiration_date)
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        return expDate <= weekFromNow && item.status !== 'expired'
      }).length

      if (availableItems > 0) {
        contextualInfo.push(`You have **${availableItems} ingredients** ready to use in your pantry.`)
      }

      if (expiringItems > 0) {
        contextualInfo.push(`⚠️ **${expiringItems} items** are expiring soon - I can suggest recipes to use them up!`)
      }
    }

    if (recentMealPlans.length > 0) {
      contextualInfo.push(`I can see your **${recentMealPlans.length} recent meal plans** to avoid repetition and build on your preferences.`)
    }

    if (contextualInfo.length > 0) {
      welcomeContent += `\n\n**Your Current Situation:**\n${contextualInfo.map(info => `- ${info}`).join('\n')}`
    }

    welcomeContent += `\n\n**What I can help you with:**
- Generate custom meal plans based on your goals and preferences
- Analyze your pantry and suggest recipes using available ingredients
- Provide nutritional information and dietary advice
- Create shopping lists for your meal plans
- Adjust plans for dietary restrictions and allergies

How can I assist you with your meal planning today?`

    return [
      {
        id: 'welcome',
        type: 'assistant',
        content: welcomeContent,
        timestamp: new Date()
      }
    ]
  })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Call the meal planning chat API with enhanced context
      const response = await fetch('/api/meal-planning/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content.trim(),
          conversation_history: messages.slice(-10), // Last 10 messages for context
          user_profile: userProfile,
          pantry_items: pantryItems.filter(item => item.include_in_meal_plans !== false),
          recent_meal_plans: recentMealPlans,
          dietary_restrictions: dietaryRestrictions,
          nutritional_targets: nutritionalTargets,
          // Enhanced context for better AI responses
          context_summary: {
            profile_complete: !!userProfile,
            has_nutritional_targets: !!nutritionalTargets,
            dietary_restrictions_count: dietaryRestrictions.length,
            pantry_items_count: pantryItems.length,
            meal_plans_count: recentMealPlans.length,
            active_plans: recentMealPlans.filter(plan => plan.is_active).length
          },
          // Request type detection for better routing
          request_intent: detectRequestIntent(content.trim())
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // If a meal plan was generated, notify parent component
      if (data.meal_plan && onMealPlanGenerated) {
        onMealPlanGenerated(data.meal_plan)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      handleSendMessage(inputValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col shadow-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-orange-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-gray-900 font-semibold">Meal Planning Assistant</h3>
            <p className="text-sm text-gray-600">
              {isLoading ? 'Preparing your response...' : 'Ready to help with your meal planning'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: '400px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-[80%] ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-gray-600' 
                  : 'bg-orange-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <ChefHat className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`rounded-lg px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {message.type === 'user' ? (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                ) : (
                  <div className="text-sm leading-relaxed">
                    <MarkdownRenderer content={message.content} />
                  </div>
                )}
                <p className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-[80%]">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSendMessage("Generate a 7-day meal plan for me")}
              disabled={isLoading}
              className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-200 transition-colors disabled:opacity-50"
            >
              Generate Meal Plan
            </button>
            {pantryItems.filter(item => item.status === 'available').length >= 3 && (
              <button
                onClick={() => handleSendMessage("What recipes can I make with my current pantry ingredients?")}
                disabled={isLoading}
                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                Use Pantry Items
              </button>
            )}
            {userProfile && (
              <button
                onClick={() => handleSendMessage("Analyze my nutritional needs based on my profile")}
                disabled={isLoading}
                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                Nutrition Analysis
              </button>
            )}
            <button
              onClick={() => handleSendMessage("Give me healthy snack ideas")}
              disabled={isLoading}
              className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors disabled:opacity-50"
            >
              Snack Ideas
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about meal planning, recipes, nutrition, or pantry management..."
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>

        <div className="mt-2 text-xs text-gray-500 text-center">
          Ask me to generate meal plans, analyze your pantry, or provide nutritional advice
        </div>
      </div>
    </div>
  )
}
