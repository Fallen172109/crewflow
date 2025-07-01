// Meal Planning Context Handler
// Provides intelligent context for meal planning conversations

import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  calculateNutritionalTargets,
  PhysicalStats,
  formatWeight,
  formatHeight
} from '@/lib/utils/calorie-calculator'
import { WeightUnit, HeightUnit } from '@/lib/utils/units'

export interface MealPlanningContext {
  userProfile?: any
  dietaryRestrictions: any[]
  cuisinePreferences: any[]
  pantryItems: any[]
  recentMealPlans: any[]
  recentMealHistory: {
    mealNames: string[]
    proteinSources: string[]
    cuisineStyles: string[]
    cookingMethods: string[]
    lastGeneratedDate?: string
  }
  nutritionalTargets?: any
  hasCompleteProfile: boolean
  profileCompletion: {
    percentage: number
    missing_fields: string[]
    is_complete: boolean
    has_minimal_profile: boolean
  }
  contextSummary: string
  intelligentFiltering: {
    excludeIngredients: string[]
    preferredIngredients: string[]
    dietaryGuidelines: string[]
  }
}

export async function getMealPlanningContext(userId: string): Promise<MealPlanningContext> {
  const supabase = await createSupabaseServerClient()
  
  try {
    // Get user's meal planning profile
    const { data: profile, error: profileError } = await supabase
      .from('user_meal_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('getMealPlanningContext - Profile query result:', {
      userId,
      profile,
      profileError,
      hasProfile: !!profile
    })

    // Get dietary restrictions
    const { data: restrictions } = await supabase
      .from('user_dietary_restrictions')
      .select('*')
      .eq('user_id', userId)

    // Get cuisine preferences
    const { data: cuisines } = await supabase
      .from('user_cuisine_preferences')
      .select('*')
      .eq('user_id', userId)

    // Get available pantry items that are included in meal plans
    const { data: pantry } = await supabase
      .from('user_pantry_items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'available')
      .eq('include_in_meal_plans', true)
      .limit(20) // Limit to avoid overwhelming context

    // Get recent meal plans (basic info)
    const { data: recentPlans } = await supabase
      .from('user_meal_plans')
      .select('id, plan_name, plan_duration_days, generated_for_date, is_active, completion_status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    // Get detailed meal history for diversity analysis (last 3 weeks)
    const threeWeeksAgo = new Date()
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)

    const { data: detailedMealHistory } = await supabase
      .from('user_meal_plans')
      .select('plan_data, created_at')
      .eq('user_id', userId)
      .gte('created_at', threeWeeksAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(8)

    // Extract meal history for diversity analysis
    const recentMealHistory = extractMealHistoryFromPlans(detailedMealHistory || [])

    // Calculate nutritional targets if profile is complete
    let nutritionalTargets = null
    if (profile && profile.weight_value && profile.height_value) {
      try {
        const physicalStats: PhysicalStats = {
          weight_value: profile.weight_value,
          weight_unit: profile.weight_unit || 'kg',
          height_value: profile.height_value,
          height_unit: profile.height_unit || 'cm'
        }

        // Get preferred diet type from dietary restrictions
        const dietTypeRestriction = restrictions?.find(r =>
          r.restriction_type === 'dietary_preference' &&
          ['vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean'].includes(r.restriction_value)
        )
        const dietType = dietTypeRestriction?.restriction_value || 'balanced'

        nutritionalTargets = calculateNutritionalTargets(
          physicalStats,
          profile.activity_level,
          profile.primary_goal,
          dietType,
          profile.age || 30,
          profile.gender || 'other'
        )
      } catch (error) {
        console.error('Error calculating nutritional targets:', error)
      }
    }

    // Calculate profile completion - more lenient for auto-generation
    // Core required fields for basic meal planning
    const coreRequiredFields = ['weight_value', 'height_value', 'primary_goal', 'activity_level']
    const completedCoreFields = coreRequiredFields.filter(field => {
      const value = profile?.[field]
      // Handle both string and number values, and check for meaningful content
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim() === '') return false
      if (typeof value === 'number' && value <= 0) return false
      return true
    })
    const completionPercentage = profile ? Math.round((completedCoreFields.length / coreRequiredFields.length) * 100) : 0

    // Check if we have minimum viable profile for auto-generation (at least weight, height, and goal)
    const minimalRequiredFields = ['weight_value', 'height_value', 'primary_goal']
    const hasMinimalProfile = profile && minimalRequiredFields.every(field => {
      const value = profile[field]
      // Handle both string and number values, and check for meaningful content
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim() === '') return false
      if (typeof value === 'number' && value <= 0) return false
      return true
    })

    // Build intelligent filtering rules
    const intelligentFiltering = buildIntelligentFiltering(restrictions || [], cuisines || [])

    const context: MealPlanningContext = {
      userProfile: profile,
      dietaryRestrictions: restrictions || [],
      cuisinePreferences: cuisines || [],
      pantryItems: pantry || [],
      recentMealPlans: recentPlans || [],
      recentMealHistory,
      nutritionalTargets,
      hasCompleteProfile: hasMinimalProfile || false,
      profileCompletion: {
        percentage: completionPercentage,
        missing_fields: coreRequiredFields.filter(field => {
          const value = profile?.[field]
          // Handle both string and number values, and check for meaningful content
          if (value === null || value === undefined) return true
          if (typeof value === 'string' && value.trim() === '') return true
          if (typeof value === 'number' && value <= 0) return true
          return false
        }),
        is_complete: completionPercentage === 100,
        has_minimal_profile: hasMinimalProfile || false
      },
      intelligentFiltering,
      contextSummary: buildContextSummary(
        profile,
        restrictions || [],
        cuisines || [],
        pantry || [],
        recentPlans || [],
        nutritionalTargets,
        intelligentFiltering
      )
    }

    return context

  } catch (error) {
    console.error('Error getting meal planning context:', error)
    return {
      userProfile: null,
      dietaryRestrictions: [],
      cuisinePreferences: [],
      pantryItems: [],
      recentMealPlans: [],
      recentMealHistory: {
        mealNames: [],
        proteinSources: [],
        cuisineStyles: [],
        cookingMethods: []
      },
      nutritionalTargets: null,
      hasCompleteProfile: false,
      profileCompletion: {
        percentage: 0,
        missing_fields: ['weight_value', 'height_value', 'primary_goal', 'activity_level'],
        is_complete: false,
        has_minimal_profile: false
      },
      intelligentFiltering: {
        excludeIngredients: [],
        preferredIngredients: [],
        dietaryGuidelines: []
      },
      contextSummary: 'No meal planning context available. User may need to set up their profile first.'
    }
  }
}

