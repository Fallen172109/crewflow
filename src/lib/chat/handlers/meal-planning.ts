// Meal Planning Chat Handler
// Handles meal planning AI interactions with nutritional analysis

import { 
  ChatHandler, 
  UnifiedChatRequest, 
  UnifiedChatResponse,
  ChatHandlerError 
} from '../types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from '@/lib/ai/config'
import { getMealPlanningContext, buildMealPlanningSystemPrompt } from '@/lib/ai/meal-planning-context'

export class MealPlanningHandler implements ChatHandler {
  canHandle(request: UnifiedChatRequest): boolean {
    return request.chatType === 'meal-planning' || 
           !!request.mealPlanningContext
  }

  async process(request: UnifiedChatRequest, user: any): Promise<UnifiedChatResponse> {
    try {
      console.log('🍽️ MEAL PLANNING HANDLER: Processing request', {
        messageLength: request.message.length,
        hasContext: !!request.mealPlanningContext,
        userId: user?.id
      })

      // Get meal planning context
      const context = request.mealPlanningContext || {}
      const {
        conversation_history = [],
        user_profile,
        pantry_items = [],
        recent_meal_plans = [],
        dietary_restrictions = [],
        nutritional_targets,
        context_summary,
        request_intent
      } = context

      // Build comprehensive context for meal planning
      let contextUsed = false
      let enhancedContext = ''

      if (user) {
        try {
          const mealContext = await getMealPlanningContext(user.id)
          enhancedContext = mealContext
          contextUsed = true
          console.log('🍽️ MEAL PLANNING HANDLER: Enhanced context loaded', {
            contextLength: enhancedContext.length
          })
        } catch (error) {
          console.error('🍽️ MEAL PLANNING HANDLER: Context loading error:', error)
          // Continue without enhanced context
        }
      }

      // Build system prompt
      const systemPrompt = buildMealPlanningSystemPrompt({
        user_profile,
        pantry_items,
        recent_meal_plans,
        dietary_restrictions,
        nutritional_targets,
        context_summary,
        enhanced_context: enhancedContext
      })

      // Prepare conversation messages
      const messages = []

      // Add system prompt
      messages.push({
        role: 'system' as const,
        content: systemPrompt
      })

      // Add conversation history if provided
      if (conversation_history && conversation_history.length > 0) {
        conversation_history.forEach((msg: any) => {
          if (msg.role && msg.content) {
            messages.push({
              role: msg.role,
              content: msg.content
            })
          }
        })
      }

      // Add current user message
      messages.push({
        role: 'user' as const,
        content: request.message
      })

      // Initialize AI model
      const aiConfig = getAIConfig()
      const model = new ChatOpenAI({
        openAIApiKey: aiConfig.openai.apiKey,
        modelName: aiConfig.openai.model,
        temperature: 0.7,
        maxTokens: 2000,
      })

      console.log('🍽️ MEAL PLANNING HANDLER: Sending to AI model', {
        messageCount: messages.length,
        model: aiConfig.openai.model
      })

      // Convert messages to LangChain format
      const langchainMessages = messages.map(msg => {
        switch (msg.role) {
          case 'system':
            return new (await import('@langchain/core/messages')).SystemMessage(msg.content)
          case 'user':
            return new (await import('@langchain/core/messages')).HumanMessage(msg.content)
          case 'assistant':
            return new (await import('@langchain/core/messages')).AIMessage(msg.content)
          default:
            return new (await import('@langchain/core/messages')).HumanMessage(msg.content)
        }
      })

      // Get AI response
      const response = await model.invoke(langchainMessages)
      const responseText = response.content as string

      console.log('🍽️ MEAL PLANNING HANDLER: AI response received', {
        responseLength: responseText.length
      })

      // Save conversation to database if user is authenticated
      if (user) {
        try {
          const supabase = createSupabaseServerClient()
          await supabase
            .from('chat_history')
            .insert([
              {
                user_id: user.id,
                agent_name: 'meal_planning_assistant',
                message_type: 'user',
                content: request.message,
                task_type: 'meal_planning'
              },
              {
                user_id: user.id,
                agent_name: 'meal_planning_assistant',
                message_type: 'agent',
                content: responseText,
                task_type: 'meal_planning'
              }
            ])
          
          console.log('🍽️ MEAL PLANNING HANDLER: Conversation saved to database')
        } catch (dbError) {
          console.error('🍽️ MEAL PLANNING HANDLER: Database save error:', dbError)
          // Don't fail the request if database save fails
        }
      }

      return {
        response: responseText,
        success: true,
        threadId: request.threadId || 'meal-planning-session',
        agent: {
          id: 'meal-planning',
          name: 'Meal Planning Assistant',
          framework: 'langchain'
        },
        meal_plan: null, // Will implement meal plan parsing later
        context_used: contextUsed,
        tokensUsed: response.response_metadata?.tokenUsage?.totalTokens
      }

    } catch (error) {
      console.error('🍽️ MEAL PLANNING HANDLER: Error:', error)
      
      if (error instanceof ChatHandlerError) {
        throw error
      }

      throw new ChatHandlerError(
        `Failed to process meal planning chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  private buildBasicSystemPrompt(): string {
    return `You are a professional meal planning assistant with expertise in nutrition, cooking, and dietary management.

CORE CAPABILITIES:
- Generate personalized meal plans based on user profiles and goals
- Modify existing meal plans with natural language requests
- Provide nutritional guidance and macro calculations
- Suggest recipes based on dietary preferences and restrictions
- Manage pantry items and suggest meals using available ingredients
- Offer cooking tips and meal preparation advice

PERSONALITY:
- Friendly, knowledgeable, and health-focused
- Practical approach to meal planning and nutrition
- Encouraging and supportive of healthy lifestyle choices
- Clear, actionable advice with specific recommendations

RESPONSE STYLE:
- Use structured formatting with clear sections
- Provide specific recipes, ingredients, and instructions when requested
- Include nutritional information when relevant
- Ask clarifying questions about preferences, restrictions, or goals
- Suggest alternatives and modifications for dietary needs

GUIDELINES:
- Always consider dietary restrictions and allergies
- Provide balanced, nutritious meal suggestions
- Include preparation time and difficulty level estimates
- Suggest seasonal and locally available ingredients when possible
- Focus on practical, achievable meal planning solutions`
  }
}
