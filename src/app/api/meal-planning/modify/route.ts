import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createMealPlanningService, type MealPlanRequest } from '@/lib/ai/meal-planning'
import { getMealPlanningContext } from '@/lib/ai/meal-planning-context'

// POST - Modify specific meals in an existing meal plan using AI
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
      plan_id,
      modification_request,
      day_index,
      meal_type,
      specific_requirements = {}
    } = body

    if (!plan_id || !modification_request) {
      return NextResponse.json({ 
        error: 'Plan ID and modification request are required' 
      }, { status: 400 })
    }

    // Get the existing meal plan
    const { data: existingPlan, error: planError } = await supabase
      .from('user_meal_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single()

    if (planError || !existingPlan) {
      return NextResponse.json({ 
        error: 'Meal plan not found or access denied' 
      }, { status: 404 })
    }

    // Get user context for personalized modifications
    const context = await getMealPlanningContext(user.id)
    const { userProfile, dietaryRestrictions, nutritionalTargets } = context

    // Build modification prompt with full context
    const modificationPrompt = `You are a professional nutritionist helping modify an existing meal plan. 

MODIFICATION REQUEST: ${modification_request}

USER PROFILE CONTEXT:
${context.contextSummary}

NUTRITIONAL TARGETS:
- Daily Calories: ${nutritionalTargets?.calories || 'Maintain balance'}
- Protein: ${nutritionalTargets?.protein || 'Adequate'}g
- Carbohydrates: ${nutritionalTargets?.carbs || 'Balanced'}g  
- Fat: ${nutritionalTargets?.fat || 'Healthy'}g

DIETARY CONSTRAINTS:
${context.intelligentFiltering.dietaryGuidelines.join('\n')}

CURRENT MEAL PLAN CONTEXT:
${existingPlan.plan_data?.overview || 'Existing personalized meal plan'}

${day_index !== undefined && meal_type ? `
SPECIFIC TARGET: Modify ${meal_type} for day ${day_index + 1}
CURRENT MEAL: ${JSON.stringify(existingPlan.plan_data?.dailyPlans?.[day_index]?.meals?.[meal_type] || 'Not found')}
` : ''}

REQUIREMENTS:
1. Maintain nutritional balance and alignment with user's goals
2. Respect all dietary restrictions and preferences
3. Consider cooking time constraints (max ${userProfile?.max_cooking_time_minutes || 60} minutes)
4. Keep serving size appropriate for ${userProfile?.household_size || 1} people
5. Ensure the modification fits within the overall meal plan structure
6. Provide detailed nutritional information for the new/modified meal(s)
7. If modifying a specific meal, ensure it complements other meals in that day
8. Maintain variety and avoid repetition with other days in the plan

Please provide the modification as a structured response that can be integrated into the existing meal plan.`

    // Generate meal modification using AI service
    const mealPlanningService = createMealPlanningService()
    const result = await mealPlanningService.generateMealPlan({
      days: 1, // For modification, we typically work with single meals or days
      mealCount: userProfile?.preferred_meal_count || 3,
      servingSize: userProfile?.household_size || 1,
      userProfile,
      targetCalories: nutritionalTargets?.calories,
      macroTargets: nutritionalTargets,
      dietaryPreferences: dietaryRestrictions
        .filter(r => r.restriction_type === 'dietary_preference')
        .map(r => r.restriction_value),
      allergies: dietaryRestrictions
        .filter(r => r.restriction_type === 'allergy')
        .map(r => r.restriction_value),
      excludeIngredients: dietaryRestrictions
        .filter(r => ['medical_restriction', 'religious_restriction'].includes(r.restriction_type))
        .map(r => r.restriction_value),
      enhancedPrompt: modificationPrompt
    })

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to generate meal modification',
        details: 'The AI service encountered an error while processing your modification request.'
      }, { status: 500 })
    }

    // Apply the modification to the existing plan
    let modifiedPlanData = { ...existingPlan.plan_data }
    
    try {
      // If specific day and meal type are provided, replace that specific meal
      if (day_index !== undefined && meal_type && result.mealPlan?.dailyPlans?.[0]?.meals?.[meal_type]) {
        if (!modifiedPlanData.dailyPlans) modifiedPlanData.dailyPlans = []
        if (!modifiedPlanData.dailyPlans[day_index]) {
          modifiedPlanData.dailyPlans[day_index] = { day: `Day ${day_index + 1}`, meals: {}, dailyNutrition: {} }
        }
        if (!modifiedPlanData.dailyPlans[day_index].meals) {
          modifiedPlanData.dailyPlans[day_index].meals = {}
        }
        
        // Replace the specific meal
        modifiedPlanData.dailyPlans[day_index].meals[meal_type] = result.mealPlan.dailyPlans[0].meals[meal_type]
        
        // Recalculate daily nutrition for the modified day
        const dayMeals = modifiedPlanData.dailyPlans[day_index].meals
        let totalCalories = 0
        let totalProtein = 0
        let totalCarbs = 0
        let totalFat = 0
        let totalFiber = 0
        
        Object.values(dayMeals).forEach((meal: any) => {
          if (meal?.nutrition) {
            totalCalories += parseInt(meal.nutrition.calories?.toString() || '0')
            totalProtein += parseInt(meal.nutrition.protein?.toString().replace('g', '') || '0')
            totalCarbs += parseInt(meal.nutrition.carbs?.toString().replace('g', '') || '0')
            totalFat += parseInt(meal.nutrition.fat?.toString().replace('g', '') || '0')
            totalFiber += parseInt(meal.nutrition.fiber?.toString().replace('g', '') || '0')
          }
        })
        
        modifiedPlanData.dailyPlans[day_index].dailyNutrition = {
          calories: totalCalories,
          protein: `${totalProtein}g`,
          carbs: `${totalCarbs}g`,
          fat: `${totalFat}g`,
          fiber: `${totalFiber}g`,
          sugar: '0g' // Placeholder
        }
      } else {
        // For general modifications, merge the new content appropriately
        if (result.mealPlan?.dailyPlans) {
          modifiedPlanData.dailyPlans = result.mealPlan.dailyPlans
        }
        if (result.mealPlan?.overview) {
          modifiedPlanData.overview = result.mealPlan.overview
        }
        if (result.mealPlan?.shoppingList) {
          modifiedPlanData.shoppingList = result.mealPlan.shoppingList
        }
      }
    } catch (modificationError) {
      console.error('Error applying meal modification:', modificationError)
      return NextResponse.json({ 
        error: 'Failed to apply meal modification',
        details: 'The modification was generated but could not be applied to your meal plan.'
      }, { status: 500 })
    }

    // Update the meal plan in the database
    const { data: updatedPlan, error: updateError } = await supabase
      .from('user_meal_plans')
      .update({
        plan_data: modifiedPlanData,
        updated_at: new Date().toISOString(),
        completion_status: 'modified'
      })
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating modified meal plan:', updateError)
      return NextResponse.json({ 
        error: 'Failed to save meal plan modifications',
        details: 'The modifications were processed but could not be saved to your account.'
      }, { status: 500 })
    }

    // Track AI usage for analytics
    try {
      await supabase.from('ai_usage_logs').insert({
        user_id: user.id,
        agent_name: 'meal_planning_modification',
        framework: 'langchain',
        provider: 'openai',
        model: result.model,
        tokens_used: result.tokensUsed,
        latency_ms: result.latency,
        success: true,
        cost_estimate: (result.tokensUsed * 0.002) / 1000, // Rough estimate
        metadata: {
          plan_id,
          modification_type: day_index !== undefined && meal_type ? 'specific_meal' : 'general',
          day_index,
          meal_type,
          modification_request: modification_request.substring(0, 100) // Truncate for storage
        }
      })
    } catch (logError) {
      console.error('Error logging AI usage:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      modified_plan: updatedPlan,
      modification_applied: {
        type: day_index !== undefined && meal_type ? 'specific_meal' : 'general',
        day_index,
        meal_type,
        request: modification_request
      },
      ai_metrics: {
        tokens_used: result.tokensUsed,
        latency: result.latency,
        model: result.model
      },
      message: 'Your meal plan has been successfully modified!'
    })

  } catch (error) {
    console.error('Meal modification API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: 'An unexpected error occurred while processing your meal modification request.'
    }, { status: 500 })
  }
}