// Build intelligent filtering rules based on dietary restrictions and preferences
function buildIntelligentFiltering(restrictions: any[], cuisines: any[]) {
  const excludeIngredients: string[] = []
  const preferredIngredients: string[] = []
  const dietaryGuidelines: string[] = []

  // Process dietary restrictions
  restrictions.forEach(restriction => {
    switch (restriction.restriction_type) {
      case 'allergy':
        excludeIngredients.push(restriction.restriction_value)
        if (restriction.severity === 'severe' || restriction.severity === 'absolute') {
          dietaryGuidelines.push(`CRITICAL: Absolutely avoid ${restriction.restriction_value} due to ${restriction.severity} allergy`)
        } else {
          dietaryGuidelines.push(`Avoid ${restriction.restriction_value} (${restriction.severity} allergy)`)
        }
        break

      case 'dietary_preference':
        if (['vegetarian', 'vegan', 'pescatarian'].includes(restriction.restriction_value)) {
          dietaryGuidelines.push(`Follow ${restriction.restriction_value} diet guidelines`)
          if (restriction.restriction_value === 'vegan') {
            excludeIngredients.push('meat', 'dairy', 'eggs', 'honey', 'gelatin')
          } else if (restriction.restriction_value === 'vegetarian') {
            excludeIngredients.push('meat', 'fish', 'poultry')
          } else if (restriction.restriction_value === 'pescatarian') {
            excludeIngredients.push('meat', 'poultry')
          }
        } else if (['keto', 'low_carb'].includes(restriction.restriction_value)) {
          dietaryGuidelines.push(`Follow ${restriction.restriction_value} macronutrient guidelines`)
          excludeIngredients.push('bread', 'pasta', 'rice', 'potatoes', 'sugar')
        } else {
          // Regular ingredient dislike
          excludeIngredients.push(restriction.restriction_value)
          dietaryGuidelines.push(`Avoid ${restriction.restriction_value} (personal preference)`)
        }
        break

      case 'medical_restriction':
        excludeIngredients.push(restriction.restriction_value)
        dietaryGuidelines.push(`Medical restriction: avoid ${restriction.restriction_value}`)
        break

      case 'religious_restriction':
        if (restriction.restriction_value === 'halal') {
          excludeIngredients.push('pork', 'alcohol')
          dietaryGuidelines.push('Follow halal dietary guidelines')
        } else if (restriction.restriction_value === 'kosher') {
          excludeIngredients.push('pork', 'shellfish')
          dietaryGuidelines.push('Follow kosher dietary guidelines')
        } else {
          excludeIngredients.push(restriction.restriction_value)
          dietaryGuidelines.push(`Religious restriction: avoid ${restriction.restriction_value}`)
        }
        break
    }
  })

  // Process cuisine preferences
  cuisines.forEach(cuisine => {
    if (cuisine.preference_level === 'love' || cuisine.preference_level === 'like') {
      dietaryGuidelines.push(`Prefers ${cuisine.cuisine_type} cuisine`)
    } else if (cuisine.preference_level === 'avoid' || cuisine.preference_level === 'dislike') {
      dietaryGuidelines.push(`Avoid ${cuisine.cuisine_type} cuisine`)
    }
  })

  return {
    excludeIngredients: [...new Set(excludeIngredients)], // Remove duplicates
    preferredIngredients,
    dietaryGuidelines
  }
}

