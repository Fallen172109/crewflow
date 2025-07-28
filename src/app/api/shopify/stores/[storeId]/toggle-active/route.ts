import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientWithCookies } from '@/lib/supabase/server'

export async function POST(
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
    const { is_active } = body

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    // Update store active status
    const { data, error } = await supabase
      .from('shopify_stores')
      .update({
        is_active
      })
      .eq('id', storeId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating store status:', error)
      return NextResponse.json(
        { error: 'Failed to update store status' },
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
      store: data,
      message: `Store ${is_active ? 'activated' : 'deactivated'} successfully`
    })

  } catch (error) {
    console.error('Error toggling store status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