// DELETE - Remove specific meal from plan
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('plan_id')
    const dayIndex = parseInt(searchParams.get('day_index') || '-1')
    const mealType = searchParams.get('meal_type')

    if (!planId || dayIndex < 0 || !mealType) {
      return NextResponse.json({ 
        error: 'Plan ID, day index, and meal type are required' 
      }, { status: 400 })
    }

    // Get the existing meal plan
    const { data: existingPlan, error: planError } = await supabase
      .from('user_meal_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (planError || !existingPlan) {
      return NextResponse.json({ 
        error: 'Meal plan not found or access denied' 
      }, { status: 404 })
    }

    // Remove the specific meal
    let modifiedPlanData = { ...existingPlan.plan_data }
    
    if (modifiedPlanData.dailyPlans?.[dayIndex]?.meals?.[mealType]) {
      delete modifiedPlanData.dailyPlans[dayIndex].meals[mealType]
      
      // Recalculate daily nutrition
      const dayMeals = modifiedPlanData.dailyPlans[dayIndex].meals
      let totalCalories = 0
      let totalProtein = 0
      let totalCarbs = 0
      let totalFat = 0
      let totalFiber = 0
      
      Object.values(dayMeals).forEach((meal: any) => {
        if (meal?.nutrition) {
          totalCalories += parseInt(meal.nutrition.calories?.toString() || '0')
          totalProtein += parseInt(meal.nutrition.protein?.toString().replace('g', '') || '0')
          totalCarbs += parseInt(meal.nutrition.carbs?.toString().replace('g', '') || '0')
          totalFat += parseInt(meal.nutrition.fat?.toString().replace('g', '') || '0')
          totalFiber += parseInt(meal.nutrition.fiber?.toString().replace('g', '') || '0')
        }
      })
      
      modifiedPlanData.dailyPlans[dayIndex].dailyNutrition = {
        calories: totalCalories,
        protein: `${totalProtein}g`,
        carbs: `${totalCarbs}g`,
        fat: `${totalFat}g`,
        fiber: `${totalFiber}g`,
        sugar: '0g'
      }
    }

    // Update the meal plan in the database
    const { data: updatedPlan, error: updateError } = await supabase
      .from('user_meal_plans')
      .update({
        plan_data: modifiedPlanData,
        updated_at: new Date().toISOString(),
        completion_status: 'modified'
      })
      .eq('id', planId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating meal plan after removal:', updateError)
      return NextResponse.json({ 
        error: 'Failed to save meal plan changes' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated_plan: updatedPlan,
      removed_meal: { day_index: dayIndex, meal_type: mealType },
      message: 'Meal removed successfully from your plan!'
    })

  } catch (error) {
    console.error('Meal removal API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