function buildContextSummary(
  profile: any,
  restrictions: any[],
  cuisines: any[],
  pantry: any[],
  recentPlans: any[],
  nutritionalTargets?: any,
  intelligentFiltering?: any
): string {
  let summary = ''

  if (profile) {
    summary += `USER PROFILE:\n`
    summary += `- Primary Goal: ${profile.primary_goal}\n`
    summary += `- Activity Level: ${profile.activity_level}\n`
    summary += `- Household Size: ${profile.household_size} people\n`
    summary += `- Preferred Meals/Day: ${profile.preferred_meal_count}\n`
    summary += `- Max Cooking Time: ${profile.max_cooking_time_minutes} minutes\n`
    summary += `- Budget Range: ${profile.budget_range}\n`
    
    if (profile.height_value && profile.weight_value) {
      summary += `- Physical Stats: ${profile.height_value}${profile.height_unit}, ${profile.weight_value}${profile.weight_unit}\n`
    }
    
    if (profile.target_date) {
      summary += `- Target Date: ${profile.target_date}\n`
    }

    if (profile.age) {
      summary += `- Age: ${profile.age} years\n`
    }

    if (profile.food_likes) {
      summary += `- Favorite Foods: ${profile.food_likes}\n`
    }

    if (profile.food_dislikes) {
      summary += `- Foods to Avoid: ${profile.food_dislikes}\n`
    }

    if (profile.preferred_diet_type) {
      summary += `- Preferred Diet Style: ${profile.preferred_diet_type}\n`
    }
  } else {
    summary += `USER PROFILE: Not set up yet. Recommend setting up profile for personalized recommendations.\n`
  }

  // Add nutritional targets if available
  if (nutritionalTargets) {
    summary += `\nDAILY NUTRITION TARGETS:\n`
    summary += `- Calories: ${nutritionalTargets.calories}\n`
    summary += `- Protein: ${nutritionalTargets.protein}g\n`
    summary += `- Carbs: ${nutritionalTargets.carbs}g\n`
    summary += `- Fat: ${nutritionalTargets.fat}g\n`
    summary += `- Fiber: ${nutritionalTargets.fiber}g\n`
  }

  if (restrictions.length > 0) {
    summary += `\nDIETARY RESTRICTIONS:\n`
    const allergies = restrictions.filter(r => r.restriction_type === 'allergy').map(r => r.restriction_value)
    const dietary = restrictions.filter(r => r.restriction_type === 'dietary_preference').map(r => r.restriction_value)
    const medical = restrictions.filter(r => r.restriction_type === 'medical_restriction').map(r => r.restriction_value)
    
    if (allergies.length > 0) summary += `- Allergies: ${allergies.join(', ')}\n`
    if (dietary.length > 0) summary += `- Dietary Preferences: ${dietary.join(', ')}\n`
    if (medical.length > 0) summary += `- Medical Restrictions: ${medical.join(', ')}\n`
  }

  if (cuisines.length > 0) {
    summary += `\nCUISINE PREFERENCES:\n`
    const loved = cuisines.filter(c => c.preference_level === 'love').map(c => c.cuisine_type)
    const liked = cuisines.filter(c => c.preference_level === 'like').map(c => c.cuisine_type)
    const disliked = cuisines.filter(c => c.preference_level === 'dislike' || c.preference_level === 'avoid').map(c => c.cuisine_type)
    
    if (loved.length > 0) summary += `- Loves: ${loved.join(', ')}\n`
    if (liked.length > 0) summary += `- Likes: ${liked.join(', ')}\n`
    if (disliked.length > 0) summary += `- Dislikes/Avoids: ${disliked.join(', ')}\n`
  }

  if (pantry.length > 0) {
    summary += `\nAVAILABLE PANTRY ITEMS (${pantry.length} items):\n`
    const pantryByCategory = pantry.reduce((acc: any, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item.ingredient_name)
      return acc
    }, {})
    
    Object.entries(pantryByCategory).forEach(([category, items]: [string, any]) => {
      summary += `- ${category}: ${items.slice(0, 5).join(', ')}${items.length > 5 ? ` (+${items.length - 5} more)` : ''}\n`
    })
  }

  if (recentPlans.length > 0) {
    summary += `\nRECENT MEAL PLANS:\n`
    recentPlans.forEach(plan => {
      summary += `- ${plan.plan_name} (${plan.plan_duration_days} days, ${plan.completion_status}${plan.is_active ? ', ACTIVE' : ''})\n`
    })
  }

  // Add intelligent filtering rules
  if (intelligentFiltering) {
    if (intelligentFiltering.excludeIngredients.length > 0) {
      summary += `\nMUST EXCLUDE INGREDIENTS: ${intelligentFiltering.excludeIngredients.join(', ')}\n`
    }

    if (intelligentFiltering.dietaryGuidelines.length > 0) {
      summary += `\nDIETARY GUIDELINES:\n`
      intelligentFiltering.dietaryGuidelines.forEach((guideline: string) => {
        summary += `- ${guideline}\n`
      })
    }
  }

  return summary
}

