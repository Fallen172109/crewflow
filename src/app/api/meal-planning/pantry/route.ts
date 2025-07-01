import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// GET - Retrieve user's pantry items
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    let query = supabase
      .from('user_pantry_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (category) {
      query = query.eq('category', category)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: pantryItems, error: pantryError } = await query

    if (pantryError) {
      console.error('Error fetching pantry items:', pantryError)
      return NextResponse.json({ error: 'Failed to fetch pantry items' }, { status: 500 })
    }

    // Group by category for easier display
    const groupedItems = pantryItems.reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {})

    return NextResponse.json({
      items: pantryItems,
      grouped: groupedItems,
      total: pantryItems.length
    })

  } catch (error) {
    console.error('Pantry GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new pantry items
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ 
        error: 'Items array is required' 
      }, { status: 400 })
    }

    // Validate and prepare items for insertion
    const pantryItems = items.map((item: any) => {
      if (!item.ingredient_name || !item.category) {
        throw new Error('ingredient_name and category are required for each item')
      }

      return {
        user_id: user.id,
        ingredient_name: item.ingredient_name,
        quantity: item.quantity || null,
        unit: item.unit || null,
        category: item.category,
        expiration_date: item.expiration_date || null,
        purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
        status: item.status || 'available',
        include_in_meal_plans: item.include_in_meal_plans !== undefined ? item.include_in_meal_plans : true
      }
    })

    const { data: insertedItems, error: insertError } = await supabase
      .from('user_pantry_items')
      .insert(pantryItems)
      .select()

    if (insertError) {
      console.error('Error inserting pantry items:', insertError)
      return NextResponse.json({ error: 'Failed to add pantry items' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      items: insertedItems,
      message: `Added ${insertedItems.length} items to pantry`
    })

  } catch (error) {
    console.error('Pantry POST API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// PUT - Update pantry items
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ 
        error: 'Items array is required' 
      }, { status: 400 })
    }

    const updatedItems = []

    // Update each item individually
    for (const item of items) {
      if (!item.id) {
        continue // Skip items without ID
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from('user_pantry_items')
        .update({
          ingredient_name: item.ingredient_name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          expiration_date: item.expiration_date,
          status: item.status,
          include_in_meal_plans: item.include_in_meal_plans !== undefined ? item.include_in_meal_plans : true
        })
        .eq('id', item.id)
        .eq('user_id', user.id) // Ensure user can only update their own items
        .select()
        .single()

      if (updateError) {
        console.error(`Error updating pantry item ${item.id}:`, updateError)
        continue // Skip this item but continue with others
      }

      updatedItems.push(updatedItem)
    }

    return NextResponse.json({
      success: true,
      items: updatedItems,
      message: `Updated ${updatedItems.length} pantry items`
    })

  } catch (error) {
    console.error('Pantry PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove pantry items
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')
    const body = await request.json().catch(() => ({}))
    const { ids } = body

    if (!itemId && (!ids || !Array.isArray(ids))) {
      return NextResponse.json({ 
        error: 'Item ID or IDs array is required' 
      }, { status: 400 })
    }

    let deleteQuery = supabase
      .from('user_pantry_items')
      .delete()
      .eq('user_id', user.id)

    if (itemId) {
      deleteQuery = deleteQuery.eq('id', itemId)
    } else {
      deleteQuery = deleteQuery.in('id', ids)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Error deleting pantry items:', deleteError)
      return NextResponse.json({ error: 'Failed to delete pantry items' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Pantry items deleted successfully'
    })

  } catch (error) {
    console.error('Pantry DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
