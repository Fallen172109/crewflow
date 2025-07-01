import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET - Retrieve user's meal plan history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const includeData = searchParams.get('include_data') === 'true'
    const planId = searchParams.get('plan_id')

    let query = supabase
      .from('user_meal_plans')
      .select(includeData ? '*' : 'id, plan_name, plan_duration_days, generated_for_date, is_active, completion_status, created_at, updated_at')
      .eq('user_id', user.id)

    // If specific plan ID is requested, fetch only that plan
    if (planId) {
      query = query.eq('id', planId).limit(1)
    } else {
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    }

    // Apply status filter if provided
    if (status) {
      query = query.eq('completion_status', status)
    }

    const { data: mealPlans, error: plansError } = await query

    if (plansError) {
      console.error('Error fetching meal plans:', plansError)
      return NextResponse.json({ error: 'Failed to fetch meal plans' }, { status: 500 })
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('user_meal_plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting meal plans:', countError)
    }

    return NextResponse.json({
      meal_plans: mealPlans,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('Meal plan history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save a meal plan (from generation or manual creation)
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
      plan_name,
      plan_duration_days,
      plan_data,
      preferences_snapshot,
      generated_for_date
    } = body

    if (!plan_data || !plan_duration_days) {
      return NextResponse.json({ 
        error: 'Plan data and duration are required' 
      }, { status: 400 })
    }

    // Deactivate other active plans if this is being set as active
    if (body.is_active) {
      await supabase
        .from('user_meal_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true)
    }

    const planData = {
      user_id: user.id,
      plan_name: plan_name || `Meal Plan - ${new Date().toLocaleDateString()}`,
      plan_duration_days,
      generated_for_date: generated_for_date || new Date().toISOString().split('T')[0],
      plan_data,
      preferences_snapshot: preferences_snapshot || {},
      is_active: body.is_active || false,
      completion_status: body.completion_status || 'active'
    }

    const { data: savedPlan, error: saveError } = await supabase
      .from('user_meal_plans')
      .insert(planData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving meal plan:', saveError)
      return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      meal_plan: savedPlan,
      message: 'Meal plan saved successfully'
    })

  } catch (error) {
    console.error('Meal plan save API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update meal plan status or details
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_id, ...updateData } = body

    if (!plan_id) {
      return NextResponse.json({ 
        error: 'Plan ID is required' 
      }, { status: 400 })
    }

    // If setting as active, deactivate other plans
    if (updateData.is_active) {
      await supabase
        .from('user_meal_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', plan_id)
    }

    const { data: updatedPlan, error: updateError } = await supabase
      .from('user_meal_plans')
      .update(updateData)
      .eq('id', plan_id)
      .eq('user_id', user.id) // Ensure user can only update their own plans
      .select()
      .single()

    if (updateError) {
      console.error('Error updating meal plan:', updateError)
      return NextResponse.json({ error: 'Failed to update meal plan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      meal_plan: updatedPlan,
      message: 'Meal plan updated successfully'
    })

  } catch (error) {
    console.error('Meal plan update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete meal plan
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('id')

    if (!planId) {
      return NextResponse.json({ 
        error: 'Plan ID is required' 
      }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('user_meal_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', user.id) // Ensure user can only delete their own plans

    if (deleteError) {
      console.error('Error deleting meal plan:', deleteError)
      return NextResponse.json({ error: 'Failed to delete meal plan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Meal plan deleted successfully'
    })

  } catch (error) {
    console.error('Meal plan delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