export function buildMealPlanningSystemPrompt(agentName: string, agentDescription: string, context: MealPlanningContext): string {
  const basePrompt = `You are ${agentName}, a specialized meal planning assistant in the CrewFlow maritime AI platform.

${agentDescription}

MEAL PLANNING CONTEXT:
${context.contextSummary}

SPECIALIZED CAPABILITIES:
- Generate personalized meal plans based on user profile and goals
- Provide nutrition analysis and dietary advice
- Suggest recipes using available pantry ingredients
- Help with meal prep scheduling and shopping lists
- Adapt recommendations based on dietary restrictions and preferences

CONVERSATION GUIDELINES:
1. **Personalization**: Always consider the user's profile, restrictions, and preferences
2. **Practical Focus**: Provide actionable, realistic meal planning advice
3. **Nutritional Awareness**: Include nutritional information when relevant
4. **Pantry Integration**: Suggest using available pantry items when possible
5. **Goal Alignment**: Ensure recommendations support the user's primary goal
6. **Maritime Personality**: Use natural maritime terminology while staying professional

RESPONSE PATTERNS:
- If user lacks profile data: Guide them to set up their profile first
- For meal planning requests: Use their profile data for personalized recommendations
- For nutrition questions: Reference their goals and restrictions
- For recipe requests: Prioritize pantry ingredients and dietary needs
- For meal prep: Consider their time constraints and household size

Remember: You have access to their complete meal planning context, so provide specific, personalized advice rather than generic responses.`

  return basePrompt
}

