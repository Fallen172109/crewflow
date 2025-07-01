import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ChatOpenAI } from '@langchain/openai'
import { getAIConfig } from '@/lib/ai/config'
import { getMealPlanningContext, buildMealPlanningSystemPrompt } from '@/lib/ai/meal-planning-context'

// Helper function to provide intent-specific guidance
function getIntentGuidance(intent: string): string {
  switch (intent) {
    case 'meal_plan_generation':
      return 'Focus on creating comprehensive meal plans with detailed nutritional information and shopping lists.'
    case 'meal_modification':
      return 'Provide specific meal substitutions that maintain nutritional balance and respect dietary constraints.'
    case 'nutritional_guidance':
      return 'Offer detailed nutritional analysis and recommendations based on the user\'s goals and targets.'
    case 'pantry_management':
      return 'Suggest meals using available pantry items and provide shopping recommendations for missing ingredients.'
    case 'recipe_guidance':
      return 'Provide detailed cooking instructions, preparation tips, and ingredient substitutions.'
    default:
      return 'Provide helpful, personalized meal planning advice based on the user\'s profile and needs.'
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Meal planning chat API called')

    const {
      message,
      conversation_history,
      user_profile,
      pantry_items,
      recent_meal_plans,
      dietary_restrictions,
      nutritional_targets,
      context_summary,
      request_intent
    } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Try to get user authentication, but don't fail if not authenticated
    let user = null
    try {
      user = await requireAuth()
      console.log('User authenticated:', user?.id)
    } catch (authError) {
      console.log('Authentication failed, proceeding without user context')
    }

    // Initialize AI service
    const aiConfig = getAIConfig()
    console.log('AI Config loaded, has OpenAI key:', !!aiConfig.openai.apiKey)

    if (!aiConfig.openai.apiKey) {
      return NextResponse.json({
        response: "I apologize, but the meal planning AI service is not properly configured. Please contact support.",
        meal_plan: null,
        context_used: { has_profile: false, pantry_items: 0, recent_plans: 0 }
      })
    }

    const llm = new ChatOpenAI({
      apiKey: aiConfig.openai.apiKey,
      model: aiConfig.openai.model,
      maxTokens: 2000,
      temperature: 0.7
    })

    // Build enhanced system prompt with full context
    let systemPrompt = `You are a professional meal planning assistant with expertise in nutrition, cooking, and dietary planning.

CORE CAPABILITIES:
- Generate personalized meal plans based on user profiles and goals
- Modify existing meal plans with natural language requests
- Provide nutritional guidance and macro calculations
- Suggest recipes based on dietary preferences and restrictions
- Manage pantry items and suggest meals using available ingredients
- Offer cooking tips and meal preparation advice

CURRENT USER CONTEXT:`

    // Add user profile context
    if (user_profile) {
      systemPrompt += `
PROFILE: ${user_profile.primary_goal?.replace('_', ' ')} goal, ${user_profile.activity_level?.replace('_', ' ')} activity level
HOUSEHOLD: ${user_profile.household_size} people
COOKING TIME: Max ${user_profile.max_cooking_time_minutes} minutes
BUDGET: ${user_profile.budget_range} range`

      if (user_profile.weight_value && user_profile.height_value) {
        systemPrompt += `
PHYSICAL STATS: ${user_profile.weight_value}${user_profile.weight_unit}, ${user_profile.height_value}${user_profile.height_unit}`
      }
    }

    // Add nutritional targets
    if (nutritional_targets) {
      systemPrompt += `
DAILY TARGETS: ${nutritional_targets.calories} calories, ${nutritional_targets.protein}g protein, ${nutritional_targets.carbs}g carbs, ${nutritional_targets.fat}g fat`
    }

    // Add dietary restrictions
    if (dietary_restrictions && dietary_restrictions.length > 0) {
      const allergies = dietary_restrictions.filter(r => r.restriction_type === 'allergy')
      const preferences = dietary_restrictions.filter(r => r.restriction_type === 'dietary_preference')
      const medical = dietary_restrictions.filter(r => r.restriction_type === 'medical_restriction')

      if (allergies.length > 0) {
        systemPrompt += `
ALLERGIES: ${allergies.map(a => a.restriction_value).join(', ')} (STRICT AVOIDANCE)`
      }

      if (preferences.length > 0) {
        systemPrompt += `
DIETARY PREFERENCES: ${preferences.map(p => p.restriction_value).join(', ')}`
      }

      if (medical.length > 0) {
        systemPrompt += `
MEDICAL RESTRICTIONS: ${medical.map(m => m.restriction_value).join(', ')}`
      }
    }

    // Add intelligent pantry context
    if (pantry_items && pantry_items.length > 0) {
      // Filter items included in meal plans
      const includedItems = pantry_items.filter(item =>
        item.status === 'available' && item.include_in_meal_plans !== false
      )

      if (includedItems.length > 0) {
        // Categorize by expiration urgency
        const now = new Date()
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        const expiringUrgent = includedItems.filter(item => {
          if (!item.expiration_date) return false
          const expDate = new Date(item.expiration_date)
          return expDate <= threeDaysFromNow && expDate > now
        })

        const expiringSoon = includedItems.filter(item => {
          if (!item.expiration_date) return false
          const expDate = new Date(item.expiration_date)
          return expDate <= weekFromNow && expDate > threeDaysFromNow
        })

        systemPrompt += `
PANTRY INVENTORY (${includedItems.length} items available for meal planning):`

        if (expiringUrgent.length > 0) {
          systemPrompt += `
🚨 URGENT - USE FIRST: ${expiringUrgent.map(item => `${item.ingredient_name} (expires ${new Date(item.expiration_date!).toLocaleDateString()})`).join(', ')}`
        }

        if (expiringSoon.length > 0) {
          systemPrompt += `
⚠️ EXPIRING SOON: ${expiringSoon.map(item => `${item.ingredient_name} (expires ${new Date(item.expiration_date!).toLocaleDateString()})`).join(', ')}`
        }

        systemPrompt += `
📦 AVAILABLE INGREDIENTS: ${includedItems.map(item => item.ingredient_name).join(', ')}

PANTRY OPTIMIZATION: Prioritize recipes using expiring items first, then incorporate other pantry ingredients to reduce waste and shopping needs.`
      }
    }

    // Add meal plan history context
    if (recent_meal_plans && recent_meal_plans.length > 0) {
      const activePlans = recent_meal_plans.filter(plan => plan.is_active)
      systemPrompt += `
MEAL PLAN HISTORY: ${recent_meal_plans.length} previous plans`

      if (activePlans.length > 0) {
        systemPrompt += `, ${activePlans.length} currently active`
      }
    }

    // Add request intent guidance
    if (request_intent) {
      systemPrompt += `

REQUEST TYPE: ${request_intent}
${getIntentGuidance(request_intent)}`
    }

    systemPrompt += `

RESPONSE GUIDELINES:
- Always consider the user's complete profile and constraints
- Provide specific, actionable advice
- Include nutritional information when relevant
- Suggest modifications that maintain nutritional balance
- Use available pantry items when possible
- Respect all dietary restrictions and allergies
- Be encouraging and supportive
- Format responses clearly with proper structure
- Provide nutritional advice and information
- Help with grocery shopping and pantry management
- Accommodate special diets (vegetarian, vegan, keto, gluten-free, etc.)
- Consider budget constraints and cooking skill levels

Please provide helpful, practical advice. If the user asks for a meal plan, provide specific meals with ingredients. Be friendly and encouraging.`

    let contextUsed = {
      has_profile: !!user_profile,
      pantry_items: pantry_items?.length || 0,
      recent_plans: recent_meal_plans?.length || 0,
      dietary_restrictions: dietary_restrictions?.length || 0,
      context_enhanced: false
    }

    if (user?.id) {
      try {
        console.log('Getting comprehensive meal planning context for user:', user.id)
        const mealContext = await getMealPlanningContext(user.id)

        // Build enhanced system prompt with full context
        systemPrompt = buildMealPlanningSystemPrompt(
          'Meal Planning Assistant',
          'a specialized nutrition and meal planning expert',
          mealContext
        )

        contextUsed = {
          has_profile: !!mealContext.userProfile,
          pantry_items: mealContext.pantryItems?.length || 0,
          recent_plans: mealContext.recentMealPlans?.length || 0,
          dietary_restrictions: mealContext.dietaryRestrictions?.length || 0,
          context_enhanced: true,
          profile_completion: mealContext.profileCompletion.percentage,
          intelligent_filtering: {
            exclude_ingredients: mealContext.intelligentFiltering.excludeIngredients.length,
            dietary_guidelines: mealContext.intelligentFiltering.dietaryGuidelines.length
          }
        }

        console.log('Enhanced context loaded:', {
          hasProfile: contextUsed.has_profile,
          restrictions: contextUsed.dietary_restrictions,
          profileCompletion: contextUsed.profile_completion
        })
      } catch (contextError) {
        console.error('Error loading meal planning context:', contextError)
        // Fall back to basic context
        systemPrompt += `\n\nUser context (basic):
- Has profile: ${!!user_profile}
- Pantry items available: ${pantry_items?.length || 0}
- Recent meal plans: ${recent_meal_plans?.length || 0}
- Dietary restrictions: ${dietary_restrictions?.length || 0}`
      }
    }

    console.log('Calling OpenAI with model:', aiConfig.openai.model)

    // Generate response using the correct LangChain message format
    const response = await llm.invoke([
      ['system', systemPrompt],
      ['user', message]
    ])

    const responseText = response.content as string
    console.log('AI response received, length:', responseText?.length)

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
              content: message,
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
      } catch (dbError) {
        console.error('Error saving conversation to database:', dbError)
        // Don't fail the request if database save fails
      }
    }

    return NextResponse.json({
      response: responseText,
      meal_plan: null, // Will implement meal plan parsing later
      context_used: contextUsed
    })



  } catch (error) {
    console.error('Error in meal planning chat:', error)

    // Provide more specific error information
    let errorMessage = 'Failed to process message'
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error details:', error.stack)
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: statusCode }
    )
  }
}
