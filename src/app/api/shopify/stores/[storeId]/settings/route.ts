import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = await params
    const body = await request.json()

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Validate the request body
    const allowedFields = ['permissions', 'agent_access', 'isActive']
    const updateData: any = {}

    // Process permissions
    if (body.permissions && typeof body.permissions === 'object') {
      updateData.permissions = body.permissions
    }

    // Process agent access
    if (body.agent_access && typeof body.agent_access === 'object') {
      updateData.agent_access = body.agent_access
    }

    // Process active status
    if (typeof body.isActive === 'boolean') {
      updateData.is_active = body.isActive
    }

    // Ensure we have something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    console.log('🔧 Updating store settings:', { storeId, updateData })

    // Update store settings
    const { data, error } = await supabase
      .from('shopify_stores')
      .update(updateData)
      .eq('id', storeId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error updating store settings:', error)
      return NextResponse.json(
        { error: 'Failed to update store settings' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    console.log('✅ Store settings updated successfully:', { storeId })

    return NextResponse.json({
      success: true,
      store: data,
      message: 'Store settings updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating store settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClientWithCookies()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    // Get store settings
    const { data, error } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('❌ Database error fetching store settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch store settings' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      store: data
    })

  } catch (error) {
    console.error('❌ Error fetching store settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
