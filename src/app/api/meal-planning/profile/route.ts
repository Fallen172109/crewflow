import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  calculateNutritionalTargets,
  validatePhysicalStats,
  PhysicalStats
} from '@/lib/utils/calorie-calculator'

// GET - Retrieve user's meal planning profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's meal planning profile
    const { data: profile, error: profileError } = await supabase
      .from('user_meal_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching meal profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Get dietary restrictions
    const { data: restrictions, error: restrictionsError } = await supabase
      .from('user_dietary_restrictions')
      .select('*')
      .eq('user_id', user.id)

    if (restrictionsError) {
      console.error('Error fetching dietary restrictions:', restrictionsError)
      return NextResponse.json({ error: 'Failed to fetch dietary restrictions' }, { status: 500 })
    }

    // Get cuisine preferences
    const { data: cuisinePrefs, error: cuisineError } = await supabase
      .from('user_cuisine_preferences')
      .select('*')
      .eq('user_id', user.id)

    if (cuisineError) {
      console.error('Error fetching cuisine preferences:', cuisineError)
      return NextResponse.json({ error: 'Failed to fetch cuisine preferences' }, { status: 500 })
    }

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

        // Use age from profile or default to 30
        const age = profile.age || 30
        const gender = profile.gender || 'other'

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
          age,
          gender
        )
      } catch (error) {
        console.error('Error calculating nutritional targets:', error)
        // Don't fail the request, just don't include targets
      }
    }

    // Calculate profile completion percentage
    const requiredFields = ['weight_value', 'height_value', 'primary_goal', 'activity_level']
    const completedFields = requiredFields.filter(field => {
      const value = profile?.[field]
      // Handle both string and number values, and check for meaningful content
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim() === '') return false
      if (typeof value === 'number' && value <= 0) return false
      return true
    })
    const completionPercentage = profile ? Math.round((completedFields.length / requiredFields.length) * 100) : 0

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

    return NextResponse.json({
      profile: profile || null,
      dietary_restrictions: restrictions || [],
      cuisine_preferences: cuisinePrefs || [],
      nutritional_targets: nutritionalTargets,
      profile_completion: {
        percentage: completionPercentage,
        missing_fields: requiredFields.filter(field => {
          const value = profile?.[field]
          // Handle both string and number values, and check for meaningful content
          if (value === null || value === undefined) return true
          if (typeof value === 'string' && value.trim() === '') return true
          if (typeof value === 'number' && value <= 0) return true
          return false
        }),
        is_complete: completionPercentage === 100,
        has_minimal_profile: hasMinimalProfile || false
      }
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete user's meal planning profile and all related data
export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/meal-planning/profile called')
    const supabase = await createSupabaseServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check:', { user: user?.id, authError })
    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Delete all related data in the correct order (due to foreign key constraints)
    console.log('Starting profile deletion for user:', user.id)

    // 1. Delete meal plans
    const { error: mealPlansError } = await supabase
      .from('user_meal_plans')
      .delete()
      .eq('user_id', user.id)

    if (mealPlansError) {
      console.error('Error deleting meal plans:', mealPlansError)
      return NextResponse.json({ error: 'Failed to delete meal plans' }, { status: 500 })
    }

    // 2. Delete pantry items
    const { error: pantryError } = await supabase
      .from('user_pantry_items')
      .delete()
      .eq('user_id', user.id)

    if (pantryError) {
      console.error('Error deleting pantry items:', pantryError)
      return NextResponse.json({ error: 'Failed to delete pantry items' }, { status: 500 })
    }

    // 3. Delete cuisine preferences
    const { error: cuisineError } = await supabase
      .from('user_cuisine_preferences')
      .delete()
      .eq('user_id', user.id)

    if (cuisineError) {
      console.error('Error deleting cuisine preferences:', cuisineError)
      return NextResponse.json({ error: 'Failed to delete cuisine preferences' }, { status: 500 })
    }

    // 4. Delete dietary restrictions
    const { error: restrictionsError } = await supabase
      .from('user_dietary_restrictions')
      .delete()
      .eq('user_id', user.id)

    if (restrictionsError) {
      console.error('Error deleting dietary restrictions:', restrictionsError)
      return NextResponse.json({ error: 'Failed to delete dietary restrictions' }, { status: 500 })
    }

    // 5. Finally, delete the main profile
    const { error: profileError } = await supabase
      .from('user_meal_profiles')
      .delete()
      .eq('user_id', user.id)

    if (profileError) {
      console.error('Error deleting meal profile:', profileError)
      return NextResponse.json({ error: 'Failed to delete meal profile' }, { status: 500 })
    }

    console.log('Profile deletion completed successfully for user:', user.id)

    return NextResponse.json({
      success: true,
      message: 'Meal planning profile and all related data deleted successfully'
    })

  } catch (error) {
    console.error('Profile deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update user's meal planning profile
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/meal-planning/profile called')
    const supabase = await createSupabaseServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check:', { user: user?.id, authError })
    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)

    const {
      height_value,
      height_unit,
      weight_value,
      weight_unit,
      age,
      gender,
      primary_goal,
      target_date,
      target_weight,
      timeline_duration_days,
      timeline_duration_weeks,
      activity_level,
      household_size,
      preferred_meal_count,
      max_cooking_time_minutes,
      budget_range,
      dietary_restrictions,
      cuisine_preferences,
      preferred_diet_type,
      food_likes,
      food_dislikes
    } = body

    // Validate required fields
    if (!primary_goal || !activity_level) {
      return NextResponse.json({
        error: 'Primary goal and activity level are required'
      }, { status: 400 })
    }

    // Validate physical stats if provided
    if (weight_value && height_value) {
      const physicalStats: PhysicalStats = {
        weight_value,
        weight_unit: weight_unit || 'kg',
        height_value,
        height_unit: height_unit || 'cm'
      }

      const validationErrors = validatePhysicalStats(physicalStats)
      if (validationErrors.length > 0) {
        return NextResponse.json({
          error: 'Invalid physical stats',
          validation_errors: validationErrors
        }, { status: 400 })
      }
    }

    // Validate units
    const validHeightUnits = ['cm', 'm', 'ft_in', 'inches']
    const validWeightUnits = ['kg', 'g', 'lbs', 'oz', 'stone']

    if (height_unit && !validHeightUnits.includes(height_unit)) {
      return NextResponse.json({
        error: 'Invalid height unit. Must be one of: cm, m, ft_in, inches'
      }, { status: 400 })
    }

    if (weight_unit && !validWeightUnits.includes(weight_unit)) {
      return NextResponse.json({
        error: 'Invalid weight unit. Must be one of: kg, g, lbs, oz, stone'
      }, { status: 400 })
    }

    // Convert timeline_duration_weeks to timeline_duration_days if provided
    const timelineDays = timeline_duration_weeks
      ? timeline_duration_weeks * 7
      : timeline_duration_days

    // Upsert meal profile (temporarily excluding problematic fields due to schema cache issue)
    const profileData = {
      user_id: user.id,
      height_value: height_value !== undefined ? height_value : null,
      height_unit: height_unit || 'cm',
      weight_value: weight_value !== undefined ? weight_value : null,
      weight_unit: weight_unit || 'kg',
      age: age !== undefined ? age : null,
      gender: gender || null,
      primary_goal,
      target_date: target_date || null,
      target_weight: target_weight !== undefined ? target_weight : null,
      timeline_duration_days: timelineDays !== undefined ? timelineDays : null,
      activity_level,
      household_size: household_size || 1,
      preferred_meal_count: preferred_meal_count || 3,
      max_cooking_time_minutes: max_cooking_time_minutes || 60,
      budget_range: budget_range || 'moderate'
      // Temporarily commented out due to Supabase schema cache issue:
      // food_likes: food_likes || null,
      // food_dislikes: food_dislikes || null,
      // preferred_diet_type: preferred_diet_type || null
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_meal_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single()

    if (profileError) {
      console.error('Error upserting meal profile:', profileError)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    // Manually update the problematic fields to bypass schema cache issue
    if (food_likes !== undefined || food_dislikes !== undefined || preferred_diet_type !== undefined) {
      try {
        const { error: updateError } = await supabase
          .from('user_meal_profiles')
          .update({
            food_likes: food_likes || null,
            food_dislikes: food_dislikes || null,
            preferred_diet_type: preferred_diet_type || null
          })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Error updating food preferences:', updateError)
          // Don't fail the whole request, just log the error
        }
      } catch (error) {
        console.error('Error with food preferences update:', error)
      }
    }

    // Handle dietary restrictions
    if (dietary_restrictions && Array.isArray(dietary_restrictions)) {
      // Delete existing restrictions
      await supabase
        .from('user_dietary_restrictions')
        .delete()
        .eq('user_id', user.id)

      // Insert new restrictions
      if (dietary_restrictions.length > 0) {
        const restrictionsData = dietary_restrictions
          .filter((restriction: any) => {
            // Filter out entries with null/empty/undefined restriction_value
            const hasValue = restriction.restriction_value &&
                           restriction.restriction_value.trim &&
                           restriction.restriction_value.trim().length > 0
            if (!hasValue) {
              console.log('Filtering out restriction with empty value:', restriction)
            }
            return hasValue
          })
          .map((restriction: any) => ({
            user_id: user.id,
            restriction_type: restriction.restriction_type || 'dietary_preference',
            restriction_value: restriction.restriction_value.trim(),
            severity: restriction.severity || 'moderate',
            notes: restriction.notes || null
          }))

        console.log('Attempting to save dietary restrictions:', restrictionsData)

        if (restrictionsData.length > 0) {
          const { error: restrictionsError } = await supabase
            .from('user_dietary_restrictions')
            .insert(restrictionsData)

          if (restrictionsError) {
            console.error('Error saving dietary restrictions:', restrictionsError)
            // Don't fail the whole request, just log the error
          } else {
            console.log('Successfully saved dietary restrictions')
          }
        } else {
          console.log('No valid dietary restrictions to save after filtering')
        }
      }
    }

    // Handle cuisine preferences
    if (cuisine_preferences && Array.isArray(cuisine_preferences)) {
      // Delete existing preferences
      await supabase
        .from('user_cuisine_preferences')
        .delete()
        .eq('user_id', user.id)

      // Insert new preferences
      if (cuisine_preferences.length > 0) {
        const cuisineData = cuisine_preferences.map((pref: any) => ({
          user_id: user.id,
          cuisine_type: pref.cuisine_type,
          preference_level: pref.preference_level || 'like'
        }))

        const { error: cuisineError } = await supabase
          .from('user_cuisine_preferences')
          .insert(cuisineData)

        if (cuisineError) {
          console.error('Error saving cuisine preferences:', cuisineError)
          // Don't fail the whole request, just log the error
        }
      }
    }

    // Calculate nutritional targets for the updated profile
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
        const dietTypeRestriction = dietary_restrictions?.find((r: any) =>
          r.restriction_type === 'dietary_preference' &&
          ['vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean'].includes(r.restriction_value)
        )
        const dietType = preferred_diet_type || dietTypeRestriction?.restriction_value || 'balanced'

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

    // Calculate profile completion
    const requiredFields = ['weight_value', 'height_value', 'primary_goal', 'activity_level']
    const completedFields = requiredFields.filter(field => {
      const value = profile?.[field]
      // Handle both string and number values, and check for meaningful content
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim() === '') return false
      if (typeof value === 'number' && value <= 0) return false
      return true
    })
    const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100)

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

    return NextResponse.json({
      success: true,
      profile,
      nutritional_targets: nutritionalTargets,
      profile_completion: {
        percentage: completionPercentage,
        missing_fields: requiredFields.filter(field => {
          const value = profile?.[field]
          return value === null || value === undefined || value === ''
        }),
        is_complete: completionPercentage === 100,
        has_minimal_profile: hasMinimalProfile || false
      },
      message: 'Profile saved successfully'
    })

  } catch (error) {
    console.error('Profile save API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update specific profile fields
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    
    // Update only provided fields
    const { data: profile, error: profileError } = await supabase
      .from('user_meal_profiles')
      .update(body)
      .eq('user_id', user.id)
      .select()
      .single()

    if (profileError) {
      console.error('Error updating meal profile:', profileError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Profile update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
