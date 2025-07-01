import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createMealPlanningService, MealPlanRequest } from '@/lib/ai/meal-planning'

// POST - Generate personalized meal plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      request: userRequest,
      plan_duration_days,
      use_profile_data,
      current_pantry,
      custom_preferences
    } = body

    if (!userRequest) {
      return NextResponse.json({ 
        error: 'Meal planning request is required' 
      }, { status: 400 })
    }

    // Get user's meal planning profile if requested
    let userProfile = null
    let dietaryRestrictions: any[] = []
    let cuisinePreferences: any[] = []
    let pantryItems: any[] = []

    if (use_profile_data !== false) { // Default to true
      // Fetch user profile
      const { data: profile } = await supabase
        .from('user_meal_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      userProfile = profile

      // Fetch dietary restrictions
      const { data: restrictions } = await supabase
        .from('user_dietary_restrictions')
        .select('*')
        .eq('user_id', user.id)

      dietaryRestrictions = restrictions || []

      // Fetch cuisine preferences
      const { data: cuisines } = await supabase
        .from('user_cuisine_preferences')
        .select('*')
        .eq('user_id', user.id)

      cuisinePreferences = cuisines || []

      // Fetch pantry items if requested
      if (current_pantry !== false) {
        const { data: pantry } = await supabase
          .from('user_pantry_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'available')
          .eq('include_in_meal_plans', true)

        pantryItems = pantry || []
      }
    }

    // Build meal plan request
    const mealPlanRequest: MealPlanRequest = {
      days: plan_duration_days || 7,
      mealCount: userProfile?.preferred_meal_count || 3,
      servingSize: userProfile?.household_size || 1,
      cookingTime: userProfile?.max_cooking_time_minutes ? `${userProfile.max_cooking_time_minutes} minutes` : '60 minutes',
      budgetRange: userProfile?.budget_range || 'moderate',

      // Enhanced profile data for better meal planning
      userProfile,
      pantryItems,
      recentMealHistory: context.recentMealHistory,
      activityLevel: userProfile?.activity_level,
      primaryGoal: userProfile?.primary_goal,
      targetCalories: nutritionalTargets?.calories,
      macroTargets: nutritionalTargets,

      // Dietary preferences from profile
      dietaryPreferences: [
        ...dietaryRestrictions
          .filter(r => r.restriction_type === 'dietary_preference')
          .map(r => r.restriction_value),
        ...(custom_preferences?.dietary_preferences || [])
      ],
      
      // Allergies from profile
      allergies: [
        ...dietaryRestrictions
          .filter(r => r.restriction_type === 'allergy')
          .map(r => r.restriction_value),
        ...(custom_preferences?.allergies || [])
      ],
      
      // Cuisine preferences
      cuisinePreferences: [
        ...cuisinePreferences
          .filter(c => c.preference_level === 'love' || c.preference_level === 'like')
          .map(c => c.cuisine_type),
        ...(custom_preferences?.cuisine_preferences || [])
      ],
      
      // Health goals based on profile
      healthGoals: userProfile?.primary_goal ? [userProfile.primary_goal] : [],
      
      // Exclude ingredients from allergies and dislikes
      excludeIngredients: [
        ...dietaryRestrictions
          .filter(r => r.restriction_type === 'allergy' || r.severity === 'severe')
          .map(r => r.restriction_value),
        ...cuisinePreferences
          .filter(c => c.preference_level === 'avoid' || c.preference_level === 'dislike')
          .map(c => c.cuisine_type),
        ...(custom_preferences?.exclude_ingredients || [])
      ]
    }

    // Add pantry context to the request if available
    let enhancedRequest = userRequest
    if (pantryItems.length > 0) {
      const pantryList = pantryItems.map(item => 
        `${item.ingredient_name}${item.quantity ? ` (${item.quantity}${item.unit || ''})` : ''}`
      ).join(', ')
      
      enhancedRequest += `\n\nAvailable pantry ingredients: ${pantryList}`
    }

    // Add profile context
    if (userProfile) {
      enhancedRequest += `\n\nUser Profile Context:
- Primary Goal: ${userProfile.primary_goal}
- Activity Level: ${userProfile.activity_level}
- Household Size: ${userProfile.household_size}
- Preferred Meals per Day: ${userProfile.preferred_meal_count}
- Max Cooking Time: ${userProfile.max_cooking_time_minutes} minutes
- Budget Range: ${userProfile.budget_range}`
    }

    // Generate meal plan using AI service
    const mealPlanningService = createMealPlanningService()
    const result = await mealPlanningService.generateMealPlan(mealPlanRequest)

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to generate meal plan' 
      }, { status: 500 })
    }

    // Save the generated meal plan to database
    const planData = {
      user_id: user.id,
      plan_name: `Meal Plan - ${new Date().toLocaleDateString()}`,
      plan_duration_days: plan_duration_days || 7,
      generated_for_date: new Date().toISOString().split('T')[0],
      plan_data: result.mealPlan,
      preferences_snapshot: {
        profile: userProfile,
        dietary_restrictions: dietaryRestrictions,
        cuisine_preferences: cuisinePreferences,
        pantry_items: pantryItems.length,
        custom_preferences: custom_preferences || {},
        request: userRequest
      },
      is_active: true,
      completion_status: 'active'
    }

    const { data: savedPlan, error: saveError } = await supabase
      .from('user_meal_plans')
      .insert(planData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving meal plan:', saveError)
      // Don't fail the request, just log the error
    }

    // Track AI usage
    try {
      await supabase
        .from('agent_usage_detailed')
        .insert({
          user_id: user.id,
          agent_id: 'sage',
          agent_name: 'Sage',
          framework: 'langchain',
          provider: 'openai',
          message_type: 'preset_action',
          input_tokens: 0, // Will be updated with actual values
          output_tokens: result.tokensUsed || 0,
          cost_usd: (result.tokensUsed || 0) * 0.00002, // Approximate cost
          latency_ms: result.latency || 0,
          success: true,
          metadata: {
            action_type: 'meal_plan_generation',
            plan_duration: plan_duration_days || 7,
            used_profile_data: use_profile_data !== false,
            pantry_items_count: pantryItems.length
          }
        })
    } catch (usageError) {
      console.error('Error tracking usage:', usageError)
    }

    return NextResponse.json({
      success: true,
      meal_plan: result.mealPlan,
      saved_plan_id: savedPlan?.id,
      ai_metrics: {
        tokens_used: result.tokensUsed,
        latency: result.latency,
        model: result.model
      },
      profile_data_used: {
        profile: !!userProfile,
        dietary_restrictions: dietaryRestrictions.length,
        cuisine_preferences: cuisinePreferences.length,
        pantry_items: pantryItems.length
      }
    })

  } catch (error) {
    console.error('Meal plan generation API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
