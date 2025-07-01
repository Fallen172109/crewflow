import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createMealPlanningService, type MealPlanRequest } from '@/lib/ai/meal-planning'
import { getMealPlanningContext } from '@/lib/ai/meal-planning-context'

// POST - Auto-generate personalized 7-day meal plan using complete user profile
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
      plan_duration_days = 7,
      custom_preferences = {},
      regenerate_existing = false 
    } = body

    // Get comprehensive meal planning context with error handling
    let context
    try {
      context = await getMealPlanningContext(user.id)

      if (!context) {
        throw new Error('Failed to retrieve meal planning context')
      }

      console.log('Auto-generate context check:', {
        hasProfile: !!context.userProfile,
        profileData: context.userProfile,
        profileCompletion: context.profileCompletion,
        hasMinimalProfile: context.profileCompletion?.has_minimal_profile
      })
    } catch (contextError) {
      console.error('Error getting meal planning context:', contextError)
      return NextResponse.json({
        error: 'Failed to retrieve user profile data',
        message: 'Unable to access your meal planning profile. Please try refreshing the page or contact support if the issue persists.'
      }, { status: 500 })
    }

    // Check if user has sufficient profile data for auto-generation
    // Now using more lenient validation - only require minimal profile (weight, height, goal)
    if (!context.profileCompletion?.has_minimal_profile) {
      console.log('Auto-generate failed - insufficient profile data:', {
        profileCompletion: context.profileCompletion,
        userProfile: context.userProfile
      })
      return NextResponse.json({
        error: 'Insufficient profile data for auto-generation',
        profile_completion: context.profileCompletion,
        missing_fields: context.profileCompletion?.missing_fields || ['weight_value', 'height_value', 'primary_goal'],
        message: 'Please complete your basic profile setup (weight, height, and primary goal) to enable auto-generation.'
      }, { status: 400 })
    }

    const { userProfile, dietaryRestrictions, cuisinePreferences, pantryItems, nutritionalTargets } = context

    // Build comprehensive meal plan request using all available profile data
    const mealPlanRequest: MealPlanRequest = {
      days: plan_duration_days,
      mealCount: userProfile?.preferred_meal_count || 3,
      servingSize: userProfile?.household_size || 1,
      cookingTime: userProfile?.max_cooking_time_minutes ? `${userProfile.max_cooking_time_minutes} minutes` : '60 minutes',
      budgetRange: userProfile?.budget_range || 'moderate',
      
      // Enhanced profile data
      userProfile,
      pantryItems,
      recentMealHistory: context.recentMealHistory,
      activityLevel: userProfile?.activity_level,
      primaryGoal: userProfile?.primary_goal,
      targetCalories: nutritionalTargets?.calories,
      macroTargets: nutritionalTargets,
      
      // Dietary preferences and restrictions
      dietaryPreferences: [
        ...dietaryRestrictions
          .filter(r => r.restriction_type === 'dietary_preference')
          .map(r => r.restriction_value),
        ...(custom_preferences?.dietary_preferences || [])
      ],
      
      allergies: [
        ...dietaryRestrictions
          .filter(r => r.restriction_type === 'allergy')
          .map(r => r.restriction_value),
        ...(custom_preferences?.allergies || [])
      ],
      
      excludeIngredients: [
        ...dietaryRestrictions
          .filter(r => ['medical_restriction', 'religious_restriction'].includes(r.restriction_type))
          .map(r => r.restriction_value),
        ...(custom_preferences?.exclude_ingredients || [])
      ],
      
      cuisinePreferences: [
        ...cuisinePreferences.map(c => c.cuisine_name),
        ...(custom_preferences?.cuisine_preferences || [])
      ],
      
      healthGoals: [
        userProfile?.primary_goal,
        ...(custom_preferences?.health_goals || [])
      ].filter(Boolean)
    }

    // Build intelligent auto-generation prompt
    const autoGenerationPrompt = `Generate a comprehensive ${plan_duration_days}-day meal plan tailored specifically for this user's profile and goals.

USER PROFILE SUMMARY:
${context.contextSummary}

NUTRITIONAL TARGETS:
- Daily Calories: ${nutritionalTargets?.calories || 'Calculate based on profile'}
- Protein: ${nutritionalTargets?.protein || 'Calculate'}g
- Carbohydrates: ${nutritionalTargets?.carbs || 'Calculate'}g  
- Fat: ${nutritionalTargets?.fat || 'Calculate'}g
- Fiber: ${nutritionalTargets?.fiber || 'Calculate'}g

DIETARY GUIDELINES:
${context.intelligentFiltering.dietaryGuidelines.join('\n')}

PANTRY INTEGRATION:
${pantryItems.length > 0 ? `Incorporate these available ingredients: ${pantryItems.map(item => `${item.ingredient_name} (${item.status})`).join(', ')}` : 'No pantry items specified'}

REQUIREMENTS:
1. Create exactly ${plan_duration_days} days of meal plans
2. Include ${userProfile?.preferred_meal_count || 3} meals per day (breakfast, lunch, dinner${userProfile?.preferred_meal_count > 3 ? ', plus snacks' : ''})
3. Each meal should align with the user's nutritional targets and dietary restrictions
4. Provide detailed nutritional information for each meal and daily totals
5. Include cooking instructions, prep times, and ingredient lists
6. Generate a comprehensive shopping list organized by category
7. Ensure variety across days while respecting preferences and restrictions
8. Consider the user's cooking time constraints (max ${userProfile?.max_cooking_time_minutes || 60} minutes)
9. Align with budget range: ${userProfile?.budget_range || 'moderate'}
10. Support household size of ${userProfile?.household_size || 1} people

Focus on creating a practical, personalized meal plan that the user can realistically follow based on their specific profile, goals, and constraints.`

    // Generate meal plan using AI service
    const mealPlanningService = createMealPlanningService()
    const result = await mealPlanningService.generateMealPlan({
      ...mealPlanRequest,
      enhancedPrompt: autoGenerationPrompt
    })

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to auto-generate meal plan',
        details: 'The AI service encountered an error while generating your personalized meal plan.'
      }, { status: 500 })
    }

    // Deactivate existing active plans if regenerating
    if (regenerate_existing) {
      await supabase
        .from('user_meal_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true)
    }

    // Save the auto-generated meal plan to database
    const planData = {
      user_id: user.id,
      plan_name: `Auto-Generated Plan - ${new Date().toLocaleDateString()}`,
      plan_duration_days,
      generated_for_date: new Date().toISOString().split('T')[0],
      plan_data: result.mealPlan,
      preferences_snapshot: {
        profile: userProfile,
        dietary_restrictions: dietaryRestrictions,
        cuisine_preferences: cuisinePreferences,
        pantry_items: pantryItems.length,
        nutritional_targets: nutritionalTargets,
        custom_preferences: custom_preferences || {},
        auto_generated: true,
        generation_method: 'auto_profile_based'
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
      console.error('Error saving auto-generated meal plan:', saveError)
      return NextResponse.json({ 
        error: 'Failed to save meal plan',
        details: 'The meal plan was generated successfully but could not be saved to your account.'
      }, { status: 500 })
    }

    // Track AI usage for analytics
    try {
      await supabase.from('ai_usage_logs').insert({
        user_id: user.id,
        agent_name: 'meal_planning_auto_generation',
        framework: 'langchain',
        provider: 'openai',
        model: result.model,
        tokens_used: result.tokensUsed,
        latency_ms: result.latency,
        success: true,
        cost_estimate: (result.tokensUsed * 0.002) / 1000, // Rough estimate
        metadata: {
          plan_duration_days,
          profile_completion: context.profileCompletion.percentage,
          dietary_restrictions_count: dietaryRestrictions.length,
          pantry_items_count: pantryItems.length
        }
      })
    } catch (logError) {
      console.error('Error logging AI usage:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      meal_plan: result.mealPlan,
      saved_plan_id: savedPlan?.id,
      auto_generated: true,
      profile_data_used: {
        profile_completion: context.profileCompletion.percentage,
        dietary_restrictions: dietaryRestrictions.length,
        cuisine_preferences: cuisinePreferences.length,
        pantry_items: pantryItems.length,
        nutritional_targets_calculated: !!nutritionalTargets
      },
      ai_metrics: {
        tokens_used: result.tokensUsed,
        latency: result.latency,
        model: result.model
      },
      message: 'Your personalized 7-day meal plan has been auto-generated successfully!'
    })

  } catch (error) {
    console.error('Auto-generation API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: 'An unexpected error occurred during meal plan auto-generation.'
    }, { status: 500 })
  }
}