export async function enhanceAgentPromptWithMealContext(
  userId: string,
  agentName: string,
  agentDescription: string,
  taskType?: string
): Promise<string> {
  // Only enhance with meal planning context for relevant tasks
  if (taskType === 'crew_ability' || taskType === 'meal_planning') {
    const context = await getMealPlanningContext(userId)
    return buildMealPlanningSystemPrompt(agentName, agentDescription, context)
  }
  
  // Return standard prompt for other tasks
  return `You are ${agentName}, a ${agentDescription} specialist in the CrewFlow maritime AI automation platform.`
}

// Extract meal history from recent meal plans for diversity analysis
function extractMealHistoryFromPlans(mealPlans: any[]): {
  mealNames: string[]
  proteinSources: string[]
  cuisineStyles: string[]
  cookingMethods: string[]
  lastGeneratedDate?: string
} {
  const mealNames: string[] = []
  const proteinSources: string[] = []
  const cuisineStyles: string[] = []
  const cookingMethods: string[] = []
  let lastGeneratedDate: string | undefined

  if (mealPlans.length > 0) {
    lastGeneratedDate = mealPlans[0].created_at
  }

  mealPlans.forEach(plan => {
    try {
      const planData = plan.plan_data
      if (planData && planData.dailyPlans) {
        planData.dailyPlans.forEach((day: any) => {
          if (day.meals) {
            Object.values(day.meals).forEach((meal: any) => {
              if (meal && typeof meal === 'object') {
                // Extract meal names
                if (meal.name) {
                  mealNames.push(meal.name.toLowerCase())
                }

                // Extract protein sources from ingredients
                if (meal.ingredients && Array.isArray(meal.ingredients)) {
                  meal.ingredients.forEach((ingredient: string) => {
                    const lowerIngredient = ingredient.toLowerCase()
                    // Common protein sources
                    if (lowerIngredient.includes('chicken')) proteinSources.push('chicken')
                    else if (lowerIngredient.includes('beef')) proteinSources.push('beef')
                    else if (lowerIngredient.includes('pork')) proteinSources.push('pork')
                    else if (lowerIngredient.includes('fish') || lowerIngredient.includes('salmon') || lowerIngredient.includes('tuna')) proteinSources.push('fish')
                    else if (lowerIngredient.includes('egg')) proteinSources.push('eggs')
                    else if (lowerIngredient.includes('tofu') || lowerIngredient.includes('tempeh')) proteinSources.push('plant-based')
                    else if (lowerIngredient.includes('beans') || lowerIngredient.includes('lentils')) proteinSources.push('legumes')
                  })
                }

                // Extract cuisine styles from tags or meal names
                if (meal.tags && Array.isArray(meal.tags)) {
                  meal.tags.forEach((tag: string) => {
                    const lowerTag = tag.toLowerCase()
                    if (['italian', 'mexican', 'asian', 'mediterranean', 'indian', 'thai', 'chinese', 'japanese'].includes(lowerTag)) {
                      cuisineStyles.push(lowerTag)
                    }
                  })
                }

                // Extract cooking methods from instructions or meal names
                if (meal.instructions && Array.isArray(meal.instructions)) {
                  const instructionText = meal.instructions.join(' ').toLowerCase()
                  if (instructionText.includes('bake') || instructionText.includes('oven')) cookingMethods.push('baked')
                  else if (instructionText.includes('grill')) cookingMethods.push('grilled')
                  else if (instructionText.includes('fry') || instructionText.includes('pan')) cookingMethods.push('pan-fried')
                  else if (instructionText.includes('stir')) cookingMethods.push('stir-fried')
                  else if (instructionText.includes('boil') || instructionText.includes('simmer')) cookingMethods.push('boiled/simmered')
                  else if (instructionText.includes('steam')) cookingMethods.push('steamed')
                }
              }
            })
          }
        })
      }
    } catch (error) {
      console.error('Error extracting meal history from plan:', error)
    }
  })

  return {
    mealNames: [...new Set(mealNames)], // Remove duplicates
    proteinSources: [...new Set(proteinSources)],
    cuisineStyles: [...new Set(cuisineStyles)],
    cookingMethods: [...new Set(cookingMethods)],
    lastGeneratedDate
  }
}
